# AGENTS.md — Antigravity Studio Kit Agent Guide

Welcome, coding agent. This repository is **Antigravity Studio Kit** (`cool-boy2024/antigravity-studio-kit`), a zero-runtime-dependency enhancement workbench for the **Google Antigravity** desktop client (macOS & Windows).

## Zero-Touch Installation / Upgrade / Uninstall

If the user asked you to **install, update, or uninstall** this kit on their machine:

1. **Read and follow [`AI_INSTALL.md`](AI_INSTALL.md) step by step** (OS detection, preflight checks, integrity self-check, platform-specific deployment, and rollback).
2. Always run `python3 scripts/verify_kit.py` (Windows: `python scripts/verify_kit.py`) before deploying.
3. Never modify official `/Applications/Antigravity.app` on macOS, never disable SIP/Gatekeeper, and never touch the user's real macOS Login Keychain.

## Development & Verification Commands

```bash
# 1. Rebuild compiled theme & renderer bundle (theme/dist/theme.css, theme/dist/renderer.js)
python3 theme/build_pack.py

# 2. Full cross-platform verification: Python 3.9+ syntax, 120Hz CSS audit,
#    renderer IIFE syntax, gemini-pulse loopback token auth tests, and privacy leak scan
python3 scripts/verify_kit.py

# 3. Deploy or hot-update locally
python3 install.py              # Full smart install / update
python3 install.py --skip-asar  # Fast hot-update for CSS/JS/dictionary/plugins only
python3 install.py --stage      # macOS: build & sign .app.staged while Preview is running

# 4. Build SHA-256 verified GitHub Release artifacts (hot-update files + full ZIP + SHA256SUMS)
python3 scripts/build_release_assets.py --version 1.2.0 --repo cool-boy2024/antigravity-studio-kit --out-dir dist-release
```

## Non-Negotiable Engineering Invariants

- **120Hz Zero-Reflow CSS**: Never introduce `:has(`, `background-attachment: fixed`, or `mask-composite` in `theme/*.css`. Keep all rules strictly scoped under `html[data-agy-theme="codex"|"claude"|"google"|"off"]` and `html[data-agy-dark="1"]`.
- **Loopback-Only Sidecar Security**: `plugins/gemini-pulse/sidecars/pulse/server.mjs` must bind strictly to `127.0.0.1`, enforce the per-launch 24-byte random token (`0600` `runtime.json`), and reject foreign `Origin`/`Host` headers.
- **Python 3.9+ Stdlib Only**: Do not add third-party Python or npm runtime dependencies or Python 3.11+-only APIs (such as `hashlib.file_digest`).
- **Privacy Hygiene**: Never commit personal user paths (`/Users/<name>/` or `C:\Users\<name>\`), runtime tokens (`runtime.json`, `port.txt`), or `mac-preview/output/` / `dist-release/` artifacts.
- **Architecture Reference**: See [`docs/ARCHITECTURE_AND_PITFALLS.md`](docs/ARCHITECTURE_AND_PITFALLS.md) and [`mac-preview/README.md`](mac-preview/README.md).
