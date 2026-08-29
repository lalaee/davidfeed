---
name: cover-parallax
description: "Turn a still chapter cover into the looping depth-parallax video the DavidFeed feed plays. Use when adding or replacing a psalm cover, when a card still shows a static image, or when someone asks to animate/re-render cover art. Also covers folding in supplied footage (watermark removal, seamless looping) and wiring the result into Feed.tsx."
---

# Cover art → parallax loop

Every card in the feed plays a short video generated from its own cover image.
The image is **not** fed to a video model — a depth map is estimated, then the
image is displaced through it along a closed camera path.

## Why depth parallax and not image-to-video

This was tested against the alternatives before being adopted. Generative I2V
(Wan 2.2, LTX-2.3) **invents content**: asked for gentle foliage motion on the
deer cover it produced pinwheel flowers that bloomed and vanished, and giant
leaves flying across frame — none of it in the source artwork. It also drifts
the subject: measured subject drift was 51–61× the noise floor across three
escalating prompts, meaning the animal walked out of frame.

Pinning the last frame to equal the first fixed the drift (down to 3.1×) but
suppressed motion globally, leaving a near-frozen image.

Depth parallax has neither failure mode, because it only ever resamples pixels
that already exist:

- **It cannot hallucinate.** No new objects, ever.
- **It loops exactly.** The camera walks `cos(t)`/`sin(t)` over one period, so
  the final frame sits one step before the first. No ping-pong needed.
- **It is subject-agnostic.** No per-image prompt. A silhouette, a landscape and
  an animal all behave.
- **It is deterministic and local.** ~3s per cover on CPU, no quota, no account.

The honest limitation: this is *camera* movement, not *content* movement.
Leaves do not rustle and light does not shift; a rigid scene is viewed from a
subtly moving viewpoint.

## How the motion is produced

No model generates frames. The **only** model is Depth Anything V2 Small (37MB
quantised ONNX), and its entire output is one channel — distance per pixel:

```
INPUT   pixel_values     [batch, 3, h, w]   an RGB image
OUTPUT  predicted_depth  [batch, h, w]      no colour, no frames
```

Everything after that is arithmetic. Per frame, walk a virtual camera around a
closed ellipse and displace each pixel in proportion to its depth:

```python
t   = 2*pi * i / n                 # exactly one period across the clip
dx  = strength * cos(t)
dy  = strength * 0.55 * sin(t)     # flatter ellipse reads as a dolly, not a wobble

amp = depth - depth.mean()         # MEAN-CENTRED — this is what creates parallax
mx  = x + amp * dx                 # where each output pixel samples FROM
my  = y + amp * dy
frame = cv2.remap(image, mx, my)   # a lookup. Nothing can be invented.
```

**`strength` is the radius of that camera orbit, in pixels.** It is the single
free parameter, and it is mine — not from the model or any paper.

Subtracting the mean is the load-bearing detail: **the multiplier changes sign
at mean depth.** Foreground slides one way, background the other, and pixels at
mean depth are the pivot the scene rotates around. Measured on the deer cover
(depth 0.03–0.97, mean 0.36, so `amp` spans −0.33 to +0.61):

| strength | nearest plane | farthest plane | spread | crop per edge |
|---|---|---|---|---|
| 14 | +8.6px | −4.6px | 13.2px | 16px |
| 30 | +18.4px | −9.8px | 28.2px | 32px |
| 60 | +36.9px | −19.5px | 56.4px | 62px |

Note **no pixel ever moves the full `strength`** — it is a budget that depth
spends unevenly, and the gap between the two extremes *is* the parallax.

The crop is derived, not chosen: `pad = ceil(strength) + 2`, because pixels
shifting inward leave a gap at the frame edge that has to be trimmed.

The loop is exact for a mathematical reason: `cos`/`sin` over one full period
return to their starting values, so frame *n* equals frame *0* by construction.
No ping-pong, no crossfade, no mirrored-motion artifact.

`0.55` is the other tuned constant, and like `60` it was arrived at by looking,
not derived.

## Setup

PyTorch has **no wheel for Python 3.13 on Intel macOS**, so this deliberately
avoids torch and runs Depth Anything V2 through ONNX Runtime instead.

```bash
python3 -m venv i2v-env
./i2v-env/bin/pip install onnxruntime opencv-python-headless numpy huggingface_hub
```

The model (`onnx-community/depth-anything-v2-small-ONNX`) downloads on first
run. Its weights live in a **sidecar `.onnx_data` file** — fetch both or the
session fails with a confusing `file_size` filesystem error. `scripts/parallax.py`
already does this.

## Rendering a cover

```bash
./i2v-env/bin/python scripts/parallax.py <cover.jpg> <out.mp4> \
    --seconds 4 --strength <S>
```

### Strength is relative, not absolute

The house setting is **60 measured against a 736px-wide cover** — i.e. 8.15% of
image width. Strength is a pixel displacement, so it **must scale with the
source** or mismatched covers get wildly different treatment:

```
S = round(60 * width / 736)
```

A flat 60 on a 260px cover would crop it to 136×166. Scaling keeps the motion
visually equivalent and the crop proportional. `scripts/render_all.sh` does this
for every cover in one pass.

### What strength costs

Higher strength moves the near plane further, so more border must be trimmed to
avoid exposing an empty edge. Measured on a 736×1101 cover:

| Strength | Motion/sec | Output | Frame cropped |
|---|---|---|---|
| 14 | 20.3 | 704×1068 | 7% |
| 30 | 40.4 | 672×1036 | 14% |
| **60** | **73.1** | **612×976** | **26%** |

Motion scales almost linearly, so this is a taste call rather than a quality
trade-off — until edges smear. Watch a **subject silhouette against a busy
background**: that is where depth-map softness shows first, as a rubbery stretch.

## Folding in supplied footage

Some covers arrive as video instead (see `psalm5`). Three checks before use:

1. **Does it loop?** Compare first and last frame. Under ~25dB it will visibly
   jump every cycle and needs ping-ponging:
   ```bash
   ffmpeg -i in.mp4 -filter_complex \
     "[0:v]split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[v]" \
     -map "[v]" -an -c:v libx264 -crf 25 -pix_fmt yuv420p -movflags +faststart out.mp4
   ```
   `trim=start_frame=1` matters — without it the turnaround frame duplicates and
   stutters. Expect ~28–30dB afterwards, not 40+: the last frame *should* sit one
   frame of motion before the first.
2. **Watermark?** Prefer **cropping** over `delogo`, which leaves an obvious
   blurred smear in detailed areas. Cropping an edge often also brings the aspect
   closer to the card's.
3. **Strip the audio.** Narration comes from the chapter mp3 and music from the
   ambient bed; a third track fights both.

## Wiring into the feed

Cover and loop live together in `public/assets/chapters/`:

```
psalm20.jpg          the still  — stays as the fallback beneath the video
psalm20-loop.mp4     the loop   — posterVideoSrc
psalm20.mp3          narration
```

Then in `src/components/Feed.tsx`:

```tsx
{ id: 20, title: "Psalm 20",
  backgroundImage: "/assets/chapters/psalm20.jpg",
  posterVideoSrc:  "/assets/chapters/psalm20-loop.mp4",
  audioSrc:        "/assets/chapters/psalm20.mp3",
  subtitles: chapterSubtitles.psalm20 },
```

`FeedItem` renders the still beneath the video, so it shows while the video
decodes and if the video ever fails. Keep both.

## Verifying

`scripts/verify.py` measures whether a clip does what was intended:

```bash
./i2v-env/bin/python scripts/verify.py out.mp4
```

It reports whole-frame **camera shift** (phase correlation), plus per-region
**activity** (consecutive-frame change) and **drift** (first vs last frame),
against a static control region that sets the noise floor.

**Read drift, not activity.** A subject sliding slowly out of frame has *low*
activity and is still completely wrong — that mistake was made once already.
Oscillation returns (activity high, drift near the floor); translation does not.

Two cautions learned the hard way: the ratios are normalised per clip, so a
model with cleaner encoding inflates its own scores — **compare absolute numbers
across clips**. And no metric distinguishes swaying from hallucination. Always
look at a frame strip:

```bash
for n in 0 24 48 72 96; do
  ffmpeg -y -v error -i out.mp4 -vf "select=eq(n\,$n)" -vframes 1 f_$n.png
done
ffmpeg -y -i f_0.png -i f_24.png -i f_48.png -i f_72.png -i f_96.png \
  -filter_complex "[0][1][2][3][4]hstack=inputs=5,scale=1500:-1" strip.png
```

## Gotchas already fixed in the scripts

- `ndarray.ptp()` was removed in numpy 2 — use `np.ptp(arr)`.
- `cv2.remap` requires `CV_32FC1` maps; multiplying by a Python float promotes
  to float64, so cast back with `.astype(np.float32)`.
- `cv2.VideoWriter` fails **silently** on odd frame dimensions and on platforms
  lacking the codec. The scripts pipe raw frames to ffmpeg instead and force
  both output dimensions even (h264 requires it).
- Blur the depth map slightly before displacing, or gradients tear at depth
  discontinuities.
