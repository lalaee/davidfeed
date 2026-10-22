#!/bin/bash
# Lock-screen animated artwork, pre-rendered at 3:4.
#
# MPMediaItemAnimatedArtwork hands the handler a requested CGSize and warns that
# "assets that diverge significantly from the requested aspect ratio may be
# rejected". The cards' own loops run 0.416 to 0.771, so most would be refused
# for the 3:4 slot. This centre-crops each one to exactly 3:4 and renders a
# matching first frame for the preview, so every card gets animated artwork
# rather than the handful that happen to be the right shape.
set -u
SRC="$1"; OUT="$2"
mkdir -p "$OUT"

# x264 auto-detects the core count and takes the lot — on a 16-core machine one
# of these encodes measured over 1400% CPU, and the loop below runs one per
# card, so a sync saturated the whole Mac for its duration. Half the cores, and
# nice(1) on top so the encode yields to whatever the machine is actually being
# used for. Override with THREADS=16 when nothing else is running.
THREADS="${THREADS:-$(( $(sysctl -n hw.ncpu) / 2 ))}"
[ "$THREADS" -lt 2 ] && THREADS=2
for f in "$SRC"/*-loop.mp4 "$SRC"/feed-poster-video-loop.mp4; do
  [ -f "$f" ] || continue
  stem=$(basename "$f" .mp4)
  out="$OUT/${stem}-art34.mp4"
  [ -f "$out" ] && continue
  # crop to 3:4 about the centre, then scale to 600x800
  nice -n 10 ffmpeg -y -v error -threads "$THREADS" -i "$f" \
    -vf "crop='min(iw,ih*3/4)':'min(ih,iw*4/3)',scale=600:800:flags=lanczos" \
    -an -c:v libx264 -crf 30 -preset veryfast -pix_fmt yuv420p \
    -movflags +faststart "$out" 2>/dev/null
  # preview must match the first frame of that clip
  nice -n 10 ffmpeg -y -v error -i "$out" -frames:v 1 -q:v 4 "$OUT/${stem}-art34.jpg" 2>/dev/null
done
