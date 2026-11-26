#!/usr/bin/env python3
"""Build SHA-256 verified release assets for Antigravity Studio Kit.

Generates in --out-dir:
  - kit-hot-update.json                    (in-app 1-click SHA-256 hot-update manifest)
  - theme.css                              (compiled 120Hz multi-theme stylesheet)
  - renderer.js                            (compiled renderer bundle)
  - localization_dict.json                 (full Chinese UI & approval-dialog dictionary)
  - antigravity-studio-kit-v<version>.zip  (clean source + dist install archive)
  - SHA256SUMS                             (SHA-256 checksums for all release artifacts)

Usage:
  python3 scripts/build_release_assets.py --version 1.2.0 --repo cool-boy2024/antigravity-studio-kit --out-dir dist-release
"""

import argparse
import fnmatch
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

EXCLUDED_DIRS = {
    ".git",
    "__pycache__",
    "node_modules",
    "dist-release",
}

EXCLUDED_REL_PREFIXES = (
    "mac-preview/output/",
)

EXCLUDED_FILE_PATTERNS = (
    ".DS_Store",
    "Thumbs.db",
    "*.pyc",
    "*.pyo",
    "*.log",
    "*.bak",
    "*.tmp",
    "*.tmp.*",
    "*.orig",
    "runtime.json",
    "port.txt",
    "settings.json",
)


def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1048576)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def should_exclude_file(rel_posix: str, name: str) -> bool:
    for prefix in EXCLUDED_REL_PREFIXES:
        if rel_posix.startswith(prefix):
            return True
    for pat in EXCLUDED_FILE_PATTERNS:
        if fnmatch.fnmatch(name, pat):
            return True
    return False


def build_source_zip(zip_path: pathlib.Path, top_folder: str, out_dir: pathlib.Path) -> int:
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        cur = pathlib.Path(dirpath)
        kept_dirs = []
        for d in sorted(dirnames):
            if d in EXCLUDED_DIRS:
                continue
            cand = (cur / d).resolve()
            if cand == out_dir:
                continue
            rel_dir = cand.relative_to(ROOT).as_posix() + "/"
            if any(rel_dir.startswith(p) for p in EXCLUDED_REL_PREFIXES):
                continue
            kept_dirs.append(d)
        dirnames[:] = kept_dirs

        for fname in sorted(filenames):
            fpath = cur / fname
            if not fpath.is_file() or fpath.is_symlink():
                continue
            rel_posix = fpath.relative_to(ROOT).as_posix()
            if should_exclude_file(rel_posix, fname):
                continue
            files.append((fpath, rel_posix))

    files.sort(key=lambda item: item[1])
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for fpath, rel_posix in files:
            arcname = f"{top_folder}/{rel_posix}"
            zf.write(fpath, arcname)
    return len(files)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--version", required=True, help="Release version (e.g. 1.2.0 or v1.2.0)")
    ap.add_argument("--repo", help="GitHub owner/repo (default: read from theme/kit-meta.json)")
    ap.add_argument("--min-injector-version", type=int, help="Minimum required injectorVersion (default: from kit-meta.json)")
    ap.add_argument("--out-dir", default=str(ROOT / "dist-release"), help="Output directory for release artifacts")
    args = ap.parse_args()

    meta_path = ROOT / "theme" / "kit-meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    version = args.version.strip().lstrip("vV")
    tag = f"v{version}"
    repo = (args.repo or meta.get("repo") or "").strip()
    if "/" not in repo:
        raise SystemExit(f"Invalid GitHub repo: {repo!r}")
    min_injector = args.min_injector_version if args.min_injector_version is not None else int(meta.get("injectorVersion", 4))

    # Rebuild dist assets cleanly with zero external dependencies
    subprocess.run([sys.executable, str(ROOT / "theme" / "build_pack.py")], check=True)

    out_dir = pathlib.Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    sources = {
        "theme.css": ROOT / "theme" / "dist" / "theme.css",
        "renderer.js": ROOT / "theme" / "dist" / "renderer.js",
        "localization_dict.json": ROOT / "theme" / "localization_dict.json",
    }

    files_manifest = {}
    for name, src in sources.items():
        if not src.is_file():
            raise SystemExit(f"Missing release asset: {src}")
        dst = out_dir / name
        shutil.copy2(src, dst)
        files_manifest[name] = {
            "url": f"https://github.com/{repo}/releases/download/{tag}/{name}",
            "sha256": sha256_file(dst),
            "size": dst.stat().st_size,
        }

    manifest = {
        "schemaVersion": 1,
        "version": version,
        "tag": tag,
        "repo": repo,
        "minInjectorVersion": min_injector,
        "files": files_manifest,
    }
    manifest_path = out_dir / "kit-hot-update.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Build clean full source/dist release archive
    zip_name = f"antigravity-studio-kit-v{version}.zip"
    zip_path = out_dir / zip_name
    zip_count = build_source_zip(zip_path, f"antigravity-studio-kit-v{version}", out_dir)

    # Write SHA256SUMS covering all generated release artifacts
    checksum_targets = [
        zip_name,
        "kit-hot-update.json",
        "localization_dict.json",
        "renderer.js",
        "theme.css",
    ]
    sums_lines = []
    for fname in checksum_targets:
        fpath = out_dir / fname
        sums_lines.append(f"{sha256_file(fpath)}  {fname}")
    sums_path = out_dir / "SHA256SUMS"
    sums_path.write_text("\n".join(sums_lines) + "\n", encoding="utf-8")

    print(f"[ok] wrote {manifest_path}")
    for name, info in files_manifest.items():
        print(f"  - {name}: {info['size']} bytes  sha256={info['sha256'][:16]}...")
    print(f"[ok] wrote {zip_path} ({zip_count} files, {zip_path.stat().st_size} bytes)")
    print(f"[ok] wrote {sums_path} ({len(sums_lines)} entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
