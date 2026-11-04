"""Six-controller transport/state only; official nodes perform all video operations."""
import asyncio
import copy
import json
import hashlib
import logging
import os
import threading
import time
import uuid
from pathlib import Path

from .six_resume import video_frame_count


class NativeMergeControl:
    def __init__(self, root, template, history, submit, validate, inspect, queue=None, state_lock=None):
        self.root, self.template = Path(root), Path(template)
        self.history, self.submit, self.validate, self.inspect = history, submit, validate, inspect
        self.queue = queue
        self.state_lock = state_lock or threading.RLock()
        self.locks, self.tasks = {}, set()
        self.notify = lambda project: None
        self.reconcile = lambda project,index: None
        self.submit_reserved = None
        self.queue_dedup_enabled = False
        self.merge_jobs = {}
        self.executing_merge_ids = set()
        self.on_merge_finished = lambda project, group_id: None

    def path(self, project):
        if not project or len(project) > 64 or any(not (c.isalnum() or c in '-_') for c in project):
            raise ValueError('Invalid project')
        return self.root / 'h3_continuation' / project / 'six_acceptance.json'

    def read(self, project):
        p = self.path(project)
        with self.state_lock:return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}

    def update(self, project, change):
        with self.state_lock:
            data = self.read(project)
            state = data.setdefault('_native_merge', {'auto_merge_enabled': True, 'active_group_id': None, 'groups': {}})
            change(state)
            group = state.get('groups', {}).get(state.get('active_group_id'))
            if group:
                state['merge_status'] = group.get('merge_status')
                state['merged_file'] = group.get('merged_file')
            p = self.path(project)
            p.parent.mkdir(parents=True, exist_ok=True)
            tmp = p.with_name(p.name + '.native.tmp-' + uuid.uuid4().hex)
            try:
                with tmp.open('wb') as handle:
                    handle.write(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))
                    handle.flush()
                    os.fsync(handle.fileno())
                for retry in range(6):
                    try:
                        os.replace(tmp, p)
                        break
                    except PermissionError:
                        if retry == 5:
                            raise
                        time.sleep(.01 * (retry + 1))
            finally:
                if tmp.exists(): tmp.unlink()
        self.notify(project)
        return state

    def state(self, project):
        state = self.read(project).get('_native_merge', {'auto_merge_enabled': True, 'active_group_id': None, 'groups': {}})
        group = state['groups'].get(state['active_group_id'], {})
        return {'auto_merge_enabled': state['auto_merge_enabled'], 'group_id': state['active_group_id'],
                'merge_status': group.get('merge_status', 'NOT_STARTED' if state['auto_merge_enabled'] else 'DISABLED'),
                'merge_prompt_id': group.get('merge_prompt_id'), 'merge_output': group.get('merge_output'), 'merged_file': group.get('merged_file'), 'merge_error': group.get('merge_error'),
                'merge_wait_reason': group.get('merge_wait_reason')}

    def settings(self, project, enabled):
        if not isinstance(enabled, bool): raise ValueError('auto_merge_enabled must be boolean')
        def change(s):
            s['auto_merge_enabled'] = enabled
            g = s['groups'].get(s['active_group_id'])
            if not enabled and g and g['merge_status'] in ('WAITING_6_OF_6', 'NOT_STARTED'):
                g['eligible'] = False
                g['merge_status'] = 'DISABLED'
            # ON never submits or re-arms an existing disabled group.
        self.update(project, change)
        return self.state(project)

    def begin(self, project, group_id=None):
        group_id = group_id or str(uuid.uuid4())
        if len(group_id) > 160 or any(not (c.isalnum() or c in '-_') for c in group_id):
            raise ValueError('Invalid group identity')
        def change(s):
            s['active_group_id'] = group_id
            if group_id not in s['groups']:
                enabled = False
                s['auto_merge_enabled'] = False
                s['groups'][group_id] = {'eligible': enabled, 'started_at': time.time(), 'prompt_ids': {},
                    'merge_prompt_id': None, 'merge_output': None,
                    'merge_status': 'WAITING_6_OF_6' if enabled else 'DISABLED'}
        self.update(project, change)
        return self.state(project)

    async def begin_validated(self, project, graph, group_id=None):
        """Create the merge group only after ComfyUI accepts the submitted graph shape."""
        if graph is None:
            return self.begin(project, group_id)
        if not isinstance(graph, dict) or not graph:
            raise ValueError('Missing execution graph; merge group was not created')
        result = await self.validate(graph)
        valid = result[0] if isinstance(result, tuple) else result
        if valid is not True:
            raise ValueError('Execution graph validation failed; merge group was not created')
        return self.begin(project, group_id)

    def spawn(self, coroutine):
        task = asyncio.create_task(coroutine)
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)
        return task

    def stale_continuation(self, receipts, ids):
        """A continued segment generated before its current predecessor was made from a
        superseded one (e.g. S1 rerun while old S2-S6 still accepted). Return its index."""
        for i in range(1,6):
            h=self.history(ids[str(i)])
            if h:
                graph=h['prompt'][2]
                prepare=[n['inputs'] for n in graph.values() if n.get('class_type')=='H3ContinuationPrepare']
                enabled=prepare[0].get('enabled') if len(prepare)==1 else None
                if isinstance(enabled,list) and len(enabled)==2 and enabled[1]==0:
                    source=graph.get(str(enabled[0]),{})
                    enabled=source.get('inputs',{}).get('value') if source.get('class_type')=='PrimitiveBoolean' else None
                if len(prepare)==1 and (enabled is False or
                        prepare[0].get('clean_rebase_enabled') is True and prepare[0].get('clean_rebase_segment')==i):
                    continue
            # History lost on restart: every later segment is treated as continued.
            before,after=receipts[str(i-1)].get('accepted_at_epoch'),receipts[str(i)].get('accepted_at_epoch')
            if not isinstance(before,(int,float)) or not isinstance(after,(int,float)) or after<before:return i
        return None

    def selected(self, project, group_id):
        root=self.root/'h3_continuation'
        pointers=root/'_prebake_current.json'
        versions=root/'_prebake_executions.json'
        if not pointers.exists() or not versions.exists():return True
        known=json.loads(versions.read_text(encoding='utf-8'))
        candidates=[b for b in known.values() if b['project_id']==project and b['group_id']==group_id]
        if not candidates:return True
        current=json.loads(pointers.read_text(encoding='utf-8'))
        return len(candidates)==1 and current.get(candidates[0]['story_id'])==candidates[0]['execution_version']

    def completed_merge_output(self, group, pid, history):
        """Accept only the reserved graph, unchanged sources and its actual saved output."""
        if history['prompt'][1]!=pid or history['status'].get('status_str')!='success' or history['status'].get('completed') is not True:
            raise ValueError('Exact merge history is not successful')
        clean=lambda graph:{str(k):{'class_type':n['class_type'],'inputs':n['inputs']}for k,n in graph.items()}
        if not group.get('merge_graph') or clean(history['prompt'][2])!=clean(group['merge_graph']):
            raise ValueError('Reserved merge graph differs from completed history')
        sources=group.get('merge_sources',[])
        if len(sources)!=6:raise ValueError('Missing six reserved merge sources')
        for source in sources:
            path=(self.root/source['relative']).resolve()
            if not path.is_relative_to(self.root.resolve()) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:
                raise ValueError('Reserved merge source changed')
        files=history.get('outputs',{}).get('8',{}).get('images',[])
        if len(files)!=1 or files[0].get('type')!='output':raise ValueError('Missing unique merge output')
        ref=files[0];path=(self.root/ref.get('subfolder','')/ref['filename']).resolve()
        if not path.is_relative_to(self.root.resolve()) or not path.is_file():raise ValueError('Merge output file missing')
        return ref

    async def complete(self, project, group_id, observe_only=False):
        # Six-card merging is exclusively manual. Never dispatch an old automatic group.
        return
        lock = self.locks.setdefault((project, group_id), asyncio.Lock())
        async with lock:
            if not self.selected(project,group_id):return
            s = self.read(project)['_native_merge']; g = s['groups'][group_id]
            if g['merge_status'] in ('SUBMITTED','ERROR','FAILED'):
                pid=g.get('merge_prompt_id');h=self.history(pid) if pid else None
                if h:
                    try:
                        output=self.completed_merge_output(g,pid,h)
                        self.merge_transition(project,group_id,pid,reconcile_error=True,merge_status='SUCCESS',merge_output=output,enqueue_phase='FINISHED')
                    except (ValueError,KeyError,OSError) as ex:
                        self.update(project,lambda st:st['groups'][group_id].update(merge_status='FAILED',merge_error='Exact merge validation failed: '+str(ex)))
                elif g['merge_status'] in ('ERROR','FAILED') or observe_only:
                    if g['merge_status']=='FAILED' and not pid and not g.get('enqueue_phase'):
                        # 派发前失败（典型：重跑落盘瞬间的回执竞态触发 inspect 守卫）。
                        # 复位为等待，下一段完成触发 complete() 时按新回执自动重评。
                        self.update(project,lambda st:st['groups'][group_id].update(merge_status='WAITING_6_OF_6',merge_error=None))
                    return
                elif self.queue_dedup_enabled and self.queue is not None and pid and pid not in self.executing_merge_ids and not any(item[1]==pid for item in self.queue()):
                    if g.get('enqueue_phase','INTENT') in ('INTENT','ENQUEUED'):
                        try:await self.resume_unstarted(project,group_id,g)
                        except Exception as ex:self.update(project,lambda st:st['groups'][group_id].update(merge_status='FAILED',merge_error=str(ex)))
                    elif g.get('enqueue_phase')=='STARTED':
                        self.update(project,lambda st:st['groups'][group_id].update(merge_status='FAILED',merge_error='Started merge lost on server restart; no automatic GPU retry'))
                return # Reuse an unstarted durable job ID; never replay a started job.
            if observe_only:return
            if not ((s['auto_merge_enabled'] and g['eligible']) or g.get('manual_requested')) or g['merge_status'] != 'WAITING_6_OF_6': return
            if s.get('active_group_id')!=group_id:return
            try:
                # Acceptance is independently durable. A delayed notification is WAITING,
                # never a terminal merge error. Reconciliation uses exact history only.
                for i in range(6):self.reconcile(project,i)
                receipts=self.read(project)
                # 2026-10-25: the project's latest verified SUCCESS receipts are the
                # authority for the current chain. A group that observed only part of
                # it (single-segment rerolls, then a continuous run from a later segment)
                # adopts each slot's accepted receipt instead of waiting forever.
                ids={}
                for i in range(6):
                    r=receipts.get(str(i),{})
                    if r.get('status')!='SUCCESS' or not r.get('prompt_id') or r.get('group_id') not in (None,group_id):return
                    ids[str(i)]=r['prompt_id']
                if len(set(ids.values()))!=6:return
                stale=self.stale_continuation(receipts,ids)
                reason=None if stale is None else f'S{stale+1} 早于 S{stale} 生成，接的是旧的 S{stale}；从 S{stale+1} 起重新生成完成后自动合并'
                if g.get('merge_wait_reason')!=reason:
                    self.update(project,lambda st:st['groups'][group_id].update(merge_wait_reason=reason))
                if stale is not None:return
                if ids!=g.get('prompt_ids'):
                    self.update(project,lambda st:st['groups'][group_id].update(prompt_ids=dict(ids),prompt_ids_adopted_from_receipts=True))
                template = json.loads(self.template.read_text(encoding='utf-8-sig'))
                graph = template['output']
                assert len(graph) == 8 and [graph[str(i)]['class_type'] for i in range(1,9)] == ['LoadVideo']*6 + ['ConcatenateVideo','SaveVideo']
                sources=[]
                for i in range(6):
                    self.inspect(project, i)
                    receipt=receipts[str(i)]
                    h = self.history(ids[str(i)])
                    if h:
                        if h['status']['status_str'] != 'success' or h['status']['completed'] is not True: return
                        native = [n for n in h['prompt'][2].values() if n['class_type']=='H3ContinuationSave' and n['inputs'].get('enabled') is True]
                        source_project=receipt.get('project_id',project)
                        assert len(native)==1 and native[0]['inputs']['project_id']==source_project and native[0]['inputs']['segment_index']==i
                        assert h['prompt'][2]['961']['class_type']=='SaveVideo'
                        output = h['outputs']['961']
                        videos = [v for k in ('images','videos') for v in output.get(k,[]) if Path(v['filename']).suffix.lower() in ('.mp4','.webm','.mov','.mkv')]
                    else:
                        # Only a previously fully accepted, fingerprinted output survives volatile history loss.
                        ref=receipt.get('video_output_ref')
                        if not ref or ref.get('prompt_id')!=ids[str(i)] or not receipt.get('video_sha256'):
                            self.update(project,lambda s:s['groups'][group_id].update(
                                merge_error=f'S{i+1}: exact History unavailable and verified video receipt missing; merge blocked'))
                            return
                        videos=[ref]
                    assert len(videos)==1 and videos[0]['type']=='output'
                    # T022: when this segment's tail was repaired by its successor's run,
                    # the merged timeline must use the repaired replay, never the old tail.
                    tail_override=(receipt.get('tail12_prefix') or {})
                    accepted_ref=videos[0]
                    if tail_override.get('video_output_ref'):videos=[tail_override['video_output_ref']]
                    v=videos[0]; assert isinstance(v['subfolder'],str) and '/' not in v['filename'] and '\\' not in v['filename']
                    relative=(Path(v['subfolder'])/v['filename']).as_posix()
                    source=(self.root/relative).resolve(); assert source.is_relative_to(self.root.resolve()) and source.is_file()
                    if tail_override.get('video_output_ref'):
                        want=str(tail_override.get('video_sha256') or '').upper()
                        if not want or hashlib.sha256(source.read_bytes()).hexdigest().upper()!=want:
                            raise ValueError(f'S{i+1}: 尾12修复版成片SHA256不一致')
                        # 修复版是**整段**重放的像素，合并却是逐段首尾相接：只要两者帧数
                        # 不同，拼出来的时间线就会多出（或少掉）重复前缀帧。
                        accepted=(self.root/Path(accepted_ref['subfolder'])/accepted_ref['filename']).resolve()
                        a_frames=video_frame_count(accepted); r_frames=video_frame_count(source)
                        if a_frames is None or r_frames is None:
                            raise ValueError(f'S{i+1}: 无法读取帧数，不能确认尾12修复版与成片同长度')
                        if a_frames!=r_frames:
                            raise ValueError(f'S{i+1}: 尾12修复版帧数({r_frames})与本段成片({a_frames})不一致，合并会插入重复帧')
                        if tail_override.get('frames') not in (None,r_frames):
                            raise ValueError(f'S{i+1}: 尾12修复版帧数与回执记录不一致')
                    elif receipt.get('video_sha256'):
                        if hashlib.sha256(source.read_bytes()).hexdigest().upper()!=receipt['video_sha256'].upper():
                            raise ValueError(f'S{i+1}: accepted video SHA256 mismatch')
                    # Keep exact verified media provenance durable before volatile
                    # History disappears on restart. Never infer it from filenames.
                    if h:
                        digest=hashlib.sha256(source.read_bytes()).hexdigest()
                        with self.state_lock:
                            durable=self.read(project)
                            current=durable.get(str(i),{})
                            if current.get('status')!='SUCCESS' or current.get('prompt_id')!=ids[str(i)]:
                                raise ValueError('Segment receipt changed during merge validation')
                            current.update(video_output_ref={**v,'prompt_id':ids[str(i)]},video_sha256=digest,
                                           project_id=source_project)
                            path=self.path(project)
                            temporary=path.with_name(path.name+'.video-'+uuid.uuid4().hex)
                            try:
                                with temporary.open('wb') as handle:
                                    handle.write(json.dumps(durable,ensure_ascii=False,indent=2).encode('utf-8'))
                                    handle.flush();os.fsync(handle.fileno())
                                os.replace(temporary,path)
                            finally:
                                if temporary.exists():temporary.unlink()
                    assert graph['7']['inputs'][f'videos.video{i}']==[str(i+1),0] and graph['8']['inputs']['video']==['7',0]
                    graph[str(i+1)]['inputs']['file']=relative+' [output]'
                    sources.append({'relative':relative,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
                graph['8']['inputs']['filename_prefix']=f'H3_{group_id}_MERGED'
                result=await self.validate(graph)
                assert result[0] is True, result
                # Settings are re-read after every asynchronous gate, immediately before POST.
                latest=self.read(project)['_native_merge']; active=latest['groups'][group_id]
                if not ((latest['auto_merge_enabled'] and active['eligible']) or active.get('manual_requested')) or active['merge_status']!='WAITING_6_OF_6': return
                if active.get('prompt_ids')!=ids:return
                if not self.selected(project,group_id):return
                current=self.read(project)
                if any(current.get(str(i),{}).get('status')!='SUCCESS' or current[str(i)].get('prompt_id')!=ids[str(i)] for i in range(6)):return
                for i in range(6):self.inspect(project,i)
                reserved=str(uuid.uuid4()) if self.submit_reserved else None
                self.update(project, lambda s:s['groups'][group_id].update(merge_status='SUBMITTED',merge_prompt_id=reserved,merge_dispatch_epoch=time.time(),enqueue_phase='INTENT',merge_graph=graph,merge_sources=sources,manual_requested=False))
                if reserved:self.merge_jobs[reserved]=(project,group_id)
                response=await self.submit_reserved(graph,reserved) if self.submit_reserved else await self.submit(graph)
                if reserved and response.get('prompt_id')!=reserved:raise ValueError('Reserved merge prompt_id mismatch')
                assert response.get('prompt_id'), 'Ambiguous submission; do not retry'
                pid=response['prompt_id']
                current=self.read(project)['_native_merge']['groups'][group_id]
                if reserved and (current.get('merge_prompt_id')!=reserved or current.get('merge_status')!='SUBMITTED'):return
                self.update(project, lambda s:s['groups'][group_id].update(merge_prompt_id=pid))
                self.spawn(self.observe_merge(project,group_id,pid))
            except Exception as exc:
                logging.exception('Native Merge isolated failure: %s',exc)
                state=self.read(project)['_native_merge']['groups'][group_id]
                if state.get('merge_status')=='SUBMITTED' and state.get('merge_prompt_id'):
                    self.update(project,lambda s:s['groups'][group_id].update(merge_error=str(exc)))
                else:self.update(project,lambda s:s['groups'][group_id].update(merge_status='FAILED',merge_error=str(exc) or type(exc).__name__))

    async def resume_unstarted(self,project,group_id,group):
        # The local queue gate deduplicates overlapping HTTP requests with this same
        # durable ID. A restart may rebuild an unstarted job, never a started one.
        pid=group['merge_prompt_id'];graph=group.get('merge_graph');ids=group.get('prompt_ids',{})
        state=self.read(project);current=state['_native_merge']['groups'][group_id]
        if not state['_native_merge']['auto_merge_enabled'] or not current['eligible'] or state['_native_merge']['active_group_id']!=group_id:return
        if not graph or len(graph)!=8 or set(ids)!=set(map(str,range(6))):return
        for i in range(6):
            r=state.get(str(i),{})
            if r.get('status')!='SUCCESS' or r.get('prompt_id')!=ids[str(i)] or r.get('group_id') not in (None,group_id):return
            self.inspect(project,i)
        for source in group.get('merge_sources',[]):
            path=(self.root/source['relative']).resolve()
            if not path.is_relative_to(self.root.resolve()) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:raise ValueError('Durable merge source changed')
        if len(group.get('merge_sources',[]))!=6:return
        valid=await self.validate(graph)
        if not valid[0]:raise ValueError('Recovered official merge graph invalid')
        latest=self.read(project);g=latest['_native_merge']['groups'][group_id]
        if not latest['_native_merge']['auto_merge_enabled'] or not g['eligible'] or g.get('merge_prompt_id')!=pid or g.get('prompt_ids')!=ids or g.get('enqueue_phase') not in ('INTENT','ENQUEUED'):return
        if any(latest.get(str(i),{}).get('status')!='SUCCESS' or latest[str(i)].get('prompt_id')!=ids[str(i)] for i in range(6)):return
        self.merge_jobs[pid]=(project,group_id)
        result=await self.submit_reserved(graph,pid)
        if result.get('prompt_id')!=pid:raise ValueError('Recovered merge ID mismatch')
        self.spawn(self.observe_merge(project,group_id,pid))

    def install_queue_gate(self,queue):
        # Only IDs owned by durable merge intents are intercepted. Original queue,
        # worker, model inputs and official eight-node graph remain unchanged.
        owner=getattr(queue,'h3_merge_gate_controller',None)
        if owner is self:return
        if owner is not None:raise ValueError('Another merge queue gate is already installed')
        queue.h3_merge_gate_controller=self
        original_put,original_get,original_done=queue.put,queue.get,queue.task_done
        executing_items={}
        registry=self.root/'h3_continuation'/'_prebake_stories.json'
        if registry.is_file():
            for b in json.loads(registry.read_text(encoding='utf-8')).values():
                for gid,g in self.read(b['project_id']).get('_native_merge',{}).get('groups',{}).items():
                    if g.get('merge_prompt_id'):self.merge_jobs[g['merge_prompt_id']]=(b['project_id'],gid)
        def put(item):
            owner=self.merge_jobs.get(item[1])
            if not owner:return original_put(item)
            project,gid=owner
            with self.state_lock,queue.mutex:
                g=self.read(project)['_native_merge']['groups'][gid]
                if g.get('merge_prompt_id')!=item[1] or g.get('merge_status')!='SUBMITTED':raise ValueError('STALE merge intent')
                if g.get('merge_graph')!=item[2]:raise ValueError('Merge intent graph changed')
                running,pending=queue.get_current_queue()
                if any(x[1]==item[1] for x in running+pending) or queue.get_history(prompt_id=item[1]):return
                if g.get('enqueue_phase') in ('STARTED','FINISHED'):return
                original_put(item)
                # Worker cannot acquire queue mutex until ENQUEUED is durable.
                self.update(project,lambda st:st['groups'][gid].update(enqueue_phase='ENQUEUED'))
        def get(*args,**kwargs):
            result=original_get(*args,**kwargs)
            if result:
                item,_=result;owner=self.merge_jobs.get(item[1])
                if owner:
                    project,gid=owner
                    # Outside queue mutex: preserve the state-lock -> queue-lock order.
                    # The worker cannot execute the returned job before this commit.
                    try:
                        with self.state_lock:
                            g=self.read(project)['_native_merge']['groups'][gid]
                            if g.get('merge_prompt_id')!=item[1] or g.get('merge_status')!='SUBMITTED':raise ValueError('STALE queued merge')
                            if not self.selected(project,gid):raise ValueError('Queued merge belongs to a superseded execution')
                            self.update(project,lambda st:st['groups'][gid].update(enqueue_phase='STARTED'))
                            self.executing_merge_ids.add(item[1]);executing_items[result[1]]=item[1]
                    except Exception as ex:
                        logging.exception('Merge start blocked before official nodes execute')
                        status=queue.ExecutionStatus(status_str='error',completed=False,messages=[('execution_error',{'prompt_id':item[1],'exception_message':str(ex)})])
                        queue.task_done(result[1],{},status=status)
                        return None
            return result
        def task_done(item_id,*args,**kwargs):
            # Core publishes History before this exact worker ownership is released.
            result=original_done(item_id,*args,**kwargs)
            with self.state_lock:
                pid=executing_items.pop(item_id,None)
                if pid is not None:self.executing_merge_ids.discard(pid)
            owner=self.merge_jobs.get(pid) if pid is not None else None
            if owner:
                try:self.on_merge_finished(*owner)
                except Exception:logging.exception('Could not schedule exact merge completion reconciliation')
            return result
        queue.put,queue.get,queue.task_done=put,get,task_done;self.queue_dedup_enabled=True

    def merge_transition(self,project,group_id,pid,reconcile_error=False,**fields):
        def change(state):
            g=state['groups'][group_id]
            if g.get('merge_prompt_id')==pid and (g.get('merge_status')=='SUBMITTED' or reconcile_error and g.get('merge_status') in ('ERROR','FAILED')):
                if g.get('merge_status') in ('ERROR','FAILED'):
                    g.setdefault('merge_state_history',[]).append({'status':g.get('merge_status'),'reason':g.get('merge_error'),'reconciled_at':time.time(),'prompt_id':pid})
                g.update(fields)
                if fields.get('merge_status')=='SUCCESS':
                    g.pop('merge_error',None)
                    ref=fields['merge_output'];g['merged_file']='/'.join(filter(None,(ref.get('subfolder',''),ref['filename'])))
        self.update(project,change)

    async def manual_merge(self, project, group_id, confirm_lost=False):
        if not isinstance(confirm_lost, bool):
            raise ValueError('确认选项无效')
        lock = self.locks.setdefault((project, group_id), asyncio.Lock())
        async with lock:
            data = self.read(project)
            state = data.get('_native_merge', {})
            group = state.get('groups', {}).get(group_id)
            if not group or state.get('active_group_id') != group_id or not self.selected(project, group_id):
                raise ValueError('当前合并组不存在或已更换，请重新选择当前项目')
            ids = {}
            for i in range(6):
                receipt = data.get(str(i), {})
                if receipt.get('status') != 'SUCCESS' or not receipt.get('prompt_id'):
                    raise ValueError(f'缺少第 {i+1} 段已确认的成片')
                if receipt.get('group_id') not in (None, group_id):
                    raise ValueError(f'第 {i+1} 段不属于当前合并组，请重新生成')
                ids[str(i)] = receipt['prompt_id']
            if len(set(ids.values())) != 6:
                raise ValueError('六段回执重复，无法确认当前链')
            stale = self.stale_continuation(data, ids)
            if stale is not None:
                raise ValueError(f'第 {stale+1} 段承接的是旧的第 {stale} 段，请从第 {stale+1} 段重新生成')
            pid = group.get('merge_prompt_id')
            if pid:
                if self.queue is None or not self.queue_dedup_enabled:
                    raise ValueError('无法核实旧合并任务的队列状态，请稍后重试')
                if pid in self.executing_merge_ids or any(item[1] == pid for item in self.queue()):
                    raise ValueError('旧合并任务仍在排队或运行，不能重复提交')
                history = self.history(pid)
                if not history:
                    if not confirm_lost:
                        raise ValueError('旧合并任务状态不可确认；确认其已失效后可选择重新合并')
                    logging.warning('Manual merge: user confirmed lost previous task project=%s group=%s prompt_id=%s', project, group_id, pid)
                elif group.get('merge_status') == 'SUCCESS':
                    self.completed_merge_output(group, pid, history)
                else:
                    info = history.get('status', {})
                    events = [x[0] for x in info.get('messages', []) if x]
                    if info.get('status_str') != 'error' or not any(x in events for x in ('execution_error', 'execution_interrupted')):
                        raise ValueError('旧合并任务结果尚未确认，不能重复提交')
            elif group.get('merge_status') == 'SUBMITTED':
                raise ValueError('旧合并任务编号缺失，状态不可确认，不能重复提交')
            def reset(s):
                g = s['groups'][group_id]
                g.setdefault('merge_state_history', []).append({**{k: copy.deepcopy(g.get(k)) for k in ('merge_status','merge_prompt_id','merge_output','merged_file','merge_error','merge_graph','merge_sources')}, 'manual_confirm_lost': bool(pid and confirm_lost), 'at': time.time()})
                g.update(merge_status='WAITING_6_OF_6', merge_prompt_id=None, merge_output=None, merged_file=None, merge_error=None, merge_wait_reason=None, manual_requested=True)
                for key in ('enqueue_phase','merge_graph','merge_sources','merge_dispatch_epoch'):
                    g.pop(key, None)
            self.update(project, reset)
        await self.complete(project, group_id)
        result = self.state(project)
        if result.get('merge_status') == 'WAITING_6_OF_6':
            self.update(project, lambda s: s['groups'][group_id].update(manual_requested=False))
        if result.get('merge_status') == 'WAITING_6_OF_6' and not result.get('merge_wait_reason') and not result.get('merge_error'):
            result['merge_error'] = '六段成片或回执尚未完全通过校验，请检查各段后重试'
        return result

    async def retry(self, project, group_id):
        # An explicit user retry must never duplicate an ambiguous running job.
        lock=self.locks.setdefault((project,group_id),asyncio.Lock())
        async with lock:
            state=self.read(project).get('_native_merge',{})
            group=state.get('groups',{}).get(group_id,{})
            if state.get('active_group_id')!=group_id or not state.get('auto_merge_enabled') or not group.get('eligible'):
                raise ValueError('Merge retry group is not active and eligible')
            status=group.get('merge_status')
            if status in ('SUCCESS','ERROR','FAILED'):
                pid=group.get('merge_prompt_id')
                if pid and self.queue is not None and any(item[1]==pid for item in self.queue()):
                    raise ValueError('Merge job is still queued or running')
                h=self.history(pid) if pid else None
                if pid and not h:raise ValueError('Previous merge outcome is unconfirmed; retry refused')
                if status=='SUCCESS':
                    if not h:raise ValueError('Successful merge history is unavailable')
                    self.completed_merge_output(group,pid,h)
                elif h:
                    info=h.get('status',{});events=[x[0] for x in info.get('messages',[]) if x]
                    if info.get('status_str')!='error' or not any(x in events for x in ('execution_error','execution_interrupted')):
                        raise ValueError('Previous merge is not a confirmed failure; retry refused')
                def reset(s):
                    g=s['groups'][group_id]
                    g.setdefault('merge_state_history',[]).append({k:copy.deepcopy(g.get(k)) for k in ('merge_status','merge_prompt_id','merge_output','merged_file','merge_error','merge_graph','merge_sources')})
                    g.update(merge_status='WAITING_6_OF_6',merge_prompt_id=None,merge_output=None,merged_file=None,merge_error=None)
                    for key in ('enqueue_phase','merge_graph','merge_sources','merge_dispatch_epoch'):g.pop(key,None)
                self.update(project,reset)
            elif status!='WAITING_6_OF_6':
                raise ValueError('Merge is not eligible for retry')
        self.spawn(self.complete(project,group_id))
        return self.state(project)

    async def observe_merge(self, project, group_id, pid):
        try:
            for _ in range(1800):
                state=self.read(project)['_native_merge']['groups'][group_id]
                if state.get('merge_prompt_id')!=pid or state.get('merge_status')!='SUBMITTED':return
                await self.complete(project,group_id,observe_only=True)
                if self.state(project)['merge_status']!='SUBMITTED':return
                await asyncio.sleep(2)
            logging.warning('Merge observation window expired; exact job remains unconfirmed: %s',pid)
        except Exception:
            # Observation failure is not worker failure; later exact-state polling reconciles it.
            logging.exception('Merge observation interrupted; preserving submitted job %s',pid)

    def on_prompt(self, data):
        # Official extension hook. Never mutate generation graph, inputs, or server-minted ids.
        try:
            graph=data.get('prompt',{})
            # Managed attempts are registered durably before submission; the backend
            # attempt watchdog performs exact history/receipt coordination after refresh.
            if any(n.get('class_type') in ('H3ConditioningLoad','H3AttemptGuard') and n.get('inputs',{}).get('execution_json') for n in graph.values()):return data
            native=[n for n in graph.values() if n.get('class_type')=='H3ContinuationSave' and n['inputs'].get('enabled') is True]
            if len(native)!=1: return data
            project=native[0]['inputs']['project_id']; index=int(native[0]['inputs']['segment_index'])
            s=self.read(project).get('_native_merge',{}); gid=s.get('active_group_id'); g=s.get('groups',{}).get(gid)
            if not g or g['merge_status'] not in ('WAITING_6_OF_6','DISABLED') or not 0<=index<6: return data
            token=str(uuid.uuid4())
            data['extra_data']={**data.get('extra_data',{}),'h3_native_merge_receipt':token}
            self.spawn(self.observe_submission(project,gid,index,token))
        except Exception: logging.exception('Native Merge submission observation skipped')
        return data

    async def observe_submission(self, project, group_id, index, token):
        # Runs inside existing 8197 control process, independent of tabs or Agents.
        try:
            pid=None
            for _ in range(100):
                candidates=list(self.queue())+[h['prompt'] for h in self.history(None).values()]
                match=[p for p in candidates if p[3].get('h3_native_merge_receipt')==token]
                if match: pid=match[0][1]; break
                await asyncio.sleep(.1)
            if not pid: return  # Invalid/rejected generation prompt never qualifies.
            self.update(project,lambda s:s['groups'][group_id]['prompt_ids'].update({str(index):pid}))
            for _ in range(7200):
                h=self.history(pid)
                if h:
                    if h['status']['status_str']!='success' or h['status']['completed'] is not True:
                        self.update(project,lambda s:s['groups'][group_id].update(last_segment_failure=pid))
                        return
                    await self.complete(project,group_id)
                    return
                await asyncio.sleep(2)
        except Exception: logging.exception('Native Merge observation isolated from generation')


def build_history_index(root, port=None, instance_id=None):
    """Index prompt_id -> (snapshot path, mtime_ns) over this instance's History snapshots.

    The instance manager writes snapshot-*.json only on a controlled stop, so one scan at
    startup (plugin registration runs before the server listens) covers the whole process
    lifetime. Snapshots are read newest first and the first holder of an id wins. Only
    snapshots whose instance id, port and output directory all match are indexed; any
    snapshot that cannot be read is returned in `damaged` with its mtime.
    """
    if port is None:
        from comfy.cli_args import args
        port=args.port
    if instance_id is None:
        instance_id=os.environ.get('H3_INSTANCE_ID')
    instances=Path(root).resolve().parent.parent/'instances'
    snapshots=[]
    if instances.is_dir():
        for path in instances.glob('*/snapshot-*.json'):
            try:snapshots.append((path,path.stat().st_mtime_ns))
            except OSError:continue
    snapshots.sort(key=lambda item:item[1],reverse=True)
    index,damaged={},[]
    output=os.path.normcase(os.path.abspath(root))
    for path,mtime in snapshots:
        try:
            payload=json.loads(path.read_text(encoding='utf-8'))
            instance=payload.get('instance',{})
            if int(instance.get('port',-1))!=port:continue
            if os.path.normcase(os.path.abspath(instance.get('dirs',{}).get('output','')))!=output:continue
            if instance_id and instance.get('id') not in (None,instance_id):continue
            for prompt_id in payload.get('history') or {}:
                index.setdefault(prompt_id,(path,mtime))
        except (OSError,ValueError,TypeError,AttributeError):
            damaged.append((path,mtime))
    if damaged:
        logging.warning('H3 history index: %d unreadable snapshot(s): %s',len(damaged),', '.join(str(p) for p,_ in damaged))
    logging.info('H3 history index: %d prompt ids from %d snapshot(s)',len(index),len(snapshots))
    return index,damaged


def make_history_lookup(live_history, current_queue, index, damaged):
    """Exact history for a prompt id: live History, then the startup snapshot index.

    Never rescans snapshots. Results (hits and misses) are cached for the process.
    """
    archived={}
    def exact_history(prompt_id):
        live=live_history(prompt_id)
        if live:return live
        if prompt_id in archived:return archived[prompt_id]
        # A prompt still queued or running has no history yet; it is never in a snapshot.
        if any(item[1]==prompt_id for item in current_queue()):return None
        hit=index.get(prompt_id)
        # A newer unreadable snapshot could hold the final state of this id: report
        # "cannot confirm" instead of an older record or "not found".
        if damaged and (hit is None or any(mtime>hit[1] for _,mtime in damaged)):
            raise RuntimeError('历史快照损坏，无法确认任务 %s 的状态：%s'%(prompt_id,', '.join(str(p) for p,_ in damaged)))
        entry=None
        if hit:
            entry=(json.loads(hit[0].read_text(encoding='utf-8')).get('history') or {}).get(prompt_id)
        archived[prompt_id]=entry
        return entry
    return exact_history


def register(server):
    import folder_paths
    import execution
    from aiohttp import web, ClientSession
    from .six_resume import inspect_segment
    root=folder_paths.get_output_directory()
    exact_history=make_history_lookup(
        lambda prompt_id:server.prompt_queue.get_history(prompt_id=prompt_id).get(prompt_id),
        lambda:sum(server.prompt_queue.get_current_queue(),[]),
        *build_history_index(root))
    async def submit(graph):
        async with ClientSession(trust_env=False) as session:
            async with session.post(f'http://127.0.0.1:{server.port}/prompt',json={'prompt':graph,'client_id':'h3-native-auto'}) as r:
                r.raise_for_status(); return await r.json()
    async def submit_reserved(graph,pid):
        async with ClientSession(trust_env=False) as session:
            async with session.post(f'http://127.0.0.1:{server.port}/prompt',json={'prompt':graph,'prompt_id':pid,'client_id':'h3-native-auto'}) as r:
                r.raise_for_status();return await r.json()
    async def validate(graph): return await execution.validate_prompt('native-auto-preflight',graph,None)
    from .six_resume import FILE_STATE_LOCK
    controller=NativeMergeControl(root,Path(__file__).parent/'web/h3_native_merge_template.json',
        lambda pid: exact_history(pid) if pid else server.prompt_queue.get_history(max_items=8),
        submit,validate,lambda project,index:inspect_segment(root,project,index,require_accepted=False),
        lambda:sum(server.prompt_queue.get_current_queue(),[]),state_lock=FILE_STATE_LOCK)
    controller.install_queue_gate(server.prompt_queue)
    controller.submit_reserved=submit_reserved
    controller.reconcile=lambda project,index:getattr(server,'h3_prebake_recover',lambda p,i:None)(project,index)
    controller.notify=lambda project:server.send_sync('h3_native_merge_state',{'project_id':project,**controller.state(project)})
    controller.on_merge_finished=lambda project,group_id:server.loop.call_soon_threadsafe(lambda:controller.spawn(controller.complete(project,group_id,observe_only=True)))
    @server.routes.get('/h3/six/native-merge')
    async def get_state(request):
        try:return web.json_response(controller.state(request.query['project_id']))
        except Exception as e:return web.json_response({'error':str(e)},status=400)
    from .request_guard import reject
    @server.routes.post('/h3/six/native-merge')
    async def set_state(request):
        blocked = reject(request)
        if blocked: return blocked
        try:
            d=await request.json();p=d['project_id']
            if d['action']=='settings':result=controller.settings(p,d['auto_merge_enabled'])
            elif d['action']=='begin':result=await controller.begin_validated(p,d.get('graph'),d.get('group_id'))
            elif d['action']=='reconcile':
                state=controller.read(p).get('_native_merge',{});group_id=d.get('group_id')
                if not group_id or state.get('active_group_id')!=group_id:raise ValueError('Merge reconciliation group is not active')
                await controller.complete(p,group_id,observe_only=True);result=controller.state(p)
            elif d['action']=='manual':
                result=await controller.manual_merge(p,d.get('group_id'),d.get('confirm_lost',False))
            elif d['action']=='retry':
                state=controller.read(p).get('_native_merge',{});group_id=d.get('group_id')
                group=state.get('groups',{}).get(group_id,{})
                if not group_id or state.get('active_group_id')!=group_id:raise ValueError('Merge retry group is not the active group')
                result=await controller.retry(p,group_id)
            else:raise ValueError('Unknown action')
            return web.json_response(result)
        except Exception as e:return web.json_response({'error':str(e)},status=400)
    server.add_on_prompt_handler(controller.on_prompt)
    return controller

