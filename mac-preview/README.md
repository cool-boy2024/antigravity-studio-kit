# Antigravity Studio Kit — Mac 本地预览适配

这份适配用于在本机安全运行 **Antigravity Studio Kit**（Antigravity 增强工作台套件：四套 120fps 隔离主题、增量简体中文汉化、预解码零重排伴随微件，以及带本地随机令牌鉴权的 `gemini-pulse` 512K 上下文与额度面板）。官方 `/Applications/Antigravity.app` 始终保持原件不被修改。

## 文件位置

- **预览应用**：`~/Applications/Antigravity Community Preview.app`
- **预览数据**：`~/Library/Application Support/Antigravity Community Preview/`（独立 `HOME`、独立 `userData`、独立插件与独立隔离钥匙串目录，不复制官方版账号凭据）
- **热更新静态资产**：`~/Library/Application Support/Antigravity Community Preview/Home/.gemini/antigravity/custom_theme/app/`（支持在预览版中按 `Cmd + R` 秒级热刷新主题与汉化）
- **构建与校验记录**：本目录 `output/`（包含官方原版全树 SHA-256 校验与签名报告，请勿公开上传运行日志）

## 已修复的 macOS 关键问题

1. **双层 macOS 钥匙串隔离（彻底消除「找不到用于储存“antigravity”的钥匙串 / 还原为默认」及升级 ACL 弹窗）**：
   - **第一层（Electron / Chromium 进程）**：在 `dist/main.js` 早期引导阶段注入 Chromium 文档化开关 `app.commandLine.appendSwitch('use-mock-keychain')`，阻止 Electron OSCrypt 访问系统登录钥匙串。
   - **第二层（独立 Go 语言服务 `language_server`）**：`Contents/Resources/bin/language_server` 直接链接 macOS `Security.framework` 并在隔离 `HOME` 下运行；若 `$HOME/Library/Keychains/login.keychain-db` 缺失，OAuth 令牌写入会触发 `SecurityAgent` 阻塞弹窗。主进程在导入任何应用模块前会自动在隔离目录 `$HOME/Library/Keychains/` 中创建、禁用自动锁定并解锁专属 `login.keychain-db`（全程不调用 `default-keychain` 或 `list-keychains -s`，绝不触碰真实 `~/Library/Preferences/com.apple.security.plist` 与用户系统登录钥匙串）。
   - **升级 / Ad-hoc 重签 ACL 防护**：通过 `.ls-binary-stamp` 校验 `language_server` 的版本、文件元数据与代码签名 `CDHash`；当官方 Antigravity 升级导致 ad-hoc `CDHash` 变化时自动重建干净的隔离钥匙串，防止旧 ACL 触发系统授权弹窗，同时避免预览版自重启时发生 `HOME` 路径递归嵌套。
2. **真实主目录解析**：脚本统一通过 POSIX `pwd.getpwuid()` 解析真实用户主目录，即使在预览版内置终端中执行构建/安装脚本也不会算错路径。
3. **本地接口鉴权加固**：`gemini-pulse` 每次启动生成 24 字节随机令牌（写入 `0600` 权限的 `runtime.json`），强制校验回环 `Host` / `Origin` 并移除 `*` 跨域头。
4. **120Hz ProMotion 丝滑渲染**：全面移除 `html:has(body.theme-dark)`、`background-attachment: fixed`、`-webkit-mask-composite: xor` 与流式输出时的每帧同步布局，支持 120fps+ 流畅交互。

## 常用指令

- **首次一键安装（构建 + 签名 + 部署插件与资产）**：
  ```bash
  python3 install.py
  # 如 Antigravity 不在默认 /Applications，可指定源路径：
  python3 install.py --install-dir "$HOME/Applications/Antigravity.app"
  ```
- **首次打开说明（macOS Gatekeeper）**：预览副本使用本机 ad-hoc 签名而非 Apple 开发者证书签名。若首次双击提示「无法验证开发者」，可在访达中**右键 → 打开**，或在「系统设置 → 隐私与安全性」底部点击「仍要打开」（本套件绝不关闭系统 SIP 或 Gatekeeper）。
- **仅更新主题/汉化/插件（预览版运行中可直接执行，随后按 `Cmd + R` 热刷新）**：
  ```bash
  python3 install.py --skip-asar
  ```
- **在预览版运行中安全预构建并严格签名新版本（生成 `.app.staged`）**：
  ```bash
  python3 install.py --stage
  # 退出预览版（Cmd + Q）后执行原子替换并启动：
  python3 mac-preview/swap_and_launch.py
  ```
- **退出预览版后直接原地重建并重签**：
  ```bash
  python3 install.py --rebuild
  ```
- **停用 / 卸载（官方 `/Applications/Antigravity.app` 始终完好）**：
  ```bash
  python3 uninstall.py
  # 如需连同隔离预览数据一并删除：
  python3 uninstall.py --remove-data
  ```

## 签名与边界说明

预览副本使用本机 ad-hoc 签名（`--options 0 --preserve-metadata=entitlements`），不改变 SIP、Gatekeeper、Electron fuses，也不添加 library-validation 豁免；每次构建与签名均自动校验 `/Applications/Antigravity.app` 前后全树 SHA-256 完全一致。
