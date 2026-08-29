#!/usr/bin/env python
"""
Did the generation do what the prompt asked?

Mean frame-to-frame difference cannot answer that on its own — a subject that
slowly walks out of frame scores LOW on it. Four measurements are needed:

  CAMERA    global pixel shift frame[0] -> frame[last], by phase correlation.
            Answers "was the camera actually locked off?"
  ACTIVITY  mean |frame[n] - frame[n-1]| in a region. How much is happening.
  DRIFT     mean |frame[last] - frame[0]| in a region. How far it ended from
            where it began.
  NOISE     the same two numbers on a region that must be static, as a floor.

Reading them together is the point:
  activity high, drift ~ noise   -> oscillation: moves and returns. Swaying.
  drift >> noise                 -> translation: moved and stayed moved.
  activity ~ noise               -> nothing happened here.

A subject told to hold still must show LOW DRIFT. Low *activity* is not enough:
smooth slow translation has low activity and is still wrong.

Usage: verify.py clip.mp4 [more.mp4 ...]
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

# (name, (x, y, w, h)) within the 560x832 output frame.
# "canopy" is the control: dark tree mass, textured, and must never move.
REGIONS = {
    "canopy":  (0, 40, 150, 170),
    "deer":    (190, 250, 200, 220),
    "foliage": (0, 600, 560, 230),
}


def frames(path: Path) -> np.ndarray:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", str(path)],
        capture_output=True, text=True, check=True).stdout.strip()
    w, h = (int(v) for v in probe.split("x"))
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo",
         "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def global_shift(a: np.ndarray, b: np.ndarray) -> tuple[float, float]:
    """Whole-frame translation a->b via phase correlation, in pixels (dy, dx)."""
    fa, fb = np.fft.fft2(a), np.fft.fft2(b)
    cross = fa * np.conj(fb)
    mag = np.abs(cross)
    mag[mag == 0] = 1e-9
    corr = np.fft.ifft2(cross / mag).real
    dy, dx = np.unravel_index(np.argmax(corr), corr.shape)
    if dy > a.shape[0] // 2:
        dy -= a.shape[0]
    if dx > a.shape[1] // 2:
        dx -= a.shape[1]
    return float(dy), float(dx)


def analyse(path: Path) -> None:
    fr = frames(path)
    n, h, w = fr.shape
    dy, dx = global_shift(fr[0], fr[-1])
    locked = abs(dy) <= 1 and abs(dx) <= 1
    print(f"\n{path.name}  ({n} frames, {w}x{h})")
    print(f"  camera: shift {dx:+.0f}px x, {dy:+.0f}px y  "
          f"-> {'LOCKED OFF' if locked else 'CAMERA MOVED'}")
    print(f"  {'region':<9} {'activity':>9} {'drift':>8} {'act/noise':>10} "
          f"{'drift/noise':>12}  verdict")

    noise_act = noise_drift = None
    for name, (x, y, rw, rh) in REGIONS.items():
        crop = fr[:, y:y + rh, x:x + rw]
        activity = float(np.abs(np.diff(crop, axis=0)).mean())
        drift = float(np.abs(crop[-1] - crop[0]).mean())

        if noise_act is None:
            noise_act, noise_drift = max(activity, 1e-6), max(drift, 1e-6)
            print(f"  {name:<9} {activity:>9.2f} {drift:>8.2f} {1.0:>10.2f} "
                  f"{1.0:>12.2f}  control (static reference)")
            continue

        ar, dr = activity / noise_act, drift / noise_drift
        if ar < 1.6:
            verdict = "static — nothing happened"
        elif dr > 2.5:
            verdict = "TRANSLATION — moved and stayed moved"
        else:
            verdict = "oscillation — moves and returns"
        print(f"  {name:<9} {activity:>9.2f} {drift:>8.2f} {ar:>10.2f} "
              f"{dr:>12.2f}  {verdict}")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        analyse(Path(arg))
