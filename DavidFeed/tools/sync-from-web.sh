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
import json, os, shutil, sys
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

shared = 0
for src_rel, out_name in share_pairs:
    keep.add(out_name)
    src = os.path.join(web, src_rel)
    out = os.path.join(dest, out_name)
    if not os.path.exists(out) or os.path.getmtime(src) > os.path.getmtime(out):
        shutil.copy2(src, out); shared += 1
print(f"   share clips: {len(share_pairs)} referenced, {shared} copied/updated")

for rel in sorted(wanted):
    src, name = os.path.join(web, rel), os.path.basename(rel)
    keep.add(name)
    out = os.path.join(dest, name)
    if not os.path.exists(src):
        print(f"   MISSING in web repo: {rel}"); missing += 1; continue
    if not os.path.exists(out) or os.path.getmtime(src) > os.path.getmtime(out):
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

print(f"   copied {copied}, removed {removed} unreferenced, {missing} missing")
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
