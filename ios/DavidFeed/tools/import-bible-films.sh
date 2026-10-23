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
#   ./tools/import-bible-films.sh [folder-of-originals]
#
# With no folder it rewrites shorts.json from films.ts over the media already
# encoded here.
#
# Source: github.com/lalaee/lemo-opuscar, Bible/no-outro (the films without
# the "See more at Dafod.app" end card).
set -euo pipefail

SRC="${1:-/nonexistent}"   # optional: only needed to (re-)encode
APP="$(cd "$(dirname "$0")/.." && pwd)"
RES="$APP/DavidFeed/Resources"
MEDIA="$RES/media"
mkdir -p "$MEDIA"

# Half the cores and nice'd: a film is a minute of 1080p, and the Mac stays usable.
THREADS="${THREADS:-$(( $(sysctl -n hw.ncpu) / 2 ))}"; [ "$THREADS" -lt 2 ] && THREADS=2

for f in "$SRC"/*.mp4; do
  [ -e "$f" ] || continue
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

# The feed's data, from the web's own list: src/data/films.ts (this app lives
# in that repo, at ios/). Which films are on the feed, their ids (the web's,
# so a reader's saves sync between the two), their verses and where their
# burned-in words sit -- all read from there, so the two feeds can't drift.
# A film in the source folder but not in films.ts is not imported (Psalm 45's
# impasto, taken off the web feed), and its media is removed.
python3 - "$SRC" "$MEDIA" "$RES" "$APP/../../src/data/films.ts" <<'PY2'
import json, re, subprocess, sys, pathlib
src, media, res, films_ts = map(pathlib.Path, sys.argv[1:5])
text = films_ts.read_text()
rows = []
for m in re.finditer(r'\{\s*id:\s*(\d+),(.*?)captions:\s*\[([\d.]+),\s*([\d.]+)\]\s*\}', text):
    pid, body, a, b = int(m.group(1)), m.group(2), float(m.group(3)), float(m.group(4))
    f = lambda k: (re.search(k + r':\s*"([^"]*)"', body) or [None, None])[1]
    chapter = int(re.search(r'chapter:\s*(\d+)', body).group(1))
    book, file, verses = f('book') or 'Psalm', f('file'), f('verses')
    out = media / f'{file}.mp4'
    if not out.exists(): sys.exit(f'{file}.mp4 is not encoded and no original was given')
    w, h = [int(x) for x in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
        'stream=width,height', '-of', 'csv=p=0', str(out)], capture_output=True, text=True).stdout.split(',') if x.strip()][:2]
    title = f'{book} {chapter}' + (f':{verses}' if verses else '')
    rows.append({'id': pid, 'title': title, 'backgroundImage': f'/assets/verses/{file}.jpg',
                 'posterVideoSrc': f'/assets/verses/{file}.mp4', 'translation': 'NIV',
                 'aspect': round(h / w, 4), 'captions': [a, b]})
    print(f"   {pid:>5}  {title:16} {w}x{h}  words {a:.2f}-{b:.2f}  {out.stat().st_size / 1e6:5.1f} MB  {file}")
keep = {r['posterVideoSrc'].split('/')[-1].removesuffix('.mp4') for r in rows}
for m in list(media.glob('*.mp4')) + list(media.glob('*.jpg')):
    if m.stem not in keep: m.unlink(); print(f'   removed {m.name} (not in films.ts)')
(res / 'data' / 'shorts.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False) + '\n')
print(f'shorts.json: {len(rows)} films')
PY2
echo "media: $(du -sh "$MEDIA" | cut -f1)"
