# H3 V30 / RunningHub 部署说明（技术审核候选）

更新日期：2026-11-04。**这是技术审核包，不是已经验证的 RunningHub 云端一键安装包。**

## 1. 交付物和已验证范围

- `custom_nodes/`：18 个目录，其中 17 个含 `__init__.py` ComfyUI 入口；`h3_adaptive_host_warm_inplace` 是辅助源码目录，不应被当成独立可注册插件。
- `workflows/H3_V30_RunningHub_CLEAN_NOLOOP.json`：186 主画布节点、240 连线、1 子图，84 个可执行类型（另 1 个子图引用标识）。
- `docs/DEPENDENCIES.md`：7 个第三方插件上游和经过 Stage-D 关键文件 SHA256 核对的精确 Git 提交。**不含第三方插件源码**。
- `docs/MODEL_INDEX.csv`：19 项模型及用途/目标目录/来源。权重、真实图片/视频、密钥和生产配置不随包分发。
- `docs/LOCAL_E2E_RESULT.md`：Windows RTX 5090 D 隔离机功能实测历史记录（六段真实生成 541 秒，不设面向所有用户的 300 秒性能门槛）。当前提交在该次验收后修订了可选 V28 Gemma 模型路径，并补充了文档及第三方许可证，**未对本次修订重新完成 E2E**。
- `custom_nodes/H3_AudioUpgrade/vendor/LICENSE`：保留打包的上游 AudioRefine MIT 授权声明；不应把该上游代码认作自研首发。
- 不包含独立 8210 编译器。旧 S4 Clean Rebase 属隐藏、停用的遗留能力，不列入主线验收。

## 2. 需要由 RunningHub 确认的环境

平台需要提供可安装自定义 Python 节点和前端 JS 扩展、可挂载应用内 HTTP 路由、可读写用户数据空间、支持 CUDA 的 ComfyUI 运行镜像，以及模型存储和下载权限。**不能只上传 JSON 和模型就自动拥有这些服务。**

| 层 | 要求/备注 |
|---|---|
| 操作系统 | 原实测环境为 Windows；RunningHub Linux 容器需另行验证 |
| ComfyUI | 需提供实际 core commit、`/system_stats` 和前端版本；审核包未锁死完整 core 镜像 |
| Python/Torch/CUDA | 以平台镜像为准，需与 MiniMax H3、各插件和 GPU 匹配；不要未经测试直接升级 |
| 自研节点 | 17 个带 `__init__.py` 的包，以及一个辅助目录，必须作为 `custom_nodes` 下的**并列目录**安装 |
| 第三方节点 | 七个仓库分别检出 `docs/DEPENDENCIES.md` 所列精确 SHA，再按各自说明安装 Python 依赖 |
| MAINodes | 锁定 v1.0.5 / b99bb83，应用本包 `patches/` 中端口区间补丁 |
| FFmpeg | `ffmpeg` 与 `ffprobe` 均须在 ComfyUI 进程的 PATH 中可调用（续接音频和合并使用） |
| GPU | 平台需要记录显存、系统 RAM、缓存/卸载策略及 Linux 驱动；不能保证任何配置下的生成时长 |
| Sidecar | 需要配置服务端数据目录、模型提供方或经授权的 LLM 服务；检查 `/h3/*`、`/h3-director/*` 等实际注册路由及鉴权策略 |
| V28 本地 LLM | **可选**；其中旧 Gemma/Bonsai 启动器仍具有 Windows/llama.cpp 特定依赖，并未证明可在 Linux 运行，不能视为主链云端能力 |

## 3. 安装结构（示例，非自动安装脚本）

假设平台在**新建隔离镜像**内设定环境变量 `COMFYUI_DIR=/workspace/ComfyUI` 并具备只读 GitHub 仓库访问权限：

```bash
git clone https://github.com/asd454314633-byte/H3-V30-RunningHub-Nodes.git
cd H3-V30-RunningHub-Nodes
# 只复制目录内容，避免形成 custom_nodes/H3-V30-RunningHub-Nodes/custom_nodes/... 多层嵌套
cp -a custom_nodes/. "$COMFYUI_DIR/custom_nodes/"
```

第三方必须逐个按 `docs/DEPENDENCIES.md` 克隆到 `$COMFYUI_DIR/custom_nodes/<插件名>`，`git checkout <精确40位SHA>`，再使用 **ComfyUI 的 Python 解释器**安装各项目需要的依赖。禁止默认使用最新 main。MAINodes 应在检出 b99bb83 后用 `git apply --check` 验证补丁，然后再执行 `git apply`。

不要在生产 8197/8207 或现有 RunningHub 模板内直接覆盖；先在全新隔离镜像测试。上述例子假定平台允许部署自定义节点，不能证明平台允许执行这些 shell 命令。

## 4. 模型和配置

按 `docs/MODEL_INDEX.csv` 将主路线模型放入 `ComfyUI/models/diffusion_models`、`text_encoders`、`vae`、`pdd_acc` 等对应目录。模型文件名与工作流引用必须一致。模型索引包含可选分支；本地报告另指出有 3 个仅由默认关闭的可选节点引用的模型未列入清单，使用那些分支时应再补来源和哈希。

- 本包 `h3_conditioning_prebake/model_registry.json` 内容为 `[]`：仅满足导入时的空配置要求，不是现场模型部署清单。根据平台实际模型位置配置所需的合法注册项，不要复制原机器私有路径。
- Sidecar 的 `H3_SIDECAR_CONFIG`、`H3_SIDECAR_DATA` 及提供方凭据等应由平台以环境变量/密钥管理器注入；**绝不提交实际 key、`sidecar.ini`、私人图片、生成记录**。
- V28 Gemma 模型的路径已改为 `H3_GEMMA_MODEL` 环境变量，未设置时指向 `H3_GEMMA_ROOT/models/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced-Q4_K_M.gguf`。这仅去除机器私有绝对路径，**不代表 Gemma 本地进程已经适配 Linux**。云端不需要该可选导演功能时，不应启动它。
- 基础视频生成是否需要外部语言模型取决于所选择导演/工作流模式，不能把“仅模型权重 + Python”概括成所有 UI 功能都可用。

## 5. 验证顺序

1. 静态：检查 18 个自研目录、固定第三方提交、MAINodes 补丁、工作流 186/240/1、Git SHA256 清单；留存 ComfyUI 核心/前端/Python/Torch/CUDA 真实版本。
2. CPU：启动 ComfyUI，检查 `/object_info` 的 84 个**工作流实际需要的可执行类型**，排除子图 UUID 作为可安装包的误判；读取 JS 前端错误、Sidecar 初始化和 HTTP 路由。
3. GPU：以测试图、明确费用上限测试单段、六段续接、39 帧保护、视频/双声道音频合并、模型动态卸载。不存在通用于低配置机器的 300 秒阈值；只记录真实性能与显存。
4. Linux 上额外验证 `H3SelectiveTEUnload` 的 fail-closed 分支、运行路径、依赖与路由权限。出错不能宣称云端通过。

**未验证状态**：RunningHub 云端安装、Linux 兼容性、付费 GPU 实际执行、所有可选模型与第三方软件完整许可证闭环，均仍需技术审核人员确认。

## 6. 对外可见性及许可边界

公开 GitHub 只代表代码可浏览，**不等于授权对自研代码进行商业再分发、镜像复刻或许可转授**。本仓库没有统一的自研代码开源许可证；是否开源及商业授权需要权利人另外决定。第三方来源及许可证见 `docs/DEPENDENCIES.md`，打包的 AudioRefine 源码使用 `custom_nodes/H3_AudioUpgrade/vendor/LICENSE` 中的 MIT 条款。

**重要隐私警告**：仓库当前 Git 历史中的早期提交包含修订前的 Windows 绝对模型路径。即使最新工作树已替换该路径，变更为 Public 后历史提交仍可能被任何人查看。公开前应使用经过审计的干净历史或重建仓库；只修订 HEAD 不构成历史清除。
