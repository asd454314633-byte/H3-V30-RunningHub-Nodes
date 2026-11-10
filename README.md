# H3 V30 RunningHub 清理后的源码审核分支
**状态：SOURCE_CLEANED / CORE_16_SOURCE_VERIFIED / RELEASE_NO_GO**。
固定来源：`ab97f9a6ff5f089dc63972eb85a55ddcb052d862`。源码：19→16目录，157→154文件。已移除 Qwen2.1 图片工作流注释节点补丁与两套 Windows 显存诊断 Probe；旧 MAINodes 修复链补丁及过期说明亦已从本分支移除。
**现役六段、尾12、锚定、跨组、长歌、导演台及未经证明可删的 UI 功能保留。** 原始分支和生产工作流未修改。
16 类核心源码定位和注册位置见 `NODE_MANIFEST.json`；历史“42 类均已精确定位”的旧声明不再使用，B/C/D 含待修正或外部依赖项。
`SOURCE_SHA256.json` 为未修改源码文件的原 SHA256，可由 `verify_package.py` 逐文件核对；`REMOVAL_MANIFEST.json` 包含删项和可回滚 Git blob。
**本分支只有源码，不含模型、用户素材、私有工作流。** 旧“视频参考 / 坏段检测 / 放大扩时 / 二采 / 自动修复”清理中的发布工作流在私仓隔离候选单独处理。
编辑器核心16类未注册，不代表 worker 状态。实际 Linux/GPU、前端JS、服务路由、持久卷和六段云端运行均未验收；平台已存在的第三方/官方节点不得重复提交。
