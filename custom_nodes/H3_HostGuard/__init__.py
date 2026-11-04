"""Loopback Host allowlist middleware for H3 local ComfyUI instances."""
import os
from aiohttp import web
from server import PromptServer


def _host_name(raw):
    raw = (raw or "").strip().lower()
    if not raw:
        return ""
    if raw.startswith("["):
        return raw[1:raw.find("]")] if "]" in raw else ""
    return raw.rsplit(":", 1)[0] if raw.count(":") == 1 else raw


def _allowed():
    hosts = {"127.0.0.1", "localhost", "::1"}
    try:
        from comfy.cli_args import args
        for item in str(args.listen or "").split(","):
            item = item.strip().lower()
            if item and item not in ("0.0.0.0", "::"):
                hosts.add(_host_name(item))
    except Exception:
        pass
    hosts.update(h.strip().lower() for h in os.environ.get("H3_ALLOWED_HOSTS", "").split(",") if h.strip())
    return frozenset(hosts)


ALLOWED = _allowed()


@web.middleware
async def h3_host_guard(request, handler):
    host = request.headers.get("Host", "")
    if _host_name(host) not in ALLOWED:
        return web.json_response({"error": "H3_HOST_REJECTED", "host": host[:64]}, status=403)
    return await handler(request)


try:
    PromptServer.instance.app.middlewares.append(h3_host_guard)
except Exception as exc:
    print(f"[H3_HostGuard] FATAL: middleware registration failed: {exc}", flush=True)
    raise RuntimeError("H3 HostGuard middleware registration failed") from exc

NODE_CLASS_MAPPINGS = {}
