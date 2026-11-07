# RunningHub engineer review scope

**Not production-ready.** The private review snapshot requires
platform-hosted Python custom-node deployment, frontend JS support,
the H3 Sidecar backend, and /h3/* services. Full six-segment operation
and cloud GPU performance have never been validated on RunningHub.

1. Confirm isolated custom-node install permissions and platform
   ComfyUI/Python/Torch/CUDA/GPU image versions.
2. Install first-party package and pinned third-party dependencies.
3. Verify /object_info registration of all 84 actual node classes;
   UUID subgraph instances are *not* separate installable plugins.
4. Verify Sidecar configuration injection using H3_SIDECAR_CONFIG,
   extension imports and /h3/* API health. Never request production
   sidecar.ini, model registry, user files or API tokens.
5. On Linux, verify H3SelectiveTEUnload telemetry fail-closed path.
6. Only after CPU/preflight acceptance, request an explicit budgeted
   cloud GPU test authorization.

An independent 8210 compiler is not a required part of this review.
Never treat successful import as successful end-to-end generation.


---

# Reviewer V2 — 2026-11-07 源码功能对齐复核与待办清单

> 状态：AUDIT_ONLY / FUNCTION_PARITY_NOT_YET_PASS / CLOUD_E2E_UNCONFIRMED  
> 写入范围：只更新本审核清单的独立 Git 分支，不修改正在审核的 main 代码，不动 8207 生产，不触发付费 GPU。  
> 审计固定基线：公开 HEAD 7331d54d3e273b6a1e60f7fe6bb8ccdcc996a040；2026-11-07 私有生产源码快照对应 HEAD c5658e6082496886976795f66adab0704bd89b79。**生产磁盘快照存在，不等于 RunningHub 云端节点已安装。**
>
> 状态代码：**GAP** = 已核实公开包缺失；**KEEP** = 已核实不应直接同步；**REVIEW** = 仍需审查、不得凭 SHA 不同覆盖；**HOLD** = 未正式晋升；**PASS_OLD** = 旧版已有独立证据但不能转成 V2 PASS；**NOT_TESTED_V2** = 本次版本未运行验收。

## A. 源码总体对账

- [x] 两个 GitHub HEAD 已直接读取：公开 7331d54；私有 c5658e6（2026-11-07）。
- [x] 两个源码树完成同路径 Git Blob 比较：公开仓库总 165 个文件；私有快照的 runtime 树 222 个文件；相同路径 153；Blob 不同 148；快照额外 69；仅公开仓库存在 12。注意上述对比包含 runtime/engine/配置/测试与审核文档，不是可直接发布的增量集合。
- [x] 148 个 Blob SHA 不同 **不等于** 148 项功能变化。已对主要运行关键文件做 CRLF/LF 归一化的逐文件比较。
- [ ] **REVIEW：** 148 个同路径差异尚未全部逐函数分类。提交前输出「功能变化 / 仅换行 / 发布脱敏 / 非生产实验 / 仅文档」五类对照表，并以文件级差异检查结果闭环。
- [ ] **REVIEW：** 校验最终 Reviewer V2 是从受控的 2026-11-07 生产快照选择性导出，而非任意旧实验树拼装。记录提取版本和每个修改的来源哈希。
- [ ] **REVIEW：** 最终生成包必须能在 Linux 隔离 ComfyUI 上导入；云端服务器实际部署状态目前未取证。

## B. P0 功能缺口：成组移植，不得只复制单文件

- [ ] **GAP / E1 尾12单次解码。**
  - 文件：custom_nodes/H3_Prompt_Sidecar/web/h3_quality_switches.js、web/h3_six_execute.js、six_resume.py。
  - 私有源码有 tail12_single_decode() 与 produce_single_decode；公开版没有。主成片兼作尾12修复证据，消除重复视频解码。
  - 必须保留当前公开/私有都已有的 retire_stale_tail12() 和 _superseded/tail12_stale 旧前缀退役防死锁修复；不得从更早的 E1 实验副本粗暴覆盖。
  - 验收：S1–S5 主成片与 tail12_prefix 的视频引用/SHA/latent 血缘正确、S6 无尾12修复、旧模式兼容、开→关→重跑无死锁，回执与正式合并保持闭环。

- [ ] **GAP / E3 V30 六段提示词预载。**
  - 文件：custom_nodes/H3_Prompt_Sidecar/web/h3_six_execute.js、six_ui.js；custom_nodes/h3_workflow_helpers/nodes.py。
  - 新增并注册 H3PromptPreloadStore、H3PromptPreloadPick；适配 V30 条件节点 1106/文本节点 138/音频预检 1042；预载键数字 10/10.0 统一与媒体输入变更失效处理。
  - 验收：长歌关闭、相同身份参考链 6/6 命中；不同身份/结构不匹配正确回退；长歌开启安全跳过；文本与 latent 逐位对照；提交图在所有变换完成后接 Pick；取消后的清理和错误回退有效。
  - 适用范围：私有 R9 712.3s vs R6 780.7s（−8.8%，长歌关闭），**不得**宣传为长歌开启也加速或所有硬件通用收益。

- [ ] **GAP / E5 接缝连续引导。**
  - 文件：custom_nodes/H3_Prompt_Sidecar/web/h3_six_execute.js、six_ui.js（及开关传递相关调用）。
  - 私有版新增 seamLead/SEAM_LEAD；仅按开关为 S2–S6 有条件插入一次，不改变 S1；不得重复前缀，不可破坏身份后缀处理顺序。
  - 验收：开/关的真实提交图及 N138 文本；同时验证 E3 预载文本与当段文本同序一致。

- [ ] **GAP / E6 保色锚定。**
  - 文件：custom_nodes/H3_DriftAnchor/drift_core.py、__init__.py；custom_nodes/H3_Prompt_Sidecar/web/h3_quality_switches.js、h3_six_execute.js。
  - 私有版新增 mean_keep_color 并将默认 E6 路径设置为保色均值、关闭高频/细纹/中频纹理校正；旧逻辑通过 h3_anchor_legacy 回退。公开版缺 mean_keep_color 与 driftAnchorParams。
  - 验收：前端传参与 Python INPUT_TYPES 一致，24 通道约束错误可诊断；默认/legacy 切换、S2–S6 生效、回执与图结构核对；新包不能借用旧版画质报告冒充 V2 结果。

- [ ] **GAP / 参考音频开关尊重存档。**
  - 文件：custom_nodes/H3_ChineseDirectorUI/js/chinese_director.js；custom_nodes/h3_workflow_helpers/web/h3_foolproof_v3_dashboard.js。
  - 公开版 syncAudioMasters() 遇到已选文件就把开关强制置 true；私有版仅「开关为 true 但文件不存在」时关闭，选新文件仍可开启。
  - **必须保留公开 NOLOOP 专用的 sub() 主画布回退逻辑**：公开版 1056 不存在时 app.graph._nodes 仍可找到 continuation 节点；生产版直接复制会丢掉这一适配。
  - 验收：有文件但开关 false 的保存/重载状态不变；新选文件开启；空文件自动关闭；1042 与 150 的镜像及 graphToPrompt 行为一致。私有记录只证明隔离功能，不可标 RunningHub 云端 PASS。

- [ ] **GAP / 尾12自由合并回执选择。**
  - 必需新增：custom_nodes/H3_Prompt_Sidecar/tail12_select.py（私有快照 125 行）。
  - 需联动：free_merge.py、web/h3_native_merge.js、web/h3_six_segment_director.js 中导入 h3_native_merge.js 的缓存查询参数。
  - 私有 free_merge.py /h3/free-merge/current 传 project_id，按回执、视频 SHA、修复段号和来源 latent SHA 选择尾12视频；公开版未包含新模块和前端参数。
  - 验收：严格和宽松选择、篡改拒绝、缺失回退、S1–S5 修复视频选取、S6 正式视频选择、帧数及合并音频校验，输出可审核选择记录。

- [ ] **REVIEW / 导演规则增量。**
  - 文件：custom_nodes/H3_Prompt_Sidecar/frozen_h3_rules.md。
  - 私有版新增续接段开头保持上一镜头、分镜渐变的规则；公开版已有路径脱敏，故只移植新增规则，保留原公开文件的脱敏/版权边界。director_engine.py 运行时会读取此文件。

## C. P0 运行副作用与许可证

- [ ] **REVIEW / 旧全局执行钩子**：公开 custom_nodes/h3_adaptive_host_warm_inplace/__init__.py 仍 monkey-patch MiniMaxH3ReferenceToVideo.execute；2026-11-07 私有快照已删除此入口。先审计 h3_partial_diffusion_evict 对 omniref_model_contract.py 的被动依赖；候选不得仅按目录名删除依赖文件，也不得把旧执行 hook 当成默认能力。
- [ ] **REVIEW / sampler→VAE 探针**：公开 custom_nodes/h3_sampler_to_vae_residency_probe/__init__.py 仍含对 load_models_gpu / VideoVAE.decode 的全局观测钩子；私有快照对应的是候选专属被动 shim，并非已验收云端生产版本。必须先完成与 h3_partial_diffusion_evict 的导入闭包、安全回退及 Linux 检查，再决定是否在 V2 包保留替代物。
- [ ] **GAP / MiniMax 官方 Skill 版权**：公开 custom_nodes/H3_V28_Director/skills/official-minimax-h3-prompt/ 下 SKILL.md、references/base-en.txt、references/ref-en.txt 三份仍随包提供。同账号 H3-Chinese-Director 的 THIRD_PARTY_NOTICES.md 已将其标 LICENSE_HOLD。对 V2 改为上游来源说明与安装指针，并验证没有隐性运行依赖；取得明确再分发授权前不要随包直接携带原文。
- [ ] 检查自研/第三方许可声明、AudioRefine vendor/LICENSE 完整保留；模型权重与第三方插件源码不随审核仓库重分发。
- [ ] 检查敏感材料：sidecar.ini、director_model_events.jsonl、用户目录绝对路径、模型本地路径、身份参考图片、私人视频/音频、提示词、回执、日志、tokens、密钥和多余运行配置不得进入 V2；model_registry.json 保持公开审核用的空配置，不要从私有快照覆盖。
- [ ] 最终打包后对「完整源码、工作流 JSON、子图定义、双字段 widgets_values 与 widgets_values_named、额外 metadata、文档及全部 Git 历史」执行复查；历史提交中不得遗留敏感内容。只检查 HEAD 不够。

## D. P1 需要核实、不允许凭 SHA 复制

- [x] **KEEP / 内容相同**：H3_LongSong/nodes.py、start_validation.py、cross_group.py；H3_Prompt_Sidecar/native_merge_control.py、web/h3_six_receipt_contract.js、web/h3_six_guides.js、web/h3_task_workflow.js、web/six_console_v2.js，在当前比较中归一化 CRLF/LF 后相同。
- [ ] **REVIEW / 六段导演前端**：web/h3_six_segment_director.js 主要有 h3_native_merge.js 的版本缓存参数差异；必须逐函数核对所有 import 缓存参数是否让最新 JS 真正生效。不得凭 1 行差异认定功能无关。
- [ ] **REVIEW / 长歌与回执**：以上已相同的文件保持公开基线；其他可能变化仅在最小增量范围内选取，不复写整组旧版长歌模块。
- [ ] **REVIEW / 可选注意力与解码切换**：web/h3_spark_contract.js 在公开版已包含 Spark 节点选择与 LightVAE 模型名称，**不等于云端已经拥有相关节点和模型**。在 docs/DEPENDENCIES.md 补标 ComfyUI-Spark-H3 的独立来源/版本与可选依赖边界，需实际验证再决定版本；docs/MODEL_INDEX.csv 补 LightVAE 的真实上游/哈希（目前未确认，禁止编造）。默认不启用的分支不可冒充已验证。
- [ ] **REVIEW / 模型索引**：现有 19 项索引保留；校验工作流中所有实际模型引用、默认关闭分支和注入后节点，并补齐曾记录的未列模型；对 >1GB 权重只索引来源，不打包。
- [ ] **REVIEW / 第三方固定版本**：7 个已锁定依赖及 MAINodes 端口补丁保留；只有真实兼容性证据才更换版本。

## E. 审核工作流和运行验收

- [x] **PASS_OLD / NOLOOP 静态结构**：公开 workflows/H3_V30_RunningHub_CLEAN_NOLOOP.json = 186 主画布节点、240 连线、1 子图；与 8207 正式存档 179/230/2 是不同编排，禁止直接覆盖。
- [x] **PASS_OLD / 占位脱敏**：公开审核 JSON 中 687/688/988 无真实参考图名称；重复 PNG 为 __H3_GUIDE_NOT_SET__.png 占位，未检出用户目录绝对路径。本结论仅针对当前已检查的 JSON；新 V2 导出后需重扫。
- [ ] **NOT_TESTED_V2 / NOLOOP**：保留当前 186/240/1 结构和前端回退，不盲目增加静态节点；对动态注入的 E3 两节点和 E1/E5/E6/尾12子链检查 graphToPrompt、/object_info 和前端依赖注册。
- [ ] **NOT_TESTED_V2 / Python/JS**：在完整导出包运行 py_compile、node --check、导入检查，查 WEB_DIRECTORY、ESM import、路由重复注册、Linux 路径分隔符与副作用。
- [ ] **NOT_TESTED_V2 / 隔离 CPU**：单独安装最终导出包与锁定第三方，核对原 84/84 静态可执行类、5 个尾12类、2 个 E3 新类；注意 84/89/91 属不同统计口径，动态类和子图 UUID 不计为静态 JSON 节点。
- [ ] **NOT_TESTED_V2 / 前端与服务**：验证自定义 JS 真的加载、用户开关真实影响提交图、Sidecar 从受控环境变量注入、必要 /h3/* 和 /h3-director/* API、FFmpeg 可用与鉴权。8210 编译器不是审核主链硬依赖。
- [ ] **NOT_TESTED_V2 / 单段和六段**：在明确许可的隔离环境执行 S1–S6 真实链路，检查 6/6 SUCCESS、S1–S5 尾12产出、S2–S6 前缀消费、39 帧保护、视频/双声道音频合并、异常恢复、重跑和日志；未经授权不得使用 RunningHub 付费 GPU。
- [x] **PASS_OLD / 历史基线必须保留**：docs/LOCAL_E2E_RESULT.md 仅证明 2026-11-04 旧代码六段 6/6 SUCCESS、1263 帧/约 718s，且 RunningHub 云端未测。**不得改写旧结果为 V2 PASS。**
- [ ] **NOT_TESTED_V2 / 新验收证据**：另外建立有独立 commit、哈希、执行环境、截图/日志引用和结果边界的 V2 实际验收记录；任何无来源的“全面 PASS”无效。
- [ ] **NOT_TESTED_V2 / RunningHub 云端**：平台需明确 Python 自定义节点、前端扩展、持久目录、API 路由、第三方依赖和 GPU 权限；导入成功或 GitHub 代码存在并不能证明实际节点部署。

## F. 保留 HOLD 与验收终止条件

- [x] **HOLD / P1 长歌开启时文字预载**：仅前置条件与离线合成测试，未实施候选，未在 8207 晋升，不能放进发布包。
- [x] **HOLD / P2 模型锁页/驻留**：虽有隔离四链和资源取证，尚无安全、性能、低内存的合格单变量候选，不标正式优化。
- [x] **HOLD / 诊断、8210 桥接、生产私有启动参数**：不为追求文件数量把这些纳入 RunningHub 审核主链。
- [ ] **发布前 Gate A**：选择性移植与敏感扫描、授权风险、依赖闭包、manifest 逐文件校验全部通过；失败则不更新公开 main。
- [ ] **发布前 Gate B**：独立导出包真实 import、前端、Sidecar、图提交、CPU 自检通过；失败则不宣传云端可运行。
- [ ] **发布前 Gate C**：按明确授权开展 GPU 验收；六段闭环、尾12与合并成功才标本地 V2 E2E PASS。平台 E2E 必须另立证据。
- [ ] 重新生成 SHA256_MANIFEST.json；不得手改哈希、不得复用 2026-11-04 的旧状态标签；README.md、docs/DEPLOYMENT_CN.md、docs/DEPENDENCIES.md、docs/MODEL_INDEX.csv 与新的实际交付包相互一致。
- [ ] **审核放行裁定：当前 NO_GO**。先准备 Reviewer V2 隔离候选，再按上述各项取证；没有云端实跑证据时只可称「技术审核候选」，不能称 RunningHub 云端完整可用。

## G. 本次复核交付状态

- 本次已完成：只读对照 HEAD 和文件树；关键 P0 代码路径逐一核对；识别原审计清单遗漏项；将核对项写入已有的 docs/REVIEW_SCOPE.md。
- 本次未做：**任何 V2 源码移植、验证运行、SHA256_MANIFEST 重建、RunningHub 平台操作或公开 main 修改**。
- 注意：本审核清单是待办追踪和核查依据，**不是**已通过验收的声明；每项完成时须更新状态、提交证据 URI、代码 commit/SHA 和真实测试结论。

## H. 文件级差异盘点归档（2026-11-07）

- [完整更新优化缺口清单](./REVIEWER_V2_GAP_INVENTORY_20261107.md)：固定快照 G01–G08、2026-11-07 新增 G09、R01–R09 发布门槛、回归边界与逐文件处理记录。
- [229 条文件级分类索引（JSON）](./REVIEWER_V2_FILE_TRIAGE_20261107.json)：固定公开/私有 SHA、每个路径的分类、处置建议和来源链接。
- 文件级差异分类已完成，但**未移植任何 Reviewer V2 功能、未执行其 CPU/GPU 验收，RunningHub 云端 E2E 仍未确认**。
- 本节仅为文档索引；上文原有 43 个审核勾选项及其状态保持不变，公开 `main` 未更改。

## I. 基线后新增功能缺口（2026-11-07 晚）

- [ ] **G09 / OmniRef8 LoRA 多选与结构兼容预检**：私仓 `2491716` 含 2 个新模块 + 4 个联动源码文件，公开 `main@7331d54` 缺该功能。已记录 8207 六段 6/6 SUCCESS 回执与私仓测试报告；不能据此认定 Reviewer V2 或 RunningHub 云端通过。详见 [G09 详细清单](./REVIEWER_V2_GAP_INVENTORY_20261107.md) 和 [JSON 的 `post_baseline_updates`](./REVIEWER_V2_FILE_TRIAGE_20261107.json)。
- 本段为后补事项，原 A–F 的 43 个勾选项原样保留；229 条原对账不重新计数。待处理期间禁止把 LoRA 代码直接改写公开 `main`。
