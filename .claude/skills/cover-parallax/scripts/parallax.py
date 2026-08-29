#!/usr/bin/env python
"""
Depth-based 2.5D parallax loop — a NON-generative alternative to I2V.

Why this exists: Wan and LTX both invent content (flowers, flying leaves)
because they synthesise pixels. This pipeline only ever *moves pixels that
already exist*, so hallucination is structurally impossible. Two consequences
that matter for a devotional feed:

  * the artwork stays exactly the artwork — nothing is added or removed
  * the loop is perfect by construction, because the virtual camera travels a
    closed elliptical path and returns precisely to its start

Runs entirely on CPU via ONNX (no GPU, no quota, no account).

  ./i2v-env/bin/python parallax.py <image> <out.mp4> [--seconds 4] [--strength 14]
"""
import argparse
import os
import subprocess
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download

REPO = "onnx-community/depth-anything-v2-small-ONNX"
FILE = "onnx/model_quantized.onnx"


def load_session() -> ort.InferenceSession:
    token = os.environ.get("HF_TOKEN")
    hf_hub_download(REPO, FILE + "_data", token=token)   # external weights
    path = hf_hub_download(REPO, FILE, token=token)
    return ort.InferenceSession(path, providers=["CPUExecutionProvider"])


def depth_map(session: ort.InferenceSession, img: np.ndarray) -> np.ndarray:
    """Normalised 0..1 depth at the image's own resolution. 1 = nearest."""
    h, w = img.shape[:2]
    net = cv2.resize(img, (518, 518), interpolation=cv2.INTER_CUBIC)
    net = cv2.cvtColor(net, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], np.float32)
    std = np.array([0.229, 0.224, 0.225], np.float32)
    net = ((net - mean) / std).transpose(2, 0, 1)[None]

    out = session.run(None, {"pixel_values": net})[0][0]
    out = cv2.resize(out, (w, h), interpolation=cv2.INTER_CUBIC)
    out = (out - out.min()) / (np.ptp(out) + 1e-8)   # ndarray.ptp removed in numpy 2
    # Soften so displacement gradients don't tear at depth discontinuities.
    return cv2.GaussianBlur(out, (0, 0), sigmaX=max(w, h) / 200.0)


def render(img: np.ndarray, depth: np.ndarray, seconds: float, fps: int,
           strength: float, out_path: Path) -> None:
    h, w = img.shape[:2]
    n = int(round(seconds * fps))
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32),
                         np.arange(h, dtype=np.float32))
    # Nearer pixels (depth -> 1) move most; far background barely shifts.
    amp = (depth - depth.mean()).astype(np.float32)

    # Crop the border the warp would otherwise expose, and force BOTH dimensions
    # even — h264 requires it, and the odd height is what silently broke VideoWriter.
    pad = int(np.ceil(strength)) + 2
    ow, oh = (w - 2 * pad) & ~1, (h - 2 * pad) & ~1

    # Pipe raw BGR frames straight into ffmpeg rather than using cv2.VideoWriter,
    # whose codec availability is platform-dependent and fails without raising.
    proc = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error",
         "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{ow}x{oh}",
         "-r", str(fps), "-i", "-",
         "-an", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", str(out_path)],
        stdin=subprocess.PIPE)

    for i in range(n):
        t = 2.0 * np.pi * i / n            # closed path -> frame n == frame 0
        dx = strength * np.cos(t)
        dy = strength * 0.55 * np.sin(t)   # flatter ellipse reads as a camera, not a wobble
        # remap demands CV_32FC1; numpy promotes to float64 via the scalar, so cast back
        mx = (gx + amp * dx).astype(np.float32)
        my = (gy + amp * dy).astype(np.float32)
        warped = cv2.remap(img, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        proc.stdin.write(np.ascontiguousarray(warped[pad:pad + oh, pad:pad + ow]).tobytes())

    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError("ffmpeg encode failed")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("out")
    ap.add_argument("--seconds", type=float, default=4.0)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--strength", type=float, default=14.0,
                    help="peak pixel displacement of the nearest plane")
    ap.add_argument("--save-depth", help="also write the depth map here")
    args = ap.parse_args()

    img = cv2.imread(args.image)
    if img is None:
        print(f"could not read {args.image}")
        return 1
    print(f"source {img.shape[1]}x{img.shape[0]}  ->  estimating depth on CPU…", flush=True)

    session = load_session()
    depth = depth_map(session, img)
    if args.save_depth:
        cv2.imwrite(args.save_depth, (depth * 255).astype(np.uint8))

    out = Path(args.out)
    render(img, depth, args.seconds, args.fps, args.strength, out)
    size = out.stat().st_size // 1024
    print(f"wrote {out}  ({args.seconds}s @ {args.fps}fps, {size}KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
