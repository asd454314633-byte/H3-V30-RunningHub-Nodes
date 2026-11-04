"""Durable observation of the existing six-director execution, never a second engine."""
import copy
import json
import threading
import time
import uuid
from director_engine import atomic, DirectorError

STAGES = ['参考图视觉理解', '六段剧情规划'] + [f'第{x}段导演生成' for x in '一二三四五六']
TERMINAL = {'COMPLETED', 'FAILED', 'INTERRUPTED'}


class DirectorTasks:
    def __init__(self, groups):
        self.groups = groups
        self.directory = groups.director.data_dir / 'tasks'
        self.lock = threading.RLock()
        self.records = {}
        for path in self.directory.glob('*.json'):
            record = json.loads(path.read_text(encoding='utf-8'))
            if record['status'] not in TERMINAL:
                # A persisted group is authoritative even if the terminal event was lost.
                group_path = groups.path(record.get('group_id') or record['task_id'])
                if group_path.exists():
                    record.update(status='COMPLETED', completed_stages=8, completed_segments=6,
                                  group_id=record.get('group_id') or record['task_id'], error=None)
                else:
                    record.update(status='INTERRUPTED', error='8207服务已重启；原任务中断，未自动重试')
                record.update(ended_at=time.time(), last_event_at=time.time())
                atomic(path, record)
            self.records[record['task_id']] = record

    def _save(self, record):
        atomic(self.directory / (record['task_id'] + '.json'), record)

    def snapshot(self, task_id=None, story_id=None):
        with self.lock:
            records = [r for r in self.records.values() if not story_id or r['story_id'] == story_id]
            record = self.records.get(task_id) if task_id else max(records, key=lambda r:r['started_at'], default=None)
            if record and story_id and record['story_id'] != story_id:
                record = None
            return {'task': copy.deepcopy(record), 'server_time': time.time()}

    def start(self, payload):
        task_id = payload.get('task_id') or uuid.uuid4().hex
        if not isinstance(task_id, str) or len(task_id) != 32 or any(c not in '0123456789abcdef' for c in task_id):
            raise DirectorError('INVALID_TASK_ID')
        with self.lock:
            current_story = self.groups.director.read()['story_id']
            if task_id in self.records:
                if self.records[task_id]['story_id'] != current_story:
                    raise DirectorError('TASK_STORY_MISMATCH')
                return self.snapshot(task_id)
            active = next((r for r in self.records.values() if r['status'] not in TERMINAL), None)
            if active:
                if active['story_id'] != current_story:
                    raise DirectorError('DIRECTOR_BUSY: 其他故事任务仍在执行')
                return self.snapshot(active['task_id'])
            if not self.groups.director.lock.acquire(blocking=False):
                raise DirectorError('DIRECTOR_BUSY: 已有导演请求执行中，不重复提交')
            try:
                story_id = self.groups.director.read()['story_id']
            finally:
                self.groups.director.lock.release()
            now = time.time()
            record = dict(task_id=task_id, story_id=story_id, group_id=None, model_key=payload.get('model_key'),
                          reference_count=len(payload.get('reference_images') or []), status='RUNNING',
                          started_at=now, stage_index=None, stage_name='任务已接收', stage_started_at=now,
                          last_event_at=now, ended_at=None, completed_stages=0, completed_segments=0,
                          stages=[{'name':name, 'status':'PENDING'} for name in STAGES], error=None)
            self.records[task_id] = record
            self._save(record)
            threading.Thread(target=self._run, args=(task_id, dict(payload)), daemon=True,
                             name='h3-director-'+task_id[:8]).start()
            return self.snapshot(task_id)

    def _run(self, task_id, payload):
        def event(kind, index=None, **details):
            with self.lock:
                r = self.records[task_id]
                now = time.time()
                r['last_event_at'] = now
                if kind == 'group':
                    r['group_id'] = details['group_id']
                elif kind == 'start':
                    r.update(stage_index=index, stage_name=STAGES[index], stage_started_at=now)
                    r['stages'][index].update(status='RUNNING', started_at=now)
                elif kind == 'done':
                    r['stages'][index].update(status='COMPLETED', ended_at=now, **details)
                    r['completed_stages'] = sum(s['status']=='COMPLETED' for s in r['stages'])
                    r['completed_segments'] = sum(s['status']=='COMPLETED' for s in r['stages'][2:])
                self._save(r)
        try:
            result = self.groups.generate(payload, progress=event)
            with self.lock:
                r = self.records[task_id]
                r.update(status='COMPLETED', group_id=result['id'], ended_at=time.time(), last_event_at=time.time())
                self._save(r)
        except Exception as exc:
            with self.lock:
                r = self.records[task_id]
                r.update(status='FAILED', error=str(exc)[:1200], ended_at=time.time(), last_event_at=time.time())
                if r['stage_index'] is not None:
                    r['stages'][r['stage_index']]['status'] = 'FAILED'
                self._save(r)
