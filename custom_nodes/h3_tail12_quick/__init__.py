"""H3 Tail12 quick — isolated tail refinement nodes for ComfyUI 0.42.1.

Flow (unchanged from the T018 experiment):
  H3Tail12LoadAccepted -> H3Tail12Extract -> sampler(low sigma tail)
                                          -> H3Tail12Splice(prev, refined)
                                          -> H3ContinuationPrepare.prev_latent

Video-only refinement: carries original audio unchanged.

T022 阶段2（方案A）：修复由该段自己的提交产出。
  * 子图挂在 H3ContinuationSave 之后，用**本段自己的** guider/noise/model 重绘本段最后
    12 个视频 token（与 E1 档案 prev_126/prev_129/prev_930 一致），因此不会与
    H3ContinuationPrepare 形成依赖环。
  * H3Tail12Commit 通过 store_path 直连存档节点，落盘后读回存档做内容级校验，再写
    ``seg_%05d_tail12.safetensors`` 与 ``seg_%05d_tail12.json``；已接受的 seg 只读不写。
  * 下一段只用 H3Tail12LoadAccepted 读取该修复版前缀（零采样），并由
    verify_prefix() / six_resume.tail12_prefix() 校验来源 SHA 与 39帧/65步几何。
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import uuid
from pathlib import Path

import torch
from safetensors.torch import load_file
from comfy.nested_tensor import NestedTensor

SCHEMA = "H3_TAIL12_V1"
PREFIX_TOKENS = 12
AUDIO_STEPS = 65


def _av(latent, label):
    samples = latent.get("samples")
    if not getattr(samples, "is_nested", False):
        raise ValueError(f"{label}: MiniMax H3 nested AV latent required")
    streams = list(samples.unbind())
    if len(streams) != 2:
        raise ValueError(f"{label}: expected video+audio, got {len(streams)}")
    return streams


# ---------------------------------------------------------------------------
# durable artefacts
# ---------------------------------------------------------------------------

def _root():
    import folder_paths
    return Path(folder_paths.get_output_directory())


def project_dir(project: str) -> Path:
    if not project or len(project) > 64 or any(not (c.isalnum() or c in "-_") for c in project):
        raise ValueError("项目名只能使用字母、数字、中文、横线和下划线（最多64字符）")
    return _root() / "h3_continuation" / project


def paths(project: str, index: int):
    directory = project_dir(project)
    stem = "seg_%05d" % int(index)
    return (directory / (stem + ".safetensors"),
            directory / (stem + "_tail12.safetensors"),
            directory / (stem + "_tail12.json"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def read_json(path: Path, default):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8")) if Path(path).is_file() else default
    except (OSError, ValueError):
        return default


def write_json_atomic(path: Path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp-" + uuid.uuid4().hex)
    try:
        with temporary.open("wb") as handle:
            handle.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def tail_shape_ok(video, audio) -> bool:
    """Same geometry the accepted 39 frame / 65 step prefix requires."""
    return (video.ndim == 5 and audio.ndim >= 4 and video.shape[2] >= PREFIX_TOKENS
            and audio.shape[-1] >= AUDIO_STEPS and (video.shape[2] - PREFIX_TOKENS) % 5 == 0)


def status(project: str, index: int):
    """Describe the durable repaired prefix for one accepted segment."""
    accepted, repaired, sidecar = paths(project, index)
    info = {"schema": SCHEMA, "project_id": project, "segment_index": int(index),
            "accepted": str(accepted), "accepted_exists": accepted.is_file(),
            "accepted_sha256": sha256_file(accepted) if accepted.is_file() else None,
            "repaired": str(repaired), "repaired_exists": repaired.is_file(),
            "sidecar": str(sidecar), "reusable": False, "reason": None}
    side = read_json(sidecar, {})
    if side:
        info["sidecar_data"] = {k: side.get(k) for k in
                                ("source_sha256", "repaired_sha256", "params", "created_at")}
    if not accepted.is_file():
        info["reason"] = "accepted latent missing"
        return info
    if not repaired.is_file() or side.get("schema") != SCHEMA:
        info["reason"] = "repaired prefix not built"
        return info
    if side.get("source_sha256") != info["accepted_sha256"]:
        info["reason"] = "accepted latent changed since the repair"
        return info
    if side.get("repaired_sha256") != sha256_file(repaired):
        info["reason"] = "repaired latent SHA256 mismatch"
        return info
    info["reusable"] = True
    info["reason"] = "repaired prefix matches the current accepted latent"
    return info


def verify_prefix(project: str, index: int, receipt: dict | None = None) -> dict:
    """Contract check for a segment whose successor consumed a repaired prefix.

    Returns {"present": False} when no repair exists (nothing to verify).
    Raises ValueError when a repair exists but no longer matches its source,
    the accepted receipt, or the 39/65 geometry.
    """
    accepted, repaired, sidecar = paths(project, index)
    side = read_json(sidecar, None)
    if not side or not repaired.is_file():
        return {"present": False}
    if side.get("schema") != SCHEMA:
        raise ValueError("尾12修复记录格式不受支持：S%d" % (index + 1))
    if not accepted.is_file():
        raise ValueError("尾12修复所依据的第%d段原始latent已缺失" % (index + 1))
    accepted_sha = sha256_file(accepted)
    if side.get("source_sha256") != accepted_sha:
        raise ValueError("尾12修复所依据的原始latent已被替换：S%d" % (index + 1))
    if receipt and receipt.get("latent_sha256") and \
            str(receipt["latent_sha256"]).upper() != accepted_sha:
        raise ValueError("尾12修复来源与第%d段已接受回执不一致" % (index + 1))
    if side.get("repaired_sha256") != sha256_file(repaired):
        raise ValueError("尾12修复版latent SHA256与记录不一致：S%d" % (index + 1))
    tensors = load_file(str(repaired), device="cpu")
    video, audio = tensors.get("video"), tensors.get("audio")
    if video is None or audio is None or not tail_shape_ok(video, audio):
        raise ValueError("尾12修复版latent不满足39帧/65音频步前缀条件：S%d" % (index + 1))
    return {"present": True, "source_sha256": accepted_sha,
            "repaired_sha256": side["repaired_sha256"], "params": side.get("params"),
            "audio_unchanged": side.get("audio_unchanged") is True}


# ---------------------------------------------------------------------------
# nodes
# ---------------------------------------------------------------------------

class H3Tail12LoadAccepted:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"s3_safetensors": ("STRING", {"default": ""})}}

    RETURN_TYPES = ("LATENT",)
    RETURN_NAMES = ("accepted_s3",)
    FUNCTION = "run"
    CATEGORY = "H3/tail12-quick"

    @classmethod
    def IS_CHANGED(cls, s3_safetensors):
        p = os.path.normpath(s3_safetensors.strip().strip('"'))
        if not os.path.isfile(p):
            return float("nan")
        st = os.stat(p)
        return (st.st_size, st.st_mtime_ns)

    def run(self, s3_safetensors):
        p = os.path.normpath(s3_safetensors.strip().strip('"'))
        if not os.path.isfile(p):
            raise FileNotFoundError(f"S3 latent not found: {p}")
        tensors = load_file(p, device="cpu")
        video, audio = tensors["video"], tensors["audio"]
        if video.ndim != 5 or audio.ndim != 4:
            raise ValueError(f"Unexpected AV shapes: video={tuple(video.shape)}, audio={tuple(audio.shape)}")
        return ({"samples": NestedTensor((video, audio))},)


class H3Tail12Extract:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"accepted_s3": ("LATENT",)}}

    RETURN_TYPES = ("LATENT",)
    RETURN_NAMES = ("tail12_to_refine",)
    FUNCTION = "run"
    CATEGORY = "H3/tail12-quick"

    def run(self, accepted_s3):
        video, audio = _av(accepted_s3, "extract")
        if video.shape[2] < PREFIX_TOKENS or audio.shape[-1] < AUDIO_STEPS:
            raise ValueError("Need >=12 video tokens and >=65 audio steps")
        if (video.shape[2] - PREFIX_TOKENS) % 5:
            raise ValueError(f"S3 temporal grid phase incompatible: {video.shape[2]} video tokens")
        vt = video[:, :, -PREFIX_TOKENS:].contiguous()
        at = audio[..., -AUDIO_STEPS:].contiguous()
        # Entire selected video tail is denoisable; audio stays exactly unchanged.
        vm = torch.ones((vt.shape[0], 1, vt.shape[2], 1, 1), device=vt.device, dtype=torch.float32)
        am = torch.zeros((at.shape[0], 1, at.shape[-2], at.shape[-1]), device=at.device, dtype=torch.float32)
        return ({"samples": NestedTensor((vt, at)), "noise_mask": NestedTensor((vm, am))},)


class H3Tail12Splice:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"accepted_s3": ("LATENT",), "refined_tail12": ("LATENT",)}}

    RETURN_TYPES = ("LATENT",)
    RETURN_NAMES = ("s3_with_refined_tail",)
    FUNCTION = "run"
    CATEGORY = "H3/tail12-quick"

    def run(self, accepted_s3, refined_tail12):
        video, audio = _av(accepted_s3, "splice-original")
        fixed_video, fixed_audio = _av(refined_tail12, "splice-refined")
        if fixed_video.shape[2] != PREFIX_TOKENS or video.shape[:2] != fixed_video.shape[:2] or video.shape[-2:] != fixed_video.shape[-2:]:
            raise ValueError(f"Tail12 shape mismatch original={tuple(video.shape)} refined={tuple(fixed_video.shape)}")
        if fixed_audio.shape[-1] != AUDIO_STEPS:
            raise ValueError("Refined AV clip must still contain 65 audio steps")
        out_video = video.clone()
        out_video[:, :, -PREFIX_TOKENS:] = fixed_video.to(device=out_video.device, dtype=out_video.dtype)
        # Deliberately NEVER splice the refined audio: retain accepted S3 audio bit-for-bit.
        return ({"samples": NestedTensor((out_video, audio))},)


class H3Tail12Commit:
    """Persist the spliced prefix once, with its exact source and parameters.

    T022 阶段2（方案A）：修复由**该段自己的**提交产出——子图挂在存档之后，
    用本段 guider/noise/model 重绘本段最后 12 个视频 token。因此：
      * ``segment_index == current_segment_index``（同一段），
      * ``store_path`` 由 ``H3ContinuationSave`` 直连传入，保证本节点在该段落盘之后执行，
      * 落盘前把存档读回来做内容级校验：除尾部 12 token 外必须逐元素相同、音频必须完全一致。

    已接受的 ``seg_%05d.safetensors`` 只读不写；修复落在 ``seg_%05d_tail12.safetensors``。
    下一段通过 ``H3Tail12LoadAccepted`` 复用它，不再做任何采样（也就不可能形成依赖环）。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "s3_with_refined_tail": ("LATENT",),
            "project_id": ("STRING", {"default": ""}),
            "segment_index": ("INT", {"default": 0, "min": 0, "max": 99999}),
            "current_segment_index": ("INT", {"default": -1, "min": -1, "max": 99999}),
            "store_path": ("STRING", {"default": "", "forceInput": True}),
            "params_json": ("STRING", {"default": "{}"}),
        }}

    RETURN_TYPES = ("LATENT",)
    RETURN_NAMES = ("s3_with_refined_tail",)
    FUNCTION = "run"
    CATEGORY = "H3/tail12-quick"
    OUTPUT_NODE = False

    def run(self, s3_with_refined_tail, project_id, segment_index, current_segment_index, store_path, params_json):
        from safetensors.torch import save_file
        video, audio = _av(s3_with_refined_tail, "commit")
        index = int(segment_index)
        current = int(current_segment_index)
        if not 0 <= index <= 4:
            raise ValueError("尾12修复段号越界：%d" % index)
        if current >= 0 and index != current:
            raise ValueError("尾12段号不一致：本次提交生成第%d段，修复归属第%d段；修复必须由该段自身产出"
                             % (current + 1, index + 1))
        accepted, repaired, sidecar = paths(project_id, index)
        if not accepted.is_file():
            raise FileNotFoundError("尾12修复来源缺失：第%d段存档尚未生成（%s）" % (index + 1, accepted))
        store = os.path.normpath(str(store_path).strip().strip('"')) if store_path else ""
        if not store or os.path.normcase(os.path.realpath(store)) != os.path.normcase(os.path.realpath(accepted)):
            raise ValueError("尾12存档路径与第%d段不符，拒绝写入修复记录：%s" % (index + 1, store or "(空)"))
        # 内容级来源校验：存档必须就是本次被重绘尾部的那份 latent。
        tensors = load_file(str(accepted), device="cpu")
        saved_video, saved_audio = tensors.get("video"), tensors.get("audio")
        if saved_video is None or saved_audio is None:
            raise ValueError("尾12来源存档缺少 video/audio：S%d" % (index + 1))
        flat_video = video.detach().to("cpu")
        flat_audio = audio.detach().to("cpu")
        if tuple(saved_video.shape) != tuple(flat_video.shape) or tuple(saved_audio.shape) != tuple(flat_audio.shape):
            raise ValueError("尾12修复版与存档形状不一致：%s vs %s"
                             % (tuple(flat_video.shape), tuple(saved_video.shape)))
        if not torch.equal(saved_video[:, :, :-PREFIX_TOKENS], flat_video[:, :, :-PREFIX_TOKENS]):
            raise ValueError("尾12修复改动了非尾部区域，拒绝覆盖修复记录：S%d" % (index + 1))
        if not torch.equal(saved_audio, flat_audio):
            raise ValueError("尾12修复改动了音频，拒绝覆盖修复记录：S%d" % (index + 1))
        source_sha = sha256_file(accepted)
        params = read_json(Path(params_json), None) if str(params_json).strip().startswith("{") else None
        if not isinstance(params, dict):
            params = {}
        params.update({"prefix_tokens": PREFIX_TOKENS, "audio_steps": AUDIO_STEPS,
                       "video_mask": "all_ones", "audio_mask": "all_zeros"})
        repaired.parent.mkdir(parents=True, exist_ok=True)
        md = {"schema": SCHEMA, "project_id": project_id, "segment_index": str(index),
              "source_sha256": source_sha, "params": json.dumps(params, ensure_ascii=False)}
        temporary = repaired.with_name(repaired.name + ".tmp-" + uuid.uuid4().hex)
        try:
            save_file({"video": video.contiguous(), "audio": audio.contiguous()}, str(temporary), metadata=md)
            with open(temporary, "r+b") as handle:
                os.fsync(handle.fileno())
            os.replace(temporary, repaired)
        finally:
            if temporary.exists():
                temporary.unlink()
        write_json_atomic(sidecar, {
            "schema": SCHEMA, "project_id": project_id, "segment_index": index,
            "repaired_by_segment": current,
            "source_latent": accepted.name, "source_sha256": source_sha,
            "repaired_latent": repaired.name, "repaired_sha256": sha256_file(repaired),
            "params": params, "audio_unchanged": True,
            "video_shape": list(video.shape), "audio_shape": list(audio.shape),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"), "created_epoch": time.time()})
        print("[tail12] repaired prefix stored S%d source=%s params=%s"
              % (index + 1, md["source_sha256"][:12], json.dumps(params, ensure_ascii=False)), flush=True)
        return (s3_with_refined_tail,)


def _native_core():
    """复用原生连续模块的裁剪策略求解（纯函数，不改动其代码）。

    注意：ComfyUI 在执行期并不把 ``custom_nodes`` 放进 ``sys.path``，所以
    ``from H3_NativeContinuation import core`` 会抛 ``ModuleNotFoundError``。
    首段 ``enabled=false`` 提前返回掩盖了这一点，第二段才暴露（节点执行失败 -> 证据成片缺失）。
    这里退回按文件位置加载：``core.py`` 只依赖标准库，加载不触发任何节点注册或路由挂载。
    """
    try:
        from H3_NativeContinuation import core  # type: ignore
        return core
    except ModuleNotFoundError:
        pass

    import importlib.util
    from pathlib import Path

    path = Path(__file__).resolve().parent.parent / "H3_NativeContinuation" / "core.py"
    if not path.is_file():
        raise RuntimeError("尾12证据裁剪：找不到原生连续模块 core.py（%s）" % path)
    spec = importlib.util.spec_from_file_location("h3_tail12_native_core", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class H3Tail12TrimMirror:
    """把尾12证据视频裁成与**主成片完全相同的帧约定**，且不产生任何副作用。

    为什么需要它：主成片的 39 帧重复前缀由 ``H3ContinuationTrimOnce`` 裁掉，但它会向
    ``index.json`` 追加 ``trim_events``（组装断言要求"每段恰好裁一次"）。证据视频若直接
    复用该节点就会重复记账，因此这里只复用同一份策略求解
    （``H3_NativeContinuation.core.resolve_continuation_policy``）与同一套 timeline 校验，
    不落任何状态。

    结果是：证据视频帧数恒等于主成片帧数（S1 为 243、S2 及以后为 204），合并时可以直接
    替换该段成片而不引入重复帧。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "project_id": ("STRING", {"default": ""}),
                "segment_index": ("INT", {"default": 0, "min": 0, "max": 99999}),
            },
            "optional": {
                "enabled": ("BOOLEAN", {"default": False}),
                "audio": ("AUDIO",),
                "fps": ("FLOAT", {"default": 24.0, "min": 1.0, "max": 120.0}),
                "trim_frames": ("INT", {"default": 39, "min": 0, "max": 4096}),
                "clean_rebase_enabled": ("BOOLEAN", {"default": False}),
                "clean_rebase_segment": ("INT", {"default": 3, "min": 0, "max": 99999}),
                "rebase_output_discard_frames": ("INT", {"default": 0, "min": 0, "max": 39}),
                "timeline_json": ("STRING", {"default": ""}),
            },
        }

    RETURN_TYPES = ("IMAGE", "AUDIO", "STRING")
    RETURN_NAMES = ("images", "audio", "trim_log_json")
    FUNCTION = "run"
    CATEGORY = "H3/tail12-quick"
    OUTPUT_NODE = False

    def run(self, images, project_id="", segment_index=0, enabled=False, audio=None,
            fps=24.0, trim_frames=39, clean_rebase_enabled=False, clean_rebase_segment=3,
            rebase_output_discard_frames=0, timeline_json=""):
        total = int(images.shape[0])
        if not enabled:
            return (images, audio, json.dumps(
                {"mirror": True, "active": False, "output_frames": total}, ensure_ascii=False))

        core = _native_core()
        prefix_frames = int(getattr(core, "VIDEO_PREFIX_FRAMES", 39))
        policy = core.resolve_continuation_policy(
            enabled=enabled, segment_index=int(segment_index),
            reuse_previous_latent=True, save_current_latent=True,
            trim_reused_prefix=True,
            clean_rebase_enabled=clean_rebase_enabled,
            clean_rebase_segment=clean_rebase_segment)
        trim = int(trim_frames)
        if policy["clean_rebase_active"]:
            if rebase_output_discard_frames not in (0, prefix_frames):
                raise ValueError("尾12证据裁剪：Clean Rebase 丢弃帧数必须是 0 或 %d" % prefix_frames)
            trim = int(rebase_output_discard_frames)
            if trim and not timeline_json:
                raise ValueError("尾12证据裁剪：Clean Rebase 丢弃 39 帧需要 timeline 合同")
        elif rebase_output_discard_frames:
            raise ValueError("尾12证据裁剪：rebase_output_discard_frames 需要 Clean Rebase 生效")

        if timeline_json:
            timeline = json.loads(timeline_json)
            if (int(timeline.get("segment_index", -1)) != int(segment_index)
                    or timeline.get("project_id") != project_id
                    or int(timeline.get("prefix_frames", -1)) != trim
                    or int(timeline.get("output_discard_frames", 0)) != 0
                    or int(timeline.get("kept_frames", -1)) != total - trim):
                raise ValueError("尾12证据裁剪：timeline 与主成片裁剪合同不一致")

        if total <= trim:
            raise ValueError("尾12证据裁剪：无法从 %d 帧里裁掉 %d 帧" % (total, trim))
        out_images = images[trim:].contiguous()
        out_audio = audio
        audio_steps = 0
        if audio is not None and trim:
            sr = int(audio["sample_rate"])
            cut = int(round(trim / float(fps) * sr))
            w = audio["waveform"]
            if w.shape[-1] <= cut:
                raise ValueError("尾12证据裁剪：无法从 %d 个音频采样里裁掉 %d" % (w.shape[-1], cut))
            out_audio = {"waveform": w[..., cut:].contiguous(), "sample_rate": sr}
            audio_steps = int(getattr(core, "audio_steps_for_frames", lambda _f: 0)(trim))
        return (out_images, out_audio, json.dumps(
            {"mirror": True, "active": True, "trimmed_frames": trim,
             "audio_steps": audio_steps, "output_frames": int(out_images.shape[0]),
             "source_frames": total}, ensure_ascii=False))


NODE_CLASS_MAPPINGS = {
    "H3Tail12LoadAccepted": H3Tail12LoadAccepted,
    "H3Tail12Extract": H3Tail12Extract,
    "H3Tail12Splice": H3Tail12Splice,
    "H3Tail12Commit": H3Tail12Commit,
    "H3Tail12TrimMirror": H3Tail12TrimMirror,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "H3Tail12LoadAccepted": "H3 尾12 · 读取已完成前段",
    "H3Tail12Extract": "H3 尾12 · 抽取39帧并锁住音频",
    "H3Tail12Splice": "H3 尾12 · 拼回原生前段latent",
    "H3Tail12Commit": "H3 尾12 · 另存修复版前缀",
    "H3Tail12TrimMirror": "H3 尾12 · 证据视频同约定裁剪",
}


def register_routes():
    """Read-only status route used by the six-segment front end."""
    try:
        from aiohttp import web
        from server import PromptServer
    except Exception:  # pragma: no cover - only when imported outside ComfyUI
        return None
    server = PromptServer.instance

    @server.routes.get("/h3/tail12/status")
    async def tail12_status(request):
        try:
            project = request.query.get("project_id", "")
            index = int(request.query.get("segment_index", -1))
            if not 0 <= index <= 5:
                raise ValueError("无效段号")
            return web.json_response(status(project, index))
        except Exception as exc:
            return web.json_response({"error": str(exc)}, status=409)

    return tail12_status


try:
    register_routes()
except Exception as exc:  # pragma: no cover
    print("[tail12] status route not registered: %s" % exc, flush=True)
