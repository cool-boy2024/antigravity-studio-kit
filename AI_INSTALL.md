# AI Agent 零门槛自动部署手册（AI_INSTALL.md）

> 本文档面向 **Antigravity AI、Claude Code、Codex、Cursor 等任意编程 Agent** 设计。当用户向你发送本仓库地址（`https://github.com/cool-boy2024/antigravity-studio-kit`）并要求「自动安装 / 升级 / 卸载 **Antigravity Studio Kit**」时，请**严格按以下确定性步骤执行**，做到安全、可验证、可无损回滚。

---

## 0. 绝对安全红线（执行前必读，禁止违反）

1. **macOS 官方应用绝对只读**：严禁修改、重签或删除官方 `/Applications/Antigravity.app`（及用户自定义的官方源 `.app`）。所有修改仅作用于独立隔离副本 `~/Applications/Antigravity Community Preview.app`。
2. **禁止弱化系统安全机制**：严禁关闭 macOS SIP（`csrutil`）、禁用 Gatekeeper（`spctl --master-disable`）、修改 Electron fuses，或向签名添加禁用库校验的异常权限。
3. **禁止触碰用户真实系统钥匙串**：严禁读取、导出、修改或重设用户真实登录钥匙串（`~/Library/Keychains/login.keychain-db`）及 `~/Library/Preferences/com.apple.security.plist`。套件自带的隔离双层钥匙串守护会自动在独立 `HOME` 内完成隔离初始化。
4. **禁止越权绕过**：不修改、绕过或弱化任何官方鉴权、配额限制或安全审批弹窗。
5. **不强制杀掉未确认的活跃会话**：若检测到当前正在运行的桌面端需要退出后替换文件，不得在未经用户明确同意前 `kill -9` 用户的活跃工作窗口；macOS 应优先使用 `--stage` 预构建方案，Windows 应提示用户保存并退出后继续。

---

## 1. 环境预检（Preflight）

按当前操作系统执行以下预检命令，全部确认后再进入安装：

### 1.1 检测操作系统与运行时

- **macOS (`darwin`)**：
  ```bash
  uname -s
  python3 --version        # 要求 >= 3.9（仅用标准库，零第三方依赖）
  node --version || true   # 推荐 >= 22（用于 verify_kit.py 运行时安全自检）
  ```
- **Windows (`win32` / PowerShell)**：
  ```powershell
  python --version         # 要求 >= 3.9（若使用 py -3，则全文替换为 py -3）
  node --version           # 推荐 >= 22
  ```

### 1.2 定位官方 Antigravity 客户端

- **macOS**：检查 `/Applications/Antigravity.app` 是否存在：
  ```bash
  ls -d "/Applications/Antigravity.app" "$HOME/Applications/Antigravity.app" 2>/dev/null
  ```
  - 若安装在默认 `/Applications/Antigravity.app`，后续无需 `--install-dir`。
  - 若位于自定义路径（例如 `$HOME/Applications/Antigravity.app`），后续 `install.py` 传入 `--install-dir "<源应用路径>"`。
  - 若本机尚未安装官方 Antigravity，**立即停止**并告知用户先从官方渠道安装 Antigravity。
- **Windows**：默认自动探测 `%LOCALAPPDATA%\Programs\Antigravity` 等常见安装路径。若用户安装在自定义目录（如 `D:\Apps\Antigravity`），后续传入 `--install-dir "D:\Apps\Antigravity"`。

---

## 2. 获取仓库与执行完整安全自检

### 2.1 克隆或同步仓库

若当前不在 `antigravity-studio-kit` 仓库根目录，先克隆到干净的项目目录（避免污染桌面或临时目录）：

- **macOS**：
  ```bash
  git clone https://github.com/cool-boy2024/antigravity-studio-kit.git "$HOME/Projects/antigravity-studio-kit"
  cd "$HOME/Projects/antigravity-studio-kit"
  ```
  （若目录已存在，直接 `cd "$HOME/Projects/antigravity-studio-kit" && git pull --ff-only`。）

- **Windows (PowerShell)**：
  ```powershell
  git clone https://github.com/cool-boy2024/antigravity-studio-kit.git "$env:USERPROFILE\Projects\antigravity-studio-kit"
  Set-Location "$env:USERPROFILE\Projects\antigravity-studio-kit"
  ```
  （若目录已存在，直接 `git pull --ff-only`。）

### 2.2 运行全套自动化验证（必须通过）

在任何部署动作之前，先执行套件自带的跨平台验证与隐私安全扫描：

- **macOS**：`python3 scripts/verify_kit.py`
- **Windows**：`python scripts/verify_kit.py`

确认输出包含 `ALL ANTIGRAVITY STUDIO KIT CHECKS PASSED!` 且退出码为 `0`。如遇报错，**停止部署**并将具体错误信息汇报给用户。

---

## 3. 按平台执行确定性部署

### 3A. macOS（`darwin`）零污染隔离预览部署

先检测预览版当前是否正在运行（尤其当 Agent 自身运行在 `Antigravity Community Preview.app` 内置终端时非常关键）：

```bash
pgrep -fl "Antigravity Community Preview.app" || echo "PREVIEW_NOT_RUNNING"
```

根据状态选择对应路径：

1. **场景 A：首次安装，或预览版当前未运行**
   ```bash
   # 可选：先预演安装计划
   python3 install.py --dry-run

   # 执行部署：自动安装主题/词典/插件，构建并本机 ad-hoc 签名隔离预览副本
   python3 install.py
   ```
   - `install.py` 会自动部署静态资产与插件到 `~/Library/Application Support/Antigravity Community Preview/Home/`，并在 `~/Applications/Antigravity Community Preview.app` 生成带双层钥匙串隔离的独立签名副本，全程校验 `/Applications/Antigravity.app` 前后 SHA-256 完全一致。

2. **场景 B：预览版正在运行，且仅需热更新主题 / 汉化 / 追问 / 插件**
   ```bash
   python3 install.py --skip-asar
   ```
   - 直接覆盖隔离目录内的前端资产与插件，**无需重启应用**。完成后告知用户在预览版窗口中按 **`Cmd + R`** 即时热刷新。
   - 提示：不加 `--skip-asar` 直接运行 `python3 install.py` 时，安装器也会自动比对宿主 `app.asar` 与主进程注入器指纹；若未变化，自动以热更新模式秒级完成。

3. **场景 C：预览版正在运行，且官方客户端或主进程钩子已升级（需要重建 `.app`）**
   ```bash
   # 在不打断当前运行会话的前提下，预构建并严格签名 .app.staged
   python3 install.py --stage
   ```
   完成后告知用户执行以下两步完成原子切换启动：
   1. 按 **`Cmd + Q`** 退出正在运行的 `Antigravity Community Preview.app`。
   2. 在系统终端运行：
      ```bash
      python3 mac-preview/swap_and_launch.py
      ```
   （若 Agent 从外部终端如 Terminal / iTerm / Claude Code 运行，可先在后台运行 `python3 mac-preview/swap_and_launch.py --wait 60`，等待用户按 `Cmd + Q` 后自动原子切换并重启预览版。）

4. **macOS 首次启动 Gatekeeper 说明**
   - 隔离预览副本采用本机 ad-hoc 签名。若用户首次打开 `~/Applications/Antigravity Community Preview.app` 时系统弹出「无法验证开发者」，提示用户在访达中**右键 → 打开**，或在「系统设置 → 隐私与安全性」点击**「仍要打开」**即可。

---

### 3B. Windows（`win32`）原地无损补丁与基线守护部署

先检测 `Antigravity.exe` 是否正在运行：

```powershell
tasklist /FI "IMAGENAME eq Antigravity.exe"
```

根据状态选择对应路径：

1. **场景 A：仅热更新前端主题 / 汉化 / 追问 / 插件（且 `app.asar` 已打过补丁）**
   ```powershell
   python install.py --skip-asar
   ```
   完成后告知用户在 Antigravity 窗口中按 **`Ctrl + R`** 即时热生效。

2. **场景 B：首次安装，或官方升级后需要无损补丁 `app.asar`**
   - 若 `Antigravity.exe` 正在运行：**不要强杀用户进程**。请提示用户先完全退出 Antigravity（确保托盘无残留进程以释放 `app.asar` 文件锁），待用户确认退出后执行：
     ```powershell
     python install.py --dry-run
     python install.py
     ```
   - `install.py` 会自动把当前版本官方 `app.asar` 完整归档至 `%USERPROFILE%\.gemini\antigravity\custom_theme\baselines\`，然后仅原地替换目标文件并重算 V8 Pickle 4 字节对齐头与 SHA-256，保留全部 `app.asar.unpacked` 条目。
   - **升级自愈快捷方式（可选推荐）**：部署完成后，可告知用户将桌面快捷方式目标设为：
     ```text
     pythonw.exe "%USERPROFILE%\.gemini\antigravity\custom_theme\injector\launch_antigravity.pyw"
     ```
     以便官方自动更新覆盖 `app.asar` 后，下次双击启动即可自动重注恢复。

---

## 4. 部署后自检与结果回报

安装完成后，Agent 应核对以下产物确实就位，再用简洁清晰的中文向用户汇报：

- **macOS 核对路径**（预览隔离主目录 `PREVIEW_HOME="$HOME/Library/Application Support/Antigravity Community Preview/Home"`）：
  - `~/Applications/Antigravity Community Preview.app` 存在（或 `.app.staged` 已通过 `codesign --verify --deep --strict`）
  - `$PREVIEW_HOME/.gemini/antigravity/custom_theme/app/` 包含 `theme.css`、`renderer.js`、`localization_dict.json`、`kit-meta.json`
  - `$PREVIEW_HOME/.gemini/config/config.json` 中已启用 `gemini-pulse` 与 `theme-canvas`
- **Windows 核对路径**：
  - `%USERPROFILE%\.gemini\antigravity\custom_theme\app\` 包含 `theme.css`、`renderer.js`、`localization_dict.json`、`kit-meta.json`
  - `%USERPROFILE%\.gemini\config\config.json` 中已启用 `gemini-pulse` 与 `theme-canvas`

汇报给用户时，附带 3 条最快上手提示：
1. **启动 / 刷新**：macOS 打开 `~/Applications/Antigravity Community Preview.app`（热更新按 `Cmd + R`）；Windows 启动 Antigravity（热更新按 `Ctrl + R`）。
2. **四套 120Hz 主题切换**：点击顶部工具栏主题胶囊左键循环切换（极简工作台 / 暖纸书房 / 晨光画布 / 原生界面），右键或点击 `▾` 直接选择，深色模式自动联动。
3. **核心体验入口**：划词选中或悬停任意回复段落可呼出「💬 就地追问」并行子助手；点击输入框旁上下文圆环展开 Pulse 512K/1M 与配额池抽屉；输入框边缘可见 **✦ 哈基米** 漫步与实时 `tok/s` 测速。

---

## 5. 无损卸载与一键回滚

当用户要求卸载或还原官方原版时，执行对应命令：

- **macOS**（先确保用户已 `Cmd + Q` 退出预览版）：
  ```bash
  # 卸载预览副本（保留隔离预览内个人对话与设置数据；官方 /Applications/Antigravity.app 从未被改动）
  python3 uninstall.py

  # 如用户明确要求连同隔离预览数据一并彻底清理：
  python3 uninstall.py --remove-data
  ```

- **Windows**（先确保用户已完全退出 Antigravity）：
  ```powershell
  # 字节级还原官方原版 app.asar 基线，并清理主题资产与插件配置
  python uninstall.py

  # 若仅恢复官方 app.asar 而保留主题/插件文件：
  python uninstall.py --keep-assets
  ```
