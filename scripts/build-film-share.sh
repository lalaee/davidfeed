#!/bin/bash
# Builds one film's share video: public/assets/share/<id>.mp4.
#
#   scripts/build-film-share.sh <post id> <lemo-opuscar file name>
#   scripts/build-film-share.sh 301 psalm-3-shadow-puppet
#
# The source is the film as LemoLab delivered it WITH the dafod ending ("See
# more at: Dafod.app"), from lemo-opuscar's Bible/outro folder. Download it
# with curl from raw.githubusercontent.com and a gh token (gh api mangles
# binaries) into $SRC_DIR, or set SRC_DIR to wherever it is.
#
# What it makes, from Figma "Dafod Reels" › New Feed UI (2753:935):
#   the whole 1080x1920 film, uncropped, its bottom corners rounded 20 (at the
#   frame's 375 width; 57.6 here), over a white strip 212 tall holding the
#   Dafod icon and "Dafod.app" — 1080x2132 overall, the strip there for the
#   whole video, the ending included. No title on the film.
#
# The strip and the corners are one PNG, scripts/assets/share/strip-overlay.png:
# white everywhere except a transparent film-shaped hole, exported from that
# Figma frame at 2.88x (1080/375). Re-export it if the design changes.
#
# Encode: H.264 CRF 25 capped at 2.5Mbps (the feed films' settings), AAC 128k,
# faststart. ~2.5 minutes a film at -threads 4 on the dev Mac.
set -euo pipefail
id="$1"; name="$2"
here="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="${SRC_DIR:-$here/../.film-sources/outro}"
overlay="$here/assets/share/strip-overlay.png"
out="$here/../public/assets/share/$id.mp4"
nice ffmpeg -v error -y -threads 4 -i "$SRC_DIR/$name.mp4" -loop 1 -i "$overlay" \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos,pad=1080:2132:0:0:color=white[f];[f][1:v]overlay=0:0:shortest=1,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -profile:v high -level 4.1 -crf 25 -maxrate 2.5M -bufsize 5M -preset slow \
  -c:a aac -b:a 128k -movflags +faststart "$out"
echo "$id $(du -h "$out" | cut -f1)"
