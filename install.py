#!/usr/bin/env python3
"""Antigravity Studio Kit (Antigravity 增强工作台套件) — cross-platform installer & updater (Windows & macOS).

Run the same single command for both first-time setup and subsequent updates:
  macOS:   python3 install.py
  Windows: python install.py

What it does automatically:
  1. Deploys workbench assets (theme.css, renderer.js, localization_dict.json, kit-meta.json)
     and loopback-authenticated plugins (gemini-pulse, theme-canvas).
  2. Checks whether the host Antigravity version or main-process injector changed:
     - If unchanged (most UI, inline follow-up Q&A, theme, and localization updates):
       completes immediately as a hot-update (press Cmd+R on macOS or Ctrl+R on Windows).
     - If first install or host/injector changed:
       * macOS: builds & locally ad-hoc signs ~/Applications/Antigravity Community Preview.app
         (or stages .app.staged safely if Preview is running) with isolated Home + dual-layer
         Keychain protection, leaving official /Applications/Antigravity.app 100% untouched.
       * Windows: losslessly patches app.asar via patch_asar_stable.py --ensure.
"""

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import signal
import subprocess
import sys

KIT_ROOT = pathlib.Path(__file__).resolve().parent


def real_user_home() -> pathlib.Path:
    if os.name == "posix" and os.environ.get("AGY_USE_ENV_HOME") != "1":
        try:
            import pwd
            return pathlib.Path(pwd.getpwuid(os.getuid()).pw_dir)
        except Exception:
            pass
    return pathlib.Path.home()


def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1048576)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def copy_tree_clean(src: pathlib.Path, dst: pathlib.Path, dry_run: bool, preserve_relpaths=()):
    if dry_run:
        print(f"[dry-run] copy dir  {src} -> {dst}")
        return
    preserved = []
    if dst.exists() and preserve_relpaths:
        for rel in preserve_relpaths:
            candidate = dst / rel
            if candidate.is_file():
                try:
                    preserved.append((rel, candidate.read_bytes(), candidate.stat().st_mode))
                except Exception:
                    pass
    if dst.exists():
        shutil.rmtree(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst)
    for rel, data, mode in preserved:
        target = dst / rel
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            if os.name == "posix":
                try:
                    os.chmod(target, mode & 0o777)
                except Exception:
                    pass
        except Exception:
            pass
    if preserved:
        kept = ", ".join(rel for rel, _, _ in preserved)
        print(f"[ok] deployed {dst} (preserved {kept})")
    else:
        print(f"[ok] deployed {dst}")


def enable_plugins_in_config(config_json: pathlib.Path, plugin_names, dry_run: bool):
    if dry_run:
        print(f"[dry-run] enable plugins {plugin_names} in {config_json}")
        return
    config_json.parent.mkdir(parents=True, exist_ok=True)
    cfg = {}
    if config_json.exists():
        bak = config_json.with_name("config.json.before-studio-kit.bak")
        legacy_bak = config_json.with_name("config.json.before-community-kit.bak")
        if not bak.exists() and not legacy_bak.exists():
            shutil.copy2(config_json, bak)
        try:
            cfg = json.loads(config_json.read_text(encoding="utf-8"))
        except Exception:
            cfg = {}
    plugins = cfg.setdefault("plugins", {})
    for name in plugin_names:
        entry = plugins.get(name)
        if not isinstance(entry, dict):
            plugins[name] = {"enabled": True}
        else:
            entry["enabled"] = True
    config_json.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[ok] enabled {plugin_names} in {config_json}")


def _restart_stale_pulse_sidecar(pulse_plugin_dir: pathlib.Path, dry_run: bool):
    """Signal a running gemini-pulse sidecar to exit so Antigravity respawns it with updated routes."""
    if os.name != "posix":
        return
    runtime_file = pulse_plugin_dir / "sidecars" / "pulse" / "runtime.json"
    if not runtime_file.is_file():
        return
    try:
        meta = json.loads(runtime_file.read_text(encoding="utf-8"))
        pid = int(meta.get("pid") or 0)
    except Exception:
        return
    if pid <= 1 or pid == os.getpid():
        return
    try:
        proc = subprocess.run(
            ["ps", "-ww", "-p", str(pid), "-o", "command="],
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        cmd = (proc.stdout or "").strip()
    except Exception:
        return
    if "gemini-pulse" not in cmd or "server.mjs" not in cmd:
        return
    if dry_run:
        print(f"[dry-run] signal stale gemini-pulse sidecar (pid={pid}) to reload")
        return
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"[ok] signaled stale gemini-pulse sidecar (pid={pid}) to reload cleanly")
    except ProcessLookupError:
        pass
    except Exception as exc:
        print(f"[warn] could not signal gemini-pulse sidecar pid={pid}: {exc}")


def deploy_assets_and_plugins(target_home: pathlib.Path, dry_run: bool, enable_pulse: bool = True, deploy_injector: bool = True):
    custom_theme_dir = target_home / ".gemini" / "antigravity" / "custom_theme"
    app_dir = custom_theme_dir / "app"
    injector_dir = custom_theme_dir / "injector"
    plugins_dir = target_home / ".gemini" / "config" / "plugins"
    config_json = target_home / ".gemini" / "config" / "config.json"

    dist_dir = KIT_ROOT / "theme" / "dist"
    files_to_app = [
        (dist_dir / "theme.css", app_dir / "theme.css"),
        (dist_dir / "renderer.js", app_dir / "renderer.js"),
        (KIT_ROOT / "theme" / "localization_dict.json", app_dir / "localization_dict.json"),
        (KIT_ROOT / "theme" / "kit-meta.json", app_dir / "kit-meta.json"),
    ]
    for src, dst in files_to_app:
        if not src.exists():
            raise SystemExit(f"Missing kit asset: {src} (run `python3 theme/build_pack.py` first)")
        if dry_run:
            print(f"[dry-run] copy file {src} -> {dst}")
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            print(f"[ok] deployed {dst}")

    if deploy_injector:
        copy_tree_clean(KIT_ROOT / "injector", injector_dir, dry_run)

    plugin_names = ["theme-canvas"]
    if enable_pulse:
        plugin_names.insert(0, "gemini-pulse")

    installed_plugins = []
    for pname in plugin_names:
        psrc = KIT_ROOT / "plugins" / pname
        if psrc.exists():
            preserve = (
                "sidecars/pulse/runtime.json",
                "sidecars/pulse/port.txt",
            ) if pname == "gemini-pulse" else ()
            copy_tree_clean(psrc, plugins_dir / pname, dry_run, preserve_relpaths=preserve)
            if pname == "gemini-pulse":
                _restart_stale_pulse_sidecar(plugins_dir / pname, dry_run)
            installed_plugins.append(pname)
    if installed_plugins:
        enable_plugins_in_config(config_json, installed_plugins, dry_run)

    return injector_dir


def compute_mac_bundle_fingerprint(source_app: pathlib.Path, no_pulse: bool) -> dict:
    source_asar = source_app / "Contents" / "Resources" / "app.asar"
    return {
        "source_app": str(source_app),
        "source_asar_sha256": sha256_file(source_asar) if source_asar.is_file() else "",
        "custom_theme_main_sha256": sha256_file(KIT_ROOT / "injector" / "custom-theme-main.js"),
        "build_preview_sha256": sha256_file(KIT_ROOT / "mac-preview" / "build_preview.py"),
        "no_pulse": bool(no_pulse),
    }


def install_macos(args):
    user_home = real_user_home()
    preview_home = user_home / "Library" / "Application Support" / "Antigravity Community Preview" / "Home"
    preview_app = user_home / "Applications" / "Antigravity Community Preview.app"
    fingerprint_file = preview_home / ".gemini" / "antigravity" / "custom_theme" / "mac-bundle-fingerprint.json"
    mac_dir = KIT_ROOT / "mac-preview"
    builder = mac_dir / "build_preview.py"
    signer = mac_dir / "sign_preview.py"

    print(f"[macOS] isolated preview home: {preview_home}")
    deploy_assets_and_plugins(
        preview_home,
        dry_run=args.dry_run,
        enable_pulse=not args.no_pulse,
        deploy_injector=False,
    )

    if args.skip_asar:
        print("[skip] macOS preview bundle build/sign skipped (--skip-asar). Press Cmd+R in Preview to hot-reload.")
        return 0

    sys.path.insert(0, str(mac_dir))
    sys.path.insert(0, str(KIT_ROOT / "injector"))
    import build_preview as bp
    import patch_asar_stable as patcher

    source_app = bp.detect_source_app(args.install_dir)
    current_fp = compute_mac_bundle_fingerprint(source_app, args.no_pulse)
    force_rebuild = args.rebuild
    use_stage = args.stage

    # Smart auto-detection: skip rebuilding/re-signing when only hot-reloadable assets/plugins changed
    if preview_app.is_dir() and not force_rebuild and not use_stage:
        prev_fp = None
        if fingerprint_file.is_file():
            try:
                prev_fp = json.loads(fingerprint_file.read_text(encoding="utf-8"))
            except Exception:
                prev_fp = None
        if prev_fp == current_fp:
            print("\n[ok] Antigravity Studio Kit hot-update complete! Host app & main-process hook are already up to date.")
            print("Press Cmd+R inside Antigravity Community Preview to apply the latest workbench assets immediately.")
            return 0
        if patcher.antigravity_running(str(preview_app)):
            print("[info] Preview app is running; staging an updated signed bundle (.staged) without interrupting your session.")
            use_stage = True
        else:
            print("[info] Host app or main-process injector changed; rebuilding isolated macOS preview bundle.")
            force_rebuild = True

    build_cmd = [sys.executable, str(builder)]
    sign_cmd = [sys.executable, str(signer)]
    if args.install_dir:
        build_cmd.extend(["--source-app", args.install_dir])
        sign_cmd.extend(["--source-app", args.install_dir])
    if args.dry_run:
        build_cmd.append("--dry-run")
        sign_cmd.append("--dry-run")
    if force_rebuild:
        build_cmd.append("--rebuild")
    if use_stage:
        build_cmd.append("--stage")
        sign_cmd.append("--stage")
    if args.no_pulse:
        build_cmd.append("--no-pulse")

    print("[step] building isolated macOS preview bundle...")
    res = subprocess.run(build_cmd)
    if res.returncode != 0:
        return res.returncode

    if args.dry_run:
        print("[dry-run] would sign preview bundle:", " ".join(sign_cmd))
        return 0

    print("[step] locally ad-hoc signing macOS preview bundle...")
    res = subprocess.run(sign_cmd)
    if res.returncode != 0:
        return res.returncode

    fingerprint_file.parent.mkdir(parents=True, exist_ok=True)
    fingerprint_file.write_text(json.dumps(current_fp, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if use_stage:
        print("\nAntigravity Studio Kit staged macOS bundle built and signed!")
        print(f"Quit Antigravity Community Preview (Cmd+Q), then run:\n  python3 \"{mac_dir / 'swap_and_launch.py'}\"")
    else:
        print("\nAntigravity Studio Kit (macOS) setup complete! Open ~/Applications/Antigravity Community Preview.app.")
        print("Official /Applications/Antigravity.app remains 100% untouched.")
    return 0


def install_windows(args):
    user_home = real_user_home()
    injector_dir = deploy_assets_and_plugins(
        user_home,
        dry_run=args.dry_run,
        enable_pulse=not args.no_pulse,
        deploy_injector=True,
    )

    patcher = injector_dir / "patch_asar_stable.py"
    if args.skip_asar:
        print("[skip] app.asar patching skipped (--skip-asar). Press Ctrl+R in Antigravity to hot-reload.")
        return 0

    cmd = [sys.executable, str(patcher), "--ensure"]
    if args.install_dir:
        cmd.extend(["--install-dir", args.install_dir])
    if args.dry_run:
        print("[dry-run] run:", " ".join(cmd))
        return 0

    print("[step] checking/patching app.asar...")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        print("\n[hint] Close Antigravity completely, then re-run:")
        print(f'       python "{patcher}" --ensure')
        return res.returncode

    print("\nAntigravity Studio Kit installation / update complete! Launch Antigravity (or press Ctrl+R if already patched).")
    print(f'Tip: Point your Windows shortcut to pythonw.exe "{injector_dir / "launch_antigravity.pyw"}" to survive official upgrades automatically.')
    return 0


def main():
    ap = argparse.ArgumentParser(description="Antigravity Studio Kit — smart single-command installer & updater (Windows & macOS)")
    ap.add_argument("--install-dir", help="Antigravity install directory (Windows) or official .app path (macOS); default: auto-detect")
    ap.add_argument("--skip-asar", action="store_true", help="Deploy assets & plugins only; skip patching/rebuilding app bundle")
    ap.add_argument("--rebuild", action="store_true", help="(macOS) Force-rebuild existing isolated preview app bundle")
    ap.add_argument("--stage", action="store_true", help="(macOS) Build & sign into .app.staged while preview is running")
    ap.add_argument("--no-pulse", action="store_true", help="Skip installing/enabling the gemini-pulse quota sidecar")
    ap.add_argument("--dry-run", action="store_true", help="Print planned actions without modifying any files")
    args = ap.parse_args()

    if sys.platform == "darwin":
        return install_macos(args)
    return install_windows(args)


if __name__ == "__main__":
    sys.exit(main())
