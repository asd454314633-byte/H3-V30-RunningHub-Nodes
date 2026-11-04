"""Isolated auto-anchor decision ledger; never trust an uncommitted or stale anchor."""
import hashlib,json,os,uuid
from pathlib import Path

def file_hash(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()

def tensor_hash(t):
    import torch
    t=t.detach().contiguous().cpu();h=hashlib.sha256()
    h.update((str(t.dtype)+':'+','.join(map(str,t.shape))+':').encode('ascii'))
    h.update(t.view(torch.uint8).numpy().tobytes());return h.hexdigest()

def index_snapshot(directory, before):
    directory=Path(directory);p=directory/'index.json'
    if before==0:return []
    if not p.is_file():raise ValueError('auto anchor requires predecessor index')
    index=json.loads(p.read_text(encoding='utf8'));entries={int(x['segment_index']):x for x in index.get('segments',[])}
    out=[]
    for i in range(before):
        e=entries.get(i);expected=f'seg_{i:05d}.safetensors'
        if not e or not e.get('prompt_id') or e.get('file')!=expected:raise ValueError('auto anchor predecessor index incomplete')
        path=directory/expected
        if not path.is_file():raise ValueError('auto anchor predecessor file missing')
        out.append({'segment':i,'prompt_id':e['prompt_id'],'file_sha256':file_hash(path)})
    return out

def resolve(directory,segment_index,base):
    """Return latest committed auto anchor; reject stale/uncommitted decisions."""
    from safetensors import safe_open
    directory=Path(directory);current=index_snapshot(directory,segment_index);target=base;source=0
    for i in range(segment_index):
        path=directory/f'drift_auto_decision_{i:05d}.json'
        if not path.is_file():continue
        decision=json.loads(path.read_text(encoding='utf8'))
        if decision.get('segment_index')!=i or decision.get('prompt_id')!=current[i]['prompt_id'] or decision.get('ancestors')!=current[:i]:
            raise ValueError('stale or uncommitted auto-anchor decision; rerun from changed segment')
        with safe_open(str(directory/f'seg_{i:05d}.safetensors'),framework='pt',device='cpu') as f:
            video=f.get_tensor('video')
        if tensor_hash(video)!=decision.get('output_video_sha256'):
            raise ValueError('auto-anchor saved latent differs; rerun affected segment')
        if decision.get('trigger'):
            name=decision.get('anchor_file','')
            if not isinstance(name,str) or not name.startswith(f'drift_auto_anchor_{i:05d}_') or Path(name).name!=name:
                raise ValueError('auto-anchor path invalid')
            anchor_path=directory/name
            if not anchor_path.is_file() or file_hash(anchor_path)!=decision.get('anchor_file_sha256'):
                raise ValueError('auto-anchor statistics missing or changed')
            target=json.loads(anchor_path.read_text(encoding='utf8'));source=i
    return target,source,current

def write_decision(directory,index,prompt_id,ancestors,video,trigger,anchor):
    directory=Path(directory)
    if not prompt_id:raise ValueError('auto anchor requires execution prompt ID')
    record={'segment_index':index,'prompt_id':prompt_id,'ancestors':ancestors,
            'output_video_sha256':tensor_hash(video),'trigger':bool(trigger)}
    if trigger:
        if not isinstance(anchor,dict):raise ValueError('missing auto-anchor statistics')
        anchor_path=directory/f'drift_auto_anchor_{index:05d}_{uuid.uuid4().hex}.json'
        with anchor_path.open('x',encoding='utf8') as f:
            json.dump(anchor,f);f.flush();os.fsync(f.fileno())
        record['anchor_file']=anchor_path.name;record['anchor_file_sha256']=file_hash(anchor_path)
    path=directory/f'drift_auto_decision_{index:05d}.json';tmp=path.with_name(path.name+'.tmp-'+uuid.uuid4().hex)
    try:
        with tmp.open('x',encoding='utf8') as f:json.dump(record,f);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if tmp.exists():tmp.unlink()
