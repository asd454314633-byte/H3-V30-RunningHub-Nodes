# H3 V30 公开发布包：更新优化缺口冻结清单（补全版）

> 审计日期：2026-11-07；**补全对象：前版 76 个 `REVIEW_FILE` 与 69 个私有独有文件**。本清单归档于 GitHub 独立审核分支，仅用于差异跟踪，不代表源码更新或发布验收。
>
> 公开固定基线：`asd454314633-byte/H3-V30-RunningHub-Nodes@7331d54d3e273b6a1e60f7fe6bb8ccdcc996a040`（公开 `main`）。
>
> 私有固定基线：`asd454314633-byte/H3-Director-Private-Handoff@c5658e6082496886976795f66adab0704bd89b79`，比较前缀 `updates/2026-11-07-main-sync/source/runtime/`。
>
> Reviewer V2 现有 GitHub 审核清单位于 `audit/reviewer-v2-checklist-20261107/docs/REVIEW_SCOPE.md`（提交 `786319b`）；本补充清单与逐文件 JSON 索引归档于同一审核分支；原审核要求保留。
>
> 口径：公开 165 文件、私有 runtime 222 文件；同路径 153（其中 148 Blob 不同、5 Blob 相同），私有独有 69，公开独有 12。**差异数不等于功能更新数。**

## 0. 最新盘点裁定（先读）

**148 个 Blob 不同文件已完成文件级差异分流，无剩余 `REVIEW_FILE`：**

- `NO_ACTION_NORMALIZED`：127 个，实际两份文件去除 CRLF/LF 差异后内容完全相同，**不需要重复移植**。
- `KEEP_PUBLIC_PORTABILITY`：5 个，仅相差路径硬编码、便携化或示例路径脱敏，**应保留公开版**。
- `KEEP_REDACTION`：2 个，公开版有专用脱敏/安全空注册表，**不得用生产版覆盖**。
- `CONFIRMED_GAP`：12 个同路径文件，加上私有独有 `tail12_select.py` 合计 13 个，归属于 G01–G06 功能缺口；**不是 13 个独立功能**。
- `REVIEW_RULES`：1 个，需选取导演规则增量。
- `REVIEW_HOOK`：1 个同路径文件；另一项公开独有钩子需一起审查。

**结论：原 76 个待归类文件没有发现新增的生产功能遗漏；当前仍以 G01–G08 八组为后续移植和文档修复主线。** 此结论仅覆盖固定 SHA 的源码文件级分析；动态依赖、第三方节点实际安装、逐函数回归和云端 E2E 仍未确认。

**69 个私有独有文件已完成用途初分：** 41 个测试、8 个本机核心/补丁、6 个私有运行数据与配置、5 个诊断资源、4 个已禁用实验件、1 个独立编译器桥、1 个安全接口 HOLD、1 个确认缺失功能 `tail12_select.py`、1 个私有候选说明、1 个待确认的可选 `websocket_image_save.py`。

**审核/发布裁定：** `AUDIT_FILE_TRIAGE_PASS`（文件级盘点完成） / `FUNCTION_PARITY_NOT_YET_PASS` / `CLOUD_E2E_NOT_TESTED` / `RELEASE_NO_GO`。

## 1. 首先整理，暂不更新（发布闸门）

- [x] 锁定两个 GitHub HEAD、保存文件级差异清单、核对 148/69/12/5 统计口径。
- [x] 逐文件核验 G01–G06 的关键新增实现确实存在私有快照、公开缺失。
- [x] 文件级 148 个不同 Blob 已完成分类；按功能组逐函数审阅、实际移植与回归仍需执行。
- [x] 69 个私有独有文件已完成用途初分；待验证可选节点的动态依赖。
- [ ] 根据功能组生成最小候选文件补丁清单与依赖闭包；不得整树覆盖。
- [ ] 发布前重新审计所有历史 Git 提交、个人邮箱、绝对路径、媒体引用、提示词、模型注册表、许可证。
- [ ] 完成独立隔离验收、重新构建 SHA256、提交 Graph/Sidecar/NOLOOP/CPU/六段真实回执。
- [ ] 平台真正授权后才进行云端 GPU 验收；禁止把导入成功宣传为可生产。

## 2. 已确认缺失：按功能组关闭（不是单文件替换）

| 编号 | 功能/状态 | 牵涉文件 / 实际差异 | 关闭条件 |
|---|---|---|---|
| G01 | **P0 / CONFIRMED_GAP**：E1 尾12单次解码 | `H3_Prompt_Sidecar/six_resume.py`、`web/h3_quality_switches.js`、`web/h3_six_execute.js` | S1-S5 单次解码、S6 不修、前缀与回执 SHA/latent 血缘一致，保留 stale 前缀退役/重跑无死锁 |
| G02 | **P0 / CONFIRMED_GAP**：E3 V30 六段文本预载 | `web/h3_six_execute.js`、`six_ui.js`、`h3_workflow_helpers/nodes.py` | Store/Pick、V30 1106/138/1042 匹配；长歌关命中且逐位一致，长歌开安全回退，缓存失效可靠 |
| G03 | **P0 / CONFIRMED_GAP**：E5 接缝连续引导 | `web/h3_six_execute.js`、`six_ui.js` | S2–S6 开关生效，S1 不变；提交文字及图结构与 E3 协同一致 |
| G04 | **P0 / CONFIRMED_GAP**：E6 保色锚定 | `H3_DriftAnchor/drift_core.py`、`__init__.py`、`web/h3_quality_switches.js`、`h3_six_execute.js` | `mean_keep_color`、开关参数、legacy 回退、S2–S6 效果及逐位/色差验收 |
| G05 | **P0 / CONFIRMED_GAP**：参考音频开关尊重存档 | `H3_ChineseDirectorUI/js/chinese_director.js`、`h3_workflow_helpers/web/h3_foolproof_v3_dashboard.js` | 有文件但已关的开关不自动重启；选择新文件开启；无文件自动关闭；必须保留 NOLOOP 的 `app.graph._nodes` 回退 |
| G06 | **P0 / CONFIRMED_GAP**：尾12自由合并选择 | 新增 `H3_Prompt_Sidecar/tail12_select.py`、联动 `free_merge.py`、`web/h3_native_merge.js`、`web/h3_six_segment_director.js` | `project_id` 透传，严格/宽松回执与哈希、血缘、篡改/缺失回退、S1–S5 选修复版，S6 选正式版、音视频完整 |
| G07 | **P1 / REVIEW_RULES**：导演镜头续接规则 | `H3_Prompt_Sidecar/frozen_h3_rules.md` | 仅提取续接渐变规则，不覆盖公开包现有脱敏/版权边界 |
| G08 | **P1 / DOC_GAP**：Spark-H3 / LightVAE 的依赖和模型索引 | `docs/DEPENDENCIES.md`、`docs/MODEL_INDEX.csv`，不是默认复制权重 | 真实上游、版本、兼容矩阵和哈希有据可查；默认关闭路径不宣称平台已安装 |

## 3. 另外必须追踪的阻断与边界（不是新增优化）

| 编号 | 分类 | 内容 | 后续裁决 |
|---|---|---|---|
| R01 | P0 / 安全 | 公开 `h3_adaptive_host_warm_inplace/__init__.py` 的旧全局执行钩子；私有当前只有被动合同模块 | 审计 `h3_partial_diffusion_evict` 依赖闭包，禁止按目录粗暴删除 |
| R02 | P0 / 安全 | `h3_sampler_to_vae_residency_probe` 的全局 VAE/模型加载钩子与被动候选差异 | 先确认候选导入闭包、Linux 退回；不可把实验 shim 宣传为生产验收 |
| R03 | P0 / 授权 | `H3_V28_Director/skills/official-minimax-h3-prompt` 三份官方 Skill 文件再分发风险 | 明确上游许可前不直接捆绑；可改来源说明/安装指针，确认无隐性运行依赖 |
| R04 | P0 / 机密 | 私有 `model_registry.json` 含本机模型路径；`v28_state_machine.py` 包含私人 WinGet 目录 | 保留公开脱敏版本，不同步私有配置及本机路径 |
| R05 | P1 / 发布 | `SHA256_MANIFEST.json` 仍为 2026-11-04 旧状态 | 最终构建后重新计算；勿把旧 Local E2E PASS 复用为 V2 PASS |
| R06 | P1 / NOLOOP | 公开工作流 186 节点/240 连线/1 子图，私有生产编排 179/230/2 不同 | 保留公开图；验证动态图注入后节点引用、API 提交及开关生效，不直接覆盖 |
| R07 | P0 / Git 历史 | 审核分支提交 `786319b` Author/Committer 使用个人 Gmail，而 main 原为 noreply | 独立处理元数据泄露，未来提交统一匿名；不要假设重写 HEAD 可删掉旧可见 SHA |
| R08 | P1 / 运行环境 | 现有 84 静态可执行类及动态尾12、预载类别不是相同计数口径 | 最终构建另立可复现的 `/object_info` 清单，不把 UUID 子图当插件 |
| R09 | P1 / 平台 | 2026-11-07 私有同步快照报告自述 `SYNC_COMPLETE_WITH_EXCEPTIONS` | 不把私有同步成功等同于平台部署成功；留存快照来源、补齐依赖闭包 |

## 4. 新补齐的五项具体源码差异（防止误复制）

| 源码文件 | 实际差异 | 决定 |
|---|---|---|
| `custom_nodes/H3_V28_Director/tools/ui_contract_guard.py` | 发布版使用相对 UI 合约文件路径；私有版硬编码本机 D 盘绝对路径 | 保留公开版 |
| `custom_nodes/H3_V28_Director/tools/v28_emit_schemas.py` | 发布版示例数据将本机输出文件路径替换为占位符 | 保留公开版 |
| `custom_nodes/H3_V28_Director/v28_gemma_runtime.py` | 发布版从 H3_GEMMA_MODEL 环境变量或工程模型目录解析，私有版硬编码本机 GGUF 路径；必须保留公开版配置能力 | 保留公开版 |
| `custom_nodes/H3_V28_Director/v28_paths.py` | 发布版将私有 ComfyUI 实验 venv 路径脱敏 | 保留公开版 |
| `custom_nodes/h3_workflow_helpers/web/h3_timeline_registry_data.js` | 发布版将数据源中的本机 D 盘路径改为 <project> 占位符 | 保留公开版 |

这五项都经双方固定 SHA 全文读取并进行换行归一化；只是路径类差异，**不能统计为新增功能**。与上一版已登记的 `v28_state_machine.py`、`h3_conditioning_prebake/model_registry.json` 一并纳入敏感路径回归检查。尤其 `v28_gemma_runtime.py` 公开版使用 `H3_GEMMA_MODEL` 环境变量，属于可移植能力，不能反向降级。

## 5. 69 个私有独有文件的用途分类

| 类型 | 文件数 | 本轮处理 |
|---|---:|---|
| 回归测试脚本（V28 / workflow helpers / conditioning prebake / Sidecar） | 41 | 保留私有测试资源，按需选入隔离 CPU/JS 回归；不全量作为节点发布 |
| 本机 ComfyUI 核心及补丁 | 8 | 禁止因差异复制进入插件包 |
| 本机 Sidecar 配置、日志、启动等 | 6 | 不发布，不同步敏感运行数据 |
| 诊断插件/观察工具 | 5 | 本轮排除，不是生产功能增量 |
| 禁用/旧候选 | 4 | 本轮排除 |
| 独立 8210 编译器桥 | 1 | 本轮排除 |
| 实例身份/信息接口 | 1 | 安全 HOLD；接口返回 argv、本机输入/输出/user 目录等，先审权限和必要性 |
| `tail12_select.py` | 1 | G06 已确认功能缺口，进入选择性补丁清单 |
| `CANDIDATE_README.md` | 1 | 私有候选说明；只引用其中依赖闭包事实，不当作运行模块 |
| `websocket_image_save.py` | 1 | 可选节点待定：NOLOOP 的 193 个主画布/子图节点实例中未直接引用 `SaveImageWebsocket`；仍需验证运行时动态注入 |
| **合计** | **69** | |

41 个测试文件明细：V28 29、`h3_workflow_helpers` 7、`h3_conditioning_prebake` 4、Sidecar 1。测试文件存在不等于执行通过；应按功能组选择相关测试，保留环境、退出码、哈希及失败记录。

## 6. 发布阻断与状态边界（必须和缺失功能分开）

| 编号 | 类别 | 判断 | 后续动作 |
|---|---|---|---|
| B01 | 安全 | 公开旧全局 execute hook / VAE hook 风险仍在 | 先审 `h3_partial_diffusion_evict` 对 `omniref_model_contract.py` 的静态 import 依赖，再决定钩子去留，严禁按目录删除 |
| B02 | 授权 | 官方 MiniMax Skill 三个文件仍在公开 HEAD | 重新核查上游许可与运行依赖；许可不明确不得复制官方原文到新版 |
| B03 | 便携 | 5 个公开版路径已处理，私有版存在绝对路径 | 保持公开实现，扫描所有候选补丁里的 Windows 盘符、用户目录、私有引用 |
| B04 | 完整性 | 清单只证明源码差异；真实 RunningHub 自定义节点和模型安装未验证 | CPU 导入/前端 JS/Sidecar/NOLOOP/GPU 分级取证，云端单独判定 |
| B05 | 历史/邮箱 | 审核分支提交元数据有个人 Gmail | 后续提交统一 noreply；历史泄露另案处理，不能以重写 HEAD 当成完全消失 |
| B06 | 输出 | 已归类 229 个文件，但没有生成 V2 发行产物 | 生成真正补丁后才重建 manifest、README、模型索引、依赖表；不能提前宣告 PASS |
| B07 | 测试边界 | P1/P2 未完成正式晋升；9 图路线保留；L1 旧判断已撤回 | 禁止误纳入 G01–G08，防止历史旧结论再触发错误修复 |
| B08 | 未确认可选 | `SaveImageWebsocket` 只见于私有额外节点 | 验证运行时引用和原始依赖；非必需则保留为可选资源，不进入发行包 |

## 7. 后续实际处理顺序（阶段 Gate）

1. **Gate 0：本地盘点完成**。固定两个提交 SHA，保留 229 条路径级记录和分组决策；**无源码更新**。
2. **Gate 1：按 G01–G06 做最小补丁计划**。每项记录：受影响文件、函数/节点、公开与私有源哈希、输入输出契约、NOLOOP 适配、回退策略；G07 单独移植规则，G08 仅补有来源的文档。
3. **Gate 2：先解除 B01/B02/B03/B05 风险**。所有本机硬编码路径/Token/媒体/提示词/模型注册表/官方 Skill 授权逐项检查，必要时隔离于新的干净发行历史。
4. **Gate 3：隔离 CPU/前端验证**。固定 ComfyUI/Python/Torch、7 个第三方依赖、84 个静态类、Store/Pick、5 个尾12类、Sidecar API、UI 开关、GraphToPrompt、Linux 兼容、FFmpeg。`84/89/91` 不得混算。
5. **Gate 4：在授权隔离 GPU 环境真实测 S1–S6**。E1–E6 功能开启/关闭、错配回退、重跑、防死锁、尾12血缘/哈希与合并 A/V，记录 commit、工作流 SHA、逐段结果；本地结果不能冒充 RunningHub 云端结果。
6. **Gate 5：生成 V2 产物和证据**。重新算 SHA256，合并文档和完整脱敏扫描，保留老版验收记录不覆盖。另请用户决定 PR/合并；此前严禁更新公开 `main` 或生产 8207。

**每项关闭必须留下：** `功能 ID → 路径/函数 → 源 SHA → 目标 SHA → 独立测试 ID → 结果 → 证据链接 → 审核人/时间`；无任一证据不标 PASS。

## 8. 全部 229 条逐文件跟踪索引

以下每条均有处理状态和决策。`NO_ACTION_NORMALIZED` 表示当前两个固定 SHA 的完整文件内容归一化后相同，不代表云端环境通过；`CONFIRMED_GAP` 是静态差异，不是已验收。

| 来源类别 | 文件路径 | 当前分类 | 决策/依据 |
|---|---|---|---|
| diff | `custom_nodes/H3_Audio8Step/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Audio8Step/nodes.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Audio8Step/web/audio8.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_AudioUpgrade/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_AudioUpgrade/nodes.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_AudioUpgrade/vendor/nodes.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_AudioUpgrade/web/audio_upgrade.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_ChineseDirectorUI/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_ChineseDirectorUI/js/chinese_director.js` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_ChineseDirectorUI/js/depth_control.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_DriftAnchor/__init__.py` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_DriftAnchor/auto_lineage.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_DriftAnchor/drift_core.py` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_DriftAnchor/tail_detector.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_HostGuard/__init__.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_LongSong/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_LongSong/cross_group.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_LongSong/nodes.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_LongSong/recovery.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_LongSong/request_guard.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_LongSong/start_validation.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_LongSong/timeline_contract.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_LongSong/web/cross_group.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_LongSong/web/long_song.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_LongSong/web/start_contract.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_NativeContinuation/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_NativeContinuation/core.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_NativeContinuation/nodes.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_NextgenDirector/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_NextgenDirector/js/h3_guide_timeline.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_NextgenDirector/nodes.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/__init__.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/comfy_director_routes.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/director_engine.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/director_groups.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/director_http_core.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/director_rules.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/director_tasks.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/free_merge.py` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_Prompt_Sidecar/frozen_h3_rules.md` | `REVIEW_RULES` | 新增镜头连续约束但须保留公开发布脱敏与版权边界 |
| diff | `custom_nodes/H3_Prompt_Sidecar/generation_guard.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/native_merge_control.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/providers/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/providers/base.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/providers/context_budget.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/providers/local_llamacpp.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/providers/openai_compat.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/providers/registry.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/reference_vision.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/request_guard.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/scene_inputs.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/six_resume.py` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_Prompt_Sidecar/six_ui.js` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_clone_compat.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_execution_policy.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_flight_progress.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_free_merge.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_identity_refs.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_json_response.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_long_song.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_native_merge.js` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_native_merge_template.json` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_prompt_sidecar_bilingual.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_quality_switches.js` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_chain_contract.mjs` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_compiler.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_compiler_preview_ui.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_execute.js` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_guides.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_receipt_contract.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_segment_director.js` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_six_width_contract.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_spark_contract.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/h3_workflow_identity_guard.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/preview_history.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/recovery_blocked.html` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/recovery_entry.html` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/six_console_v2.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/six_console_v2_core.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Prompt_Sidecar/web/six_identity.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_Qwen21_NoteShim/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/skills/h3-v28-2-director/SKILL.md` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/skills/h3-v28-2-director/agents/openai.yaml` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/skills/h3-v28-2-director/references/physical-feasibility.md` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/skills/h3-v28-2-director/references/structured-plan.md` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/skills/official-minimax-h3-prompt/SKILL.md` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/skills/official-minimax-h3-prompt/references/base-en.txt` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/skills/official-minimax-h3-prompt/references/ref-en.txt` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/tools/run_optional_director_regressions.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/tools/ui_contract_guard.py` | `KEEP_PUBLIC_PORTABILITY` | 发布版使用相对 UI 合约文件路径；私有版硬编码本机 D 盘绝对路径 |
| diff | `custom_nodes/H3_V28_Director/tools/v28_emit_schemas.py` | `KEEP_PUBLIC_PORTABILITY` | 发布版示例数据将本机输出文件路径替换为占位符 |
| diff | `custom_nodes/H3_V28_Director/v28_bonsai_provider.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_bonsai_runtime.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_dialogue_track.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_director_core.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_director_prompts.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_gemma_provider.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_gemma_runtime.py` | `KEEP_PUBLIC_PORTABILITY` | 发布版从 H3_GEMMA_MODEL 环境变量或工程模型目录解析，私有版硬编码本机 GGUF 路径；必须保留公开版配置能力 |
| diff | `custom_nodes/H3_V28_Director/v28_gemma_schema.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_mock_provider.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_orchestrator.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_V28_Director/v28_paths.py` | `KEEP_PUBLIC_PORTABILITY` | 发布版将私有 ComfyUI 实验 venv 路径脱敏 |
| diff | `custom_nodes/H3_V28_Director/v28_project.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_prompt_compiler.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_V28_Director/v28_prompt_resolution.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_provider.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_routes.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_V28_Director/v28_runtime_contract.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_schemas.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/H3_V28_Director/v28_state_machine.py` | `KEEP_REDACTION` | 私有版含本机绝对路径，禁止覆盖已处理的公开版 |
| diff | `custom_nodes/H3_V28_Director/v28_ui_node.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/H3_V28_Director/web/h3_director_v28.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_conditioning_prebake/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/adaptive_bridge.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/adaptive_v1/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/adaptive_v1/core.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/attempt_lifecycle.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/cache_codec.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_conditioning_prebake/execution_state.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/model_registry.json` | `KEEP_REDACTION` | 公开审核空注册表，私有版含个人模型路径和哈希，禁止同步 |
| diff | `custom_nodes/h3_conditioning_prebake/nodes.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_conditioning_prebake/observer.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/production.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_conditioning_prebake/route_contract.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_conditioning_prebake/user_guides.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_conditioning_prebake/web/production.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_conditioning_prebake/web/route_contract.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_partial_diffusion_evict/__init__.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_sampler_to_vae_residency_probe/__init__.py` | `REVIEW_HOOK` | 私有版是被动候选 shim；公开版含全局钩子，需闭包审计 |
| diff | `custom_nodes/h3_selective_te_unload/__init__.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_te_residency_probe/__init__.py` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_workflow_helpers/__init__.py` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_workflow_helpers/nodes.py` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_candidate_guide_route.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_candidate_model_route.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_console_state.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_fl2v_recipe_authority.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_foolproof_v2_ux.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_foolproof_v3_dashboard.js` | `CONFIRMED_GAP` | 源码存在已核验的差异，按 G01-G06 组修复与验收 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_guide_authority.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_material_cell.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_omniref_lifecycle.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_timeline_registry_data.js` | `KEEP_PUBLIC_PORTABILITY` | 发布版将数据源中的本机 D 盘路径改为 <project> 占位符 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_timeline_ux.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_workflow_registry_core.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_workflow_registry_v1.js` | `NO_ACTION_NORMALIZED` | 完整文件经过 CRLF/LF 归一化后逐字相同；仅 Git Blob 不同，没有本版本源码功能增量 |
| diff | `custom_nodes/h3_workflow_helpers/web/h3_workflow_ux.js` | `NO_ACTION_NORMALIZED` | 已逐文件比较，CRLF/LF 归一化后内容一致 |
| private_only | `comfy_execution/jobs.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| private_only | `comfy_extras/nodes_sparse_attention.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| private_only | `custom_nodes/H3_LaunchFlagsBadge/__init__.py` | `EXCLUDE_DIAGNOSTIC` | 本机诊断或读写遥测工具，不属于主运行链；需单独安全审核方可讨论发行 |
| private_only | `custom_nodes/H3_LaunchFlagsBadge/web/launch_flags_badge.js` | `EXCLUDE_DIAGNOSTIC` | 本机诊断或读写遥测工具，不属于主运行链；需单独安全审核方可讨论发行 |
| private_only | `custom_nodes/H3_MemoryPolicy.disabled/__init__.py` | `EXCLUDE_DISABLED_LOCAL` | 私有禁用/旧实验插件及开关文件，不能因缺失于公开包而当作生产优化 |
| private_only | `custom_nodes/H3_Prompt_Sidecar/START_H3_DIRECTOR.ps1` | `EXCLUDE_PRIVATE` | 运行配置、日志、模型本机路径，禁止复制 |
| private_only | `custom_nodes/H3_Prompt_Sidecar/director_data/store.json` | `EXCLUDE_PRIVATE` | 运行配置、日志、模型本机路径，禁止复制 |
| private_only | `custom_nodes/H3_Prompt_Sidecar/director_model_events.jsonl` | `EXCLUDE_PRIVATE` | 运行配置、日志、模型本机路径，禁止复制 |
| private_only | `custom_nodes/H3_Prompt_Sidecar/director_preferences.json` | `EXCLUDE_PRIVATE` | 运行配置、日志、模型本机路径，禁止复制 |
| private_only | `custom_nodes/H3_Prompt_Sidecar/sidecar.ini` | `EXCLUDE_PRIVATE` | 运行配置、日志、模型本机路径，禁止复制 |
| private_only | `custom_nodes/H3_Prompt_Sidecar/tail12_select.py` | `CONFIRMED_GAP` | G06 新增尾12自由合并选择模块 |
| private_only | `custom_nodes/H3_Prompt_Sidecar/tests/six_prompt_sync.test.cjs` | `TEST_ASSET_ONLY` | 私有测试素材（H3_Prompt_Sidecar），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/_v28_bootstrap.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v282_manual_continuation.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v282_oneclick.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v282_prompt_control_backport.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v282_reference_contract.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v282_reference_hygiene.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v283_constraints_transfer.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_bonsai_cli_flags.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_bug8_seed_control.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_bug9_frame_display.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_dialogue_track.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_extract_json.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_gate6b_core.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_gate6c_submission_identity.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_gate8a_physical_feasibility.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_gate8b_deterministic_plan_structure.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_isolation.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_optional_director.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_project_hygiene.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_protected_ui.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_provider.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_provider_agnostic_runtime.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_reasoning_budget.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_route_guard.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_schemas.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_state_machine.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_static_audit.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_ui_contract.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/H3_V28_Director/tests/test_v28_widget_instructions.py` | `TEST_ASSET_ONLY` | 私有测试素材（H3_V28_Director），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_adaptive_host_warm_inplace/CANDIDATE_README.md` | `KEEP_PRIVATE_DEPENDENCY_NOTE` | 私有候选 A 辅助说明，证明 omniref_model_contract.py 为 h3_partial_diffusion_evict 的依赖；公开发布应在审核文档转述，不照搬私有候选文件 |
| private_only | `custom_nodes/h3_adaptive_host_warm_v1.disabled/__init__.py` | `EXCLUDE_DISABLED_LOCAL` | 私有禁用/旧实验插件及开关文件，不能因缺失于公开包而当作生产优化 |
| private_only | `custom_nodes/h3_conditioning_audit_probe_20261004.disabled/__init__.py` | `EXCLUDE_DISABLED_LOCAL` | 私有禁用/旧实验插件及开关文件，不能因缺失于公开包而当作生产优化 |
| private_only | `custom_nodes/h3_conditioning_prebake/observe.enabled.disabled_20261006` | `EXCLUDE_DISABLED_LOCAL` | 私有禁用/旧实验插件及开关文件，不能因缺失于公开包而当作生产优化 |
| private_only | `custom_nodes/h3_conditioning_prebake/tests/route_contract.test.mjs` | `TEST_ASSET_ONLY` | 私有测试素材（h3_conditioning_prebake），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_conditioning_prebake/tests/task_workflow.test.mjs` | `TEST_ASSET_ONLY` | 私有测试素材（h3_conditioning_prebake），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_conditioning_prebake/tests/test_omniref_contract.py` | `TEST_ASSET_ONLY` | 私有测试素材（h3_conditioning_prebake），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_conditioning_prebake/tests/test_route_contract.py` | `TEST_ASSET_ONLY` | 私有测试素材（h3_conditioning_prebake），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_instance_identity/__init__.py` | `HOLD_SECURITY_ENDPOINT` | h3_instance_identity 暴露实例标识、命令行 argv 和 input/output/user 等本机目录；NOLOOP 静态图未引用，发布前必须独立审查路由权限和必要性 |
| private_only | `custom_nodes/h3_precision_audit/__init__.py` | `EXCLUDE_DIAGNOSTIC` | 本机诊断或读写遥测工具，不属于主运行链；需单独安全审核方可讨论发行 |
| private_only | `custom_nodes/h3_selective_diffusion_unload/__init__.py` | `EXCLUDE_DIAGNOSTIC` | 本机诊断或读写遥测工具，不属于主运行链；需单独安全审核方可讨论发行 |
| private_only | `custom_nodes/h3_six_compiler_bridge/__init__.py` | `EXCLUDE_COMPILER_BRIDGE` | 8210 独立编译器桥接，主链并非硬依赖；不可混入可移植发布包 |
| private_only | `custom_nodes/h3_tail12_quick/tail12_extra_model_paths.yaml` | `EXCLUDE_PRIVATE` | 运行配置、日志、模型本机路径，禁止复制 |
| private_only | `custom_nodes/h3_transfer_audit/__init__.py` | `EXCLUDE_DIAGNOSTIC` | 本机诊断或读写遥测工具，不属于主运行链；需单独安全审核方可讨论发行 |
| private_only | `custom_nodes/h3_workflow_helpers/tests/backend_condition_routing.test.cjs` | `TEST_ASSET_ONLY` | 私有测试素材（h3_workflow_helpers），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_workflow_helpers/tests/dashboard_resize.test.cjs` | `TEST_ASSET_ONLY` | 私有测试素材（h3_workflow_helpers），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_workflow_helpers/tests/hidden_prompt_guard.test.cjs` | `TEST_ASSET_ONLY` | 私有测试素材（h3_workflow_helpers），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_workflow_helpers/tests/native20.test.cjs` | `TEST_ASSET_ONLY` | 私有测试素材（h3_workflow_helpers），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_workflow_helpers/tests/reference_ordinals.test.cjs` | `TEST_ASSET_ONLY` | 私有测试素材（h3_workflow_helpers），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_workflow_helpers/tests/test_native_reference_payload.py` | `TEST_ASSET_ONLY` | 私有测试素材（h3_workflow_helpers），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/h3_workflow_helpers/tests/test_native_switch_contract.py` | `TEST_ASSET_ONLY` | 私有测试素材（h3_workflow_helpers），不属于执行插件发布的新增功能；后续从此组选择性复用隔离回归，验证跨平台依赖 |
| private_only | `custom_nodes/websocket_image_save.py` | `REVIEW_OPTIONAL_NODE` | SaveImageWebsocket 示例式额外节点，公开 NOLOOP 主图及子图未引用；仍需在运行时注入图/调用链确认是否真正不依赖，禁止仅据文件缺失导入 |
| private_only | `execution.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| private_only | `folder_paths.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| private_only | `listener_forensics.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| private_only | `local_patches/winerror64_20261019/accept_candidate.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| private_only | `local_patches/winerror64_20261019/sitecustomize.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| private_only | `main.py` | `EXCLUDE_CORE` | ComfyUI 本机核心/系统补丁，不随插件发布 |
| public_only | `.gitignore` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `README.md` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `SHA256_MANIFEST.json` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `custom_nodes/H3_AudioUpgrade/vendor/LICENSE` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `custom_nodes/h3_adaptive_host_warm_inplace/__init__.py` | `REVIEW_HOOK` | 公开独有旧全局执行钩子，审查后决定保留/替换 |
| public_only | `docs/DEPENDENCIES.md` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `docs/DEPLOYMENT_CN.md` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `docs/LOCAL_E2E_RESULT.md` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `docs/MODEL_INDEX.csv` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `docs/REVIEW_SCOPE.md` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `patches/ComfyUI-MAINodes_v1.0.5_timeline_port_range.patch` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |
| public_only | `workflows/H3_V30_RunningHub_CLEAN_NOLOOP.json` | `KEEP_PUBLIC_ONLY` | 公开发布专用文件；默认保留，按独立发布策略审计 |

## 9. 固定来源与审计方法

- [公开 `main@7331d54` 源码](https://github.com/asd454314633-byte/H3-V30-RunningHub-Nodes/tree/7331d54d3e273b6a1e60f7fe6bb8ccdcc996a040)
- [Reviewer V2 GitHub 原审核清单](https://github.com/asd454314633-byte/H3-V30-RunningHub-Nodes/blob/audit/reviewer-v2-checklist-20261107/docs/REVIEW_SCOPE.md)
- [GitHub 既有清单提交 `786319b`](https://github.com/asd454314633-byte/H3-V30-RunningHub-Nodes/commit/786319b53675d126be58f8d3163bba7d2777399f)
- 私有生产快照：`H3-Director-Private-Handoff@c5658e6/updates/2026-11-07-main-sync/source/runtime/`。
- 本轮对剩余 76 个文件均通过 GitHub 连接按 **固定 commit + 文件路径** 读取双方完整内容，严格比较 `.replace(\r\n,\n)` 的结果；不依赖文件名相同或 Git Blob 一致猜测。
- 69 个私有独有文件根据实际仓库树分类，并对实例身份、诊断、可选 websocket 等代表文件进行源码读取；不把静态图中未引用等价为动态环境完全不依赖。

## 10. 最新分类计数

| 分类 | 文件数 | 阶段解释 |
|---|---:|---|
| `CONFIRMED_GAP` | 13 | G01–G06 相关源码文件 |
| `EXCLUDE_COMPILER_BRIDGE` | 1 | 按逐文件说明处理 |
| `EXCLUDE_CORE` | 8 | 按逐文件说明处理 |
| `EXCLUDE_DIAGNOSTIC` | 5 | 按逐文件说明处理 |
| `EXCLUDE_DISABLED_LOCAL` | 4 | 按逐文件说明处理 |
| `EXCLUDE_PRIVATE` | 6 | 按逐文件说明处理 |
| `HOLD_SECURITY_ENDPOINT` | 1 | 身份接口安全 HOLD |
| `KEEP_PRIVATE_DEPENDENCY_NOTE` | 1 | 按逐文件说明处理 |
| `KEEP_PUBLIC_ONLY` | 11 | 按逐文件说明处理 |
| `KEEP_PUBLIC_PORTABILITY` | 5 | 不覆盖发布版便携/脱敏实现 |
| `KEEP_REDACTION` | 2 | 按逐文件说明处理 |
| `NO_ACTION_NORMALIZED` | 127 | 无需同步，换行差异 |
| `REVIEW_HOOK` | 2 | 全局钩子需单独审计 |
| `REVIEW_OPTIONAL_NODE` | 1 | 运行时引用待查 |
| `REVIEW_RULES` | 1 | 按逐文件说明处理 |
| `TEST_ASSET_ONLY` | 41 | 私有测试资产，按需取用 |
| **总计** | **229** | 148 同路径不同 Blob + 69 私有独有 + 12 公开独有 |

### 已完成与未完成的边界

- 文件级归类：**229/229 已登记处理建议，148/148 不同 Blob 已有初步性质判定，76/76 原 REVIEW_FILE 已闭环**。
- 正式可部署的更新优化：**0 项在本轮移植或实测**；G01–G08 全部仍须经过对应 Gate。
- 本补充清单与 JSON 索引归档在 GitHub 审核分支；`docs/REVIEW_SCOPE.md` 继续保留原要求，公开 `main` 不改动。
