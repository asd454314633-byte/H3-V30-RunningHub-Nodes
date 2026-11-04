# H3 V30 — RunningHub 技术审核节点包

**此仓库为可供技术审核的源码快照，尚未验证 RunningHub 云端部署；公开可见不等于开源授权。**

## 内容
- `custom_nodes/`：19 个项目目录，覆盖导演台、漂移锚定、音频、Native Continuation、**尾部 12 Token 精修（`h3_tail12_quick`）**、Sidecar、前端 JS、缓存与辅助模块。
- `workflows/H3_V30_RunningHub_CLEAN_NOLOOP.json`：脱敏工作流，186 个节点、240 条连线、1 个子图；`extra.h3_tail12=true`。
- `docs/DEPENDENCIES.md`：7 个第三方插件的上游 GitHub 地址、固定 SHA 和许可证提示；插件源码不随审核包重复打包。
- `docs/MODEL_INDEX.csv`：19 项模型索引及下载来源，**不包含模型权重**。
- `patches/`：MAINodes v1.0.5 端口范围兼容补丁。
- `docs/LOCAL_E2E_RESULT.md`：隔离 Windows RTX 5090 D 功能实测记录。
- `docs/DEPLOYMENT_CN.md`：**部署顺序、目录结构、环境差异、FFmpeg、Sidecar、可选导演服务、Linux 注意事项与对外公开风险。**

## 2026-11-04 更新：补入尾部 12 Token 精修
首版快照遗漏了生产环境正在使用的**尾部 12 Token 精修**。该功能在工作流 `extra.h3_tail12=true` 时自动生效，无单独界面开关：每段存档后对最后 12 个视频 token（39 帧）做 2 步精修并另存 `seg_%05d_tail12`，下一段以修复版作为续接前缀；最后一段不产出。

- 新增 `custom_nodes/h3_tail12_quick`：5 个节点类（`H3Tail12LoadAccepted`、`H3Tail12Extract`、`H3Tail12Splice`、`H3Tail12Commit`、`H3Tail12TrimMirror`）及 `/h3/tail12/status` 路由。
- `H3_Prompt_Sidecar` 同步至生产当前版本：新增 `web/h3_quality_switches.js`、`web/h3_six_chain_contract.mjs`，并更新六段执行、回执、合并相关文件；其他模块同步至生产当前版本。工作流文件未改。

## 验收状态
本次更新后在隔离 Windows RTX 5090 D 实例上重新实测：84/84 工作流节点类型及 5 个尾 12 节点注册；六段连续生成 S1–S6 全部 SUCCESS，S1–S5 每段产出尾 12、S2–S6 每段读取前一段尾 12（逐段核对实际提交图）；合并 1263 帧 / 52.7 秒，含立体声音频。六段合计约 **718 秒**（含尾 12 精修）。此数字是测试记录，不是性能门槛。详见 [docs/LOCAL_E2E_RESULT.md](docs/LOCAL_E2E_RESULT.md)。

不能把本地通过外推为 RunningHub 云端已经通过。原生产环境未改动。

**漂移锚定为当前相关能力；旧 S4 Clean Rebase 属隐藏停用的遗留机制，不作为审核前置条件。**

## 授权与安全
- **仓库可见性与软件授权是两回事。** 自研源码未附统一开源许可证；公开仓库不自动授予第三方商业再分发、私有云改版转售等权利。
- `custom_nodes/H3_AudioUpgrade/vendor/nodes.py` 使用来自 [ComfyUI-H3-AudioRefine](https://github.com/Adudeguyman/ComfyUI-H3-AudioRefine) 的 MIT 授权代码；完整声明在 `custom_nodes/H3_AudioUpgrade/vendor/LICENSE`。
- 不含个人参考图片、输出视频、真实密钥、`sidecar.ini`、运行时用户数据、大模型权重或私有研发仓库历史。
- 云端需要运行 Python 自定义节点、前端 JS、Sidecar/HTTP 路由的权限；平台必须独立验证 Linux 和 GPU 适配。不得未经许可触发付费 GPU 测试。

详细部署及风险清单见 [docs/DEPLOYMENT_CN.md](docs/DEPLOYMENT_CN.md)。
