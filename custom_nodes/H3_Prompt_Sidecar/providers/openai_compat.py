"""OpenAI-compatible HTTP provider for free external pools (OmniRoute / OpenRouter).

Config keys (from sidecar.ini [model.<key>]):
  provider      = openai_compat
  base_url      = e.g. http://127.0.0.1:20128/v1  or  https://openrouter.ai/api/v1
  model         = upstream model id (e.g. ddgw/gpt-5.6-luna)
  api_key_env   = optional env var name; value is never stored in config files
  reasoning_effort = optional (e.g. low) forwarded when supported
  temperature / top_p = optional overrides handled by the registry

Fallback policy: transport-level failures raise FallbackableError so a chain
(AUTO) may move to the next model.  Contract-level failures (4xx other than
429/402/404) are plain ProviderError and must never trigger fallback.
A single clean retry drops response_format when the endpoint rejects schemas.
"""
import json
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

from .base import FallbackableError, ModelProvider, ModelResponse, ProviderError

_FALLBACKABLE_HTTP = {429, 402, 404, 500, 502, 503, 504}


def _strip_think(text):
    if "<think>" in text:
        import re
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)
    return text


class OpenAICompatProvider(ModelProvider):
    name = 'openai_compat'

    def __init__(self, config):
        self.config = dict(config)
        self.base_url = str(config['base_url']).rstrip('/')
        self.model = str(config['model'])
        self.api_key_env = str(config.get('api_key_env', '') or '')
        self.api_key = os.environ.get(self.api_key_env, '')
        self.reasoning_effort = str(config['reasoning_effort']) if config.get('reasoning_effort') else None
        self.label = config.get('label', self.model)
        # Optional per-model proxy bypass: some local proxy setups drop TLS
        # connections intermittently (SSL EOF) for specific hosts, while the
        # direct route (TUN/fake-IP) is stable. Never affects other models.
        self._opener = None
        if str(config.get('no_proxy', '')).strip().lower() in ('1', 'true', 'yes'):
            self._opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        # Optional curl transport (transport = curl): relay paths that reset
        # ~50% of Python-OpenSSL TLS connections (sharp ~5s RST) pass reliably
        # through Windows Schannel (system curl.exe). Key stays in a temp
        # curl-config file, never on the command line; file removed after use.
        self._curl_transport = str(config.get('transport', '')).strip().lower() == 'curl'
        self._stream = str(config.get('stream', '')).strip().lower() in ('1', 'true', 'yes')
        # A CN2 endpoint is opt-in for NON-streaming only. The original URL
        # remains the streaming route and explicit/manual rollback target.
        # Never auto-replay an HTTP/model failure on another paid endpoint.
        self.fallback_base_url = self.base_url
        self.nonstream_base_url = str(config.get('nonstream_base_url', '') or '').strip().rstrip('/')
        if self.nonstream_base_url and not self._stream:
            self.base_url = self.nonstream_base_url


    def _headers(self):
        if self.api_key_env == 'H3_GROK_API_KEY' and not self.api_key:
            raise ProviderError(f'CREDENTIAL_MISSING: {self.api_key_env} 未进入当前服务进程；未发起网络请求，请通过原密钥启动入口恢复')
        # Explicit User-Agent: some relays (e.g. Cloudflare-fronted) reject the
        # default Python-urllib signature with 403/error 1010 at the edge.
        headers = {'Content-Type': 'application/json',
                   'User-Agent': 'H3-Director-OpenAICompat/1.0'}
        if self.api_key:
            headers['Authorization'] = 'Bearer ' + self.api_key
        return headers

    def _safe_detail(self, value, limit=1200):
        text = str(value)
        if self.api_key:
            text = text.replace(self.api_key, '[REDACTED]')
        text = re.sub(r'data:image/[^;\s]+;base64,[A-Za-z0-9+/=]+', '[IMAGE_REDACTED]', text)
        text = re.sub(r'Bearer\s+[^\s"<>]+', 'Bearer [REDACTED]', text, flags=re.I)
        return text[:limit]

    def _curl_exchange(self, url, method, data, timeout):
        """Keep body, headers and curl metadata separate; never replay a sent POST."""
        started = time.monotonic()
        audit_id = uuid.uuid4().hex
        audit = {'id':audit_id, 'started_at':time.time(), 'model':self.model,
                 'method':method, 'request_bytes':len(data or b''), 'timeout_seconds':timeout}
        audit_root = Path(os.environ.get('H3_SIDECAR_DATA', str(Path(__file__).resolve().parents[1]/'director_data'))) / 'transport_audit'
        def save():
            audit_root.mkdir(parents=True, exist_ok=True)
            target = audit_root/(audit_id+'.json')
            temporary = target.with_suffix('.tmp')
            temporary.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')
            os.replace(temporary, target)
        with tempfile.TemporaryDirectory(prefix='h3curl_') as directory:
            directory = Path(directory)
            cfg = directory/'headers.cfg'
            # Header secrets never appear in argv or durable diagnostics.
            cfg.write_text('\n'.join('header = '+json.dumps(k+': '+v) for k,v in self._headers().items())+'\n', encoding='utf-8')
            output, header_file = directory/'body', directory/'response.headers'
            cmd = ['curl', '-q', '-sS', '-N', '-K', str(cfg), '-X', method,
                   '--max-time', str(max(1.0,float(timeout))), '--output', str(output),
                   '--dump-header', str(header_file), '--write-out', '\nH3_CURL_META:%{json}']
            if self._opener is not None:cmd += ['--noproxy','*']
            if data is not None:cmd += ['--data-binary','@-']
            cmd.append(url)
            timed_out = False
            try:
                for attempt in range(5):
                    if attempt:time.sleep(0.8)
                    proc = subprocess.run(cmd, input=data, capture_output=True, timeout=max(2.0,timeout)+5)
                    handshake_meta={}
                    try:handshake_meta=json.loads(proc.stdout.decode('utf-8','replace').rsplit('H3_CURL_META:',1)[1])
                    except (ValueError,IndexError):pass
                    # Retain the prior handshake recovery only with positive proof
                    # that no HTTP response or request body transmission occurred.
                    unsent=(proc.returncode in (7,35) and handshake_meta.get('size_upload')==0
                            and not handshake_meta.get('http_code') and not handshake_meta.get('response_code'))
                    if not unsent or attempt==4:break
                rc, stdout, stderr = proc.returncode, proc.stdout, proc.stderr
                audit['network_attempts']=attempt+1
            except subprocess.TimeoutExpired as exc:
                timed_out = True
                rc, stdout, stderr = None, exc.stdout or b'', exc.stderr or b''
            except OSError as exc:
                audit.update(error='CURL_START_FAILED', detail=self._safe_detail(exc))
                save()
                raise FallbackableError(f'CURL_START_FAILED: {audit["detail"]}; audit={audit_id}') from exc
            raw = output.read_bytes() if output.exists() else b''
            header_text = header_file.read_text(encoding='iso-8859-1') if header_file.exists() else ''
            meta = {}
            try:meta=json.loads(stdout.decode('utf-8','replace').rsplit('H3_CURL_META:',1)[1])
            except (ValueError,IndexError):pass
            # Select the last response block (after HTTP CONNECT / 100 Continue).
            status, headers = 0, {}
            for block in re.split(r'\r?\n\r?\n',header_text):
                lines=block.splitlines()
                if not lines or not lines[0].startswith('HTTP/'):continue
                try:status=int(lines[0].split()[1])
                except (ValueError,IndexError):continue
                headers={k.strip().lower():v.strip() for line in lines[1:] if ':' in line for k,v in [line.split(':',1)]}
            status = int(meta.get('http_code') or meta.get('response_code') or status or 0)
            audit.update(returncode=rc, http_status=status, response_bytes=len(raw),
                         response_sha256=hashlib.sha256(raw).hexdigest(),
                         elapsed_ms=round((time.monotonic()-started)*1000),
                         response_headers={k:self._safe_detail(v) for k,v in headers.items() if k in ('content-type','server','date','location','retry-after','x-request-id','cf-ray','x-cache')},
                         timings={k:meta.get(k) for k in ('time_connect','time_appconnect','time_starttransfer','time_total','size_upload','size_download')},
                         stderr=self._safe_detail(stderr.decode('utf-8','replace')),
                         response_excerpt=self._safe_detail(raw.decode('utf-8','replace')))
            save()
        suffix=f'HTTP={status or "UNKNOWN"}, rc={rc}, bytes={len(raw)}, audit={audit_id}'
        if timed_out or rc == 28:
            raise FallbackableError(f'CURL_TIMEOUT: {suffix}; 未自动重试')
        if rc != 0:
            raise FallbackableError(f'CURL_TRANSPORT: {suffix}; {audit["stderr"]}; 未自动重试')
        if not status:
            raise FallbackableError(f'CURL_HTTP_STATUS_MISSING: {suffix}')
        if not 200 <= status < 300:
            error = FallbackableError if status in _FALLBACKABLE_HTTP else ProviderError
            raise error(f'HTTP_{status}: {audit["response_excerpt"] or "响应体为空"}; {suffix}; 未自动重试')
        if not raw.strip():
            raise FallbackableError(f'EMPTY_HTTP_BODY: {suffix}; 未自动重试')
        return status, headers, raw, audit['elapsed_ms'], audit_id

    def _curl_run(self, url, method, data, timeout):
        status, headers, raw, elapsed, audit_id = self._curl_exchange(url, method, data, timeout)
        try:
            body = json.loads(raw.decode('utf-8-sig'))
        except (ValueError, UnicodeError) as exc:
            raise FallbackableError(f'HTTP_JSON_INVALID: HTTP={status}, audit={audit_id}; {self._safe_detail(raw.decode("utf-8","replace"))}') from exc
        if not isinstance(body, dict):
            raise ProviderError(f'HTTP_JSON_INVALID: expected object; HTTP={status}, audit={audit_id}')
        return status, body

    def _curl_stream_post(self, payload, timeout):
        body = dict(payload, stream=True, stream_options={'include_usage': True})
        status, headers, raw, elapsed, audit_id = self._curl_exchange(
            self.base_url+'/chat/completions', 'POST', json.dumps(body,ensure_ascii=False).encode('utf-8'), timeout)
        suffix = f'HTTP={status}, audit={audit_id}'
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeError as exc:
            raise FallbackableError(f'RESPONSE_ENCODING_INVALID: {suffix}') from exc
        # Some compatible relays ignore stream=True and return a complete JSON response.
        # This is a valid response, not a curl transport failure.
        if text.lstrip().startswith(('{','[')):
            try: result=json.loads(text)
            except ValueError as exc:
                raise FallbackableError(f'HTTP_JSON_INVALID: {suffix}; {self._safe_detail(text)}') from exc
            if not isinstance(result,dict):
                raise ProviderError(f'HTTP_JSON_INVALID: expected object; {suffix}')
            if 'error' in result:
                raise ProviderError(f'UPSTREAM_ERROR: {self._safe_detail(json.dumps(result["error"],ensure_ascii=False))}; {suffix}')
            choices=result.get('choices')
            if not isinstance(choices,list) or not choices or not isinstance(choices[0],dict):
                raise ProviderError(f'UPSTREAM_MALFORMED: response has no choices; {suffix}')
            if not choices[0].get('finish_reason'):
                raise FallbackableError(f'CURL_STREAM_TRUNCATED: JSON response has no finish_reason; {suffix}; 未自动重试')
        else:
            pieces, finish_reason, usage, model, response_id = [], None, {}, None, None
            saw_data=False
            for block in re.split(r'\r?\n\r?\n',text):
                fields=[line[5:].lstrip(' ') for line in block.splitlines() if line.startswith('data:')]
                if not fields:continue  # SSE comments / heartbeats do not prove model progress.
                data_text='\n'.join(fields).strip()
                if data_text=='[DONE]':continue
                saw_data=True
                try:chunk=json.loads(data_text)
                except ValueError as exc:
                    raise FallbackableError(f'CURL_SSE_DECODE: invalid event JSON; {suffix}; {self._safe_detail(data_text)}') from exc
                if not isinstance(chunk,dict):
                    raise ProviderError(f'CURL_SSE_DECODE: event must be an object; {suffix}')
                if 'error' in chunk or chunk.get('type')=='error':
                    raise ProviderError(f'UPSTREAM_ERROR: {self._safe_detail(json.dumps(chunk.get("error",chunk),ensure_ascii=False))}; {suffix}')
                model=chunk.get('model') or model;response_id=chunk.get('id') or response_id
                if isinstance(chunk.get('usage'),dict):usage=chunk['usage']
                choices=chunk.get('choices') or []
                if not isinstance(choices,list):
                    raise ProviderError(f'CURL_SSE_DECODE: choices must be an array; {suffix}')
                if choices:
                    if not isinstance(choices[0],dict):
                        raise ProviderError(f'CURL_SSE_DECODE: invalid choice; {suffix}')
                    delta=choices[0].get('delta') or {}
                    if not isinstance(delta,dict):
                        raise ProviderError(f'CURL_SSE_DECODE: delta must be an object; {suffix}')
                    piece=delta.get('content')
                    if piece is not None:
                        if not isinstance(piece,str):raise ProviderError(f'CURL_SSE_DECODE: content must be text; {suffix}')
                        pieces.append(piece)
                    finish_reason=choices[0].get('finish_reason') or finish_reason
            if not saw_data:
                raise FallbackableError(f'HTTP_UNEXPECTED_BODY: expected SSE or JSON; {suffix}; {self._safe_detail(text)}')
            if finish_reason is None:
                raise FallbackableError(f'CURL_STREAM_TRUNCATED: stream ended without finish_reason; {suffix}; 未自动重试')
            result={'id':response_id,'model':model,'choices':[{'message':{'content':''.join(pieces)},'finish_reason':finish_reason}],'usage':usage}
        result['_h3_transport']={'http_status':status,'headers':headers,'audit_id':audit_id}
        return result, elapsed

    def _post(self, payload, timeout):
        if self._curl_transport:
            started = time.monotonic()
            if self._stream:
                body, latency_ms = self._curl_stream_post(payload, timeout)
                transport=body.pop('_h3_transport')
                return transport['http_status'], body, transport['headers'], latency_ms
            status, body = self._curl_run(self.base_url + '/chat/completions', 'POST',
                                          json.dumps(payload, ensure_ascii=False).encode('utf-8'),
                                          timeout)
            return status, body, {}, round((time.monotonic() - started) * 1000)
        request = urllib.request.Request(self.base_url + '/chat/completions',
                                         data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
                                         headers=self._headers(), method='POST')
        started = time.monotonic()
        try:
            opener = self._opener or urllib.request.build_opener()
            with opener.open(request, timeout=max(1.0, timeout)) as response:
                body = json.loads(response.read().decode('utf-8', 'replace'))
                headers = {k.lower(): v for k, v in response.headers.items()}
                return response.status, body, headers, round((time.monotonic() - started) * 1000)
        except urllib.error.HTTPError as exc:
            detail = ''
            try:
                detail = exc.read().decode('utf-8', 'replace')[:500]
            except Exception:
                pass
            if exc.code in _FALLBACKABLE_HTTP:
                raise FallbackableError(f'HTTP_{exc.code}: {detail}') from exc
            raise ProviderError(f'HTTP_{exc.code}: {detail}') from exc
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            # Timeout before any valid response, endpoint down, or malformed body.
            raise FallbackableError(f'TRANSPORT: {type(exc).__name__}: {exc}') from exc

    def generate(self, request):
        payload = {'model': self.model, 'messages': request.messages,
                   'max_tokens': int(request.max_tokens), 'temperature': float(request.temperature),
                   'top_p': float(request.top_p)}
        if request.stop:
            payload['stop'] = list(request.stop)
        if self.reasoning_effort:
            payload['reasoning_effort'] = self.reasoning_effort
        if request.structured_output:
            payload['response_format'] = {'type': 'json_schema',
                                          'json_schema': {'name': 'output', 'strict': False,
                                                          'schema': request.structured_output}}
        schema_dropped = False
        try:
            status, body, headers, latency_ms = self._post(payload, request.timeout)
        except ProviderError as exc:
            # One clean retry without the schema when THIS endpoint rejects
            # response_format. Same model, no valid response yet, never a model
            # switch; the decision is logged as schema_dropped.
            if not (request.structured_output and 'HTTP_400' in str(exc)
                    and any(marker in str(exc).lower() for marker in ('response_format', 'json_schema', 'schema'))):
                raise
            payload.pop('response_format', None)
            schema_dropped = True
            status, body, headers, latency_ms = self._post(payload, request.timeout)
        if status == 200 and 'choices' not in body:
            raise ProviderError('UPSTREAM_MALFORMED: response has no choices')
        if 'error' in body:
            raise ProviderError('UPSTREAM_ERROR: ' + json.dumps(body['error'], ensure_ascii=False)[:400])
        message = body['choices'][0].get('message') or {}
        content = message.get('content')
        if not content and message.get('reasoning'):
            # Reasoning burned the entire budget with no visible text.
            raise FallbackableError('REASONING_ATE_BUDGET: no visible content')
        content = _strip_think(content or '')
        if not content.strip():
            raise FallbackableError('EMPTY_CONTENT')
        usage = body.get('usage') or {}
        cost = usage.get('cost')
        if cost is None and headers.get('x-omniroute-response-cost') is not None:
            try:
                cost = float(headers['x-omniroute-response-cost'])
            except ValueError:
                cost = None
        metadata = {'usage': dict(usage), 'response_id': body.get('id'),
                    'cost_in_usd_ticks': usage.get('cost_in_usd_ticks'),
                    'response_cost': cost,
                    'requested_model': self.model,
                    'http_status': status,
                    'request_base_url': self.base_url, 'stream': self._stream,
                    'fallback_base_url': self.fallback_base_url, 'fallback_mode': 'manual_no_replay',
                    'omniroute_headers': {k: v for k, v in headers.items() if k.startswith('x-omniroute-')} or None}
        if schema_dropped:
            metadata['schema_dropped'] = True
        return ModelResponse(text=content, finish_reason=body['choices'][0].get('finish_reason'),
                             prompt_tokens=usage.get('prompt_tokens'), completion_tokens=usage.get('completion_tokens'),
                             total_tokens=usage.get('total_tokens'), latency_ms=latency_ms,
                             provider=self.name, model=body.get('model') or self.model,
                             raw_metadata=metadata)

    def health(self):
        try:
            if self._curl_transport:
                status, _ = self._curl_run(self.base_url + '/models', 'GET', None, 8)
                return status == 200
            request = urllib.request.Request(self.base_url + '/models', headers=self._headers())
            opener = self._opener or urllib.request.build_opener()
            with opener.open(request, timeout=8) as response:
                return response.status == 200
        except Exception:
            return False

    def capabilities(self):
        return {'provider': self.name, 'model': self.model, 'label': self.label, 'transport': 'openai_compat'}


def create(config):
    return OpenAICompatProvider(config)
