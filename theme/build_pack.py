#!/usr/bin/env python3
"""Pack desk companion poses and all strictly-scoped themes into dist/renderer.js & dist/theme.css.

Zero external dependencies by default: reuses pre-optimized frames from
art/muse-poses/poses-cache.json (or falls back to direct PNG base64 encoding).
Pass --reencode-poses (requires Pillow + numpy) after replacing raw PNGs in
theme/art/muse-poses/.
"""

import argparse
import base64
import io
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
MUSE_ART = os.path.join(BASE, "art", "muse-poses")
POSES_CACHE = os.path.join(MUSE_ART, "poses-cache.json")
DIST = os.path.join(BASE, "dist")

MUSE_POSES = ["idle", "laptop1", "laptop2", "write1", "write2", "done", "sleepy"]
TARGET_W = 360
MAX_COLORS = 224


def encode_muse_frame_pillow(path, target_w=TARGET_W, colors=MAX_COLORS):
    import numpy as np
    from PIL import Image

    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    # Purge ultra-faint alpha haze (< 18) for clean edges on both light & dark surfaces
    arr[:, :, 3] = np.where(arr[:, :, 3] < 18, 0, arr[:, :, 3])
    im = Image.fromarray(arr, mode="RGBA")

    scale = target_w / float(im.width)
    if scale < 1.0:
        im = im.resize((target_w, max(1, round(im.height * scale))), Image.LANCZOS)

    if colors:
        alpha = im.getchannel("A")
        flat = im.convert("RGB").quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
        im = flat.convert("RGBA")
        im.putalpha(alpha)

    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    raw = buf.getvalue()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii"), len(raw), im.size


def encode_muse_frame_raw(path):
    with open(path, "rb") as fh:
        raw = fh.read()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii"), len(raw), "raw"


def load_poses(reencode=False):
    if not reencode and os.path.isfile(POSES_CACHE):
        with open(POSES_CACHE, "r", encoding="utf-8") as fh:
            cached = json.load(fh)
        if all(isinstance(cached.get(name), str) and cached[name].startswith("data:image/") for name in MUSE_POSES):
            print(f"[cache] loaded {len(MUSE_POSES)} optimized poses from poses-cache.json")
            return {name: cached[name] for name in MUSE_POSES}

    has_pillow = False
    try:
        import numpy  # noqa: F401
        from PIL import Image  # noqa: F401
        has_pillow = True
    except ImportError:
        if reencode:
            raise SystemExit("Pillow and numpy are required for --reencode-poses (pip install pillow numpy)")

    found = {}
    for name in MUSE_POSES:
        p = os.path.join(MUSE_ART, f"muse-{name}.png")
        if not os.path.exists(p):
            raise SystemExit(f"[MISS] {name}: {p}")
        if has_pillow:
            uri, nbytes, size = encode_muse_frame_pillow(p)
        else:
            uri, nbytes, size = encode_muse_frame_raw(p)
        found[name] = uri
        print(f"[OK] {name}: {size}  {nbytes} bytes")

    if has_pillow:
        with open(POSES_CACHE, "w", encoding="utf-8") as fh:
            json.dump(found, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(f"[cache] updated {POSES_CACHE}")
    return found


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reencode-poses", action="store_true", help="Re-quantize PNG poses via Pillow + numpy")
    args = ap.parse_args()

    os.makedirs(DIST, exist_ok=True)
    found = load_poses(reencode=args.reencode_poses)

    tpl_path = os.path.join(BASE, "renderer.template.js")
    out_path = os.path.join(DIST, "renderer.js")
    with open(tpl_path, "r", encoding="utf-8") as f:
        tpl = f.read()

    if "__HAKIMI_POSES__" not in tpl or "__AGY_THEMES__" not in tpl:
        raise SystemExit("Missing template markers in renderer.template.js")

    # Bundle all strictly-scoped stylesheets once into User-Origin dist/theme.css so
    # switching themes is an O(1) attribute toggle with zero CSS re-parsing.
    css_parts = []
    for filename in ("google.css", "claude.css", "codex.css"):
        path = os.path.join(BASE, filename)
        if not os.path.exists(path):
            raise SystemExit(f"Missing theme stylesheet: {path}")
        with open(path, "r", encoding="utf-8") as sf:
            css_parts.append(sf.read().strip())
    combined_css = "\n\n".join(css_parts) + "\n"

    theme_css_path = os.path.join(DIST, "theme.css")
    with open(theme_css_path, "w", encoding="utf-8") as tf:
        tf.write(combined_css)
    print(f"[sync] dist/theme.css <- google.css + claude.css + codex.css ({len(combined_css)} chars)")

    # Keep __AGY_THEMES__ empty because all themes are pre-parsed in User-Origin theme.css.
    out = tpl.replace("__HAKIMI_POSES__", json.dumps(found, ensure_ascii=False))
    out = out.replace("__AGY_THEMES__", "{}")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(out)

    total = os.path.getsize(out_path)
    print(f"dist/renderer.js -> {total} bytes ({total / 1024:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
