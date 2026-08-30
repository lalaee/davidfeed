#!/usr/bin/env python3
"""
Force-align the known verse text of each short against its new narration.

The new clips are fresh, slower readings (cross-correlation against the chapter
mp3s peaks at only 0.28-0.44), so the existing caption timings cannot be reused
by any offset. Instead: ASR the clip with whisper.cpp for word timings, then
align the KNOWN text to the ASR words so the transcript's own errors never leak
into the captions -- only its timestamps are used.
"""
import json, re, subprocess, sys, pathlib

SRC = pathlib.Path("/Users/olalekanisaac/Downloads/Code/dafod-2/static/audio")
WORK = pathlib.Path(sys.argv[1])
MODEL = pathlib.Path.home() / ".cache/whisper/ggml-base.en.bin"

FILES = [(23,"1-3"),(27,"1"),(91,"4"),(5,"1-3"),(7,"1-2"),(16,"11"),(20,"7-8"),
         (25,"4-5"),(3,"1-3"),(45,"6-8"),(44,"25-26"),(51,"10-12"),(4,"6-8")]

# Caption index ranges, mirroring SPANS in src/data/shorts.ts
RANGES = {23:(0,6),27:(0,3),91:(8,10),5:(0,8),7:(0,4),16:(26,28),20:(17,20),
          25:(8,12),3:(0,5),45:(14,24),44:(58,61),51:(22,28),4:(14,21)}

norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def load_reference():
    """Phrase text per chapter, straight out of the TS caption files."""
    txt = ""
    for p in ("src/data/chapter-subtitles.ts", "src/data/psalm91-subtitles.ts"):
        txt += pathlib.Path(p).read_text()
    out = {}
    for name, body in re.findall(
        r"export const (psalm\d+)Subtitles: Subtitle\[\] = \[(.*?)\n\];", txt, re.S):
        out[name] = [t.replace('\\"', '"') for t in
                     re.findall(r'text: "((?:[^"\\]|\\.)*)"', body)]
    return out


def asr_words(pid, verses):
    """whisper.cpp token timings, merged back into whole words."""
    wav = WORK / f"a{pid}.wav"
    subprocess.run(["ffmpeg","-v","error","-y","-i", str(SRC/f"psalm{pid}-v{verses}.mp3"),
                    "-ac","1","-ar","16000", str(wav)], check=True)
    subprocess.run(["whisper-cli","-m",str(MODEL),"-f",str(wav),"-ml","1","-oj",
                    "-of", str(WORK/f"a{pid}")], capture_output=True, check=True)
    toks = json.load(open(WORK/f"a{pid}.json"))["transcription"]

    words = []
    for t in toks:
        raw, o = t["text"], t["offsets"]
        s, e = o["from"]/1000, o["to"]/1000
        if not raw.strip():
            continue
        # A leading space marks a new word; anything else continues the last one.
        if raw.startswith(" ") or not words:
            words.append({"text": raw.strip(), "start": s, "end": e})
        else:
            words[-1]["text"] += raw.strip()
            words[-1]["end"] = e
    return [w for w in words if norm(w["text"])]


def align(ref, hyp):
    """Needleman-Wunsch over normalised words. Returns ref index -> hyp index."""
    n, m = len(ref), len(hyp)
    GAP = -0.6
    def score(a, b):
        if a == b: return 1.0
        if a.startswith(b[:3]) or b.startswith(a[:3]): return 0.3
        return -1.0
    D = [[0.0]*(m+1) for _ in range(n+1)]
    P = [[None]*(m+1) for _ in range(n+1)]
    for i in range(1, n+1): D[i][0] = D[i-1][0]+GAP; P[i][0] = "u"
    for j in range(1, m+1): D[0][j] = D[0][j-1]+GAP; P[0][j] = "l"
    for i in range(1, n+1):
        for j in range(1, m+1):
            d = D[i-1][j-1] + score(ref[i-1], hyp[j-1])
            u = D[i-1][j] + GAP
            l = D[i][j-1] + GAP
            best = max(d, u, l)
            D[i][j] = best
            P[i][j] = "d" if best == d else ("u" if best == u else "l")
    out, i, j = {}, n, m
    while i > 0 and j > 0:
        if P[i][j] == "d":
            if ref[i-1] == hyp[j-1] or score(ref[i-1], hyp[j-1]) > 0:
                out[i-1] = j-1
            i, j = i-1, j-1
        elif P[i][j] == "u": i -= 1
        else: j -= 1
    return out


def main():
    reference = load_reference()
    result, report = {}, []

    for pid, verses in FILES:
        phrases = reference[f"psalm{pid}"][RANGES[pid][0]: RANGES[pid][1]+1]
        hyp = asr_words(pid, verses)

        ref_words, owner = [], []
        for k, ph in enumerate(phrases):
            for w in ph.split():
                if norm(w):
                    ref_words.append(norm(w)); owner.append(k)

        amap = align(ref_words, [norm(w["text"]) for w in hyp])
        matched = len(amap)

        # Per phrase: earliest matched word start, latest matched word end.
        bounds = []
        for k in range(len(phrases)):
            idx = [amap[i] for i in range(len(ref_words)) if owner[i] == k and i in amap]
            bounds.append((hyp[min(idx)]["start"], hyp[max(idx)]["end"]) if idx else None)

        # Fill any unmatched phrase by interpolating between its neighbours.
        for k, b in enumerate(bounds):
            if b: continue
            prev = next((bounds[x][1] for x in range(k-1, -1, -1) if bounds[x]), None)
            nxt  = next((bounds[x][0] for x in range(k+1, len(bounds)) if bounds[x]), None)
            lo = prev if prev is not None else 0.0
            hi = nxt if nxt is not None else lo + 1.0
            bounds[k] = (lo, hi)

        # Chain each end onto the next start so captions never blink out between
        # phrases -- the same convention the chapter captions use.
        subs = []
        for k, (s, e) in enumerate(bounds):
            end = bounds[k+1][0] if k+1 < len(bounds) else e
            subs.append({"id": k+1, "startTime": round(max(0.0, s), 3),
                         "endTime": round(max(end, s+0.3), 3), "text": phrases[k]})
        for k in range(1, len(subs)):                    # keep it monotonic
            if subs[k]["startTime"] < subs[k-1]["startTime"]:
                subs[k]["startTime"] = subs[k-1]["endTime"]

        result[f"psalm{pid}"] = subs
        report.append((pid, verses, matched, len(ref_words),
                       subs[0]["startTime"], subs[-1]["endTime"]))

    print(f"{'clip':18} {'matched':>12} {'captions':>9} {'first':>7} {'last':>7}")
    print("-"*62)
    for pid, v, m, tot, first, last in report:
        pct = 100*m/tot if tot else 0
        flag = "" if pct >= 85 else "   <-- LOW MATCH"
        print(f"psalm{pid}-v{v:<9} {m:4}/{tot:<4} {pct:3.0f}% "
              f"{len(result[f'psalm{pid}']):9} {first:7.2f} {last:7.2f}{flag}")

    (WORK/"aligned.json").write_text(json.dumps(result, indent=1))
    print(f"\nwrote {WORK/'aligned.json'}")


main()
