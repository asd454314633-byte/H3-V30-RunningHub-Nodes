"""H3 latent drift anchor (experimental, isolated runtime only).

Version 2 records localized mid/fine-band anchor energies. Version 1 anchor
files and old graphs that only provide strength_hf remain supported.
"""
import json
import logging
import math
import os

from .drift_core import anchor_stats, apply_anchor, process_segment, write_anchor_file
from . import drift_core, auto_lineage
from .tail_detector import evaluate

CATEGORY = "H3/continuation"


def _root():
    import folder_paths
    return folder_paths.get_output_directory()


class H3LatentDriftAnchor:
    DESCRIPTION = "Anchor latent means and localized mid/fine spatial energies to segment 1."

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "latent": ("LATENT",),
                "project_id": ("STRING", {"default": ""}),
                "segment_index": ("INT", {"default": 0, "min": 0, "max": 99999}),
                "prefix_tokens": ("INT", {"default": 12, "min": 0, "max": 64}),
                "ramp_tokens": ("INT", {"default": 24, "min": 1, "max": 200}),
                "strength_mean": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05}),
                # Retained as the round-1 alias for strength_fine.
                "strength_hf": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05}),
                "enabled": ("BOOLEAN", {"default": False}),
            },
            # Optional inputs keep saved round-1 graphs valid; run() supplies defaults.
            "optional": {
                "strength_fine": ("FLOAT", {"default": 0.7, "min": 0.0, "max": 1.0, "step": 0.05}),
                "strength_mid": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.05}),
                "grid_h": ("INT", {"default": 6, "min": 1, "max": 66}),
                "grid_w": ("INT", {"default": 4, "min": 1, "max": 38}),
                "reanchor_segment": ("INT", {"default": -1, "min": -1, "max": 99999}),
                "auto_reanchor_tail": ("FLOAT", {"default": 0.01, "min": 0.0, "max": 1.0, "step": 0.001}),
            },
        }

    RETURN_TYPES = ("LATENT", "STRING")
    RETURN_NAMES = ("latent", "report")
    FUNCTION = "run"
    CATEGORY = CATEGORY

    @classmethod
    def IS_CHANGED(cls, auto_reanchor_tail=0.01, **kwargs):
        # Files and prior accepted segments can change independently of graph inputs.
        return float('nan') if float(auto_reanchor_tail)>0 else None

    def run(self, latent, project_id, segment_index, prefix_tokens, ramp_tokens,
            strength_mean, strength_hf, enabled, strength_fine=None,
            strength_mid=1.0, grid_h=6, grid_w=4, reanchor_segment=-1, auto_reanchor_tail=0.01):
        if not enabled or not project_id:
            return (latent, json.dumps({"active": False}))

        from comfy.nested_tensor import NestedTensor
        samples = latent["samples"]
        video, audio = list(samples.unbind())
        d = os.path.join(_root(), "h3_continuation", project_id)
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, "drift_anchor.json")
        v = video.float()
        fine_strength = float(strength_hf if strength_fine is None else strength_fine)
        grid_h, grid_w = int(grid_h), int(grid_w)
        threshold=float(auto_reanchor_tail)
        if not math.isfinite(threshold) or not 0<=threshold<=1:raise ValueError('invalid auto reanchor threshold')
        automatic=threshold>0 and int(reanchor_segment)<0
        def prompt_id():
            from comfy_execution.utils import get_executing_context
            context=get_executing_context()
            if not context or not context.prompt_id:raise ValueError('automatic anchor requires executing prompt ID')
            return str(context.prompt_id)

        if int(segment_index) == 0:
            stats = anchor_stats(v, grid_h=grid_h, grid_w=grid_w)
            write_anchor_file(path, stats)
            if automatic:auto_lineage.write_decision(d,0,prompt_id(),[],video,False,None)
            return (latent, json.dumps({"active": True, "mode": "record_anchor", "version": 2,
                                        "path": path, "window": stats["window"],
                                        "grid_h": grid_h, "grid_w": grid_w}))

        if not os.path.isfile(path):
            return (latent, json.dumps({"active": False,
                                        "reason": "no anchor recorded for this project (segment 1 not run with this node)"}))
        with open(path, encoding="utf-8") as f:
            ref = json.load(f)
        tail_result={'status':'disabled','trigger':False}
        if automatic and (int(ref.get('version',1))<2 or 'mid_energy' not in ref or 'fine_energy' not in ref):
            # Legacy v1 lacks the grid needed for detection; preserve its old path.
            automatic=False;tail_result={'status':'unsupported_v1','trigger':None}
            logging.warning('H3 drift auto-reanchor unavailable for legacy v1 anchor')
        ancestors=None
        if automatic:
            ref,source,ancestors=auto_lineage.resolve(d,int(segment_index),ref)
            tail_result=evaluate(drift_core,v,ref,int(prefix_tokens),threshold)
            if tail_result['trigger'] is None:
                raise ValueError('automatic anchor cannot assess this latent: '+tail_result['status'])
            logging.info('H3 drift auto-reanchor segment=%s p_mid=%.6f p_fine=%.6f trigger=%s source=%s',
                         segment_index,tail_result['p_mid'],tail_result['p_fine'],tail_result['trigger'],source)
            if tail_result['trigger']:
                stats=anchor_stats(v,grid_h=grid_h,grid_w=grid_w)
                auto_lineage.write_decision(d,int(segment_index),prompt_id(),ancestors,video,True,stats)
                return latent,json.dumps({'active':True,'mode':'record_auto_reanchor','segment_index':int(segment_index),
                                          'correction_applied':False,'tail':tail_result,'anchor_source_segment':source})
        reanchor_segment = int(reanchor_segment)
        if reanchor_segment >= 0 and int(segment_index) == reanchor_segment:
            stats = anchor_stats(v, grid_h=grid_h, grid_w=grid_w)
            reanchor_path = os.path.join(d, f"drift_anchor_seg{reanchor_segment + 1}.json")
            write_anchor_file(reanchor_path, stats)
            return (latent, json.dumps({
                "active": True, "mode": "record_reanchor", "version": 2,
                "segment_index": int(segment_index), "path": reanchor_path,
                "window": stats["window"], "grid_h": grid_h, "grid_w": grid_w,
                "correction_applied": False,
            }))

        reanchor_ref = None
        if reanchor_segment >= 0 and int(segment_index) > reanchor_segment:
            reanchor_path = os.path.join(d, f"drift_anchor_seg{reanchor_segment + 1}.json")
            if not os.path.isfile(reanchor_path):
                raise ValueError(f"reanchor anchor file is missing: {reanchor_path}")
            with open(reanchor_path, encoding="utf-8") as f:
                reanchor_ref = json.load(f)
        target = reanchor_ref if reanchor_ref is not None else ref
        if target.get("shape", [None, video.shape[1]])[1] != video.shape[1]:
            raise ValueError("drift anchor channel count mismatch")
        fixed, rep, stats, mode = process_segment(
            v, ref, int(segment_index), reanchor_segment=reanchor_segment,
            reanchor_anchor=reanchor_ref, prefix=int(prefix_tokens),
            ramp_tokens=int(ramp_tokens), strength_mean=float(strength_mean),
            strength_hf=float(strength_hf), strength_fine=fine_strength,
            strength_mid=float(strength_mid), grid_h=grid_h, grid_w=grid_w,
        )
        out = dict(latent)
        fixed_video=fixed.to(video.dtype)
        out["samples"] = NestedTensor((fixed_video, audio))
        if automatic:auto_lineage.write_decision(d,int(segment_index),prompt_id(),ancestors,fixed_video,False,None)
        return (out, json.dumps({
            "active": True, "mode": mode, "version": target.get("version", 1),
            "segment_index": int(segment_index), "prefix_tokens": int(prefix_tokens),
            "ramp_tokens": int(ramp_tokens), "strength_mean": float(strength_mean),
            "strength_fine": fine_strength, "strength_hf_alias": float(strength_hf),
            "strength_mid": float(strength_mid), "grid_h": grid_h, "grid_w": grid_w,
            "corrected_tokens": len(rep), "correction_applied": mode != "record_reanchor",
            "tail": tail_result,
        }))


NODE_CLASS_MAPPINGS = {"H3LatentDriftAnchor": H3LatentDriftAnchor}
NODE_DISPLAY_NAME_MAPPINGS = {"H3LatentDriftAnchor": "H3 连续 漂移锚定（实验）"}

