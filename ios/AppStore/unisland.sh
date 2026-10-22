#!/bin/bash
# Clone-stamp the Dynamic Island out of a 1320x2868 simulator capture.
# The island sits at x 472-847, y 42-151. A 560x260 patch from just below it
# (source y 260-520) goes over x 380, y 0. Its mask is solid from the top edge
# down to ~y 182 and across x ~448-872 (clear of the island on every side),
# then fades to nothing well INSIDE the patch, so the patch's own edges never
# show.
# The mask is stretched to full range: a gray frame is 16-235, so without it
# the patch is only 92% opaque and a ghost of the pill shows on light skies.
#   unisland.sh in.png out.png
set -euo pipefail
ffmpeg -y -v error -i "$1" -filter_complex "
  [0:v]split=2[base][src];
  [src]crop=560:260:380:260[patch];
  color=black:s=560x260,format=gray,drawbox=x=40:y=0:w=480:h=210:color=white:t=fill,boxblur=14:2,lut=y='clip((val-16)*255/219\,0\,255)'[mask];
  [patch][mask]alphamerge[soft];
  [base][soft]overlay=380:0,format=rgb24" -frames:v 1 "$2"
