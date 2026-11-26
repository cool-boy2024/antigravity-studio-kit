# Antigravity Studio Kit 架构设计与工程实践手册

本文沉淀 **Antigravity Studio Kit（Antigravity 增强工作台套件）** 在 Electron 主进程无损挂载、就地上下文追问、120Hz 零重排视觉主题、2.4ms 帧预算增量汉化、Pulse 轻量遥测 Sidecar 以及 macOS 双层钥匙串隔离架构中的核心实现与避坑总结，便于维护、审计与二次扩展。

---

## 1. 主进程注入时机与无损 `app.asar` 补丁

### 1.1 为什么必须在 `win.loadURL()` 前完成挂载？
- **挂载锚点**：位于 `app.asar` 内 `dist/utils.js` 的 `createWindow()` 函数中，`registerWindowWebContents(win, hubContents);` 之后、**`win.loadURL(url)` 之前**。
- **时序风险**：若延迟至窗口创建后的其他回调才挂载监听器，首次 `dom-ready` 事件可能已经触发完毕，导致冷启动或路由跳转后样式与交互脚本间歇性丢失。
- **防竞态代次保护（`generation`）**：`injector/custom-theme-main.js` 每次收到 `dom-ready` 时递增单调计数器 `generation`；若在异步读取本地资产或探测 Sidecar 端口期间发生新一轮导航，旧挂载任务自动丢弃，杜绝跨页误注。

### 1.2 为什么绝不使用 `@electron/asar pack` 整包重打？
官方 Antigravity 的 `app.asar` 包含约 377 个 `unpacked: true` 外置条目（对应 `app.asar.unpacked/` 下的原生模块与 MCP 工具）。常规 `asar pack` 会破坏外置标记与原始偏移布局，造成启动失败或子进程异常。

`injector/patch_asar_stable.py` 采用**原地 blob 精准替换方案**：
1. 仅更新目标文件字节（`dist/utils.js` 与 `dist/custom-theme-main.js`），其余所有已打包文件保持逐字节不变。
2. 完整保留全部 `unpacked: true` 节点，仅重算受影响条目的 `offset` 与 SHA-256 `integrity.hash`。
3. 严格按 **V8 Pickle 4 字节对齐格式** 序列化头部：
   ```text
   [0:4]   = 4                     (固定魔数)
   [4:8]   = align4(4 + inner)     (外层 header 长度)
   [8:12]  = align4(4 + json_len)  (内层 JSON 块长度)
   [12:16] = json_len              (JSON 原始字节长度)
   [16:..] = JSON bytes + 0x00 对齐填充
   ```
4. 替换前对临时文件做完整反解析、4 字节对齐、SHA-256 与外置文件存在性校验；确认目标进程未运行后同卷原子 `os.replace`，并自动归档当前版本官方原包至 `~/.gemini/antigravity/custom_theme/baselines/` 以支持字节级无损回滚。

---

## 2. 就地划词 / 悬停上下文追问架构

就地追问是本套件的核心原创交互能力，解决长任务输出中「局部疑问需要滚到底部打断主线程或另开空白会话」的效率断层：

- **双触发入口**：
  1. **块级悬停入口**：监听回答区域内的段落与代码块容器，鼠标移入时在元素边缘浮出轻量追问触发器。
  2. **划词选区入口**：监听 `selectionchange` / `mouseup`，当用户在回答正文或代码中选中非空片段时，按选区包围盒（Bounding Rect）定位浮出追问按钮与就地对话框。
- **上下文与模型复用**：追问面板提交时，将锚定引用片段与用户问题组装为局部上下文追问请求，直接复用当前会话的完整任务上下文与当前已选模型，无需手动复制粘贴或重新初始化工具环境。
- **防干扰与焦点隔离**：
  - 追问浮层容器与输入域显式排除在汉化与 DOM 监听器之外，避免触发自我重绘循环。
  - 在流式生成期间使用非破坏性浮层挂载，绝不篡改宿主 React 托管的对话消息树节点，确保流式输出、复制代码与滚动定位稳定。

---

## 3. 120Hz 零重排视觉主题与高频 UI 避坑

### 3.1 User Origin `!important` 优先级与四主题隔离
Electron 通过 `wc.insertCSS(css, { cssOrigin: 'user' })` 注入的样式处于 **User Origin**。依据 CSS Cascade 规范，User Origin 中的 `!important` 优先级高于页面 `<style>`（Author Origin）的 `!important`。

为了实现无串味热切换且兼顾 120Hz 流畅度：
- 四套主题（`codex` 极简工作台、`claude` 暖纸书房、`google` 晨光画布、`off` 原生界面）统一预编译进同一份 `theme.css`，每套规则严格包裹在 `html[data-agy-theme="..."]` 作用域内。
- 切换主题仅执行 `document.documentElement.setAttribute('data-agy-theme', mode)` 单属性翻转，零 `<style>` 节点重建与全表重解析。

### 3.2 高刷屏（120Hz ProMotion / 144Hz+）掉帧根因治理
1. **彻底消除 `:has()` 全树重算**：不使用 `html:has(body.theme-dark)`，改由仅监听 `document.body` 的单属性 `MutationObserver` 将深色状态同步至 `html[data-agy-dark="1"]`。
2. **彻底消除 `background-attachment: fixed` 与 `mask-composite`**：画布背景改为纯色直出；输入框描边采用原生 CSS `padding-box` + `border-box` 双背景裁剪通道，杜绝输入区伸缩时触发昂贵的离屏蒙版合成。
3. **关键 UI 踩坑对照**：

| 典型故障 | 根因 | 实测工程方案 |
| --- | --- | --- |
| **浮层/下拉菜单半透明穿帮** | 宿主弹窗继承了透明表面变量或 `backdrop-filter` | 在亮色模式下为 `[role="dialog"]`、`[role="menu"]`、`[data-radix-menu-content]` 强制设定实色表面令牌、关闭 `backdrop-filter` 并提升层级。 |
| **侧栏菜单被容器边缘裁切** | 对侧边栏容器施加 `transform` / `will-change` / `backdrop-filter` 创建了独立 GPU 合成层 | 禁止对 `div[role="navigation"].bg-sidebar` 创建新 stacking context 或 GPU 合成层。 |
| **辅助栏标签关闭按钮失灵** | 全局悬停覆盖误伤 `.agy-hover-actions` 或被输入区渐隐遮罩遮挡 | 显式保留 `.agy-aux-tab .agy-hover-actions` 的 `display: flex; pointer-events: auto; z-index: 20`，并对渐隐遮罩选择器排除 `:not(.agy-hover-actions)`。 |
| **自定义挂件引发无限重绘** | 全局 `MutationObserver` 观测到自身控件文本变化后再次触发回调 | 在 Observer 回调中跳过桌边助手、上下文圆环、Pulse 抽屉与就地追问浮层等自有节点，并结合 `requestAnimationFrame` 合帧提交，仅在文本真实变更时写入。 |

---

## 4. 2.4ms 帧预算全量增量汉化引擎

- **完整覆盖含安全审批弹窗**：词典 `theme/localization_dict.json` 覆盖主工作区、导航侧栏、设置对话框以及命令执行/工具调用**安全审批弹窗**的关键文案。
- **O(1) 安全跳过路径**：遍历前直接短路跳过回答正文、代码块（`pre`/`code`）、代码编辑器与用户输入控件，防止误译技术标识符、报错堆栈或用户文本。
- **性能预算控制**：
  - 将全部短语表预编译为单条 V8 正则表达式并配合 1500 条容量缓存，避免逐条循环扫描。
  - 脏节点队列在 `requestAnimationFrame` 回调中严格按 **2.4ms 帧预算** 分帧消费，剩余任务顺延至下一帧，确保 120Hz（8.33ms/帧）下零掉帧。

---

## 5. Pulse Sidecar：上下文双视角、低流量轮询与本地回环安全

### 5.1 512K 自动压缩阈值 vs 1M 物理上限
- 宿主 `GetAvailableModels` 公布的模型物理上限通常为 1M（如 `1,048,576` / `1,000,000`）或 128K（`131,072`）。
- 但在多轮 Agent 实践中，运行时通常在约 **512K tokens** 附近即会主动触发历史压缩（`CHECKPOINT`）以维持推理质量与缓存命中。
- 因此默认以 **512K 自动压缩线** 计算剩余可用比例，更贴合真实续航；同时提供一键切换至 **1M 物理上限** 视图。

### 5.2 Language Server RPC 带宽削减（>99% 降幅）
实测本机 Antigravity Language Server 三个关键接口单次载荷：
- `RetrieveUserQuotaSummary`：**~1.9 KB**（已包含全配额池 5h / 周剩余比例、重置时间与禁用状态）
- `GetUserStatus`：**~72 KB**（套餐名称位于 `userStatus.planStatus.planInfo.planName`）
- `GetAvailableModels`：**~330 KB**（全模型静态 `maxTokens` 定义）

优化后：每 12 秒常规轮询仅调用 `RetrieveUserQuotaSummary`（`<2KB`）；`GetUserStatus` 与 `GetAvailableModels` 独立进入 **1 小时静态缓存**（带并发去重锁），将常规轮询流量削减约 99.5%。

### 5.3 单端口与轻量 SSE 生命周期
- 插件配置 `has_web_ui: false`，避免占用额外原生侧栏面板，统一由输入框圆环与自绘右侧抽屉承接。
- 常规状态下主窗口仅维持 1 条轻量流 `/api/events?conv=auto&view=compact`（单帧约 1.5 KB，跳过 7 日历史扫描与明细列表）。
- 仅在抽屉展开时加载全量视图流；抽屉关闭后通过 `postMessage({ type: 'gemini-pulse:active', active: false })` 立即关闭冗余 SSE 连接。

### 5.4 本地回环安全模型
- HTTP 服务仅绑定 `127.0.0.1` 动态端口，彻底杜绝 `0.0.0.0` 暴露与 `Access-Control-Allow-Origin: *`。
- 每次启动生成 24 字节随机令牌写入 `0600` 权限的 `runtime.json`；除 `/healthz` 外全部接口强制校验令牌（常量时间比对）及本机回环 `Host` / `Origin` 白名单。

---

## 6. macOS 零污染隔离预览与双层钥匙串防弹窗架构

macOS 端坚持**官方应用绝对只读**：绝不对 Google 签名的 `/Applications/Antigravity.app` 执行原地补丁。

1. **独立隔离副本与本地签名**：`mac-preview/build_preview.py` 复制生成 `~/Applications/Antigravity Community Preview.app`，并通过 `sign_preview.py` 执行本地 ad-hoc 签名；所有配置、缓存与插件完全隔离在 `~/Library/Application Support/Antigravity Community Preview/Home`。
2. **双层钥匙串防弹窗架构**：
   - **第一层（Chromium 开关）**：在隔离副本内通过 `app.commandLine.appendSwitch('use-mock-keychain')`，阻止 Electron/Chromium 因独立 `HOME` 与系统默认钥匙串路径不匹配而弹出「登录钥匙串无法找到 / 还原为默认」告警。
   - **第二层（隔离自动解锁钥匙串与升级防 ACL 守护）**：配合独立目录的自动解锁登录钥匙串策略及本地签名版本更新时的 ACL 防弹窗守护，避免每次重建签名或热升级后反复要求输入系统登录密码。
3. **无中断升级流水线**：运行中检测到新版本时，`install.py --stage` 先构建并签名 `.app.staged`，待用户退出预览版后由 `mac-preview/swap_and_launch.py` 完成原子替换与重启。

---

## 7. 零重排桌边助手与 SHA-256 校验热更新

- **预解码零重排动画**：桌边助手的 7 帧透明 PNG 在初始化阶段一次性转为 `Blob ObjectURL` 并执行 `img.decode()` 预解码为堆叠图层，切换工作姿态仅翻转 `opacity`；定位完全交由 `ResizeObserver` + `transform: translate3d(...)` 完成，流式输出期零 `getBoundingClientRect()` 同步回流。
- **状态识别与流式速率**：检测宿主停止按钮（`button[data-testid="input-stop-button"]`）与运行卡片（`[data-testid="running-items-card"]`），区分思考撰稿与命令工具调用姿态，并在状态胶囊附带实时 `tok/s` 输出速率。
- **安全静默热更新**：主进程内置回环更新控制器（带独立随机令牌与 `Host`/`Origin` 校验），按 30 分钟周期带 `If-None-Match`（`ETag 304` 零额度）查询 `cool-boy2024/antigravity-studio-kit` 最新 Release；下载前校验白名单域名，落地前逐项核验 `kit-hot-update.json` 中的 SHA-256 摘要，确认通过后再原子覆盖本地资源并触发窗口重载。
