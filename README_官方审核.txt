H3 V30｜RunningHub 节点包审核材料（公开仓库独立版本）

日期：2026-11-10
范围：只包含可安装的插件文件、配套第三方依赖索引、模型索引、环境索引、安全说明及校验资料。

文件内容：
- custom_nodes/：19个自研插件目录，共157个文件（含锁定 V2 修正）。
- patches/：一份按指定版本使用的第三方兼容补丁。
- INSTALL_INDEX.json：七项公开依赖的链接及锁定提交。
- MODEL_INDEX.json：十八项模型名称和来源，不包含权重。
- ENVIRONMENT_INDEX.json：已测本地环境与需核验的云端条件。
- SOURCE_SHA256.json 和 verify_package.py：文件完整性校验。
- SECURITY_SCOPE.txt、REVIEW_LICENSE.txt：有限安全审查记录及权利声明。

此分支与 main 中历史文件完全隔离；main 上的旧工作流和旧源码未修改。
工作流已经单独上传 RunningHub，本包不重复提供工作流 JSON。
不包含模型大文件、用户素材、账户凭据或第三方插件源码。

注意：**这是公开 GitHub 仓库，任何人都可以浏览和下载这些源文件。** 公开可读取不代表已授权第三方复制传播或用于商业项目；权利边界参阅 REVIEW_LICENSE.txt。

版本性质：仅供插件安装与安全审核的候选包；ComfyUI 真实 Linux/GPU 兼容性及平台功能仍待验收。没有通过官方安全审核的声明。
