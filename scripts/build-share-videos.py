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

# All of it read off the Figma frame "New Feed UI" (2711:1006), a 375x610 card
# drawn 1:1, and scaled by K. The clip itself stays 1080x1920 because that is
# what Stories and Status want; the frame is a card mock, not a delivery format.
# So the top furniture is anchored to the TOP and the reference to the BOTTOM,
# and the extra height that 9:16 adds falls in the middle, where the artwork is.
WORDMARK = "Dafod.app"
WORDMARK_TOP = round(45.55 * K)         # y=45.55 in the frame, and CENTRED
WORDMARK_PX = round(20 * K)
WORDMARK_TRACK = -0.01                  # -1%, and NOT the -2% the reference uses

# THE TAGLINE, and why it is not one string.
#
# The frame draws "Stop D<sad><weary>mscrolling, Start H<heart>pescrolling" —
# the o's are replaced by icons. In Figma that is one text layer whose o's are
# runs of spaces, with three icon frames absolutely positioned on top of the
# gaps. Reproducing it that way here would mean betting that PIL's advance
# widths for Inter match Figma's to the pixel, because a 1px drift puts an icon
# half off its own hole.
#
# So it is composed as a SEQUENCE instead: text runs and icons laid end to end,
# measured, then centred as a block. Self-consistent by construction, and the
# icons cannot drift from the words they stand in for.
#
# The layer is still called "Incoming Verse" in the file, which remains a trap:
# it is marketing copy, not the psalm. The frame has no caption in it at all, so
# the verse keeps the place the card gives it — the middle.
TAGLINE_TOP = round(79.19 * K)
TAGLINE_PX = round(16 * K)
TAGLINE_LINE = round(16 * 1.11 * K)     # line-height 111%
TAGLINE_ICON = round(16 * K)            # the two faces are 16x16 in the frame
TAGLINE_HEART = round(16.63 * K)        # the heart is 16.63, very slightly bigger
TAGLINE_ICON_DY = round(0.9 * K)        # icons sit ~0.9 below the text box top

# ("text", str) draws a run; ("icon", name, px) drops one of the masks in
# scripts/assets/tagline. Order is the reading order.
TAGLINE = [
    ("text", "Stop D"),
    ("icon", "sad-tear", TAGLINE_ICON),
    ("icon", "distressed", TAGLINE_ICON),
    ("text", "mscrolling, Start H"),
    ("icon", "heart", TAGLINE_HEART),
    ("text", "pescrolling"),
]
ICON_DIR = ROOT / "scripts/assets/tagline"

# The verse, exactly as the card draws it: centred in the frame, 24 Semibold,
# leading 1.3, in a 320 column.
CAPTION_PX = round(24 * K)
CAPTION_LINE = round(24 * 1.3 * K)
CAPTION_MAX = round(320 * K)

TITLE_PX = round(24 * K)
TITLE_LEFT = round(20 * K)              # x=20
TITLE_BOTTOM = round(20.82 * K)         # 610 - (560.18 + 29)

TRACKING = -0.02                        # -2%, on the 24px reference
WEIGHT_SEMIBOLD = 600
WEIGHT_MEDIUM = 500


def font(px, weight=WEIGHT_SEMIBOLD):
    f = ImageFont.truetype(str(FONT), px)
    f.set_variation_by_axes([14.0, float(weight)])
    return f


def advance(f, ch):
    return f.getlength(ch)


def tracked_width(text, f, track):
    """Width with letter-spacing applied, which PIL has no notion of."""
    if not text:
        return 0.0
    return sum(advance(f, c) for c in text) + track * (len(text) - 1)


def draw_tracked(d, xy, text, f, fill, track):
    """Draw a run character by character so letter-spacing can exist at all.

    Figma sets -2% on the 24px pair. PIL draws whole strings at the font's own
    advances and has no letter-spacing, so the only way to honour it is to place
    each glyph. Kerning pairs are lost doing this; at -2% on a 69px face that is
    a sub-pixel difference and invisible, whereas the 12px the tracking removes
    from "Dafod.app" is not.
    """
    x, y = xy
    for c in text:
        d.text((x, y), c, font=f, fill=fill)
        x += advance(f, c) + track


def wrap(text, f, max_w, track=0.0):
    words, lines, line = text.split(), [], ""
    for w in words:
        trial = f"{line} {w}".strip()
        if tracked_width(trial, f, track) <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def icon_mask(name, px):
    """One tagline icon, as an L-mode alpha mask at the requested size.

    Stored at 192px and downsampled here rather than rendered per size, so the
    build needs no SVG rasteriser. Only alpha is kept — the icons are painted
    white at composite time, so the source fill colour never matters.
    """
    return Image.open(ICON_DIR / f"{name}.png").convert("L").resize(
        (px, px), Image.LANCZOS)


def tagline_layer(items, f, top, track=0.0, shadow=(3, 8, 140)):
    """The tagline: text runs and inline icons, laid end to end and centred.

    Measured first, then drawn, because the block has to be centred and an icon
    is not a glyph the font can advance past. The icons are vertically nudged by
    TAGLINE_ICON_DY, which is the frame's own offset between the text box top
    and the icon frames — they sit fractionally low so their optical centre
    lands on the x-height rather than on the line box.
    """
    dy, blur, alpha = shadow
    widths, total = [], 0
    for it in items:
        w = tracked_width(it[1], f, track) if it[0] == "text" else it[2]
        widths.append(w)
        total += w

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d, ds = ImageDraw.Draw(layer), ImageDraw.Draw(shade)
    x = (W - total) / 2
    for it, w in zip(items, widths):
        if it[0] == "text":
            draw_tracked(ds, (x, top + dy), it[1], f, (0, 0, 0, alpha), track)
            draw_tracked(d, (x, top), it[1], f, (255, 255, 255, 255), track)
        else:
            m = icon_mask(it[1], it[2])
            pos = (round(x), round(top + TAGLINE_ICON_DY))
            white = Image.new("RGBA", m.size, (255, 255, 255, 255))
            black = Image.new("RGBA", m.size, (0, 0, 0, alpha))
            shade.paste(black, (pos[0], pos[1] + dy), m)
            layer.paste(white, pos, m)
        x += w
    shade = shade.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(shade, layer)


def text_layer(lines, f, line_h, top, align="center", track=0.0, shadow=(3, 8, 140)):
    """A full-frame RGBA layer, so ffmpeg can overlay it at 0:0 and forget geometry.

    Anchored by the TOP of the first line, because that is how the frame places
    everything: the wordmark at y=55, the caption at y=90.23. Centring on a
    midpoint instead would move the block whenever a caption wrapped to a
    different number of lines.

    The shadow is not in the frame — the mock's artwork happens to be dark
    exactly where its text sits. Twenty-eight covers do not all have that
    courtesy, so the card's own `0 1px 6px rgba(0,0,0,0.55)` is carried over,
    scaled: a blurred copy a few pixels lower, on its own layer so the blur
    cannot eat the glyphs it is there to lift.
    """
    dy, blur, alpha = shadow
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d, ds = ImageDraw.Draw(layer), ImageDraw.Draw(shade)
    y = top
    for ln in lines:
        x = TITLE_LEFT if align == "left" else (W - tracked_width(ln, f, track)) / 2
        draw_tracked(ds, (x, y + dy), ln, f, (0, 0, 0, alpha), track)
        draw_tracked(d, (x, y), ln, f, (255, 255, 255, 255), track)
        y += line_h
    shade = shade.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(shade, layer)


def chrome_layer(title):
    """Everything that is not the artwork or the caption: scrims, mark, reference.

    The frame shows no scrims — its own cover is dark top and bottom, so the
    text simply sits on it. That is a property of one painting, not of the
    twenty-eight this has to serve, so the card's bottom gradient is kept and
    the top is given a lighter mirror. Both are subtle enough that the frame's
    look survives them, and without them a wordmark over Proverbs 18:10's pale
    sky disappears.
    """
    mark_f = font(WORDMARK_PX, WEIGHT_SEMIBOLD)
    title_f = font(TITLE_PX, WEIGHT_SEMIBOLD)
    line_h = round(TITLE_PX * 1.2102)   # the frame's own line-height
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    grad = Image.new("RGBA", (1, H), (0, 0, 0, 0))
    top_span = H * 0.20
    for y in range(H):
        down = max(0.0, (y - H / 2) / (H / 2)) * 0.40
        up = max(0.0, (top_span - y) / top_span) * 0.20
        grad.putpixel((0, y), (0, 0, 0, int(255 * max(down, up))))
    layer = Image.alpha_composite(layer, grad.resize((W, H)))

    # Centred at the top, per the frame — not tucked into a corner. Its -1% is
    # NOT the reference's -2%; the frame sets them separately.
    track = WORDMARK_TRACK * WORDMARK_PX
    layer = Image.alpha_composite(
        layer, text_layer([WORDMARK], mark_f, line_h, WORDMARK_TOP, "center", track)
    )

    # The tagline sits under it, in the frame's 16/Medium, with the icons
    # standing in for the o's of Doomscrolling and Hopescrolling.
    tag_f = font(TAGLINE_PX, WEIGHT_MEDIUM)
    layer = Image.alpha_composite(layer, tagline_layer(TAGLINE, tag_f, TAGLINE_TOP))

    # The reference, bottom left, measured up from the foot of the frame.
    t_track = TRACKING * TITLE_PX
    lines = wrap(title, title_f, W - TITLE_LEFT - round(80 * K), t_track)
    top = H - TITLE_BOTTOM - line_h * len(lines)
    return Image.alpha_composite(
        layer, text_layer(lines, title_f, line_h, top, "left", t_track)
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
    cap_f = font(CAPTION_PX, WEIGHT_SEMIBOLD)

    chrome_layer(post["title"]).save(work / "chrome.png")

    # One PNG per caption, shown over its own window. The card centres captions
    # in the frame, so these do too.
    caps = []
    for i, s in enumerate(post["subtitles"]):
        lines = wrap(s["t"], cap_f, CAPTION_MAX)
        # Vertically centred, as on the card — the block moves with its own
        # line count so a two-line caption straddles the midline like a one.
        top = H // 2 - (CAPTION_LINE * len(lines)) // 2
        text_layer(lines, cap_f, CAPTION_LINE, top).save(work / f"c{i}.png")
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
