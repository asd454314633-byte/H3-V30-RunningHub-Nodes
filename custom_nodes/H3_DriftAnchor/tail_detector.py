"""A171 CPU/GPU-compatible low-tail prototype, no persistence or graph effects."""
import numpy as np

def measure_tail(core, video, ref, prefix=12, cutoff=.4, epsilon=1e-6):
    if int(ref.get('version',1))<2 or 'mid_energy' not in ref or 'fine_energy' not in ref:
        return {'status':'unsupported_v1','p_mid':None,'p_fine':None}
    if video.shape[2]<=prefix:
        return {'status':'insufficient_tokens','p_mid':None,'p_fine':None}
    gh,gw=int(ref['grid_h']),int(ref['grid_w'])
    if video.shape[0]!=1: raise ValueError('tail detection currently requires batch size 1')
    if core._is_torch(video):
        import torch
        references={k:torch.as_tensor(ref[k+'_energy'],dtype=torch.float64,device=video.device) for k in ('mid','fine')}
        totals={k:torch.zeros((),dtype=torch.int64,device=video.device) for k in ('mid','fine')}
        counts={k:torch.zeros((),dtype=torch.int64,device=video.device) for k in ('mid','fine')}
        invalid={k:torch.zeros((),dtype=torch.int64,device=video.device) for k in ('mid','fine')}
        for t in range(prefix,video.shape[2]):
            _,mid,fine=core._bands(video[0,:,t]);k=t%core.CLASSES
            for key,x in (('mid',mid),('fine',fine)):
                cur=core._adaptive_mean_square(x,gh,gw).clamp_min(0).sqrt().to(torch.float64)
                target=references[key][k];valid=torch.isfinite(cur)&torch.isfinite(target)&(target>epsilon)
                invalid[key]+=(~valid).sum();counts[key]+=valid.sum()
                totals[key]+=((cur/target.clamp_min(epsilon)<cutoff)&valid).sum()
        totals={k:int(v.item()) for k,v in totals.items()};counts={k:int(v.item()) for k,v in counts.items()};invalid={k:int(v.item()) for k,v in invalid.items()}
        if any(invalid.values()) or not all(counts.values()):return {'status':'invalid_statistics','p_mid':None,'p_fine':None,'invalid':invalid}
        return {'status':'measured','p_mid':totals['mid']/counts['mid'],'p_fine':totals['fine']/counts['fine'],
                'low_counts':totals,'counts':counts}
    totals={'mid':0,'fine':0};counts={'mid':0,'fine':0};invalid={'mid':0,'fine':0}
    for t in range(prefix,video.shape[2]):
        _,mid,fine=core._bands(video[0,:,t]);k=t%core.CLASSES
        for key,x in (('mid',mid),('fine',fine)):
            cur=core._adaptive_mean_square(x,gh,gw)
            if core._is_torch(cur):cur=cur.clamp_min(0).sqrt().detach().cpu().numpy()
            else:cur=np.sqrt(np.maximum(cur,0))
            target=np.asarray(ref[key+'_energy'][k]);valid=np.isfinite(cur)&np.isfinite(target)&(target>epsilon)
            invalid[key]+=int((~valid).sum());counts[key]+=int(valid.sum())
            totals[key]+=int(np.count_nonzero(cur[valid]/target[valid] < cutoff))
    if any(invalid.values()) or not all(counts.values()):
        return {'status':'invalid_statistics','p_mid':None,'p_fine':None,'invalid':invalid}
    return {'status':'measured','p_mid':totals['mid']/counts['mid'],'p_fine':totals['fine']/counts['fine'],
            'low_counts':totals,'counts':counts}

def evaluate(core,video,ref,prefix=12,threshold=.01):
    if threshold==0:return {'status':'disabled','trigger':False}
    if not 0<threshold<=1:raise ValueError('threshold must be 0 or (0,1]')
    result=measure_tail(core,video,ref,prefix)
    result['trigger']=max(result['p_mid'],result['p_fine'])>threshold if result['status']=='measured' else None
    return result
