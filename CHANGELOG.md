# 更新日志（CHANGELOG）

本项目遵循 [语义化版本（Semantic Versioning）](https://semver.org/lang/zh-CN/) 规范。

## [v1.3.0] - 2026-11-27

全面升级三套主题（极简工作台 / 暖纸书房 / 晨光画布）的模型选择弹窗与底部输入栏视觉体验，保持 120Hz 零重排与暗黑模式自动联动。

### ✨ 视觉与交互升级（Changed & Added）
- **液态毛玻璃模型选择弹窗**：模型选择浮层升级为半透明磨砂玻璃表面（高光描边 + 多层柔和投影），同时保持其他系统弹窗与设置面板的实底高可读性，零半透明穿帮。
- **模型专属彩色圆点与思考档位色字**：自动识别 Gemini 4 Neon / Carbon / Argon / Hydrogen / Flash、Claude Opus / Sonnet 及 GPT-OSS 等模型，为每个选项挂载专属语义彩色圆点，并让档位标识（`High` / `Medium` / `XHigh` 等）跟随模型主色高亮。
- **酒红液态高光 `Orchestrator` 按钮与 `思考强度` 滑块**：弹窗底部的 `Orchestrator` 开关胶囊与 `思考强度` 进度滑块全面升级为立体深酒红高光渐变质感，搭配白色立体滑块手柄与红色档位标签，兼容 Radix Slider 与原生 range 控件。
- **底部输入栏三项实时指标胶囊 + 当前模型主色高亮**：将底部单圆环升级为精简三项内联状态条（上下文占用 `%` / 5 小时配额余量 `%` / 每周配额余量 `%`，搭配独立极简图标与阈值告警着色），紧邻主色高亮的模型切换按钮，悬停速览与点击展开 Pulse 侧边抽屉完整保留。
- **词典同步优化**：补充并统一 `Main Agent → 主 Agent`、`Thinking effort / Reasoning effort / Thinking level → 思考强度`。

## [v1.2.0] - 2026-11-26

**Antigravity Studio Kit** 首个面向跨平台（macOS & Windows）完整发布的工作台增强大版本，全面升级就地并行追问、全量中文汉化、四套 120Hz 零重排主题、✦ 哈基米双源测速动画、Pulse 512K/1M 仪表盘、macOS 双层钥匙串隔离架构及 AI 零门槛自动部署体验。

### ✨ 新增功能（Added）
- **独立并行子助手就地划词 / 悬停追问**：选中回答或代码片段即可在旁侧呼出追问浮层，后台唤起独立并行子助手并自动复用当前会话的**同款模型与主任务全局上下文**；即使主任务正在运行也能并行秒答，不占用底部输入框排队、不新建杂乱侧栏对话、不污染主对话流，支持「复制回复 / 定位到对话流 / 最小化旁注」。
- **四套 120Hz 零重排视觉主题 + 深色自动联动**：内置 **极简工作台（`codex`）**、**暖纸书房（`claude`）**、**晨光画布（`google`）**、**原生界面（`off`）** 四套严格作用域隔离皮肤，同步联动宿主深色模式；顶部工具栏胶囊支持左键循环切换、点击 `▾` 或右键直选。
- **全量增量中文汉化（完整覆盖安全审批弹窗）**：内置 755+ 词条词典（`theme/localization_dict.json`），采用 2.4ms 帧预算分帧引擎与单条预编译正则缓存，完整覆盖命令执行与工具授权安全审批弹窗，同时 O(1) 跳过回答正文、代码块与编辑器。
- **✦ 哈基米升级（全边框漫步 / 360° 转圈跳舞 + 双源实时测速）**：7 帧透明 PNG 预解码零重排图层，支持沿输入框全边框自由漫步与完成任务 360° 欢快转圈跳舞，结合渲染流与 Pulse 遥测实现双源实时 `tok/s` 测速展示，右键随时收纳为轻巧胶囊。
- **Pulse 512K / 1M 上下文与官方配额池仪表盘**：输入框集成上下文圆环与侧滑抽屉，一键切换 **512K 自动压缩线** 与 **1M 物理上限**，展示缓存命中率、官方 5 小时/每周配额池与近 7 日用量趋势；常规 12s 轮询压至 `<2KB`（降幅 99.5%），静态元数据按 1 小时缓存，抽屉收起立即断开全量 SSE。
- **macOS 零污染隔离预览 + 双层钥匙串防弹窗架构**：官方 `/Applications/Antigravity.app` 100% 保持只读，独立构建并本机 ad-hoc 签名 `~/Applications/Antigravity Community Preview.app`；结合 Chromium `--use-mock-keychain` 与隔离自动解锁登录钥匙串（含升级防 ACL 弹窗 `CDHash` 守护），彻底告别反复输入密码与钥匙串警告；支持运行中 `--stage` 预构建与 `swap_and_launch.py` 原子切换。
- **AI-First 零门槛自动部署套件**：新增 [`AI_INSTALL.md`](AI_INSTALL.md)、[`AGENTS.md`](AGENTS.md) 与 [`CLAUDE.md`](CLAUDE.md)，用户只需将仓库链接与一句话指令发给 Antigravity AI、Claude Code 或 Codex，即可由 AI 自动完成环境预检、安全自检与部署。
- **完整 Release 打包与 SHA-256 静默热更新**：内置后台 ETag 304 静默更新检测与 SHA-256 校验原子热替换；`scripts/build_release_assets.py` 与 GitHub Actions 自动产出 `kit-hot-update.json`、`theme.css`、`renderer.js`、`localization_dict.json`、`antigravity-studio-kit-v1.2.0.zip` 与 `SHA256SUMS`。

### 🛡️ 安全与性能优化（Security & Performance）
- **120Hz 高刷屏治理**：全面清除 `:has(`、`background-attachment: fixed` 与 `mask-composite`，改由 `html[data-agy-theme]` / `html[data-agy-dark="1"]` 单属性翻转驱动，配合 `scripts/verify_kit.py` 静态回归门禁。
- **设置面板与浮层下拉菜单完整兼容**：修复亮/暗模式下设置页面与 Radix 下拉菜单的透明穿帮、遮挡与层级冲突问题，确保所有弹窗实底清晰、辅助栏关闭按钮正常响应。
- **Pulse Sidecar 回环安全加固**：严格绑定 `127.0.0.1` 动态端口，每次启动生成 24 字节随机令牌写入 `0600` 权限 `runtime.json`，强制校验回环 `Host` / `Origin` 白名单并纳入 `verify_kit.py` 自动化安全测试。
- **跨平台无损还原与基线守护**：Windows 端采用原地 V8 Pickle 4 字节对齐精准替换（完整保留全部 `app.asar.unpacked` 外置条目）并自动归档官方原包基线，支持 `python uninstall.py` 字节级无损还原。
