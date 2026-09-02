#!/usr/bin/env python
"""
Render one self-contained mp4 per card, for sharing.

WHY A FILE AND NOT A LINK. A card is not a video. It is a 4s silent loop, a
separate mp3 running 8-24s, and captions drawn as DOM text on top — three things
the page assembles live. navigator.share can attach a real file to the native
sheet (Web Share Level 2), which is what puts a clip into an Instagram Story or
a WhatsApp status instead of a URL with an OG image. That file has to exist
first, so it is composed here.

AHEAD OF TIME, not on demand. Nothing about a card's video changes between
visits — same artwork, same recording, same captions — so rendering it per
share would burn a serverless invocation to produce a byte-identical result.
Built once, it is a static asset the share sheet can pick up instantly.

Captions are burned in as overlays rather than drawn by ffmpeg: this ffmpeg has
neither libass nor libfreetype (`subtitles` and `drawtext` are both absent), so
each line is rasterised with Pillow in the app's own Inter and composited.

ENCODE. 24fps and CRF 29, which is a size decision made by looking. At CRF
23/30fps the twenty-seven clips came to 124MB — more than the entire rest of
public/. At CRF 29 they come to about half that, and on a 1:1 centre crop the
two are near indistinguishable: this is soft painterly texture with slow camera
motion, which is the easiest thing in the world for x264. Every platform these
land on re-encodes anyway.

  ./i2v-env/bin/python scripts/build-share-videos.py [id ...]
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUT = PUBLIC / "assets/share"
WORK = ROOT / ".share-build"
FONT = ROOT / "scripts/fonts/Inter.ttf"

# The card is 375pt wide; the share sheet wants a full-resolution portrait clip.
W, H = 1080, 1920
K = W / 375  # 2.88 — every measurement below is the card's own, scaled by this.

CAPTION_PX = round(24 * K)      # text-[24px]
CAPTION_LINE = round(24 * 1.3 * K)  # leading-[1.3]
CAPTION_MAX = round(320 * K)    # max-w-[320px]
TITLE_PX = round(24 * K)
TITLE_LEFT = round(20 * K)      # left-[20px]
TITLE_BOTTOM = round(24 * K)    # bottom-[24px]
WORDMARK = "Dafod.app"
WORDMARK_TOP = round(24 * K)    # mirrors the reference's own inset at the foot
WEIGHT_SEMIBOLD = 600           # font-semibold, on Inter's variable wght axis


def font(px, weight=WEIGHT_SEMIBOLD):
    f = ImageFont.truetype(str(FONT), px)
    f.set_variation_by_axes([14.0, float(weight)])
    return f


def wrap(text, f, max_w):
    words, lines, line = text.split(), [], ""
    for w in words:
        trial = f"{line} {w}".strip()
        if f.getbbox(trial)[2] <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def text_layer(lines, f, line_h, centre_y, align_left=None, shadow=(3, 8, 140)):
    """A full-frame RGBA layer, so ffmpeg can overlay it at 0:0 and forget geometry.

    The shadow is the card's own `0 1px 6px rgba(0,0,0,0.55)`, scaled: a blurred
    copy of the same text sitting a few pixels lower. Drawn on its own layer and
    composited under, or the blur would eat into the glyphs it is meant to lift.
    """
    dy, blur, alpha = shadow
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d, ds = ImageDraw.Draw(layer), ImageDraw.Draw(shade)
    total = line_h * len(lines)
    y = centre_y - total // 2
    for ln in lines:
        bbox = f.getbbox(ln)
        x = TITLE_LEFT if align_left else (W - (bbox[2] - bbox[0])) // 2 - bbox[0]
        ds.text((x, y + dy), ln, font=f, fill=(0, 0, 0, alpha))
        d.text((x, y), ln, font=f, fill=(255, 255, 255, 255))
        y += line_h
    shade = shade.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(shade, layer)


def chrome_layer(title, f):
    """The card's furniture, plus the one thing the card does not need.

    On screen the reader already knows where they are, so the card carries no
    wordmark. A shared clip travels without that context — it lands in someone
    else's Story with nothing around it — so this is where the name has to be,
    and it is given the reference's own treatment at the opposite corner: same
    Inter, same size, same inset, same shadow.

    Both scrims are here for legibility, not decoration. The bottom one is the
    card's own; the top is its mirror at half strength, because the wordmark is
    one short line rather than a wrapping title and needs less to sit on.
    """
    line_h = round(TITLE_PX * 1.2)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # bg-gradient-to-b from-transparent via-transparent to-black/40 — flat for the
    # top half, then ramping in, exactly as the utility describes it. The top
    # scrim ramps the other way over the first fifth of the frame.
    grad = Image.new("RGBA", (1, H), (0, 0, 0, 0))
    top_span = H * 0.20
    for y in range(H):
        down = max(0.0, (y - H / 2) / (H / 2)) * 0.40
        up = max(0.0, (top_span - y) / top_span) * 0.20
        grad.putpixel((0, y), (0, 0, 0, int(255 * max(down, up))))
    layer = Image.alpha_composite(layer, grad.resize((W, H)))

    mark = text_layer([WORDMARK], f, line_h, WORDMARK_TOP + line_h // 2, align_left=True)
    layer = Image.alpha_composite(layer, mark)

    lines = wrap(title, f, W - TITLE_LEFT - round(80 * K))  # right-[80px]
    baseline = H - TITLE_BOTTOM - round(line_h * len(lines)) // 2
    return Image.alpha_composite(
        layer, text_layer(lines, f, line_h, baseline, align_left=True)
    )


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def render(post):
    pid = post["id"]
    audio = PUBLIC / post["audio"].lstrip("/")
    loop = PUBLIC / post["loop"].lstrip("/")
    start = post.get("startAt") or 0.0
    length = round(duration(audio) - start, 2)

    work = WORK / str(pid)
    work.mkdir(parents=True, exist_ok=True)
    cap_f, title_f = font(CAPTION_PX), font(TITLE_PX)

    chrome_layer(post["title"], title_f).save(work / "chrome.png")

    # One PNG per caption, shown over its own window. The card centres captions
    # in the frame, so these do too.
    caps = []
    for i, s in enumerate(post["subtitles"]):
        lines = wrap(s["t"], cap_f, CAPTION_MAX)
        text_layer(lines, cap_f, CAPTION_LINE, H // 2).save(work / f"c{i}.png")
        caps.append((work / f"c{i}.png", max(0.0, s["s"] - start), max(0.0, s["e"] - start)))

    cmd = ["ffmpeg", "-v", "error", "-y",
           "-stream_loop", "-1", "-i", str(loop),
           "-ss", str(start), "-i", str(audio),
           "-i", str(work / "chrome.png")]
    for p, _, _ in caps:
        cmd += ["-i", str(p)]

    # Cover-crop to 1080x1920, the same object-cover the card uses.
    fc = [f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,"
          f"crop={W}:{H},setsar=1,fps=24[bg]",
          "[bg][2:v]overlay=0:0[v0]"]
    prev = "v0"
    for i, (_, s, e) in enumerate(caps):
        nxt = f"v{i+1}"
        fc.append(f"[{prev}][{i+3}:v]overlay=0:0:enable='between(t,{s:.2f},{e:.2f})'[{nxt}]")
        prev = nxt

    cmd += ["-filter_complex", ";".join(fc),
            "-map", f"[{prev}]", "-map", "1:a",
            "-t", str(length),
            "-c:v", "libx264", "-preset", "medium", "-crf", "29",
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
            "-movflags", "+faststart",
            str(OUT / f"{pid}.mp4")]
    subprocess.run(cmd, check=True)
    return length


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(exist_ok=True)
    posts = json.load(open(ROOT / "scripts/share-manifest.json"))
    wanted = set(sys.argv[1:])
    if wanted:
        posts = [p for p in posts if str(p["id"]) in wanted]

    print(f"{'card':<18}{'secs':>7}{'size':>9}")
    for p in posts:
        secs = render(p)
        mb = (OUT / f"{p['id']}.mp4").stat().st_size / 1048576
        print(f"{p['title']:<18}{secs:>7.1f}{mb:>8.2f}M")


if __name__ == "__main__":
    main()
