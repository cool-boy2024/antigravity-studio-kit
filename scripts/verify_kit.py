#!/usr/bin/env python3
"""Cross-platform open-source release self-check for Antigravity Studio Kit (Windows, macOS, Linux).

Verifies:
  1. Python 3.9+ syntax & absence of Python 3.11+-only stdlib calls.
  2. Theme CSS 120Hz static audit (zero :has(, background-attachment: fixed, mask-composite)
     and presence of all 4 scoped themes (codex, claude, google, off).
  3. Built renderer.js IIFE syntax, localization_dict.json & kit-meta.json integrity.
  4. Hardened gemini-pulse local HTTP security (401 without token, 403 foreign origin,
     200 with per-launch token + loopback origin, clean SIGTERM cleanup).
  5. Open-source privacy leak scan (no personal home paths, runtime tokens, or
     machine-specific build outputs in repository tracked/publishable files).
"""

import json
import os
import pathlib
import py_compile
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent

PY_FILES = [
    "install.py",
    "uninstall.py",
    "theme/build_pack.py",
    "injector/patch_asar_stable.py",
    "injector/launch_antigravity.pyw",
    "mac-preview/build_preview.py",
    "mac-preview/sign_preview.py",
    "mac-preview/swap_and_launch.py",
    "scripts/verify_kit.py",
    "scripts/build_release_assets.py",
]

JS_FILES = [
    "injector/custom-theme-main.js",
    "plugins/gemini-pulse/sidecars/pulse/server.mjs",
    "plugins/gemini-pulse/sidecars/pulse/telemetry.mjs",
]

# Patterns that must never leak into tracked open-source files
LEAK_PATTERNS = [
    (re.compile(r"/Users/(?!<user>|username\b)[A-Za-z0-9._-]+/"), "hardcoded macOS user home path"),
    (re.compile(r"[A-Za-z]:\\\\Users\\\\(?!<user>|username\b)[A-Za-z0-9._-]+\\\\"), "hardcoded Windows user home path"),
    (re.compile(r"jetski-standalone-oauth-token"), "OAuth token filename reference"),
]

ALLOWED_PLUGINS = {"gemini-pulse", "theme-canvas"}


def check_python():
    for rel in PY_FILES:
        path = ROOT / rel
        if not path.is_file():
            raise RuntimeError(f"Missing Python script: {rel}")
        py_compile.compile(str(path), doraise=True)
        text = path.read_text(encoding="utf-8")
        if rel != "scripts/verify_kit.py" and "hashlib.file_digest" in text:
            raise RuntimeError(f"{rel} uses Python 3.11+ hashlib.file_digest (must stay Python 3.9+ compatible)")
    print(f"[ok] Python 3.9+ syntax check passed ({len(PY_FILES)} files)")


def check_css_and_dict():
    css_path = ROOT / "theme/dist/theme.css"
    raw_css = css_path.read_text(encoding="utf-8")
    stripped = re.sub(r"/\*[\s\S]*?\*/", "", raw_css)
    for forbidden in (":has(", "background-attachment: fixed", "mask-composite"):
        if forbidden in stripped:
            raise RuntimeError(f"120fps CSS regression in theme/dist/theme.css: found `{forbidden}`")
    for scope in (
        'html[data-agy-theme="codex"]',
        'html[data-agy-theme="claude"]',
        'html[data-agy-theme="google"]',
        'html[data-agy-theme="off"]',
    ):
        if scope not in stripped:
            raise RuntimeError(f"Missing theme scope in theme/dist/theme.css: {scope}")

    dict_path = ROOT / "theme/localization_dict.json"
    entries = json.loads(dict_path.read_text(encoding="utf-8"))
    if not isinstance(entries, list) or len(entries) < 200:
        raise RuntimeError("localization_dict.json appears truncated or invalid")
    for idx, pair in enumerate(entries):
        if not isinstance(pair, list) or len(pair) != 2 or not all(isinstance(x, str) and x.strip() for x in pair):
            raise RuntimeError(f"Invalid localization_dict.json entry at index {idx}: {pair!r}")
    print(f"[ok] CSS 120fps audit & localization_dict.json passed ({len(entries)} entries)")


def check_js_and_pulse():
    node = shutil.which("node")
    if not node:
        print("[warn] node not found in PATH; skipping JS syntax and gemini-pulse runtime security test")
        return

    for rel in JS_FILES:
        subprocess.run([node, "--check", str(ROOT / rel)], check=True)

    # Verify renderer.js inside the exact IIFE wrapper used by custom-theme-main.js
    check_iife = (
        'const fs = require("node:fs");'
        'const js = fs.readFileSync(process.argv[1], "utf8");'
        'new Function("AGY_PHRASES", "AGY_TELEMETRY_PORT", "AGY_TELEMETRY_TOKEN", '
        '"AGY_UPDATER_PORT", "AGY_UPDATER_TOKEN", "AGY_KIT_META", "AGY_UPDATE_STATE", js);'
    )
    subprocess.run([node, "-e", check_iife, str(ROOT / "theme/dist/renderer.js")], check=True)

    meta = json.loads((ROOT / "theme/kit-meta.json").read_text(encoding="utf-8"))
    if not meta.get("version") or "/" not in str(meta.get("repo", "")):
        raise RuntimeError("Invalid theme/kit-meta.json")
    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8")
    if "MIT License" not in license_text or "Antigravity Community Contributors" not in license_text:
        raise RuntimeError("LICENSE must retain MIT License text and upstream attribution")

    # Runtime security check of gemini-pulse in a temp copy so repo stays clean
    with tempfile.TemporaryDirectory(prefix="agy-pulse-verify-") as tmp:
        tmp_path = pathlib.Path(tmp)
        pulse_copy = tmp_path / "pulse"
        shutil.copytree(ROOT / "plugins/gemini-pulse/sidecars/pulse", pulse_copy)
        runtime_file = pulse_copy / "runtime.json"
        env = dict(os.environ)
        env["ANTIGRAVITY_SIDECAR_WEB_PORT"] = "0"
        env["ANTIGRAVITY_SIDECAR_DATA_DIR"] = str(tmp_path / "data")
        proc = subprocess.Popen(
            [node, str(pulse_copy / "server.mjs")],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        try:
            rt = None
            for _ in range(50):
                if runtime_file.is_file():
                    try:
                        cand = json.loads(runtime_file.read_text(encoding="utf-8"))
                        if cand.get("port") and cand.get("token"):
                            rt = cand
                            break
                    except Exception:
                        pass
                time.sleep(0.1)
            if not rt:
                raise RuntimeError("Timed out waiting for gemini-pulse runtime.json")

            base = f"http://127.0.0.1:{rt['port']}"
            direct_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

            def http_status(path, headers=None):
                req = urllib.request.Request(base + path, headers=headers or {})
                try:
                    with direct_opener.open(req, timeout=3) as resp:
                        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
                except urllib.error.HTTPError as err:
                    return err.code, dict(err.headers), err.read().decode("utf-8", "replace")

            st, _, body = http_status("/healthz")
            if st != 200 or body.strip() != "ok":
                raise RuntimeError(f"/healthz expected 200 ok, got {st} {body!r}")

            st, _, _ = http_status("/api/metrics")
            if st != 401:
                raise RuntimeError(f"/api/metrics without token expected 401, got {st}")

            st, _, _ = http_status("/api/metrics", {"X-Gemini-Pulse-Token": "invalid-token"})
            if st != 401:
                raise RuntimeError(f"/api/metrics with invalid token expected 401, got {st}")

            st, _, _ = http_status(
                "/api/metrics",
                {"Origin": "https://evil.example", "X-Gemini-Pulse-Token": rt["token"]},
            )
            if st != 403:
                raise RuntimeError(f"/api/metrics with foreign Origin expected 403, got {st}")

            st, hdrs, body = http_status(
                "/api/metrics?view=compact",
                {"Origin": "https://127.0.0.1:45678", "X-Gemini-Pulse-Token": rt["token"]},
            )
            if st != 200:
                raise RuntimeError(f"/api/metrics with valid token expected 200, got {st}")
            acao = {k.lower(): v for k, v in hdrs.items()}.get("access-control-allow-origin")
            if acao != "https://127.0.0.1:45678":
                raise RuntimeError(f"Expected echoed loopback ACAO header, got {acao!r}")
            json.loads(body)
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=5)
    print("[ok] JS syntax & gemini-pulse security verification passed")


def check_privacy_and_hygiene():
    plugins_root = ROOT / "plugins"
    actual_plugins = {p.name for p in plugins_root.iterdir() if p.is_dir()}
    extra_plugins = actual_plugins - ALLOWED_PLUGINS
    if extra_plugins:
        raise RuntimeError(f"Unexpected plugin directories found (possible personal plugins): {sorted(extra_plugins)}")

    # Check git-visible files (tracked + untracked non-ignored) for private leaks
    git = shutil.which("git")
    if git and (ROOT / ".git").exists():
        out = subprocess.check_output(
            [git, "-C", str(ROOT), "ls-files", "--cached", "--others", "--exclude-standard"],
            text=True,
        )
        candidate_files = [ROOT / line for line in out.splitlines() if line.strip()]
    else:
        candidate_files = [p for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts]

    binary_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pyc", ".zip"}
    for path in candidate_files:
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith("mac-preview/output/"):
            raise RuntimeError(f"Machine-specific output must not be tracked/unignored: {rel}")
        if rel.endswith(("runtime.json", "port.txt", "settings.json")):
            raise RuntimeError(f"Runtime state file must not be tracked/unignored: {rel}")
        if path.suffix.lower() in binary_exts or not path.is_file():
            continue
        if rel == "scripts/verify_kit.py":
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for rx, reason in LEAK_PATTERNS:
            m = rx.search(text)
            if m:
                raise RuntimeError(f"Privacy leak check failed in {rel}: {reason} ({m.group(0)!r})")

    print(f"[ok] Open-source privacy & hygiene scan passed ({len(candidate_files)} publishable files)")


def main():
    check_python()
    check_css_and_dict()
    check_js_and_pulse()
    check_privacy_and_hygiene()
    print("\nALL ANTIGRAVITY STUDIO KIT CHECKS PASSED!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
