"""
Every effect on one cover, as a labelled 4x3 grid — the sheet an artwork's
effect gets chosen from.

This exists because choosing by name does not work. The one recipe that has
ever survived contact with the artwork (Psalm 3's deep + relight + motes) was
picked by a person watching all twelve cells move at once, side by side on the
same painting. A grid per cover is that same act, made repeatable.

Cells, layout and order come from depth_effects.ORDER, so the sheet and the
module can never drift apart. Each effect is applied STANDALONE, exactly as
depth_effects.main renders them: the primaries are alternatives to each other,
and the layers are shown for what they do on their own, so what to stack is a
decision left to whoever reads the sheet.

Every cell is cropped by the same border the production render uses, so a cell
is framed like the thing that would actually ship — not a wider view of it.

  ./i2v-env/bin/python render_grid.py <outdir> <cover.jpg> [cover.jpg ...]
                                      [--width 450] [--jobs 5]
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import multiprocessing as mp
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from depth_effects import COLS, EFFECTS, ORDER, depth_map  # noqa: E402

FONT = Path(__file__).resolve().parents[4] / "scripts/fonts/Inter.ttf"
CACHE = Path(__file__).parent / "depthcache"
HANDLE = {"parallax": "resample", "crane": "resample", "dolly": "resample",
          "vertigo": "resample", "deep": "resample", "focus": "filter",
          "haze": "filter", "grade": "filter", "rays": "composite",
          "motes": "composite", "relight": "shade", "original": "still"}
BAR = 34          # per-cell label strip
HEAD = 46         # grid title bar


def _text(size, weight):
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_axes([14.0, float(weight)])
    return f


def strip(text, w, h, size, weight, bg):
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)
    f = _text(size, weight)
    d.text((12, (h - size) // 2 - 2), text, font=f, fill=(255, 255, 255))
    return np.array(im)[:, :, ::-1].copy()          # RGB -> BGR


def cell_labels(tw):
    """Pre-rendered once per cover: the label strip never changes per frame."""
    out = {}
    for name in ORDER:
        text = name if name == "original" else f"{name}  ·  {HANDLE[name]}"
        out[name] = strip(text, tw, BAR, 19, 600, (16, 16, 18))
    return out


def render(job):
    # One OpenCV thread per worker. cv2 multithreads internally, so five
    # workers each grabbing every core spend the gain on contention — and a
    # fork that inherits a live thread pool is how this hangs instead of
    # merely running slow.
    cv2.setNumThreads(1)
    src, outdir, tw, n, fps = job
    img0, d0 = depth_map(src, CACHE / (src.stem + ".depth.npy"))

    sc = tw / img0.shape[1]
    img = cv2.resize(img0, (tw, int(round(img0.shape[0] * sc))), interpolation=cv2.INTER_AREA)
    d = cv2.resize(d0, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    amp = (d - d.mean()).astype(np.float32)
    S = 60.0 * tw / 736.0                            # the house strength, scaled
    pad = int(np.ceil(S)) + 2

    ch, cw = img.shape[0] - 2 * pad, tw - 2 * pad
    labels = cell_labels(cw)
    rows = (len(ORDER) + COLS - 1) // COLS
    gw, gh = cw * COLS, HEAD + rows * (BAR + ch)
    # h264 needs even dimensions, and the rounding has to go UP. Rounding down
    # took one pixel off a height that was exactly three rows tall, the last
    # row's bounds check then failed, and the sheet shipped with rays, motes,
    # relight and deep missing entirely — the four cells the knight was chosen
    # from. An odd grid now gains a black pixel instead of losing a row.
    gw, gh = gw + (gw & 1), gh + (gh & 1)
    title = strip(f"{src.stem}   ·   {img0.shape[1]}x{img0.shape[0]}   ·   "
                  f"every effect, {n / fps:.0f}s loop", gw, HEAD, 24, 700, (0, 0, 0))

    p = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
         "-s", f"{gw}x{gh}", "-r", str(fps), "-i", "-", "-an", "-c:v", "libx264",
         "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
         str(outdir / f"{src.stem}.mp4")], stdin=subprocess.PIPE)

    still = img[pad:-pad, pad:-pad]
    poster = None
    for i in range(n):
        t = 2 * np.pi * i / n
        grid = np.zeros((gh, gw, 3), np.uint8)
        grid[:HEAD] = title[:HEAD, :gw]
        for k, name in enumerate(ORDER):
            f = still if name == "original" else \
                EFFECTS[name](img, d, amp, t, S)[pad:-pad, pad:-pad]
            r, c = divmod(k, COLS)
            y = HEAD + r * (BAR + ch)
            x = c * cw
            if y + BAR + ch <= gh and x + cw <= gw:
                grid[y:y + BAR, x:x + cw] = labels[name]
                grid[y + BAR:y + BAR + ch, x:x + cw] = f
        p.stdin.write(np.ascontiguousarray(grid).tobytes())
        if i == n // 4:
            poster = grid.copy()
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError(f"encode failed: {src.stem}")
    cv2.imwrite(str(outdir / f"{src.stem}.png"), poster)
    return f"{src.stem:<32} {gw}x{gh}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("outdir")
    ap.add_argument("covers", nargs="+")
    ap.add_argument("--width", type=int, default=450, help="per-cell width")
    ap.add_argument("--seconds", type=float, default=4.0)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--jobs", type=int, default=5)
    a = ap.parse_args()

    out = Path(a.outdir); out.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(exist_ok=True)
    n = int(round(a.seconds * a.fps))
    jobs = [(Path(c), out, a.width, n, a.fps) for c in a.covers]

    # Depth first, serially: the ONNX session is the memory-hungry part and
    # five of them at once on a laptop is how this gets killed. Once cached,
    # the workers below never touch the model.
    for j in jobs:
        depth_map(j[0], CACHE / (j[0].stem + ".depth.npy"))
    # spawn, not fork: the loop above has already built an onnxruntime session
    # in this process, and forking a process holding one is unsafe.
    with mp.get_context("spawn").Pool(a.jobs) as pool:
        for line in pool.imap_unordered(render, jobs):
            print(line, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
