# CLAUDE.md — Antigravity Studio Kit

This repository is **Antigravity Studio Kit** (`cool-boy2024/antigravity-studio-kit`), a cross-platform (macOS & Windows) desktop workbench suite for **Google Antigravity**.

## Installing, Updating, or Uninstalling for a User

When the user asks you to install, upgrade, or remove this kit, **read [`AI_INSTALL.md`](AI_INSTALL.md) first and follow it deterministically**:

- Always run `python3 scripts/verify_kit.py` (Windows: `python scripts/verify_kit.py`) before running `install.py`.
- **macOS**: Official `/Applications/Antigravity.app` must remain 100% untouched. Use `python3 install.py` (or `python3 install.py --stage` followed by `python3 mac-preview/swap_and_launch.py` if `Antigravity Community Preview.app` is currently running).
- **Windows**: Close `Antigravity.exe` before patching `app.asar` via `python install.py` (or use `python install.py --skip-asar` for UI-only hot updates).
- **Safety Boundaries**: Never disable SIP/Gatekeeper, never touch the user's real macOS Login Keychain, and never bypass official authentication or approval prompts.
- **Rollback**: `python3 uninstall.py` (macOS) / `python uninstall.py` (Windows).

## Repository Maintenance Rules

See [`AGENTS.md`](AGENTS.md) and [`docs/ARCHITECTURE_AND_PITFALLS.md`](docs/ARCHITECTURE_AND_PITFALLS.md) for full invariants. Key commands:

```bash
python3 theme/build_pack.py      # Compile theme/dist/theme.css & theme/dist/renderer.js
python3 scripts/verify_kit.py    # Syntax, 120Hz CSS audit, Pulse loopback auth, privacy scan
python3 scripts/build_release_assets.py --version 1.2.0 --out-dir dist-release
```

Keep Python 3.9+ stdlib-only compatibility, avoid `:has(` / `background-attachment: fixed` / `mask-composite` in CSS, and never commit personal home paths or runtime files.
