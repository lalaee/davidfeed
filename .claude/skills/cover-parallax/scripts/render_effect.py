"""
Render ONE cover to the loop the feed plays, with a chosen primary and layers.

parallax.py renders the house default. This renders a composed recipe at the
cover's own resolution, cropped the same way, so a recipe approved in a 640px
preview can ship without being re-tuned by hand.

  ./i2v-env/bin/python render_effect.py <cover.jpg> <out.mp4> \
      --primary deep --layers relight,motes [--seconds 4] [--fps 24]

Strength defaults to the house setting scaled to the cover: 60 * width / 736.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from depth_effects import compose, depth_map, encode, seam_db  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cover"); ap.add_argument("out")
    ap.add_argument("--primary", default="parallax")
    ap.add_argument("--layers", default="")
    ap.add_argument("--seconds", type=float, default=4.0)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--strength", type=float, default=0.0)
    ap.add_argument("--cache", default=str(Path(__file__).parent / "depthcache"))
    a = ap.parse_args()

    cover = Path(a.cover)
    cache = Path(a.cache); cache.mkdir(exist_ok=True)
    img, d = depth_map(cover, cache / (cover.stem + ".depth.npy"))
    h, w = img.shape[:2]
    S = a.strength or 60.0 * w / 736.0
    layers = [x for x in a.layers.split(",") if x]
    amp = (d - d.mean()).astype(np.float32)
    n = int(round(a.seconds * a.fps))
    pad = int(np.ceil(S)) + 2

    frames = []
    for i in range(n):
        f = compose(a.primary, layers, img, d, amp, 2 * np.pi * i / n, S)
        frames.append(f[pad:-pad, pad:-pad])
    encode(frames, Path(a.out), a.fps)

    # Seam, RELATIVE to a normal step — the shared one, not a private copy.
    # This file used to compute its own absolute PSNR between the last frame and
    # the first. Those two are one step apart by construction, so on a densely
    # hatched drawing it read 14-24 dB and looked like a broken loop when the
    # warp was in fact byte-identical at t=0 and t=2pi. Near zero is seamless.
    seam = seam_db(frames)
    act = float(np.mean([np.abs(frames[i + 1].astype(np.float32) - frames[i].astype(np.float32)).mean()
                         for i in range(n - 1)]))
    recipe = a.primary + ("".join(f" + {l}" for l in layers))
    print(f"{cover.stem}  {recipe}")
    print(f"  source {w}x{h}  strength {S:.0f}  crop {pad}px  ->  "
          f"{frames[0].shape[1]}x{frames[0].shape[0]}  {n} frames @ {a.fps}fps")
    print(f"  activity {act:.3f}   seam {seam:+.1f} dB vs step")


if __name__ == "__main__":
    main()
