# 官方安装核验流程（候选）
1. 分别核验编辑器和 GPU worker 的 `/object_info`，缺失类按函数和名称去重；已存在节点一律不覆盖。
2. 审核 `NODE_MANIFEST.json` 的16类核心自研源码；平台原生 MiniMaxH3、KJNodes、rgthree 等不重复安装。
3. 审核部署所需 Python 依赖、`web/` JS、`/h3/*` 路由、HostGuard、文件持久化和 Linux 目录权限。
4. 本分支不包含第三方整仓或模型权重，也不直接给出“可运行”保证。云端 GPU 实测需另行获授权。
5. 旧二采/坏段检测链不在待发布正式范围，不应为其额外装 MAINodes 旧节点。
