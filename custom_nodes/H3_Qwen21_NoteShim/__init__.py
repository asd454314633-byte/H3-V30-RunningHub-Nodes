# -*- coding: utf-8 -*-
"""
H3_Qwen21_NoteShim — 8207 双图像模型集成 · 定点补齐（2026-10-10）

背景：
    千问 Qwen Image 2.1 官方模板工作流（Comfy-Org/workflow_templates）使用
    `MarkdownNote` / `Note` 两种纯注释节点。8207（ComfyUI 0.36.0）与来源环境
    8196（同为 0.36.0）均未注册这两个节点，来源环境中它们同样显示为缺失节点。

定位：
    这两个节点只承载说明文本，不参与任何连线、不产生任何张量。
    本补齐包以最小代码提供同名节点，使工作流在 8207 前端不再出现红色缺失节点、
    可正常加载并运行。它不改动采样链、不改动任何模型/编码器/VAE 行为。

约束：
    - 纯本地实现，无第三方依赖，无需 pip 安装。
    - 只新增两个新节点名，不覆盖、不改名、不删除任何既有节点。
    - 若 ComfyUI 未来原生提供同名节点，本包可直接整目录删除。
"""


class _NoteBase:
    CATEGORY = "_8207_集成/注释"
    FUNCTION = "noop"
    RETURN_TYPES = ()
    OUTPUT_NODE = False
    DESCRIPTION = "8207 集成补齐：纯注释节点，承载工作流说明文本，不参与连线与计算。"

    def noop(self, **kwargs):
        return ()


class MarkdownNote(_NoteBase):
    """对应官方模板 MarkdownNote：一个多行 Markdown 文本编辑框。"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": (
                    "STRING",
                    {"multiline": True, "default": "", "dynamicPrompts": False},
                ),
            }
        }

    def noop(self, text=""):
        return ()


class Note(_NoteBase):
    """对应通用 Note：一个多行纯文本编辑框。"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": (
                    "STRING",
                    {"multiline": True, "default": "", "dynamicPrompts": False},
                ),
            }
        }

    def noop(self, text=""):
        return ()


NODE_CLASS_MAPPINGS = {
    "MarkdownNote": MarkdownNote,
    "Note": Note,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MarkdownNote": "Markdown Note（8207 集成补齐）",
    "Note": "Note（8207 集成补齐）",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
