# -*- coding: utf-8 -*-
"""
H3 workflow helpers: optional image load + lazy first-frame branch switch.

Used by 10Eros formal workflows so:
- mode=1 only evaluates the direct first-frame branch
- mode=2 only evaluates the multi-ref / HiDream fusion branch
- last_frame can be omitted without mute/unmute or LoadImage errors
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re

import folder_paths
import node_helpers
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, ImageOps, ImageSequence

import comfy.nested_tensor
import comfy.utils

logger = logging.getLogger("h3_workflow_helpers")

NONE_NAMES = {"", "none", "(none)", "None", "null", "NULL", "disabled"}


def _is_none_name(name) -> bool:
    if name is None:
        return True
    if not isinstance(name, str):
        return False
    return name.strip() in NONE_NAMES


def _load_rgb_image(image_name: str):
    image_path = folder_paths.get_annotated_filepath(image_name)
    img = node_helpers.pillow(Image.open, image_path)

    output_images = []
    output_masks = []
    w = h = None
    for i in ImageSequence.Iterator(img):
        i = node_helpers.pillow(ImageOps.exif_transpose, i)
        if i.mode == "I":
            i = i.point(lambda x: x * (1 / 255))
        image_rgb = i.convert("RGB")
        if len(output_images) == 0:
            w, h = image_rgb.size
        if image_rgb.size != (w, h):
            continue
        image_np = np.array(image_rgb).astype(np.float32) / 255.0
        image_t = torch.from_numpy(image_np)[None,]
        if "A" in i.getbands():
            mask = np.array(i.getchannel("A")).astype(np.float32) / 255.0
            mask = 1.0 - torch.from_numpy(mask)
        else:
            mask = torch.zeros((64, 64), dtype=torch.float32, device="cpu")
        output_images.append(image_t)
        output_masks.append(mask.unsqueeze(0))

    if not output_images:
        raise RuntimeError(f"Failed to load image: {image_name}")

    if len(output_images) > 1:
        output_image = torch.cat(output_images, dim=0)
        output_mask = torch.cat(output_masks, dim=0)
    else:
        output_image = output_images[0]
        output_mask = output_masks[0]
    return output_image, output_mask


def _pad_resize(image: torch.Tensor, width: int, height: int, upscale_method: str = "lanczos"):
    """Keep aspect ratio, letterbox/pad to exact width x height. image: [B,H,W,C]."""
    if image is None:
        return None
    width = int(width)
    height = int(height)
    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid resize target: {width}x{height}")

    _b, h, w, _c = image.shape
    if w == width and h == height:
        return image

    scale = min(width / float(w), height / float(h))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    samples = image.movedim(-1, 1)
    method = upscale_method if upscale_method in (
        "nearest-exact", "bilinear", "area", "bicubic", "lanczos"
    ) else "lanczos"
    samples = comfy.utils.common_upscale(samples, new_w, new_h, method, "disabled")

    pad_w = width - new_w
    pad_h = height - new_h
    left = pad_w // 2
    right = pad_w - left
    top = pad_h // 2
    bottom = pad_h - top
    # F.pad on NCHW: (left, right, top, bottom)
    samples = F.pad(samples, (left, right, top, bottom), mode="constant", value=0.0)
    return samples.movedim(1, -1)


class LoadImageWithSwitch:
    """Legacy helper kept for compatibility."""

    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        return {
            "required": {
                "image": (sorted(files), {"image_upload": True}),
            },
            "optional": {
                "enabled": ("BOOLEAN", {"default": True, "label_on": "enabled", "label_off": "disabled"}),
            },
        }

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ("IMAGE", "MASK", "BOOLEAN")
    RETURN_NAMES = ("image", "mask", "enabled")
    FUNCTION = "load_image_with_switch"

    def load_image_with_switch(self, image, enabled=True):
        if not enabled or _is_none_name(image):
            return (None, None, False)
        out_img, out_mask = _load_rgb_image(image)
        return (out_img, out_mask, True)

    @classmethod
    def IS_CHANGED(s, image, enabled=True):
        if not enabled or _is_none_name(image):
            return "disabled"
        image_path = folder_paths.get_annotated_filepath(image)
        return f"{image_path}:{os.path.getmtime(image_path)}"

    @classmethod
    def VALIDATE_INPUTS(s, image, enabled=True):
        if not enabled or _is_none_name(image):
            return True
        if not folder_paths.exists_annotated_filepath(image):
            return f"Invalid image file: {image}"
        return True


class H3OptionalLoadImage:
    """Load image; empty/none selection returns None without validation error."""

    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        choices = ["(none)"] + sorted(files)
        return {
            "required": {
                "image": (choices, {"image_upload": True}),
            },
        }

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ("IMAGE", "MASK", "BOOLEAN")
    RETURN_NAMES = ("image", "mask", "has_image")
    FUNCTION = "load_optional"
    DESCRIPTION = "Optional image loader. Choose (none) or leave empty to skip without errors."

    def load_optional(self, image):
        if _is_none_name(image):
            return (None, None, False)
        if not folder_paths.exists_annotated_filepath(image):
            logger.warning("H3OptionalLoadImage: missing file treated as none: %s", image)
            return (None, None, False)
        out_img, out_mask = _load_rgb_image(image)
        return (out_img, out_mask, True)

    @classmethod
    def IS_CHANGED(s, image):
        if _is_none_name(image):
            return "none"
        try:
            image_path = folder_paths.get_annotated_filepath(image)
            return f"{image_path}:{os.path.getmtime(image_path)}"
        except Exception:
            return f"missing:{image}"

    @classmethod
    def VALIDATE_INPUTS(s, image):
        # Never fail the graph because an optional slot is empty/missing.
        return True


class H3OptionalImageResize:
    """Pad-resize when image present; pass None through when absent."""

    upscale_methods = ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"]

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "width": ("INT", {"default": 864, "min": 16, "max": 8192, "step": 1}),
                "height": ("INT", {"default": 480, "min": 16, "max": 8192, "step": 1}),
                "upscale_method": (s.upscale_methods, {"default": "lanczos"}),
                "keep_proportion": (
                    ["stretch", "resize", "pad", "pad_edge", "pad_edge_pixel", "crop", "pillarbox_blur", "total_pixels"],
                    {"default": "pad"},
                ),
                "pad_color": ("STRING", {"default": "0, 0, 0"}),
                "crop_position": (["center", "top", "bottom", "left", "right"], {"default": "center"}),
                "divisible_by": ("INT", {"default": 32, "min": 0, "max": 512, "step": 1}),
            },
            "optional": {
                "image": ("IMAGE",),
                "mask": ("MASK",),
                "device": (["cpu", "gpu"], {"default": "cpu"}),
            },
        }

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ("IMAGE", "INT", "INT", "MASK")
    RETURN_NAMES = ("IMAGE", "width", "height", "mask")
    FUNCTION = "resize"
    DESCRIPTION = "Optional pad-resize. If image is None, returns None (no work)."

    def resize(
        self,
        width,
        height,
        upscale_method="lanczos",
        keep_proportion="pad",
        pad_color="0, 0, 0",
        crop_position="center",
        divisible_by=32,
        image=None,
        mask=None,
        device="cpu",
    ):
        if image is None:
            return (None, int(width), int(height), None)

        # Force pad/letterbox behavior for identity-safe geometry.
        mode = keep_proportion if keep_proportion else "pad"
        if mode != "pad":
            # Still avoid non-uniform stretch unless explicitly stretch.
            if mode == "stretch":
                samples = image.movedim(-1, 1)
                samples = comfy.utils.common_upscale(
                    samples, int(width), int(height), upscale_method, "disabled"
                )
                out = samples.movedim(1, -1)
            else:
                out = _pad_resize(image, int(width), int(height), upscale_method)
        else:
            out = _pad_resize(image, int(width), int(height), upscale_method)

        out_mask = mask
        return (out, int(width), int(height), out_mask)


class H3LazyImageSwitch:
    """
    True lazy first-frame source switch.
    mode=1 -> only evaluate image1 (direct first frame)
    mode=2 -> only evaluate image2 (multi-ref fusion result)
    """

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "mode": (
                    "INT",
                    {
                        "default": 1,
                        "min": 1,
                        "max": 2,
                        "step": 1,
                        "tooltip": "1=单参考直接首帧；2=多参考融合首帧。只执行被选中的分支。",
                    },
                ),
            },
            "optional": {
                "image1": ("IMAGE", {"lazy": True}),
                "image2": ("IMAGE", {"lazy": True}),
            },
        }

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "switch"
    DESCRIPTION = "Lazy switch: mode 1 runs direct first frame only; mode 2 runs multi-ref fusion only."

    def check_lazy_status(self, mode, image1=None, image2=None):
        mode = int(mode)
        needed = []
        if mode == 1:
            if image1 is None:
                needed.append("image1")
        else:
            if image2 is None:
                needed.append("image2")
        return needed

    def switch(self, mode, image1=None, image2=None):
        mode = int(mode)
        if mode == 1:
            if image1 is None:
                raise RuntimeError("单参考模式(mode=1)：请上传「正式首帧」。")
            return (image1,)
        if image2 is None:
            raise RuntimeError(
                "多参考模式(mode=2)：多参考融合结果为空。请上传身份/参考图后重试。"
            )
        return (image2,)


class H3OperationSelector:
    """Single, explicit UI selector for the production H3 workflow stages.

    Execution routing is performed by the companion lightweight frontend
    extension, which synchronizes the selected value to the pre-tagged workflow
    nodes' bypass modes.  The returned string is intentionally optional: the
    node is a control surface, not part of the generation dependency graph.
    """

    MODES = ["只跑一采", "无任何选项状态"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"当前操作": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "H3 工作流唯一运行模式选择器；任意时刻只允许一个阶段启用。"

    def select(self, 当前操作):
        return ()


class H3SpeedModeSelector:
    """Third control axis: 一采生成 的画质/速度偏好（双模式正式整合 2026-09-03）。

    与 H3OperationSelector（操作阶段轴）正交：只作用于功能 1 一采生成。
    默认（原样）= 源工作流原行为；画质优先 = SLA0.85 + FP16；
    高速平衡 = Turbo8(v4) + Sage(H3) + INT8 ConvRot。
    由前端 JS 按节点 properties["h3_speed_branch"] 同步 node.mode 0/4。
    """

    MODES = ["默认（原样）", "画质优先", "高速平衡"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"一采模式": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "一采生成模式：默认（原样）/ 画质优先（SLA0.85+FP16）/ 高速平衡（Turbo8+Sage+INT8）。仅作用于功能 1。"
    MODES_EXTRA_NOTE = "h3_speed_branch: default|quality|fast（数组允许多模式同节点，如 119 VAE=[default,quality]）"

    def select(self, 一采模式):
        return ()


class H3SizeModeSelector:
    """Serialized control surface for the real preset/custom size branches."""

    MODES = ["预设尺寸", "自定义尺寸"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"尺寸模式": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "真正切换预设宽高与自定义宽高分支。"

    def select(self, 尺寸模式):
        return ()


class H3GenerationModeSelector:
    """Serialized selector for REF2VA versus FL2VA generation."""

    MODES = ["多参考图（REF2VA）", "文生/单图/首尾帧（FL2VA）"]
    # 本机真实存在的 FL2VA 基模（2026-09-03 资产核验）
    FL2VA_MODEL = "10Eros_Max_H3_FL2VA-NVFP4.safetensors"

    @classmethod
    def INPUT_TYPES(cls):
        available_models = set(folder_paths.get_filename_list("diffusion_models"))
        modes = cls.MODES if cls.FL2VA_MODEL in available_models else cls.MODES[:1]
        return {"required": {"生成模式": (modes, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "真正切换 REF2VA/FL2VA 模型、条件和初始潜空间分支。"

    def select(self, 生成模式):
        return ()


class H3ImageModeSelector:
    """Controls which FL2VA image-conditioning inputs are evaluated."""

    MODES = ["文生视频（不用图）", "单图生视频", "首尾帧生视频"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"图片模式": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "真正切换 FL2VA 无图、单图和首尾帧条件分支。"

    def select(self, 图片模式):
        return ()


class H3ReferenceSourceSelector:
    """Independent, serialized toggles for REF2VA reference material sources.

    REF_MASTER_CONTROL_20260906：第 5 项「后处理使用上传视频」是后处理上传
    视频链（766/767/768/769/770）的唯一总控开关，与四个 REF2VA 参考开关
    相互独立。关 = 整链 MUTE（彻底断链）；开 = 整链恢复。它只影响
    检测/扩时/二采/修复的素材来源，不影响一采。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "启用四张参考图": ("BOOLEAN", {"default": True}),
                "启用参考视频": ("BOOLEAN", {"default": False}),
                "启用参考音频1": ("BOOLEAN", {"default": False}),
                "启用参考音频2": ("BOOLEAN", {"default": False}),
                # 第五项 = 后处理总控（置于底部，避免误开；默认 True 保持
                # 与历史行为一致：上传链当前处于启用状态）。
                "后处理使用上传视频": ("BOOLEAN", {"default": True}),
            }
        }

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = (
        "【参考素材总控】仅作用于 REF2VA 多参考分支（MiniMaxH3ReferenceToVideo）：启用/关闭图1-4、参考视频与音频。"
        "注意：若当前生成引擎为「常规视频生成（FL2VA）/ MiniMaxH3ImageToVideo」，只使用首帧(first_frame)，"
        "图2/图3/图4 不进入生成；此时「启用四张参考图 = true」不代表四图参与，请以控制台【参考模式：单首帧】为准。"
        "第五项独立控制后处理上传视频链（仅检测/扩时/二采/修复）。"
    )

    def select(self, 启用四张参考图, 启用参考视频, 启用参考音频1, 启用参考音频2, 后处理使用上传视频):
        return ()


class H3Fl2vRouteSelector:
    """FL2V 二级路线轴：主用 F4（社区 V1 4-step 重打包）/ 快速平衡（官方 FastH3 V2 8-Step）。

    与 H3GenerationModeSelector（一级：REF2VA/FL2VA）正交，只作用于 FL2VA 分支。
    由前端 JS 按节点 properties["h3_fl2v_route_branch"] 同步 node.mode 0/4：
      - 主用 F4: f4 链（646 主模型源 / 878 SigmaShift12-3 / 880 调度 simple4 / 881 采样 euler）点亮
      - 快速平衡: v2 链（977 官方 V2 权重 / 978 SigmaShift10-3 / 979 注意力后端 /
        980 Core 原生 VSA 稀疏载体 / 981 调度 simple8 / 982 res_multistep）点亮
    两档互斥：被选档点亮，另一档整链旁路（m4）。REF2VA 模式或 FL2VA 未启用时全部旁路，
    链路透明零副作用。自动路由开关取『第一个非空输入』，故未选中档必须连源节点一起旁路。
    """

    MODES = ["主用 F4（FastH3 VSA 4步）", "快速平衡（FastH3 V2 8步）"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"FL2V 路线": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "FL2V 路线：主用 F4＝社区 V1 4-step 重打包（SigmaShift12/3·4步·euler）/ 快速平衡＝官方 FastH3 V2 8-Step 蒸馏权重（SigmaShift10/3·8步·res_multistep·Core 原生 VSA，仅文生音视频，官方未蒸馏 FL2VA/Ref2VA）。仅 FL2VA 生效。"

    def select(self, **kwargs):
        return ()


class H3Ref2vaBackendSelector:
    """Ref2VA 二级后端轴：稳定8步 / PDD 8步（两档生产收口，2026-09-29）。

    与 H3GenerationModeSelector（一级：REF2VA/FL2VA）正交，只作用于 REF2VA 分支。
    由前端 JS 按节点 properties["h3_ref2va_backend_branch"] 同步 node.mode 0/2/4：
      - stable8 : 稳定8步链（N940 turbo→N1007→N1008→N941 6/3；N942 simple/8）点亮；
                  00029 健康路线形态（turbo_8step，208 patches），不得误接 PDD
      - pdd8    : PDD 链（N1006 Apply→N998→N950；N1006.sigmas；N943 euler）点亮；
                  MiniMaxH3PDDAccApply，8 NFE / Shift 12/3 / Euler，308 patches
      - vsa / original : 旧档（枚举已移除=生产 UI 隐藏）；分支节点保留作 rollback
    FL2VA 模式或 Ref2VA 未启用时全部旁路，链路透明零副作用。
    旧图兼容：旧值"官方…"按 PDD 档点亮（pdd8/official8 标签同组）。
    """

    MODES = ["稳定多参考8步", "PDD多参考8步", "Native Ref2VA 20步诊断", "OmniRef8（FastH3）", "原版 Ref2VA（默认 / 画质优先 / 高速平衡）"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"Ref2VA 后端": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "Ref2VA 后端：OmniRef8（FastH3）、稳定8步、PDD8步、Native 20步诊断和 V29 原版 Ref2VA 回退。"

    def select(self, **kwargs):
        return ()


class H3Ref2vaAttentionSelector:
    """Ref2VA 官方8步二级轴：注意力方案 标准 / 内置 INT8。

    与 H3Ref2vaBackendSelector 正交，只作用于官方 Ref2VA 8步分支内部。
    前端按 h3_ref2va_attention_branch 同步节点执行模式。
    """

    MODES = ["标准", "内置 INT8"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"注意力方案": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "官方 Ref2VA 8步注意力方案：标准（不经过 INT8 注意力）/ 内置 INT8（经过 ModelAttentionBackend）。仅官方8步后端生效。"

    def select(self, **kwargs):
        return ()


class H3MemoryOptimizationSelector:
    """PDD Ref2VA 高级开关：关闭（默认）/ 开启 H3MemoryOptimization。"""

    MODES = ["关闭", "开启"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"H3内存优化": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "PDD Ref2VA 8步高级开关。默认关闭；开启时仅增加官方 H3MemoryOptimization MODEL patch，保留 Comfy Kitchen INT8 dense attention。"

    def select(self, **kwargs):
        return ()


class H3GuideModeSelector:
    """时间轴关键帧轴：让画面在指定时间点到达目标状态（Core 原生 MiniMaxH3AddGuide）。

    与其它轴正交，REF2VA / FL2VA 两种生成模式都可用；它控制的是
    properties["h3_guide_branch"] = 1/2/3 的关键帧链，槽位号 ≤ 所选数量的点亮，
    其余整链旁路（m4）。旁路时前端把 conditioning 直通回 N648，默认路线零副作用。

    概念边界（作者 2026-09-19 方案 §8，禁止再混淆）：
      Reference（参考图/参考视频）＝语义参考，不规定出现在第几帧；
      Guide（本轴）＝时间轴锚点，规定"第 frame_idx 帧必须是这张画面"。
    """

    MODES = ["不使用关键帧", "1 个关键帧画面", "2 个关键帧画面", "3 个关键帧画面"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"关键帧控制": (cls.MODES, {"default": cls.MODES[0]})}}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = "时间轴关键帧：让画面在指定第几帧到达你给的那张图。与参考图不同，关键帧规定出现时刻。默认不使用；开启后必须为每个关键帧选择图片，否则执行时报中文错误。"

    def select(self, **kwargs):
        return ()


class H3ContinuationSelector:
    """【接续生产】轴：V27 唯一新增能力，官方 Motion Context 的中文薄壳。

    解决的问题：长故事分段生成时"第一段结束 → 第二段重新起步 → 动作明显顿一下
    → 运动速度/姿态/声音不连续"。开启后本段不再从零起步，而是接着上一段结尾
    的运动与声音继续演（由官方 MiniMaxH3MotionContext 完成，本节点不参与算法）。

    与其它轴（尺寸 / 生成模式 / 图片模式 / 参考素材 / 一采速度 / FL2V 路线 /
    Ref2VA 后端 / 注意力方案 / 关键帧）全部正交，REF2VA 与 FL2VA 都可用。

    前端 JS 按 properties["h3_continuation_branch"] 同步官方链的执行模式：
      - 关闭（默认）：整条接续链旁路（m4 直通），画面/音频/条件都原样透传，
        执行输入与 V26 冻结基线逐项相同 ⇒ 零污染。
      - 开启：官方五节点点亮（读取上一段存档 → 接续 → 去保护区 → 存档 → 分段推进）。
    本类 RETURN_TYPES=()：不连任何线，纯 UI 事实源（thin adapter）。但
    RETURN_TYPES=() 本身并不会让它退出 /prompt——前端把任何已注册后端类都写进
    执行图（MarkdownNote 干净只因为它是纯前端节点、不是后端类）。实测确认后，
    由前端 h3_workflow_ux.js 的 stripUiOnlyNodes() 在提交前摘掉「零连线的纯 UI
    开关」，STEP 8 因此做成提交级逐字节相等，而不是"多一个无害节点"。

    概念边界（禁止再混淆）：
      Reference＝语义参考（长什么样/什么音色）；
      Guide＝时间轴锚点（第几帧必须是这张图）；
      接续生产＝上一段结尾的运动与声音状态（第几帧都不管，只管"怎么接上"）。
    """

    MODES = ["关闭（本段独立起步）", "开启（接上一段继续演）"]
    STRENGTHS = ["自动", "更强连续"]

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "接续生产": (cls.MODES, {"default": cls.MODES[0]}),
            "接续强度": (cls.STRENGTHS, {"default": cls.STRENGTHS[0]}),
        }}

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "select"
    DESCRIPTION = (
        "接续生产：用于\"同一镜头继续往下演\"。换镜头时请关闭接续，开始新的镜头段。"
        "关闭＝默认，与本功能加入前的行为完全一致。"
        "接续强度：自动（默认）/ 更强连续（连续大幅动作仍接不上时再开，更慢）。"
    )

    # 技术别名（STEP 7：这些英文概念一律不出现在用户可见标题里，只登记在此）
    TECHNICAL_ALIAS = {
        "接续生产": "h3_continuation_branch / MiniMaxH3MotionContext{Load,Save,Trim,Chain}",
        "自动": "context_length=22 (official VIDEO_RUN_GRID point)",
        "更强连续": "context_length=39 (same grid, unvalidated this round)",
        "保护区": "pinned head = span frames removed by MiniMaxH3MotionContextTrim",
        "上一段存档": "context_latent slot clip_index（Load 0=无上一段直通 / N=接第 N 段）",
        "声音接续": "audio_context_length=22 → 40Hz 网格取整为 37 步（≈22.2 帧）",
    }

    def select(self, **kwargs):
        return ()


SENTINEL_GUIDE_NAME = "__H3_GUIDE_NOT_SET__.png"


class H3GuideImageGuard:
    """任意关键帧锚定（实验）·运行保护（后端 fail-closed）。

    只做一件事：AddGuide 执行链中若关键帧图片仍是专用哨兵（未替换），
    立即 raise 中文错误；否则 IMAGE 原样透传，不修改像素。

    语义要点（依赖 ComfyUI 执行模型，勿"优化"掉）：
    - 不实现 VALIDATE_INPUTS：prompt 校验阶段仅做 combo 成员校验，
      因此 OFF 态（900 bypass → Guard 为孤儿节点）虽被序列化进 API prompt，
      但不会被实际执行，不报错 —— "关闭时完全不参与生成"成立。
    - ON 态（900 激活 → Guard 成为输出节点祖先）才会真正执行 → 哨兵即报错。
    - 不自动关闭 AddGuide、不 fallback、不自动选其它图片。
    """

    @classmethod
    def INPUT_TYPES(cls):
        input_dir = folder_paths.get_input_directory()
        try:
            files = [
                f for f in os.listdir(input_dir)
                if os.path.isfile(os.path.join(input_dir, f)) and not f.startswith(".")
            ]
        except Exception:
            files = []
        if SENTINEL_GUIDE_NAME not in files:
            files.append(SENTINEL_GUIDE_NAME)
        files.sort()
        return {
            "required": {
                "images": ("IMAGE",),
                "image_name": (files, {"default": SENTINEL_GUIDE_NAME}),
            }
        }

    CATEGORY = "H3/helpers"
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("IMAGE",)
    FUNCTION = "guard"
    DESCRIPTION = (
        "任意关键帧锚定（实验）·运行保护：关键帧图片未替换（仍为专用哨兵 "
        "__H3_GUIDE_NOT_SET__.png）时立即中文报错；已设置则原样透传，"
        "不修改像素、不自动回退、不自动选择其它图片。"
    )

    def guard(self, images, image_name):
        if image_name == SENTINEL_GUIDE_NAME:
            raise RuntimeError("AddGuide 已开启，请先选择关键帧图片。")
        return (images,)


# 预载六段提示词：连续生成多段时，文本编码器（≈15 GB）与主模型（≈21 GB）进不了同一份显存/锁页内存，
# 原本每段都要从磁盘重读一次编码器。开启后前端在首段提交前，把剩余各段的条件节点放进一个只编码的任务
# 一次算完，由 H3PromptPreloadStore 暂存在本进程；各段的 H3PromptPreloadPick 用同一把键取用，命中时
# 不执行上游条件节点（惰性输入），取不到就照常编码，结果不变。暂存只属于当前这条链：新链开始即清空，
# 每段取用一次即删除，不落盘。
_PRELOAD = {"chain": None, "items": {}}
_PRELOAD_MEDIA_INPUTS = ("image", "audio", "video", "file")


def _preload_key(prompt, link):
    """条件来源及其全部上游的类型与输入（不含节点号）；媒体文件再带上大小与修改时间，
    同名替换后不会取到旧条件。"""
    memo = {}

    def sig(node_id):
        node_id = str(node_id)
        if node_id not in memo:
            node = prompt[node_id]
            parts = [node["class_type"]]
            for name in sorted(node["inputs"]):
                value = node["inputs"][name]
                if isinstance(value, list) and len(value) == 2 and str(value[0]) in prompt:
                    parts.append([name, sig(value[0]), value[1]])
                    continue
                # 服务端校验会把部分 FLOAT 输入就地转成浮点、另一些保持整数（10 与 10.0），比较时统一为浮点。
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    value = float(value)
                parts.append([name, value])
                if name in _PRELOAD_MEDIA_INPUTS and isinstance(value, str) and folder_paths.exists_annotated_filepath(value):
                    stat = os.stat(folder_paths.get_annotated_filepath(value))
                    parts.append([name + ":stat", stat.st_size, stat.st_mtime_ns])
            memo[node_id] = json.dumps(parts, ensure_ascii=False)
        return memo[node_id]

    return hashlib.sha256(f"{sig(link[0])}#{link[1]}".encode("utf-8")).hexdigest()


def _preload_bytes(value):
    if isinstance(value, torch.Tensor):
        return value.nelement() * value.element_size()
    if isinstance(value, comfy.nested_tensor.NestedTensor):
        return sum(_preload_bytes(t) for t in value.tensors)
    if isinstance(value, dict):
        return sum(_preload_bytes(v) for v in value.values())
    if isinstance(value, (list, tuple)):
        return sum(_preload_bytes(v) for v in value)
    return 0


class H3PromptPreloadStore:
    """预载任务的落点：暂存一段的条件与初始 latent，供本链后续 H3PromptPreloadPick 取用。"""

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"conditioning": ("CONDITIONING",), "latent": ("LATENT",), "chain_id": ("STRING", {"default": ""})},
                "hidden": {"prompt": "PROMPT", "unique_id": "UNIQUE_ID"}}

    RETURN_TYPES = ()
    FUNCTION = "store"
    OUTPUT_NODE = True
    CATEGORY = "H3/helpers"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def store(self, conditioning, latent, chain_id, prompt, unique_id):
        if _PRELOAD["chain"] != chain_id:
            _PRELOAD["items"].clear()
            _PRELOAD["chain"] = chain_id
        key = _preload_key(prompt, prompt[str(unique_id)]["inputs"]["conditioning"])
        _PRELOAD["items"][key] = (conditioning, latent)
        logging.info("[预载六段提示词] 暂存 %s，约 %.0f MB；本链共 %d 段",
                     key[:12], (_preload_bytes(conditioning) + _preload_bytes(latent)) / 2**20, len(_PRELOAD["items"]))
        return {}


class H3PromptPreloadPick:
    """取用预载结果：键相同即直接交出暂存的条件与 latent，上游条件节点不执行；否则照常编码。"""

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"conditioning": ("CONDITIONING", {"lazy": True}), "latent": ("LATENT", {"lazy": True})},
                "hidden": {"prompt": "PROMPT", "unique_id": "UNIQUE_ID"}}

    RETURN_TYPES = ("CONDITIONING", "LATENT")
    FUNCTION = "pick"
    CATEGORY = "H3/helpers"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("nan")

    def check_lazy_status(self, conditioning=None, latent=None, prompt=None, unique_id=None):
        key = _preload_key(prompt, prompt[str(unique_id)]["inputs"]["conditioning"])
        return [] if key in _PRELOAD["items"] else ["conditioning", "latent"]

    def pick(self, conditioning=None, latent=None, prompt=None, unique_id=None):
        key = _preload_key(prompt, prompt[str(unique_id)]["inputs"]["conditioning"])
        stored = _PRELOAD["items"].pop(key, None)
        if stored is not None:
            logging.info("[预载六段提示词] 命中 %s，本段跳过文本编码；本链剩余 %d 段", key[:12], len(_PRELOAD["items"]))
            return stored
        logging.info("[预载六段提示词] 未命中 %s，本段照常编码", key[:12])
        return (conditioning, latent)


NODE_CLASS_MAPPINGS = {
    "LoadImageWithSwitch": LoadImageWithSwitch,
    "H3OptionalLoadImage": H3OptionalLoadImage,
    "H3OptionalImageResize": H3OptionalImageResize,
    "H3LazyImageSwitch": H3LazyImageSwitch,
    "H3OperationSelector": H3OperationSelector,
    "H3SpeedModeSelector": H3SpeedModeSelector,
    "H3SizeModeSelector": H3SizeModeSelector,
    "H3GenerationModeSelector": H3GenerationModeSelector,
    "H3ImageModeSelector": H3ImageModeSelector,
    "H3ReferenceSourceSelector": H3ReferenceSourceSelector,
    "H3Fl2vRouteSelector": H3Fl2vRouteSelector,
    "H3Ref2vaBackendSelector": H3Ref2vaBackendSelector,
    "H3Ref2vaAttentionSelector": H3Ref2vaAttentionSelector,
    "H3MemoryOptimizationSelector": H3MemoryOptimizationSelector,
    "H3GuideModeSelector": H3GuideModeSelector,
    "H3GuideImageGuard": H3GuideImageGuard,
    "H3ContinuationSelector": H3ContinuationSelector,

    "H3PromptPreloadStore": H3PromptPreloadStore,
    "H3PromptPreloadPick": H3PromptPreloadPick,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LoadImageWithSwitch": "H3 带开关图像载入",
    "H3OptionalLoadImage": "H3 可选图像载入",
    "H3OptionalImageResize": "H3 可选图像缩放（补边）",
    "H3LazyImageSwitch": "H3 懒切换图像源（1单参考/2多参考）",
    "H3OperationSelector": "H3 当前操作（真正单选）",
    "H3SpeedModeSelector": "H3 一采模式（画质优先/高速平衡，真切换）",
    "H3SizeModeSelector": "H3 尺寸模式（真切换）",
    "H3GenerationModeSelector": "H3 生成模式（真切换）",
    "H3ImageModeSelector": "H3 图片模式（真切换）",
    "H3ReferenceSourceSelector": "H3 参考素材（真开关）",
    "H3Fl2vRouteSelector": "H3 FL2V 路线（主用 F4 / 快速平衡 FastH3 V2，真切换）",
    "H3Ref2vaBackendSelector": "H3 Ref2VA 后端（原版 / VSA，真切换）",
    "H3Ref2vaAttentionSelector": "H3 Ref2VA 注意力方案（标准 / 内置 INT8）",
    "H3MemoryOptimizationSelector": "H3 内存优化（关闭 / 开启，高级开关）",
    "H3GuideModeSelector": "H3 时间轴关键帧（不使用 / 1~3 个关键帧，真切换）",
    "H3GuideImageGuard": "H3 关键帧图片运行保护（未设置即报错）",
    "H3ContinuationSelector": "H3 接续生产（关闭 / 开启，真切换）",

    "H3PromptPreloadStore": "H3 预载六段提示词·暂存（内部）",
    "H3PromptPreloadPick": "H3 预载六段提示词·取用（内部）",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
