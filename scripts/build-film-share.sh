#!/bin/bash
# Builds one film's share video: public/assets/share/<id>.mp4.
#
#   scripts/build-film-share.sh <post id> <lemo-opuscar file name> [top]
#   scripts/build-film-share.sh 301 psalm-3-shadow-puppet
#   scripts/build-film-share.sh 302 psalm-3-stained-glass top
#
# The source is the film as LemoLab delivered it WITH the dafod ending ("See
# more at: Dafod.app"), from lemo-opuscar's Bible/outro folder. Download it
# with curl from raw.githubusercontent.com and a gh token (gh api mangles
# binaries) into $SRC_DIR, or set SRC_DIR to wherever it is.
#
# What it makes, from Figma "Dafod Reels" › New Feed UI (2753:935):
#   the whole 1080x1920 film, uncropped, its bottom corners rounded 20 (at the
#   frame's 375 width; 57.6 here), over a white strip 212 tall holding the
#   Dafod icon and "Dafod.app" at its left and "Verse of the day" at its
#   right (Inter Medium 16, -3%) — 1080x2132 overall, the strip there for the
#   whole video, the ending included. No title on the film.
#
# The strip sits 150 higher than the frame has it (LIFT): a WhatsApp Story lays
# its Reply bar over the video's bottom ~160 (at 1080 wide), and the strip was
# under it. The video stays 1080x2132, so the film gives up 150: by default
# its foot goes under the strip, which clears the words of every film whose
# lowest words end above 0.89 of its height. "top" slides the film up instead,
# its head cut, for the four whose words reach lower and have none at the
# top: 302, 303, 4501 and 4503. White fills below the strip.
#
# The strip and the corners are one PNG, scripts/assets/share/strip-overlay.png:
# white everywhere except a transparent film-shaped hole, exported from that
# Figma frame at 2.88x (1080/375). Re-export it if the design changes.
#
# Encode: H.264 CRF 25 capped at 2.5Mbps (the feed films' settings), AAC 128k,
# faststart. ~2.5 minutes a film at -threads 4 on the dev Mac.
set -euo pipefail
id="$1"; name="$2"; mode="${3:-foot}"
LIFT=150
here="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="${SRC_DIR:-$here/../.film-sources/outro}"
overlay="$here/assets/share/strip-overlay.png"
out="${OUT:-$here/../public/assets/share/$id.mp4}"
case "$mode" in
  foot) film="" ;;
  top) film=",crop=1080:$((1920 - LIFT)):0:$LIFT" ;;
  *) echo "mode is foot or top, not $mode" >&2; exit 1 ;;
esac
nice ffmpeg -v error -y -threads 4 -i "$SRC_DIR/$name.mp4" -loop 1 -i "$overlay" \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos$film,pad=1080:2132:0:0:color=white[f];[f][1:v]overlay=0:-$LIFT:shortest=1,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -profile:v high -level 4.1 -crf 25 -maxrate 2.5M -bufsize 5M -preset slow \
  -c:a aac -b:a 128k -movflags +faststart "$out"
echo "$id $(du -h "$out" | cut -f1)"
