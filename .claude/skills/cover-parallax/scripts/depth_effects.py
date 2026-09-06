"""
Eleven depth-derived effects from ONE depth map, for side-by-side evaluation.

Rebuilt from the record of the earlier pass. Every effect consumes the same
Depth Anything V2 channel the shipped parallax uses — nothing here can invent
content, because every one is either a resample of existing pixels, a filter
over them, an authored layer composited at a depth, or a shading term derived
from the depth's own gradients.

Four handles, which is the useful way to think about them:

  resample   move pixels           parallax, crane, dolly, vertigo, deep
  filter     blur/tint by depth    focus, haze, grade
  composite  insert at a depth     rays, motes
  shade      relight from normals  relight

Every effect walks a closed path over exactly one period, so frame n == frame 0
and the loop is seamless by construction, not by crossfading.

  ./i2v-env/bin/python depth_effects.py <cover.jpg> <outdir> [--width 640]
"""
from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path

import cv2
import numpy as np

REPO = "onnx-community/depth-anything-v2-small-ONNX"
FILE = "onnx/model_q4.onnx"

# Effects in the order they appear in BOTH the grid and the montage. The two
# disagreeing is exactly what made the last sheet hard to read, so they are
# generated from this one list.
ORDER = ["original", "parallax", "crane", "dolly",
         "vertigo", "focus", "haze", "grade",
         "rays", "motes", "relight", "deep"]
COLS = 4


# ----------------------------------------------------------------- depth ---

def depth_map(path: Path, cache: Path) -> tuple[np.ndarray, np.ndarray]:
    """(image BGR, depth 0..1 where 1 = nearest). Cached — depth is the slow part."""
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if cache.exists():
        return img, np.load(cache)
    import onnxruntime as ort
    from huggingface_hub import hf_hub_download
    tok = os.environ.get("HF_TOKEN")
    hf_hub_download(REPO, FILE + "_data", token=tok)
    sess = ort.InferenceSession(hf_hub_download(REPO, FILE, token=tok),
                                providers=["CPUExecutionProvider"])
    h, w = img.shape[:2]
    net = cv2.resize(img, (518, 518), interpolation=cv2.INTER_CUBIC)
    net = cv2.cvtColor(net, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], np.float32)
    std = np.array([0.229, 0.224, 0.225], np.float32)
    net = ((net - mean) / std).transpose(2, 0, 1)[None]
    d = sess.run(None, {"pixel_values": net})[0][0]
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    d = (d - d.min()) / (np.ptp(d) + 1e-8)
    d = cv2.GaussianBlur(d, (0, 0), sigmaX=max(w, h) / 200.0)
    np.save(cache, d)
    return img, d


# --------------------------------------------------------------- helpers ---

def _remap(img, mx, my):
    return cv2.remap(img, mx.astype(np.float32), my.astype(np.float32),
                     cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def _grid(shape):
    h, w = shape[:2]
    return np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))


def _blur_stack(img, sigmas):
    return [img.astype(np.float32)] + [
        cv2.GaussianBlur(img.astype(np.float32), (0, 0), sigmaX=s) for s in sigmas]


# --------------------------------------------------------------- effects ---
# Each returns a frame for phase t in [0, 2pi). amp is mean-centred depth: the
# sign flip at mean depth is what makes near and far move oppositely.

def fx_parallax(img, d, amp, t, S):
    gx, gy = _grid(img.shape)
    return _remap(img, gx + amp * S * np.cos(t), gy + amp * S * 0.55 * np.sin(t))


def fx_crane(img, d, amp, t, S):
    # Kept only for honesty: this is parallax on a taller ellipse, not a
    # distinct effect. It was called out as such last time and still is.
    gx, gy = _grid(img.shape)
    return _remap(img, gx + amp * S * 0.35 * np.cos(t), gy + amp * S * 1.0 * np.sin(t))


def fx_dolly(img, d, amp, t, S):
    """Push in and out along the view axis: everything scales, near scales more."""
    h, w = img.shape[:2]
    gx, gy = _grid(img.shape)
    cx, cy = w / 2.0, h / 2.0
    push = 0.045 * np.cos(t)
    scale = (1.0 + push) * (1.0 + 0.55 * amp * push / 0.045 * 0.6)
    return _remap(img, cx + (gx - cx) / scale, cy + (gy - cy) / scale)


def fx_vertigo(img, d, amp, t, S):
    """Dolly-zoom. The mean-depth plane holds its size while near and far
    diverge around it — impossible without depth, and the reason this one
    measured ~3x the activity of parallax."""
    h, w = img.shape[:2]
    gx, gy = _grid(img.shape)
    cx, cy = w / 2.0, h / 2.0
    scale = 1.0 + 0.42 * amp * np.cos(t)
    return _remap(img, cx + (gx - cx) / scale, cy + (gy - cy) / scale)


def fx_deep(img, d, amp, t, S):
    """Layered parallax with the disocclusion holes inpainted, so no crop is
    needed. Telea fills large reveals with mush — it smeared last time and it
    still does. Travel deliberately held down to keep it presentable."""
    gx, gy = _grid(img.shape)
    # float32 throughout: the scalar multiply promotes to float64, and both
    # cv2.remap and cv2.Laplacian reject that.
    mx = (gx + amp * S * 0.62 * np.cos(t)).astype(np.float32)
    my = (gy + amp * S * 0.62 * 0.55 * np.sin(t)).astype(np.float32)
    return deep_fill(_remap(img, mx, my), mx, my)


def deep_fill(frame, mx, my):
    """Inpaint where the warp stretched hardest — the disocclusion holes."""
    jac = np.abs(cv2.Laplacian(mx, cv2.CV_32F)) + np.abs(cv2.Laplacian(my, cv2.CV_32F))
    holes = (jac > np.percentile(jac, 99.3)).astype(np.uint8)
    if holes.any():
        frame = cv2.inpaint(frame, cv2.dilate(holes, np.ones((3, 3), np.uint8)), 3, cv2.INPAINT_TELEA)
    return frame


def fx_focus(img, d, amp, t, S):
    """Rack focus. Blur proportional to |depth - focal_plane|, focal plane
    swept far->near->far on a cosine. The camera never moves."""
    focal = 0.5 - 0.42 * np.cos(t)             # sweeps across the depth range
    coc = np.clip(np.abs(d - focal) * 2.6, 0, 1)
    stack = _blur_stack(img, [2.0, 5.0, 10.0])
    out = np.zeros_like(stack[0])
    edges = np.linspace(0, 1, len(stack))
    for i in range(len(stack) - 1):
        w = np.clip((coc - edges[i]) / (edges[i + 1] - edges[i]), 0, 1)[..., None]
        out = out * (1 - w) + stack[i + 1] * w if i else stack[0] * (1 - w) + stack[1] * w
    return np.clip(out, 0, 255).astype(np.uint8)


def fx_haze(img, d, amp, t, S):
    """Aerial perspective: far pixels blend toward a haze colour, density breathes."""
    far = 1.0 - d
    dens = 0.55 + 0.45 * np.cos(t)
    k = np.clip(far ** 1.6 * dens, 0, 1)[..., None]
    haze = np.array([196, 174, 150], np.float32)   # BGR, cool distance
    return np.clip(img.astype(np.float32) * (1 - k) + haze * k, 0, 255).astype(np.uint8)


def fx_grade(img, d, amp, t, S):
    """Depth-graded colour: warm near, teal far, split breathing. Recorded as
    the weakest of the set — a look, not a motion — and kept so that verdict
    can be re-checked rather than taken on trust."""
    f = np.clip(d, 0, 1)[..., None]
    strength = 0.5 + 0.5 * np.cos(t)
    warm = np.array([0.86, 1.02, 1.16], np.float32)
    cool = np.array([1.20, 1.04, 0.84], np.float32)
    mul = cool + (warm - cool) * f
    mul = 1.0 + (mul - 1.0) * strength
    return np.clip(img.astype(np.float32) * mul, 0, 255).astype(np.uint8)


def fx_rays(img, d, amp, t, S):
    """God rays. The emitter is pixels that are BOTH bright AND distant — sky
    seen past the scene — so near geometry occludes the shaft. Needs far more
    gain than a full-frame effect because it only touches what the sky shows
    through; 9x was the correction last time."""
    h, w = img.shape[:2]
    lum = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    emit = np.clip((lum - 0.55) / 0.45, 0, 1) * np.clip((1.0 - d - 0.15) / 0.85, 0, 1)
    ang = 0.6 + 0.25 * np.cos(t)
    ox, oy = w * (0.5 + 0.35 * np.cos(t)), -h * 0.15
    acc = np.zeros_like(emit)
    steps, decay = 22, 0.94
    gx, gy = _grid(img.shape)
    for i in range(steps):
        f = i / steps
        sx = gx + (ox - gx) * f * 0.55
        sy = gy + (oy - gy) * f * 0.55
        acc += _remap(emit, sx, sy) * (decay ** i)
    acc /= steps
    acc *= np.clip(1.0 - d * 1.1, 0, 1)              # nearer geometry blocks it
    gain = 9.0 * (0.65 + 0.35 * np.sin(t))
    tint = np.array([190, 214, 240], np.float32)
    return np.clip(img.astype(np.float32) + acc[..., None] * gain * tint, 0, 255).astype(np.uint8)


_MOTES = None


def fx_motes(img, d, amp, t, S, n=200):
    """Dust motes authored at chosen depths, projected through the SAME warp
    the scene uses so they parallax correctly, and hidden where the scene is
    nearer. Content motion that cannot hallucinate, because the content is
    authored rather than generated.

    Tuned per the earlier pass: dim, few, warm, and suppressed where the image
    is already bright — the first version read as snow speckling the sky.
    Motes need dark air that is also FAR; roughly half the covers are too
    bright to take this at all.
    """
    global _MOTES
    h, w = img.shape[:2]
    # RESOLUTION-INDEPENDENT. Count and radius were absolute pixels, so the same
    # scene rendered at the cover's full width came out with smaller, sparser
    # motes than the preview it was approved from. Both now scale off 640, the
    # width the evaluation renders at, so what ships looks like what was seen.
    k = w / 640.0
    n = max(1, int(round(n * k * k)))
    if _MOTES is None or _MOTES[0].shape[0] != n:
        rng = np.random.default_rng(7)
        _MOTES = (rng.uniform(0, w, n).astype(np.float32),
                  rng.uniform(0, h, n).astype(np.float32),
                  rng.uniform(0.25, 0.95, n).astype(np.float32),   # own depth
                  (rng.uniform(0.6, 1.9, n) * k).astype(np.float32))  # radius
    mx0, my0, mz, mr = _MOTES
    mamp = mz - float(d.mean())
    px = mx0 + mamp * S * np.cos(t) + 5.0 * np.sin(t * 1.0 + mx0 * 0.03)
    py = my0 + mamp * S * 0.55 * np.sin(t) + 3.0 * np.cos(t * 1.0 + my0 * 0.03)
    lum = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    layer = np.zeros((h, w), np.float32)
    for x, y, z, r in zip(px, py, mz, mr):
        xi, yi = int(round(x)), int(round(y))
        if not (0 <= xi < w and 0 <= yi < h):
            continue
        if d[yi, xi] > z:                      # scene is nearer: mote is behind it
            continue
        if lum[yi, xi] > 0.62:                 # bright air swallows it
            continue
        cv2.circle(layer, (xi, yi), max(1, int(round(r))), float(0.55 * (1 - lum[yi, xi])), -1)
    layer = cv2.GaussianBlur(layer, (0, 0), sigmaX=1.6 * k)
    tint = np.array([176, 208, 240], np.float32)
    return np.clip(img.astype(np.float32) + layer[..., None] * tint, 0, 255).astype(np.uint8)


def fx_relight(img, d, amp, t, S):
    """Sobel the depth into approximate surface normals, then Lambert +
    Blinn-Phong with a key light orbiting the scene. Reads as a travelling sun.
    Armour is the material that sells it — the specular crawls across the
    plate, which measured 113 levels of peak local change last time."""
    h, w = img.shape[:2]
    # RESOLUTION-INDEPENDENT NORMALS. Sobel measures depth change per PIXEL, and
    # the same feature spans more pixels at a larger render — so its gradient
    # shrinks as 1/width, the normals flatten, and more of the frame turns to
    # face the light. Rendered at 1041 with a constant 90 the thin sky streaks
    # of the 640 preview became broad pale blobs. Scaling by width/640 holds the
    # surface shape, and so the look, constant across resolutions.
    k = w / 640.0
    zx = cv2.Sobel(d, cv2.CV_32F, 1, 0, ksize=5) * 90.0 * k
    zy = cv2.Sobel(d, cv2.CV_32F, 0, 1, ksize=5) * 90.0 * k
    nz = np.ones_like(zx)
    norm = np.sqrt(zx * zx + zy * zy + nz * nz)
    nx, ny, nz = -zx / norm, -zy / norm, nz / norm
    lx, ly, lz = np.cos(t) * 0.75, np.sin(t) * 0.45, 0.62
    ln = np.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    lam = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    hx, hy, hz = lx, ly, lz + 1.0
    hn = np.sqrt(hx * hx + hy * hy + hz * hz)
    spec = np.clip((nx * hx + ny * hy + nz * hz) / hn, 0, 1) ** 26
    base = img.astype(np.float32)
    out = base * (0.80 + 0.42 * lam)[..., None] + spec[..., None] * 150.0
    return np.clip(out, 0, 255).astype(np.uint8)


EFFECTS = {"parallax": fx_parallax, "crane": fx_crane, "dolly": fx_dolly,
           "vertigo": fx_vertigo, "deep": fx_deep, "focus": fx_focus,
           "haze": fx_haze, "grade": fx_grade, "rays": fx_rays,
           "motes": fx_motes, "relight": fx_relight}

# ------------------------------------------------------------ composition ---
# A layer sits ON a primary. For resample primaries the depth map has to be
# warped with the pixels, or motes occlude against geometry that has moved and
# relight shades a surface that is no longer under the highlight. focus does
# not move pixels, so its depth stays put.

def warp_maps(name, img, amp, t, S):
    h, w = img.shape[:2]
    gx, gy = _grid(img.shape)
    cx, cy = w / 2.0, h / 2.0
    if name == "parallax":
        return gx + amp * S * np.cos(t), gy + amp * S * 0.55 * np.sin(t)
    if name == "deep":
        return gx + amp * S * 0.62 * np.cos(t), gy + amp * S * 0.62 * 0.55 * np.sin(t)
    if name == "vertigo":
        sc = 1.0 + 0.42 * amp * np.cos(t)
        return cx + (gx - cx) / sc, cy + (gy - cy) / sc
    if name == "dolly":
        push = 0.045 * np.cos(t)
        sc = (1.0 + push) * (1.0 + 0.55 * amp * push / 0.045 * 0.6)
        return cx + (gx - cx) / sc, cy + (gy - cy) / sc
    return None


def compose(primary, layers, img, d, amp, t, S):
    """primary, then each layer in the order given. `layers` may be a name,
    a list of names, or None. Order matters: relight before motes shades the
    scene and leaves the specks bright; the reverse dims them."""
    if isinstance(layers, str):
        layers = [layers]
    maps = warp_maps(primary, img, amp, t, S)
    if maps is not None:
        mx, my = (m.astype(np.float32) for m in maps)
        frame = _remap(img, mx, my)
        if primary == "deep":
            frame = deep_fill(frame, mx, my)
        dw = cv2.remap(d, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    else:
        frame, dw = EFFECTS[primary](img, d, amp, t, S), d
    ampw = (dw - dw.mean()).astype(np.float32)
    for layer in layers or []:
        frame = EFFECTS[layer](frame, dw, ampw, t, S)
    return frame




# ---------------------------------------------------------------- render ---

def encode(frames, path, fps):
    h, w = frames[0].shape[:2]
    w, h = w & ~1, h & ~1
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
         "-s", f"{w}x{h}", "-r", str(fps), "-i", "-", "-an", "-c:v", "libx264",
         "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)],
        stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(np.ascontiguousarray(f[:h, :w]).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError(f"encode failed: {path}")


def seam_db(frames):
    """How well it loops: PSNR between the last frame and the first."""
    a, b = frames[0].astype(np.float32), frames[-1].astype(np.float32)
    mse = float(((a - b) ** 2).mean())
    return 99.0 if mse < 1e-9 else 10 * np.log10(255.0 ** 2 / mse)


def activity(frames):
    """Mean absolute change between consecutive frames — how much moves."""
    d = [np.abs(frames[i + 1].astype(np.float32) - frames[i].astype(np.float32)).mean()
         for i in range(len(frames) - 1)]
    return float(np.mean(d))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("outdir")
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--seconds", type=float, default=4.0)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--only", default="")
    a = ap.parse_args()

    src, out = Path(a.image), Path(a.outdir)
    out.mkdir(parents=True, exist_ok=True)
    img, d = depth_map(src, out / (src.stem + ".depth.npy"))

    sc = a.width / img.shape[1]
    img = cv2.resize(img, (a.width, int(round(img.shape[0] * sc))), interpolation=cv2.INTER_AREA)
    d = cv2.resize(d, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_CUBIC)
    amp = (d - d.mean()).astype(np.float32)
    S = 60.0 * img.shape[1] / 736.0                # the house strength, scaled

    n = int(round(a.seconds * a.fps))
    want = [k for k in EFFECTS if not a.only or k in a.only.split(",")]
    print(f"{img.shape[1]}x{img.shape[0]}  strength {S:.1f}  {n} frames\n")
    print(f"{'effect':<10}{'handle':<11}{'activity':>9}{'seam dB':>9}")
    handles = {"parallax": "resample", "crane": "resample", "dolly": "resample",
               "vertigo": "resample", "deep": "resample", "focus": "filter",
               "haze": "filter", "grade": "filter", "rays": "composite",
               "motes": "composite", "relight": "shade"}
    stats = {}
    for name in want:
        fn = EFFECTS[name]
        frames = [fn(img, d, amp, 2 * np.pi * i / n, S) for i in range(n)]
        encode(frames, out / f"{name}.mp4", a.fps)
        cv2.imwrite(str(out / f"{name}.png"), frames[n // 4])
        stats[name] = (activity(frames), seam_db(frames))
        print(f"{name:<10}{handles[name]:<11}{stats[name][0]:>9.3f}{stats[name][1]:>9.1f}")
    cv2.imwrite(str(out / "original.png"), img)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
