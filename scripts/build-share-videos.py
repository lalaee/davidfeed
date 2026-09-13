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

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUT = PUBLIC / "assets/share"
WORK = ROOT / ".share-build"
FONT = ROOT / "scripts/fonts/Inter.ttf"

# The card is 375pt wide; the share sheet wants a full-resolution portrait clip.
W, H = 1080, 1920
K = W / 375  # 2.88 — every measurement below is the card's own, scaled by this.

# All of it read off the Figma frame "New Feed UI" (2753:935), a 375x610 card
# drawn 1:1, and scaled by K. The clip stays 1080x1920 because that is what
# Stories and Status want; the frame is a card mock, not a delivery format.
#
# THE FURNITURE MOVED INTO A WHITE FOOTER. The previous frame (2711:1006) laid a
# white wordmark and a two-clause tagline over the ARTWORK at the top. This one
# ends the artwork at y=536.5 and gives the remaining 73.5 to a white bar: the
# wordmark at its left, "Start Hopescrolling" at its right, both BLACK. So the
# footer anchors to the BOTTOM, the artwork takes everything above it, and the
# height 9:16 adds over the mock falls in the artwork.
#
# Two things in the frame do NOT render and are not reproduced: "Frame 37013 —
# traced" is visible:false, and "Play - Iconly Pro" sits at 9243,-1912, far
# outside a frame that clips. The iOS status bar is mock chrome — the previous
# frames carried one too and no shipped clip has ever drawn it.
FOOTER_UNITS = 610 - 536.5              # 73.5
FOOTER_H = round(FOOTER_UNITS * K)      # 212
FOOTER_TOP = H - FOOTER_H               # 1708 — where the artwork ends
INK = (0, 0, 0, 255)                    # #000000, the footer's text

# The wordmark, bottom LEFT, with a heart standing in for the o of Dafod.
WORDMARK = "Daf   d.app"                # the run of spaces IS the icon slot
WORDMARK_PX = round(20 * K)
WORDMARK_LEFT = round(16.4 * K)
WORDMARK_TOP = FOOTER_TOP + round((562.8 - 536.5) * K)
WORDMARK_TRACK = -0.01                  # -1%, as before
# Frame x=49 against the text's own x=16.4 puts the heart in the three spaces
# after "Daf". Centred in its slot rather than placed absolutely, for the reason
# the old tagline was: PIL's advances differ from Figma's by a fraction of a
# unit, and a slot-anchored icon moves with the letters instead of away.
WORDMARK_SLOT = ("Daf", "   ", "heart", 15.8)
HEART_RGB = (85, 200, 242)              # #55C8F2 — the frame's own, not white
WORDMARK_ICON_TOP = FOOTER_TOP + round((567.2 - 536.5) * K)

# The tagline, bottom RIGHT, and one clause now rather than two.
TAGLINE_PX = round(15.208379745483398 * K)
TAGLINE_LINE = 15.208379745483398 * 1.11 * K    # line-height 111%, unrounded
TAGLINE_TOP = FOOTER_TOP + round((566 - 536.5) * K)
TAGLINE_RIGHT = round((375 - (216.6 + 141)) * K)  # 17.4 of air, mirroring the 16.4
# "Start " and "scrolling" are Medium, "Hope" is Bold ITALIC — which the shipped
# variable Inter cannot draw: its only axes are Optical size and Weight, and it
# has no italic instance. So the italic is a second file.
TAGLINE_RUNS = [("Start ", False), ("Hope", True), ("scrolling", False)]

ICON_DIR = ROOT / "scripts/assets/tagline"

# The verse, exactly as the card draws it: centred, 24 Semibold, leading 1.3,
# in a 320 column — but centred in the ARTWORK now, not the frame, since the
# footer owns the bottom 212px.
CAPTION_PX = round(24 * K)
CAPTION_LINE = round(24 * 1.3 * K)
CAPTION_MAX = round(320 * K)

TITLE_PX = round(24 * K)
TITLE_LEFT = round(20 * K)              # x=20
# 536.5 - (479.7 + 29): the reference sits 27.8 above the foot of the ARTWORK.
TITLE_ABOVE_FOOTER = round(27.8 * K)

TRACKING = -0.02                        # -2%, on the 24px reference
WEIGHT_SEMIBOLD = 600
WEIGHT_MEDIUM = 500


FONT_ITALIC = ROOT / "scripts/fonts/Inter-BoldItalic.ttf"


def font(px, weight=WEIGHT_SEMIBOLD, italic=False):
    """Inter at a weight, or the separate Bold Italic file.

    The variable Inter.ttf carries Optical size and Weight and nothing else, so
    "Hope" cannot be slanted out of it. Shearing an upright would be a fake —
    Inter's italic redraws letterforms, it does not lean them — so the real
    static Bold Italic is shipped alongside."""
    if italic:
        return ImageFont.truetype(str(FONT_ITALIC), round(px))
    f = ImageFont.truetype(str(FONT), round(px))
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


def ink_span(mask):
    """(left inset, ink width) of a mask, in its own pixels.

    Icons are centred by their INK, not by their frame: the frames carry
    different amounts of padding (the faces 1.5 units a side, the heart 1.66),
    so centring frames would leave the heart visibly off in its gap.
    Ink is taken at 50% alpha, the same place every other measurement in this
    file draws the line. Using a near-zero threshold instead counts the
    anti-aliased skirt as ink, which reads the icons ~0.5 units wider than they
    are and pushes their neighbours apart by that much.
    """
    a = np.array(mask)
    cols = np.nonzero((a >= 128).any(axis=0))[0]
    return float(cols.min()), float(cols.max() - cols.min() + 1)


def icon_mask(name, px):
    """One tagline icon, as an L-mode alpha mask at the requested size.

    Stored at 192px and downsampled here rather than rendered per size, so the
    build needs no SVG rasteriser. Only alpha is kept — the icons are painted
    white at composite time, so the source fill colour never matters.
    """
    return Image.open(ICON_DIR / f"{name}.png").convert("L").resize(
        (px, px), Image.LANCZOS)


def footer_layer():
    """The white bar the card ends on: wordmark left, tagline right, both black.

    None of the shadow machinery below applies here. That exists to lift white
    text off twenty-eight different paintings; this ground is a flat white the
    clip paints itself, so the text is simply drawn onto it.
    """
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle([0, FOOTER_TOP, W, H], fill=(255, 255, 255, 255))

    # The wordmark, with the heart standing in for the o.
    mf = font(WORDMARK_PX, WEIGHT_SEMIBOLD)
    track = WORDMARK_TRACK * WORDMARK_PX
    draw_tracked(d, (WORDMARK_LEFT, WORDMARK_TOP), WORDMARK, mf, INK, track)
    prefix, slot, name, size = WORDMARK_SLOT
    a = WORDMARK_LEFT + tracked_width(prefix, mf, track) + track
    b = WORDMARK_LEFT + tracked_width(prefix + slot, mf, track) + track
    m = icon_mask(name, round(size * K))
    inset, iw = ink_span(m)
    x = a + (b - a - iw) / 2 - inset
    layer.paste(Image.new("RGBA", m.size, HEART_RGB + (255,)),
                (round(x), WORDMARK_ICON_TOP), m)

    # The tagline, right-anchored so its air mirrors the wordmark's, in three
    # runs because the middle one is a different file. Same line-box correction
    # the old tagline needed: PIL anchors at the ascender, Figma centres the
    # glyph box in a 111% line, and skipping it floats the row high.
    fonts = [font(TAGLINE_PX, italic=True) if it else font(TAGLINE_PX, WEIGHT_MEDIUM)
             for _, it in TAGLINE_RUNS]
    widths = [f.getlength(t) for (t, _), f in zip(TAGLINE_RUNS, fonts)]
    asc, desc = fonts[0].getmetrics()
    y = TAGLINE_TOP + (TAGLINE_LINE - (asc + desc)) / 2
    x = W - TAGLINE_RIGHT - sum(widths)
    for (t, _), f, w in zip(TAGLINE_RUNS, fonts, widths):
        d.text((x, y), t, font=f, fill=INK)
        x += w
    return layer


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
    """Everything that is not the artwork or the caption: scrim, reference, footer.

    The frame shows no scrim — its own cover is dark exactly where its text
    sits. That is a property of one painting, not of the twenty-eight this has
    to serve, so the card's gradient is kept. It now stops at FOOTER_TOP:
    below that the footer paints its own white and there is nothing to lift.
    """
    title_f = font(TITLE_PX, WEIGHT_SEMIBOLD)
    line_h = round(TITLE_PX * 1.2102)   # the frame's own line-height
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Only the DOWNWARD half survives. The top mirror existed to lift a wordmark
    # that sat at y=45; that wordmark is in the footer now, so the top scrim was
    # darkening the head of twenty-eight paintings for nothing.
    art = FOOTER_TOP
    grad = Image.new("RGBA", (1, H), (0, 0, 0, 0))
    for y in range(art):
        down = max(0.0, (y - art / 2) / (art / 2)) * 0.40
        grad.putpixel((0, y), (0, 0, 0, int(255 * down)))
    layer = Image.alpha_composite(layer, grad.resize((W, H)))

    # The reference, bottom left of the ARTWORK, measured up from the footer
    # rather than from the foot of the clip.
    t_track = TRACKING * TITLE_PX
    lines = wrap(title, title_f, W - TITLE_LEFT - round(80 * K), t_track)
    top = FOOTER_TOP - TITLE_ABOVE_FOOTER - line_h * len(lines)
    layer = Image.alpha_composite(
        layer, text_layer(lines, title_f, line_h, top, "left", t_track))

    return Image.alpha_composite(layer, footer_layer())


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
        # Vertically centred in the ARTWORK, as on the card — the footer owns
        # the bottom 212px, so the midline is FOOTER_TOP/2 and not H/2. The
        # block moves with its own line count so a two-line caption straddles
        # that midline the way a one-line one does.
        top = FOOTER_TOP // 2 - (CAPTION_LINE * len(lines)) // 2
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
