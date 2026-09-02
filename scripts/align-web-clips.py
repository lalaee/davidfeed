#!/usr/bin/env python3
"""
Force-align the WEB shorts against their own text.

Same method as align-shorts.py — whisper.cpp for word timings, then
Needleman-Wunsch of the KNOWN text onto those words, so only the timestamps
come from the ASR and a misheard word can never reach the screen. The
difference is the reference: these clips read the World English Bible, and we
already ship that text, so the reference is pulled straight out of
public/bible/web rather than being retyped. scripts/web-clips.json holds the
resolved references and their exact wording.

Writes src/data/web-subtitles.ts.
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/shorts"
WORK = ROOT / ".align-web"
MODEL = Path.home() / ".cache/whisper/ggml-base.en.bin"
WORK.mkdir(exist_ok=True)

# Caption sizing. The shipped shorts average 6.2 words and 2.3s a caption; a
# line has to be readable in the time it is on screen and fit the card's width.
TARGET, HARD_MAX = 8, 11


def as_read(text):
    """Our WEB files print the divine name as "Yahweh"; the readers say "the LORD".

    The World English Bible ships in two editions that differ in exactly this
    and nothing else, and these recordings are plainly the LORD edition — every
    clip that has the name in it reads it that way. Captions have to match the
    voice, so the reference is converted before alignment rather than after:
    that way the ASR is scored against what was actually said, and the 83% match
    on 2 Samuel (two of twelve words) goes away instead of being tolerated.
    It also puts these captions in the same register as the thirteen already
    shipping, which write "the LORD" too."""
    text = re.sub(r"\bYahweh's\b", "the LORD's", text.replace("\u2019", "'"))
    text = re.sub(r"\bYahweh\b", "the LORD", text)
    # Sentence-initial, and after an opening quote: "The LORD", not "the LORD".
    text = re.sub(r'(^|[.!?;]\s+|\u201c)the LORD', lambda m: m.group(1) + "The LORD", text)
    return text.replace("'", "\u2019")


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def asr_words(stem):
    wav = WORK / f"{stem}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SRC / f"{stem}.mp3"),
                    "-ac", "1", "-ar", "16000", str(wav)], check=True)
    subprocess.run(["whisper-cli", "-m", str(MODEL), "-f", str(wav), "-ml", "1",
                    "-oj", "-of", str(WORK / stem)], capture_output=True, check=True)
    toks = json.load(open(WORK / f"{stem}.json"))["transcription"]
    words = []
    for t in toks:
        raw, o = t["text"], t["offsets"]
        s, e = o["from"] / 1000, o["to"] / 1000
        if not raw.strip():
            continue
        if raw.startswith(" ") or not words:
            words.append({"text": raw.strip(), "start": s, "end": e})
        else:
            words[-1]["text"] += raw.strip()
            words[-1]["end"] = e
    return [w for w in words if norm(w["text"])]


def align(ref, hyp):
    """Needleman-Wunsch over normalised words. ref index -> hyp index."""
    n, m, GAP = len(ref), len(hyp), -0.6

    def score(a, b):
        if a == b: return 1.0
        if a.startswith(b[:3]) or b.startswith(a[:3]): return 0.3
        return -1.0

    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    P = [[None] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): D[i][0] = D[i-1][0] + GAP; P[i][0] = "u"
    for j in range(1, m + 1): D[0][j] = D[0][j-1] + GAP; P[0][j] = "l"
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d = D[i-1][j-1] + score(ref[i-1], hyp[j-1])
            u, l = D[i-1][j] + GAP, D[i][j-1] + GAP
            best = max(d, u, l)
            D[i][j] = best
            P[i][j] = "d" if best == d else ("u" if best == u else "l")
    out, i, j = {}, n, m
    while i > 0 and j > 0:
        if P[i][j] == "d":
            if score(ref[i-1], hyp[j-1]) > 0:
                out[i-1] = j - 1
            i, j = i - 1, j - 1
        elif P[i][j] == "u": i -= 1
        else: j -= 1
    return out


def balance_quotes(lines):
    """Drop quote marks whose partner is in a verse this clip does not read.

    Deuteronomy 31:6 and Isaiah 12:2 both END a speech that OPENED a verse or
    two earlier, so our text carries their closing mark and nothing to match it.
    On a card that renders as a stray floating quote. Balance is checked across
    the whole clip, not per caption, because a quotation legitimately opens on
    one line and closes three lines later.
    """
    OPEN, CLOSE = "“", "”"
    text = " ".join(lines)
    extra_close = text.count(CLOSE) - text.count(OPEN)
    extra_open = -extra_close
    out = list(lines)
    # Strip surplus closers from the end backwards, surplus openers from the front.
    for i in range(len(out) - 1, -1, -1):
        while extra_close > 0 and CLOSE in out[i]:
            out[i] = out[i][::-1].replace(CLOSE, "", 1)[::-1]
            extra_close -= 1
    for i in range(len(out)):
        while extra_open > 0 and OPEN in out[i]:
            out[i] = out[i].replace(OPEN, "", 1)
            extra_open -= 1
    return [l.strip() for l in out]


def phrases(text):
    """Split the verse into caption-sized lines, breaking at punctuation first.

    Clause boundaries are where a reader pauses, so a caption that ends on one
    changes at the same moment the voice does. Only when a clause overruns
    HARD_MAX is it cut mid-phrase, and then at TARGET words."""
    # Keep the delimiter attached to the piece it closes.
    parts = [p.strip() for p in re.split(r"(?<=[.;:,”?!])\s+", text) if p.strip()]
    out = []
    for p in parts:
        ws = p.split()
        if len(ws) <= HARD_MAX:
            out.append(p)
            continue
        for k in range(0, len(ws), TARGET):
            out.append(" ".join(ws[k:k + TARGET]))
    # A one- or two-word piece is a flash, not a caption, so it joins a
    # neighbour — but WHICH neighbour is decided by its own punctuation. A
    # fragment ending in a comma is the opening of the clause after it
    # ("Yes," / "Behold,") and folds FORWARD; one ending in a full stop closed
    # the clause before it and folds BACK. Getting this backwards is what put
    # "I will strengthen you. Yes," on one line.
    merged = []
    carry = ""
    for p in out:
        p = (carry + " " + p).strip() if carry else p
        carry = ""
        if len(p.split()) <= 2 and p.rstrip().endswith(","):
            carry = p
            continue
        if merged and len(p.split()) <= 2:
            merged[-1] += " " + p
        else:
            merged.append(p)
    if carry:
        if merged: merged[-1] += " " + carry
        else: merged.append(carry)
    return balance_quotes(merged)


def main():
    clips = json.load(open(ROOT / "scripts/web-clips.json"))
    result, report = {}, []

    for c in clips:
        stem = c["file"].replace(".mp3", "")
        lines = phrases(as_read(c["text"]))
        hyp = asr_words(stem)

        ref_words, owner = [], []
        for k, ph in enumerate(lines):
            for w in ph.split():
                if norm(w):
                    ref_words.append(norm(w)); owner.append(k)

        amap = align(ref_words, [norm(w["text"]) for w in hyp])
        pct = 100 * len(amap) / len(ref_words)

        bounds = []
        for k in range(len(lines)):
            idx = [amap[i] for i in range(len(ref_words)) if owner[i] == k and i in amap]
            bounds.append((hyp[min(idx)]["start"], hyp[max(idx)]["end"]) if idx else None)

        # Interpolate any line whose words all went unmatched.
        for k, b in enumerate(bounds):
            if b: continue
            prev = next((bounds[j][1] for j in range(k - 1, -1, -1) if bounds[j]), 0.0)
            nxt = next((bounds[j][0] for j in range(k + 1, len(bounds)) if bounds[j]), c["seconds"])
            bounds[k] = (prev, prev + (nxt - prev) / 2)

        # Butt the captions together so no line is ever blank mid-sentence, and
        # let the last one hold to the end of the file.
        subs = []
        for k, (s, e) in enumerate(bounds):
            start = round(bounds[k - 1][1], 2) if k else round(s, 2)
            end = round(bounds[k + 1][0], 2) if k + 1 < len(bounds) else round(c["seconds"], 2)
            subs.append({"id": k + 1, "startTime": start, "endTime": max(end, start + 0.4),
                         "text": lines[k]})
        result[stem] = subs
        report.append((stem, len(hyp), len(ref_words), pct, len(subs),
                       hyp[0]["start"], " ".join(w["text"] for w in hyp[:8])))

    print(f"{'clip':<26}{'asr':>5}{'ref':>5}{'match':>8}{'caps':>6}{'t0':>7}  transcript head")
    for r in report:
        print(f"{r[0]:<26}{r[1]:>5}{r[2]:>5}{r[3]:>7.0f}%{r[4]:>6}{r[5]:>7.2f}  {r[6]}")

    out = ROOT / "src/data/web-subtitles.ts"
    with open(out, "w") as f:
        f.write('import type { Subtitle } from "./psalm23-subtitles";\n\n')
        f.write("/*\n * Captions for the verse cards, force-aligned to the audio.\n"
                " *\n"
                " * GENERATED by scripts/align-web-clips.py — edit that, not this.\n"
                " *\n"
                " * whisper.cpp (ggml-base.en) supplies word timings; the WORDS come from the\n"
                " * reference text in scripts/web-clips.json, laid onto those timings by\n"
                " * Needleman-Wunsch. So an ASR mistake can shift a caption but can never\n"
                " * change what it says.\n"
                " *\n"
                " * Almost all of these are the World English Bible, taken from our own\n"
                " * public/bible/web. Isaiah 45:2 is the exception: that recording is NIV, a\n"
                " * translation we do not ship, so its wording is carried in the manifest and\n"
                " * was confirmed word for word against the transcript before use.\n"
                " */\n\n")
        f.write("export const webSubtitles: Record<string, Subtitle[]> = {\n")
        for stem, subs in result.items():
            f.write(f"  // {stem}.mp3 — {len(subs)} captions\n")
            f.write(f'  "{stem}": [\n')
            for s in subs:
                t = s["text"].replace("\\", "\\\\").replace('"', '\\"')
                f.write(f'    {{ id: {s["id"]}, startTime: {s["startTime"]}, '
                        f'endTime: {s["endTime"]}, text: "{t}" }},\n')
            f.write("  ],\n")
        f.write("};\n")
    print(f"\nwrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
