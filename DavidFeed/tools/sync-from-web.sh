#!/bin/bash
# Pull the web app's current data and media into the iOS bundle.
#
# The port does not keep its own copy of the feed's content: it re-reads
# davidfeed's own TypeScript, so editing artwork or verses there and running
# this is the whole update. Safe to re-run — it only copies what changed and
# only renders artwork it does not already have.
#
#   ./tools/sync-from-web.sh [path-to-davidfeed]
set -euo pipefail

WEB="${1:-/Users/olalekanisaac/Downloads/Code/davidfeed}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
RES="$APP/DavidFeed/Resources"
TOOLS="$APP/tools"

[ -d "$WEB/src/data" ] || { echo "No davidfeed source at $WEB"; exit 1; }

echo "== 1/4  exporting data from the web app's own TypeScript =="
# export.mjs registers its module resolver from /tmp/dfexport and writes its
# output there, so that directory has to exist and hold alias.mjs before it
# runs. Staging it was a manual step the first time and was never written down,
# which meant this script only worked until /tmp was next cleaned. Doing it here
# is what makes "safe to re-run" actually true.
mkdir -p /tmp/dfexport
cp "$TOOLS/alias.mjs" /tmp/dfexport/alias.mjs
( cd "$WEB" && node --experimental-strip-types --no-warnings "$TOOLS/export.mjs" )
cp /tmp/dfexport/shorts.json "$RES/data/shorts.json"
[ -f /tmp/dfexport/topics.json ] && cp /tmp/dfexport/topics.json "$RES/data/topics.json"

echo "== 2/4  syncing referenced media =="
python3 - "$WEB/public" "$RES/media" "$RES/data/shorts.json" <<'PY'
import json, os, shutil, subprocess, sys
web, dest, data = sys.argv[1], sys.argv[2], sys.argv[3]
posts = json.load(open(data))
keys = ("backgroundImage", "videoSrc", "posterVideoSrc", "audioSrc")

wanted = {p[k].lstrip("/") for p in posts for k in keys if p.get(k)}
# The ambient bed is referenced by the Feed component, not by any post, so it
# would never appear in this sweep. It has been missed once already.
wanted.add("assets/ambient-bed.m4a")

# The share clips are not referenced by any post field either: the web builds
# them per id into assets/share/<id>.mp4 (build-share-videos.py) and fetches
# them by id at share time. They are what a shared card actually IS -- 1080x1920
# with the branding, reference and captions burned in and the narration muxed
# under it -- as opposed to the silent 3:4 parallax loop the card shows.
#
# They are copied under the name the web hands to the share sheet,
# shareFileName() in shareVideo.ts: title lowercased with every run of
# non-alphanumerics collapsed to a dash, plus "-dafod.mp4". Naming them that way
# here means ShareLink can hand the file over directly and the recipient sees
# "psalm-23-1-3-dafod.mp4" rather than "23.mp4".
import re
share_pairs = []
for post in posts:
    pid, title = post.get("id"), post.get("title") or ""
    if pid is None:
        continue
    src_rel = f"assets/share/{pid}.mp4"
    if os.path.exists(os.path.join(web, src_rel)):
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower())
        share_pairs.append((src_rel, f"{slug}-dafod.mp4"))

copied = missing = 0
keep = set()

# Share clips ship as the web renders them: single pass, H.264, bed already
# under the voice. They used to be looped here so a Story got two passes, and
# that doubling was 93MB of the app -- the single largest thing in it. The
# second pass now happens on the phone at share time: ShareClip composes the
# bundled clip twice with a passthrough export, a stream copy that takes a
# fraction of a second, so the recipient still gets two passes and the
# download does not carry them. H.264 on purpose: these files leave the phone
# for other people's devices, and HEVC would risk a recipient who cannot play
# it.
THREADS = max(2, (os.cpu_count() or 4) // 2)

shared = 0
for src_rel, out_name in share_pairs:
    keep.add(out_name)
    src = os.path.join(web, src_rel)
    out = os.path.join(dest, out_name)
    if not os.path.exists(out) or os.path.getmtime(src) > os.path.getmtime(out):
        shutil.copy2(src, out); shared += 1
print(f"   share clips: {len(share_pairs)} referenced, {shared} copied (single pass; looped at share time)")

# What ships is not a copy of the web's files but a re-encode of them, and the
# numbers are why. The web's H.264 parallax loops are soft painterly texture
# with slow camera motion -- the easiest thing there is to compress -- and at
# HEVC crf 28 they come out at a FIFTH of the size with SSIM 0.983 against the
# source, frame-checked at 100% for banding in the gradients. Narration is
# spoken word: 64k mono AAC halves it. Together with single-pass share clips
# that is 275MB -> ~130MB, under the line where iOS asks before a cellular
# download, with no hosting and the app still fully offline.
#
# hvc1, not hev1: AVFoundation will not play the other tag. Every phone iOS 18
# runs on decodes HEVC in hardware.
def hevc(src, out):
    subprocess.run(
        ["nice", "-n", "10", "ffmpeg", "-y", "-v", "error", "-threads", str(THREADS),
         "-i", src, "-c:v", "libx265", "-preset", "medium", "-crf", "28",
         "-tag:v", "hvc1", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", out],
        check=True)

def aac(src, out):
    subprocess.run(
        ["nice", "-n", "10", "ffmpeg", "-y", "-v", "error",
         "-i", src, "-c:a", "aac", "-b:a", "64k", "-ac", "1", "-movflags", "+faststart", out],
        check=True)

encoded = 0
for rel in sorted(wanted):
    src, name = os.path.join(web, rel), os.path.basename(rel)
    if not os.path.exists(src):
        print(f"   MISSING in web repo: {rel}"); missing += 1; continue
    stem, ext = os.path.splitext(name)
    if ext == ".mp3":
        name = stem + ".m4a"                      # Post.narrationURL looks for this first
    keep.add(name)
    out = os.path.join(dest, name)
    if os.path.exists(out) and os.path.getmtime(src) <= os.path.getmtime(out):
        continue
    if ext == ".mp4" and name != "ambient-bed.m4a":
        hevc(src, out); encoded += 1
    elif ext == ".mp3":
        aac(src, out); encoded += 1
    else:
        shutil.copy2(src, out); copied += 1

# Artwork gets reassigned upstream, so files fall out of use. Drop them, and the
# 3:4 lock-screen pair rendered from them, or the bundle only ever grows.
removed = 0
for f in os.listdir(dest):
    if f in keep or f == "ambient-bed.m4a":
        continue
    if f.endswith("-art34.mp4") or f.endswith("-art34.jpg"):
        if f.rsplit("-art34", 1)[0] + ".mp4" in keep:
            continue
    os.remove(os.path.join(dest, f)); removed += 1

print(f"   copied {copied}, re-encoded {encoded}, removed {removed} unreferenced, {missing} missing")
PY

echo "== 3/4  rendering 3:4 lock-screen artwork for anything new =="
"$TOOLS/make-art34.sh" "$RES/media" "$RES/media"

echo "== 4/4  summary =="
python3 - "$RES" <<'PY'
import json, os, sys
res = sys.argv[1]
posts = json.load(open(os.path.join(res, "data", "shorts.json")))
media = os.listdir(os.path.join(res, "media"))
art = len([f for f in media if f.endswith("-art34.mp4")])
size = sum(os.path.getsize(os.path.join(res, "media", f)) for f in media) / 1e6
print(f"   {len(posts)} cards, {len(media)} media files ({size:.0f} MB), {art} lock-screen clips")
missing = [p["title"] for p in posts
           if not os.path.exists(os.path.join(res, "media", os.path.basename(p["backgroundImage"])))]
print("   cards missing artwork:", missing or "none")
PY
echo
echo "Now rebuild:  ./run-on-device.sh"
