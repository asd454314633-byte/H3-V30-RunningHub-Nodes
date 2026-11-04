# H3 V30 — RunningHub 技术审核节点包

**此仓库为可供技术审核的源码快照，尚未验证 RunningHub 云端部署；公开可见不等于开源授权。**

## 内容
- `custom_nodes/`：18 个项目目录（17 个 ComfyUI 插件入口、1 个辅助目录），覆盖导演台、漂移锚定、音频、Native Continuation、Sidecar、前端 JS、缓存与辅助模块。
- `workflows/H3_V30_RunningHub_CLEAN_NOLOOP.json`：脱敏工作流，186 个节点、240 条连线、1 个子图。
- `docs/DEPENDENCIES.md`：7 个第三方插件的上游 GitHub 地址、固定 SHA 和许可证提示；插件源码不随审核包重复打包。
- `docs/MODEL_INDEX.csv`：19 项模型索引及下载来源，**不包含模型权重**。
- `patches/`：MAINodes v1.0.5 端口范围兼容补丁。
- `docs/LOCAL_E2E_RESULT.md`：隔离 Windows RTX 5090 D 功能实测记录。
- `docs/DEPLOYMENT_CN.md`：**部署顺序、目录结构、环境差异、FFmpeg、Sidecar、可选导演服务、Linux 注意事项与对外公开风险。**

## 验收状态
在生成本审核包时，隔离 Windows 实例完成 84/84 需要的节点类型注册、单段生成、六段连续生成、39 帧续接保护和音视频合并，六段实测约 **541 秒**。此数字是测试记录，不是所有硬件必须达到的性能线。

本次后续维护仅对文档、第三方许可证归档和**可选 V28 Gemma 本地模型路径**进行了调整；未重新进行 GPU E2E，不能把历史本地通过外推为 RunningHub 云端已经通过。原生产环境未改动。

**漂移锚定为当前相关能力；旧 S4 Clean Rebase 属隐藏停用的遗留机制，不作为审核前置条件。**

## 授权与安全
- **仓库可见性与软件授权是两回事。** 自研源码未附统一开源许可证；公开仓库不自动授予第三方商业再分发、私有云改版转售等权利。
- `custom_nodes/H3_AudioUpgrade/vendor/nodes.py` 使用来自 [ComfyUI-H3-AudioRefine](https://github.com/Adudeguyman/ComfyUI-H3-AudioRefine) 的 MIT 授权代码；完整声明在 `custom_nodes/H3_AudioUpgrade/vendor/LICENSE`。
- 不含个人参考图片、输出视频、真实密钥、`sidecar.ini`、大模型权重或私有研发仓库历史。
- **历史提示：现有 Git 提交历史曾包含 Windows 绝对路径。即使最新文件已删去这些路径，公开旧提交仍可能暴露它们；正式切换 Public 前必须清理历史或改用干净历史新仓库。**
- 云端需要运行 Python 自定义节点、前端 JS、Sidecar/HTTP 路由的权限；平台必须独立验证 Linux 和 GPU 适配。不得未经许可触发付费 GPU 测试。

详细部署及风险清单见 [docs/DEPLOYMENT_CN.md](docs/DEPLOYMENT_CN.md)。
