"""One business implementation shared by migration HTTP and Comfy routes."""
from pathlib import Path
from director_engine import Director, DirectorError, ROOT
from director_groups import SixSegmentDirector
from director_tasks import DirectorTasks

PREFIX = '/api/h3-director'

class DirectorCore:
    def __init__(self, director=None):
        self.director = director or Director()
        self.groups = SixSegmentDirector(self.director)
        self.tasks = DirectorTasks(self.groups)

    def activity(self):
        idle = self.director.lock.acquire(blocking=False)
        if idle:self.director.lock.release()
        return {'busy':not idle or self.director.provider.get_status().get('busy',False)}

    def dispatch(self, method, path, payload=None):
        # Old routes are only a transport mapping during offline migration tests.
        path = path.removeprefix(PREFIX).removeprefix('/director')
        provider = self.director.provider
        if method == 'GET':
            if path == '/groups/tasks':return self.tasks.snapshot(story_id=self.director.read()['story_id'])
            if path.startswith('/groups/tasks/'):
                task_id = path.rsplit('/',1)[1]
                return self.tasks.snapshot(task_id, story_id=self.director.read()['story_id'])
            if path.startswith('/groups/result/'):
                group = self.groups.read(path.rsplit('/',1)[1])
                if group['story_id'] != self.director.read()['story_id']:raise DirectorError('GROUP_NOT_FOUND')
                return group
            if path in ('/status','/local-backend','/health'):return provider.get_status()
            if path == '/activity':return self.activity()
            if path == '/models':return provider.models()
            if path == '/preferences':return provider.preferences()
            if path == '/state':return self.director.state()
            if path == '/groups/latest':return self.groups.latest()
        elif method == 'POST':
            if not isinstance(payload,dict):raise DirectorError('需要JSON对象')
            if path == '/groups/tasks/start':return self.tasks.start(payload)
            if path == '/route-check':
                # Explicit one-shot paid connectivity probe; no Director rules,
                # story state, schema retry, planner, workflow or GPU operation.
                import re
                from h3_sidecar_model_providers import ModelRequest
                probe_id = str(payload.get('probe_id', ''))
                if payload.get('confirm_paid_probe') is not True or not re.fullmatch(r'[0-9a-f]{32}', probe_id):
                    raise DirectorError('EXPLICIT_ONE_SHOT_PROBE_REQUIRED')
                config = provider.catalog().get('grok43', {})
                if config.get('chain') or str(config.get('stream', '')).lower() not in ('0','false','no'):
                    raise DirectorError('PROBE_REQUIRES_NONSTREAM_SINGLE_PROVIDER')
                guard = self.director.data_dir/'transport_audit'/('route-check-'+probe_id+'.sent')
                guard.parent.mkdir(parents=True, exist_ok=True)
                try:
                    with guard.open('x', encoding='utf-8') as handle:handle.write('one explicit route probe; never replay')
                except FileExistsError:
                    raise DirectorError('PROBE_ALREADY_SENT_NO_REPLAY')
                response = provider.generate(ModelRequest(
                    messages=[{'role':'user','content':'Reply exactly CN2_OK.'}],
                    max_tokens=512, temperature=.3, top_p=.9, timeout=90,
                    metadata={'model_key':'grok43'}))
                return {'probe_id':probe_id, 'text':response.text,
                        'model':response.model, 'finish_reason':response.finish_reason,
                        'latency_ms':response.latency_ms,
                        'usage':{'prompt_tokens':response.prompt_tokens,'completion_tokens':response.completion_tokens,'total_tokens':response.total_tokens},
                        'route':{k:response.raw_metadata.get(k) for k in ('request_base_url','fallback_base_url','fallback_mode','stream','http_status','response_id')},
                        'actual_model_key':response.raw_metadata.get('actual_model_key'),
                        'workflow_submitted':False}
            if path == '/preferences':return provider.select_model(payload.get('selected_model'))
            if path in ('/model/warm','/model/start'):return provider.warm_model(str(payload.get('model_key','')))
            if path in ('/planner/generate','/groups/generate'):return self.groups.generate(payload)
            if path in ('/generate','/continue','/refine'):return self.director.generate(payload,path.rsplit('/',1)[1])
            if path == '/confirm':return self.director.confirm(payload)
            if path == '/new-story':return self.director.new_story()
            if path == '/groups/save':return self.groups.save(payload)
            if path == '/groups/confirm':return self.groups.confirm(payload)
        raise DirectorError('NOT_FOUND')

    @staticmethod
    def asset(path):
        names={'/director':'director.html','/six':'six.html','/six_ui.js':'six_ui.js'}
        if path not in names:raise DirectorError('NOT_FOUND')
        name=names[path]
        return (ROOT/name).read_bytes(), ('text/javascript' if name.endswith('.js') else 'text/html')
