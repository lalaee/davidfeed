#!/bin/bash
# Put the Bible films from lalaee/lemo-opuscar into the feed.
#
# The films are the whole card on this branch: they carry their own voice,
# score and captions, so there is no narration, no bed and no share clip
# beside them. This takes a folder of the originals (30-99MB each, H.264 at
# the renderer's bitrate), encodes each to HEVC at the phone's size with
# stereo AAC, pulls a poster for the still and the ambience, and writes the
# feed's data with the film's measured shape. Safe to re-run: a film whose
# encode is newer than its original is left alone.
#
#   ./tools/import-bible-films.sh <folder-of-originals>
set -euo pipefail

SRC="${1:?folder of original films}"
APP="$(cd "$(dirname "$0")/.." && pwd)"
RES="$APP/DavidFeed/Resources"
MEDIA="$RES/media"
mkdir -p "$MEDIA"

# Half the cores and nice'd: a film is a minute of 1080p, and the Mac stays usable.
THREADS="${THREADS:-$(( $(sysctl -n hw.ncpu) / 2 ))}"; [ "$THREADS" -lt 2 ] && THREADS=2

# The verses each psalm's films cover, and their translation (NIV, all of
# them), from dafod/psalm-*/shared/BRIEF.md in
# lemo-opuscar. The films are the passage, not always the whole psalm:
# Psalm 45's are verses 2 to 8. (/bin/bash on macOS has no associative arrays.)
verses_for() {
  case "$1" in
    psalm-23) echo "1-6" ;;
    psalm-3)  echo "1-8" ;;
    psalm-45) echo "2-8" ;;
    *)        echo "" ;;
  esac
}

rows=()
n=0
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
  read -r w h < <(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$out" | tr ',' ' ')
  aspect=$(python3 -c "print(round($h/$w, 4))")
  # "psalm-23-woodcut" -> "Psalm 23:1-6": the book and the verses, not the style.
  passage=$(python3 -c "import re,sys; print(re.match(r'[a-z]+-\d+', sys.argv[1]).group(0))" "$stem")
  verses=$(verses_for "$passage")
  title=$(python3 -c "
import sys; book, ch = sys.argv[1].rsplit('-', 1); v = sys.argv[2]
print(book.capitalize() + ' ' + ch + (':' + v if v else ''))" "$passage" "$verses")
  n=$((n+1))
  # Ids from 101: the old feed's ids are still in saved state on the phone
  # (a saved "3" would otherwise light up whichever film landed third).
  rows+=("{\"id\": $((100+n)), \"title\": \"$title\", \"backgroundImage\": \"/assets/verses/$stem.jpg\", \"posterVideoSrc\": \"/assets/verses/$stem.mp4\", \"translation\": \"NIV\", \"aspect\": $aspect}")
  echo "   $n  $title  ${w}x${h}  $(du -h "$out" | cut -f1)"
done

printf '[\n%s\n]\n' "$(IFS=$',\n'; echo "${rows[*]}" | sed 's/^/  /')" > "$RES/data/shorts.json"
python3 -c "import json; d=json.load(open('$RES/data/shorts.json')); print(f'shorts.json: {len(d)} films')"
echo "media: $(du -sh "$MEDIA" | cut -f1)"
