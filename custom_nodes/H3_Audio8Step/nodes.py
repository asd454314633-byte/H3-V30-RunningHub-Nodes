"""Candidate-only reference validation. Never mutate PCM, latent, model or masks."""
import logging
import re
import torch

_MIN_REFERENCE_SECONDS = 2.0
_MAX_REFERENCE_SECONDS = 15.0
_MAX_TOTAL_REFERENCE_SECONDS = 15.0


def _fit_reference_audio(audio, key, target_seconds):
    """Return an H3-compatible audio view without modifying the uploaded file.

    Long inputs are cropped from the head. Short standalone voice references
    receive trailing digital silence so changing a valid audio file never
    requires a manual trim in the UI.
    """
    waveform = audio['waveform']
    sample_rate = int(audio['sample_rate'])
    target_samples = max(1, int(target_seconds * sample_rate))
    source_samples = waveform.shape[-1]
    if source_samples == target_samples:
        return audio
    if source_samples > target_samples:
        fitted = waveform[..., :target_samples]
    else:
        fitted = torch.nn.functional.pad(waveform, (0, target_samples - source_samples))
    result = dict(audio)
    result['waveform'] = fitted
    logging.info(
        '[H3Audio8ReferencePreflight] auto-fit %s: %.4f -> %.4f seconds; uploaded file unchanged',
        key, source_samples / sample_rate, target_samples / sample_rate,
    )
    return result


def _reference_targets(entries):
    """Fit standalone references to 2..15 s and all enabled audio to <=15 s.

    If several valid references exceed the combined model budget, preserve a
    minimum of 2 s for each standalone voice reference and allocate remaining
    time proportionally to each clip's duration above that minimum.
    """
    targets = []
    for key, audio, seconds in entries:
        minimum = 0.0 if key == 'soundtrack' else _MIN_REFERENCE_SECONDS
        targets.append(min(_MAX_REFERENCE_SECONDS, max(minimum, seconds)))
    total = sum(targets)
    if total <= _MAX_TOTAL_REFERENCE_SECONDS + 1e-9:
        return targets
    floors = [0.0 if key == 'soundtrack' else _MIN_REFERENCE_SECONDS for key, _, _ in entries]
    excess = [max(0.0, target - floor) for target, floor in zip(targets, floors)]
    excess_total = sum(excess)
    available = max(0.0, _MAX_TOTAL_REFERENCE_SECONDS - sum(floors))
    scale = available / excess_total if excess_total else 0.0
    return [floor + extra * scale for floor, extra in zip(floors, excess)]

class H3Audio8ReferencePreflight:
    CATEGORY='H3/8步音频参考'
    FUNCTION='check'
    RETURN_TYPES=('AUDIO','AUDIO','AUDIO','AUDIO','STRING')
    @classmethod
    def INPUT_TYPES(cls):
        return {'required':{'prompt':('STRING',{'forceInput':True}),
            **{k:('BOOLEAN',{'default':False}) for k in ['audio1_enabled','audio2_enabled','audio3_enabled','soundtrack_enabled']},
            'role3':('STRING',{'default':''})},
            'optional':{k:('AUDIO',{'lazy':True}) for k in ['audio1','audio2','audio3','soundtrack']}}
    def check_lazy_status(self,**kw):
        return [k for k in ['audio1','audio2','audio3','soundtrack'] if kw.get(k+'_enabled') and kw.get(k) is None]
    def check(self,prompt,audio1_enabled=False,audio2_enabled=False,audio3_enabled=False,soundtrack_enabled=False,role3='',**kw):
        values={};mapping={};ordinal=1;entries=[]
        for key,enabled in [('soundtrack',soundtrack_enabled),('audio1',audio1_enabled),('audio2',audio2_enabled),('audio3',audio3_enabled)]:
            if not enabled:continue
            a=kw.get(key)
            if a is None:raise ValueError('已启用的参考音频为空：'+key)
            w=a.get('waveform');sr=a.get('sample_rate')
            if not isinstance(w,torch.Tensor) or w.ndim!=3 or w.shape[0]!=1 or w.shape[1] not in (1,2) or w.shape[-1]==0 or not isinstance(sr,(int,float)) or sr<=0:
                raise ValueError('参考音频须为有效单条 mono/stereo：'+key)
            if not torch.isfinite(w).all():raise ValueError('参考音频包含 NaN/Inf：'+key)
            seconds=w.shape[-1]/sr
            entries.append((key,a,seconds))
        targets=_reference_targets(entries)
        for (key,a,seconds),target in zip(entries,targets):
            values[key]=_fit_reference_audio(a,key,target)
            if key!='soundtrack':mapping[int(key[-1])]=ordinal
            ordinal+=1
        if not values:return None,None,None,None,prompt
        if audio3_enabled and role3.strip():prompt+='\n<Audio 3> '+role3.strip()
        def remap(m):
            i=int(m.group(1))
            if i not in mapping:raise ValueError(f'提示词引用未开启音频 <Audio {i}>')
            return f'<Audio {mapping[i]}>'
        prompt=re.sub(r'<Audio\s+(\d+)>',remap,prompt,flags=re.I)
        if '<VideoSoundtrack>' in prompt:
            if not soundtrack_enabled:raise ValueError('视频音轨参考未启用')
            prompt=prompt.replace('<VideoSoundtrack>','<Audio 1>')
        return *(values.get('audio'+str(i)) for i in [1,2,3]),values.get('soundtrack'),prompt

NODE_CLASS_MAPPINGS={'H3Audio8ReferencePreflight':H3Audio8ReferencePreflight}
