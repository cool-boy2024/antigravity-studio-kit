#!/usr/bin/env python3
"""Cross-platform clean uninstaller for Antigravity Studio Kit (Windows & macOS)."""

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys


def real_user_home() -> pathlib.Path:
    if os.name == "posix" and os.environ.get("AGY_USE_ENV_HOME") != "1":
        try:
            import pwd
            return pathlib.Path(pwd.getpwuid(os.getuid()).pw_dir)
        except Exception:
            pass
    return pathlib.Path.home()


def uninstall_macos(args):
    home = real_user_home()
    preview_app = home / "Applications" / "Antigravity Community Preview.app"
    staged_app = home / "Applications" / "Antigravity Community Preview.app.staged"
    preview_data = home / "Library" / "Application Support" / "Antigravity Community Preview"

    # Ensure preview is not currently running before removing its bundle
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent / "injector"))
    import patch_asar_stable as patcher

    if preview_app.exists() and patcher.antigravity_running(str(preview_app)):
        print("[abort] Antigravity Community Preview.app is currently running. Please quit it first.")
        return 1

    for target in (preview_app, staged_app):
        if target.exists() or target.is_symlink():
            if target.is_symlink():
                target.unlink()
            else:
                shutil.rmtree(target)
            print(f"[ok] removed {target}")

    if args.remove_data and preview_data.exists() and not preview_data.is_symlink():
        shutil.rmtree(preview_data)
        print(f"[ok] removed preview data {preview_data}")
    elif preview_data.exists():
        print(f"[keep] preview data kept at {preview_data} (pass --remove-data to delete it too)")

    print("\nAntigravity Studio Kit (macOS preview) uninstall complete. Official /Applications/Antigravity.app was never modified.")
    return 0


def uninstall_windows(args):
    home = real_user_home()
    custom_theme_dir = home / ".gemini" / "antigravity" / "custom_theme"
    injector_dir = custom_theme_dir / "injector"
    plugins_dir = home / ".gemini" / "config" / "plugins"
    config_json = home / ".gemini" / "config" / "config.json"

    patcher = injector_dir / "patch_asar_stable.py"
    if not patcher.exists():
        patcher = pathlib.Path(__file__).resolve().parent / "injector" / "patch_asar_stable.py"

    cmd = [sys.executable, str(patcher), "--restore"]
    if args.install_dir:
        cmd.extend(["--install-dir", args.install_dir])
    print("[step] restoring official app.asar baseline...")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print("[abort] Please close Antigravity completely and re-run uninstall.py.")
        return res.returncode

    if args.keep_assets:
        print("[ok] official app.asar restored (assets/plugins kept).")
        return 0

    for pname in ("gemini-pulse", "theme-canvas"):
        pdir = plugins_dir / pname
        if pdir.exists():
            shutil.rmtree(pdir)
            print(f"[ok] removed plugin {pdir}")

    if config_json.exists():
        try:
            cfg = json.loads(config_json.read_text(encoding="utf-8"))
            plugins = cfg.get("plugins") or {}
            for pname in ("gemini-pulse", "theme-canvas"):
                plugins.pop(pname, None)
            sidecars = cfg.get("sidecars") or {}
            sidecars.pop("gemini-pulse/pulse", None)
            config_json.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"[ok] cleaned plugin entries from {config_json}")
        except Exception as exc:
            print(f"[warn] could not update {config_json}: {exc}")

    app_dir = custom_theme_dir / "app"
    if app_dir.exists():
        shutil.rmtree(app_dir)
        print(f"[ok] removed {app_dir}")

    print("\nAntigravity Studio Kit uninstall complete. Antigravity is back to pristine official state.")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Uninstall Antigravity Studio Kit (Windows & macOS)")
    ap.add_argument("--install-dir", help="(Windows) Antigravity install directory (default: auto-detect)")
    ap.add_argument("--keep-assets", action="store_true", help="(Windows) Only restore app.asar; keep plugins and theme files")
    ap.add_argument("--remove-data", action="store_true", help="(macOS) Also delete isolated preview Application Support data")
    args = ap.parse_args()

    if sys.platform == "darwin":
        return uninstall_macos(args)
    return uninstall_windows(args)


if __name__ == "__main__":
    sys.exit(main())
