#!/bin/bash
# Put the Bible films from lalaee/lemo-opuscar into the feed.
#
# The films are the whole card: they carry their own voice, score and
# captions, so there is no narration, no bed and no share clip beside them.
# This takes a folder of the originals (40-100MB each, H.264 at the
# renderer's bitrate), encodes each to HEVC at the phone's size with stereo
# AAC, pulls a poster for the still and the ambience, and writes the feed's
# data with each film's measured shape. Safe to re-run: a film whose encode
# is newer than its original is left alone, and media for films no longer in
# the folder is removed.
#
#   ./tools/import-bible-films.sh <folder-of-originals>
#
# Source: github.com/lalaee/lemo-opuscar, Bible/no-outro (the films without
# the "See more at Dafod.app" end card).
set -euo pipefail

SRC="${1:?folder of original films}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
RES="$APP/DavidFeed/Resources"
MEDIA="$RES/media"
mkdir -p "$MEDIA"

# Half the cores and nice'd: a film is a minute of 1080p, and the Mac stays usable.
THREADS="${THREADS:-$(( $(sysctl -n hw.ncpu) / 2 ))}"; [ "$THREADS" -lt 2 ] && THREADS=2

# Drop media for films that are no longer in the source folder.
for m in "$MEDIA"/*.mp4 "$MEDIA"/*.jpg; do
  [ -e "$m" ] || continue
  stem=$(basename "${m%.*}")
  [ -f "$SRC/$stem.mp4" ] || { rm -f "$m"; echo "   removed $(basename "$m")"; }
done

for f in "$SRC"/*.mp4; do
  stem=$(basename "${f%.mp4}")
  out="$MEDIA/$stem.mp4"
  if [ ! -s "$out" ] || [ "$f" -nt "$out" ]; then
    echo "== encoding $stem"
    # HEVC, hvc1 so iOS plays it, no wider than 1080 (the phone draws the card
    # at ~1200px, so 1080 is the size and 4K would be weight). AAC 96k stereo:
    # these have a score under the voice, and mono would fold it. Capped at
    # 3 Mbps: the woodcuts' hatching came out at 120MB uncapped -- bigger than
    # the originals -- and 25MB capped (SSIM 0.92); the flat styles never reach it.
    nice -n 10 ffmpeg -y -v error -threads "$THREADS" -i "$f" \
      -vf "scale='min(1080,iw)':-2" -c:v libx265 -preset medium -crf 28 \
      -x265-params "vbv-maxrate=3000:vbv-bufsize=6000:log-level=error" -tag:v hvc1 -pix_fmt yuv420p \
      -c:a aac -b:a 96k -ac 2 -movflags +faststart "$out"
  fi
  poster="$MEDIA/$stem.jpg"
  if [ ! -s "$poster" ] || [ "$out" -nt "$poster" ]; then
    # Ten percent in: past any title card, into the picture.
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")
    ffmpeg -y -v error -ss "$(python3 -c "print($d*0.1)")" -i "$out" -frames:v 1 -q:v 3 "$poster"
  fi
done

# The feed's data, written in one go. For each film:
# - the passage from its name: "isaiah-41-10-13-ink-wash" is Isaiah 41:10-13;
#   "psalm-23-woodcut" names no verses, so they come from the film's brief
#   (dafod/psalm-*/shared/BRIEF.md in lemo-opuscar) below;
# - a whole chapter is named alone ("Psalm 23"), verses only for part of one,
#   judged against the chapter's verse count in the WEB text the app ships;
# - the translation: NIV for every film so far, per each film's CREDITS;
# - an id that stays put across re-runs, so a film saved on a phone stays
#   saved; new films take the next free number from 101.
python3 - "$SRC" "$MEDIA" "$RES" <<'PY'
import json, re, subprocess, sys, pathlib
src, media, res = map(pathlib.Path, sys.argv[1:4])
BRIEF_VERSES = {('psalm', 23): '1-6', ('psalm', 3): '1-8', ('psalm', 45): '2-8'}
index = {b['slug']: b['name'] for b in json.load(open(res / 'bible' / 'index.json'))['web']}
SLUG = {'psalm': 'psalms'}                       # file names say "psalm", the Bible "psalms"
SINGULAR = {'Psalms': 'Psalm'}                    # "Psalm 23", not "Psalms 23"

shorts = res / 'data' / 'shorts.json'
old = {}
if shorts.exists():
    for p in json.load(open(shorts)):
        old[p['posterVideoSrc'].split('/')[-1].removesuffix('.mp4')] = p['id']
next_id = max([100, *old.values()]) + 1

rows = []
for f in sorted(src.glob('*.mp4')):
    stem = f.stem
    m = re.match(r'([a-z]+)-(\d+)(?:-(\d+)-(\d+))?-', stem)
    if not m: sys.exit(f'cannot read a passage from {stem}')
    book, ch = m.group(1), int(m.group(2))
    verses = f'{m.group(3)}-{m.group(4)}' if m.group(3) else BRIEF_VERSES.get((book, ch), '')
    slug = SLUG.get(book, book)
    count = len(json.load(open(res / 'bible' / f'web-{slug}.json'))['chapters'][str(ch)])
    name = SINGULAR.get(index[slug], index[slug])
    whole = verses == f'1-{count}'
    title = f'{name} {ch}' + ('' if whole or not verses else f':{verses}')
    out = media / f'{stem}.mp4'
    # Some encodes report a trailing field ("1080,1920,"): take the first two.
    w, h = [int(x) for x in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
        'stream=width,height', '-of', 'csv=p=0', str(out)], capture_output=True, text=True).stdout.split(',') if x.strip()][:2]
    pid = old.get(stem)
    if pid is None: pid, next_id = next_id, next_id + 1
    rows.append({'id': pid, 'title': title, 'backgroundImage': f'/assets/verses/{stem}.jpg',
                 'posterVideoSrc': f'/assets/verses/{stem}.mp4', 'translation': 'NIV', 'aspect': round(h / w, 4)})
    print(f"   {pid}  {title:14} {w}x{h}  {out.stat().st_size / 1e6:5.1f} MB  {stem}")
rows.sort(key=lambda r: r['id'])
shorts.write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n')
print(f'shorts.json: {len(rows)} films')
PY
echo "media: $(du -sh "$MEDIA" | cut -f1)"
