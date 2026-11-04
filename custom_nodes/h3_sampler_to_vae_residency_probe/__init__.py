"""CANDIDATE-ONLY PASSIVE SHIM (candidate A, 2026-11-03) - NOT the production probe.

Derived from 8207 runtime h3_sampler_to_vae_residency_probe/__init__.py
(original SHA256 c7a191db899dedfd79568908e5c9b8e1b03904d9d14790934b6d813e2a3d96fe).

Retained, byte-faithful read-only logic: patch_snapshot(), model_snapshot().
Removed on purpose (candidate A "no global hooks" contract, per
V30_CLOUD_CANDIDATE_BUILD_ORDER_20261103.md P0-3):
  - import-time replacement of mm.load_models_gpu and MiniMaxH3VideoVAE.decode
  - sys.setprofile observation state machine (ACTIVE/observe_safe/snapshot)
  - the H3SamplerToVAEResidencyProbe node class (V30 does not reference it)

h3_partial_diffusion_evict.audit_module() contract satisfied: this module lives
at the exact sibling path it probes for, is present in sys.modules with this
__file__, and exposes model_snapshot. All fail-closed assertions inside
h3_partial_diffusion_evict remain active and untouched.
"""

import folder_paths
import importlib.util
import json
import logging
import os
import sys
import time
from pathlib import Path
from types import SimpleNamespace

import torch
import comfy.model_management as mm
from comfy.ldm.minimax.vae import MiniMaxH3VideoVAE

# shared read-only helpers still come from the (A1-patched) sibling probe
_spec = importlib.util.spec_from_file_location('h3_te_snapshot_shared', Path(__file__).parent.parent / 'h3_te_residency_probe' / '__init__.py')
shared = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(shared)


def patch_snapshot(patcher,model):
    errors=[]
    tensors={}
    adapters=set()
    def walk(value):
        if isinstance(value,torch.Tensor):
            tensors[id(value)]=value
        elif isinstance(value,dict):
            for v in value.values():walk(v)
        elif isinstance(value,(list,tuple)):
            for v in value:walk(v)
        elif type(value).__module__.startswith('comfy.weight_adapter') and id(value) not in adapters:
            adapters.add(id(value));walk(value.weights)
    walk(patcher.patches)
    raw_ids=set(tensors)
    prepared_count=0
    for module in model.modules():
        for key in ('weight_lowvram_function','bias_lowvram_function'):
            fn=module.__dict__.get(key)
            if fn is not None and getattr(fn,'prepared_patches',None) is not None:
                prepared_count+=1;walk(fn.prepared_patches)
    by_device={}
    logical=0
    for ident,t in tensors.items():
        try:
            size=int(t.numel())*int(t.element_size())
            by_device.setdefault(str(t.device),[]).append((int(t.data_ptr()),int(t.data_ptr())+size))
            if ident in raw_ids:logical+=size
        except Exception as e:errors.append(str(e))
    states={id(s):s for s in getattr(model,'dynamic_pins',{}).values()}
    pin_bytes=0;host_bytes=0;seen=set()
    for state in states.values():
        for key in ('patches','patches-loaded'):
            if key in state and id(state[key][0]) not in seen:
                host,_,_,pinned,*_=state[key]
                seen.add(id(host));pin_bytes+=int(pinned[0]);host_bytes+=int(host.size)
    return {'PDD_PATCH_COUNT':len(patcher.patches),'PDD_PATCH_TENSOR_COUNT':len(raw_ids),
            'PDD_PATCH_TOTAL_GIB':logical/shared.GIB if not errors else 'UNPROVEN',
            'PDD_PATCH_TOTAL_SCOPE':'logical bytes of original patch tensors; shared tensor identities deduplicated',
            'PDD_PATCH_RUNTIME_TENSOR_GIB_BY_DEVICE':{k:shared._union_bytes(v)/shared.GIB for k,v in by_device.items()},
            'PDD_PATCH_DEVICE':sorted(by_device),
            'PDD_PATCH_PINNED_GIB':pin_bytes/shared.GIB,
            'PDD_PATCH_HOSTBUFFER_GIB':host_bytes/shared.GIB,
            'PDD_PATCH_PIN_SCOPE':'H3 dynamic patches/patches-loaded registered counters; included in H3 residency, not additional',
            'PDD_PREPARED_PATCH_MODULE_COUNT':prepared_count,
            'PDD_TRANSFORMED_STATUS':'prepared copies present' if prepared_count else 'no prepared copies attached at snapshot; earlier transformations UNPROVEN',
            'PDD_ATTACHED_TO_H3_PATCHER':bool(patcher.patches),'PDD_ERRORS':errors}


def model_snapshot(entry):
    patcher=entry.model
    model=patcher.model
    errors=[]
    cls=type(model)
    result={'class':f'{cls.__module__}.{cls.__qualname__}','loaded_id':id(entry),'patcher_id':id(patcher),'model_id':id(model),
            'model_memory_gib':entry.model_memory()/shared.GIB,'loaded_size_gib':patcher.loaded_size()/shared.GIB,
            'device':str(patcher.current_loaded_device()),'is_dynamic':patcher.is_dynamic()}
    if (cls.__module__=='comfy.model_base' and cls.__name__=='MiniMaxH3') or (cls.__module__=='comfy.ldm.minimax.vae' and cls.__name__=='MiniMaxH3VideoVAE'):
        owners=list(model.modules())
        for module in tuple(owners):
            for key in ('weight_lowvram_function','bias_lowvram_function'):
                fn=module.__dict__.get(key)
                if fn is not None and hasattr(fn,'__dict__'):owners.append(fn)
        pins=shared._host_and_pins(SimpleNamespace(modules=lambda:iter(owners),dynamic_pins=getattr(model,'dynamic_pins',{})),errors)
        for k,v in list(pins.items()):
            if k.endswith('_BYTES') and isinstance(v,(int,float)):pins[k[:-6]+'_GIB']=v/shared.GIB
        result['pins']=pins
        state_stats={}
        for device,state in getattr(model,'dynamic_pins',{}).items():
            state_stats[str(device)]={key:{'hostbuffer_gib':int(state[key][0].size)/shared.GIB,'registered_gib':int(state[key][3][0])/shared.GIB,'stack_count':len(state[key][1])} for key in ('weights','weights-loaded','patches','patches-loaded') if key in state}
        result['dynamic_pin_subsets']=state_stats
        # Include the patch HostBuffers' registration counters; LowVramPatch is not a module.
        result['registered_all_subsets_gib']=sum(v['registered_gib'] for s in state_stats.values() for v in s.values())
        if cls.__name__=='MiniMaxH3':result['pdd']=patch_snapshot(patcher,model)
    result['errors']=errors
    return result


class H3SamplerToVAEResidencyProbe:
    """Passive stand-in (candidate A): the production observer hooks
    mm.load_models_gpu/VAE.decode; this build installs no hooks."""
    def observe(self, latent):
        logging.info('H3 sampler->VAE observer: passive candidate-A shim, not armed')
        return (latent,)


# Not a workflow node; empty mapping only avoids a false IMPORT FAILED.
NODE_CLASS_MAPPINGS = {}


