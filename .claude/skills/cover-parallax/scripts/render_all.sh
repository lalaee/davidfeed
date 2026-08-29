#!/usr/bin/env bash
# Render a depth-parallax loop for every chapter cover in public/assets/chapters.
#
# Strength is expressed relative to image width rather than in absolute pixels:
# the house setting is 60 measured against a 736px cover, i.e. 8.15% of width.
# Applying a flat 60 to a 260px cover would crop it to 136x166. Scaling keeps
# motion visually equivalent and the crop proportional across mixed sources.
#
#   ./scripts/render_all.sh [output-dir]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../../.." && pwd)"
COVERS="$REPO/public/assets/chapters"
OUT="${1:-$REPO/public/assets/chapters}"
VENV="${VENV:-$REPO/i2v-env}"
REF_W=736
REF_STRENGTH=60

[ -x "$VENV/bin/python" ] || { echo "no venv at $VENV — see SKILL.md Setup"; exit 1; }
mkdir -p "$OUT"

printf '%-14s %-11s %-9s %-14s %s\n' cover source strength output note
for src in "$COVERS"/psalm*.jpg "$COVERS"/psalm*.png; do
  [ -e "$src" ] || continue
  name=$(basename "$src"); slug="${name%.*}"
  w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$src")
  h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$src")
  s=$(awk "BEGIN{printf \"%.0f\", $REF_STRENGTH*$w/$REF_W}")

  "$VENV/bin/python" "$HERE/parallax.py" "$src" "$OUT/${slug}-loop.mp4" \
      --seconds 4 --strength "$s" >/dev/null

  ow=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$OUT/${slug}-loop.mp4")
  oh=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$OUT/${slug}-loop.mp4")
  kb=$(( $(stat -f%z "$OUT/${slug}-loop.mp4" 2>/dev/null || stat -c%s "$OUT/${slug}-loop.mp4") / 1024 ))
  note=""; [ "$w" -lt 500 ] && note="LOW-RES SOURCE — replace the cover"
  printf '%-14s %-11s %-9s %-14s %s\n' "$slug" "${w}x${h}" "$s" "${ow}x${oh} ${kb}KB" "$note"
done

echo
echo "$(ls "$OUT"/*-loop.mp4 | wc -l | tr -d ' ') loops, $(du -sh "$OUT" | cut -f1) total"
