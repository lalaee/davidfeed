#!/usr/bin/env python3
"""Replace the Dynamic Island in a store screenshot with the film's own pixels.

A screenshot-mode capture (6.9", 1320x2868) shows the film flush to the top,
edge to edge, at 1320/1080 of its size, with the island drawn over its top
band. The film file is the one the app plays, so the frame on screen is in it:
this finds that frame by matching the band just below the island (rows 170-300)
against every frame, then lays the matched frame's top 175 rows over the
capture, feathered over its last 12. Unlike unisland.sh (a clone patch), the
result is the real picture, so it works on films with faces or words at the top.

    film-island.py capture.png film.mp4 out.png
"""
import subprocess, sys

shot, film, out = sys.argv[1:4]
W, BAND, SW, SH = 1320, 300, 220, 50          # compare at 1/6 scale
LO, HI = 170 // 6, BAND // 6                  # compare rows below the island

def gray_band(args):
    return subprocess.run(["ffmpeg", "-v", "error", *args, "-vf",
        f"scale={W}:-1,crop={W}:{BAND}:0:0,scale={SW}:{SH},format=gray", "-f", "rawvideo", "-"],
        capture_output=True, check=True).stdout

ref = gray_band(["-i", shot])
frames = subprocess.run(["ffmpeg", "-v", "error", "-i", film, "-vf",
    f"scale={W}:-1,crop={W}:{BAND}:0:0,scale={SW}:{SH},format=gray", "-f", "rawvideo", "-"],
    capture_output=True, check=True).stdout
n = len(frames) // (SW * SH)
lo, hi = LO * SW, HI * SW
best, best_i = None, -1
for i in range(n):
    f = frames[i * SW * SH:(i + 1) * SW * SH]
    d = sum((a - b) ** 2 for a, b in zip(f[lo:hi], ref[lo:hi])) / (hi - lo)
    if best is None or d < best:
        best, best_i = d, i
print(f"{film.split('/')[-1]}: frame {best_i}/{n}, mean sq diff {best:.1f}")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", shot, "-i", film, "-filter_complex",
    f"[1:v]select=eq(n\\,{best_i}),setpts=PTS-STARTPTS,scale={W}:-1,crop={W}:175:0:0,format=rgba[f];"
    f"color=white:s={W}x175,format=gray,drawbox=x=0:y=163:w={W}:h=12:color=black:t=fill,"
    f"boxblur=0:0:6:1,lut=y='clip((val-16)*255/219\\,0\\,255)'[m];"
    f"[f][m]alphamerge[soft];[0:v][soft]overlay=0:0:eof_action=pass,format=rgb24",
    "-frames:v", "1", out], check=True)
