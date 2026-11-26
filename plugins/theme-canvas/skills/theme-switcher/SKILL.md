---
name: theme-switcher
description: Antigravity Studio Kit 主题与本地化维护技能（Windows & macOS）：管理四套 120Hz 零重排视觉主题（极简工作台、暖纸书房、晨光画布、原生界面 + 深色联动）、全量增量中文汉化，以及升级重注与无损还原。
---

# Theme Switcher（Antigravity Studio Kit 视觉与维护 · Windows & macOS）

用于管理 **Antigravity Studio Kit（Antigravity 增强工作台套件）** 在 Windows 与 macOS 下的主题切换、增量汉化热刷新及版本升级维护：

## 界面内即时切换主题

- **左键**点击顶部工具栏右侧的主题胶囊按钮，在 **极简工作台 / 暖纸书房 / 晨光画布 / 原生界面** 之间瞬切（基于 `data-agy-theme` 单属性切换，零 CSS 重解析，自动联动亮/暗模式）。
- **右键**点击主题胶囊按钮，弹出菜单直接选择目标主题。
- 或在 DevTools 控制台执行：`window.__AGY_THEME__.set('codex' | 'claude' | 'google' | 'off')`（分别对应极简工作台、暖纸书房、晨光画布、原生界面）。

## 日常使用提示

- **就地划词/悬停追问**：将鼠标移至任意回答段落/代码块，或划词选中任意片段，即可就地呼出追问对话框，直接沿用当前会话完整上下文与当前模型，无需滚动到底部另起对话。
- **配置与词典热刷新**：更新本地主题产物或 `localization_dict.json` 后，在窗口内按 `Cmd + R`（macOS）或 `Ctrl + R`（Windows）即可即时生效。

## Windows 维护指令

- 检查当前客户端挂载状态与官方基线归档：
  ```powershell
  python "$env:USERPROFILE\.gemini\antigravity\custom_theme\injector\patch_asar_stable.py" --check
  ```
- 官方客户端升级后自动补丁（需先完全退出 `Antigravity.exe`）：
  ```powershell
  python "$env:USERPROFILE\.gemini\antigravity\custom_theme\injector\patch_asar_stable.py" --ensure
  ```
- 按字节无损还原当前版本的官方 `app.asar`：
  ```powershell
  python "$env:USERPROFILE\.gemini\antigravity\custom_theme\injector\patch_asar_stable.py" --restore
  ```

## macOS 维护指令

macOS 默认通过独立隔离副本 `~/Applications/Antigravity Community Preview.app` 运行，官方 `/Applications/Antigravity.app` 全程保持原样不受改动：

- 仅热更新主题、汉化词典与插件（随后在预览副本窗口按 `Cmd + R` 立即生效）：
  ```bash
  python3 install.py --skip-asar
  ```
- 预览副本运行中后台预构建并本地签名新版本，退出后原子切换：
  ```bash
  python3 install.py --stage
  python3 mac-preview/swap_and_launch.py
  ```
- 退出预览副本后强制全量重建并重签：
  ```bash
  python3 install.py --rebuild
  ```
- 卸载预览副本（官方版始终完好）：
  ```bash
  python3 uninstall.py
  ```
