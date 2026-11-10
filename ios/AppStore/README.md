# App Store screenshots

`screenshots/iphone-6.3/` holds the set App Store Connect now requires -- "iPhone with Dynamic Island
(medium display)", 1206x2622 -- and `screenshots/iphone-6.9/` the same shots at 1320x2868 for the
optional large-display slot; RGB, no alpha, in upload order. The 6.3" set is what version 1.1 carries.

The current set (9 Nov 2026): the woodcut films alone, no app around them -- no tab bar, no
status bar, no title or buttons -- each caught on a well-known line:

1. Jeremiah 29:11 -- "For I know the plans I have for you," declares the LORD,
2. Psalm 23:1 -- The Lord is my shepherd, I lack nothing.
3. Isaiah 41:10 -- So do not fear, for I am with you;
4. Philippians 4:6 -- Do not be anxious about anything,
5. Romans 12:2 -- Do not conform to the pattern of this world,

(John 3:16, Proverbs 3:5 and Joshua 1:9 were in the first cut and taken out on 10 Nov 2026; their
times were 3.5, 38.8 and 53.4.)

How they were made, so the set can be redone:

1. The frame: from lemo-opuscar's `Bible/no-outro/<passage>-woodcut.mp4` (1080x1920), at a time the
   film's own .srt (`dafod/<passage>/woodcut/*.srt`) shows the line, near the end of the caption so it
   has fully come in: `ffmpeg -ss <t> -i <film>.mp4 -frames:v 1 frame.png`. Times used: Jeremiah 5.6,
   Psalm 23 4.9, Isaiah 4.3, Philippians 17.0, Romans 12 22.9.
2. The shot (6.9"; the 6.3" set is the same at 1206 wide: film 1206x2144, a 200-row band from row
   1937, 239 rows above from row 161 of the doubled band and 239 below): the frame scaled to the full
   1320 width (1320x2347), and the 521 rows the 6.9" screen has
   over a 9:16 film made up from the film's own paper -- a 220-row band of bare paper from under its
   words, doubled, 260 rows above and 261 below -- so the paper's grain runs on without a seam
   (a flat fill of its colour, #EDE7D6, showed an edge):

       ffmpeg -i frame.png -filter_complex "[0:v]scale=1320:2347:flags=lanczos,split=2[f][a];
         [a]crop=1320:220:0:2120,split=2[a1][a2];[a1][a2]vstack,split=2[t][u];
         [t]crop=1320:260:0:180[top];[u]crop=1320:261:0:0[bot];[top][f][bot]vstack=3,format=rgb24" out.png

The earlier sets were simulator captures of the app (`-AppStoreScreenshots`, `ScreenshotMode` in
Design/StatusBar.swift, and `film-island.py` / `unisland.sh` to take the Dynamic Island out); that mode
is still there for shots of the app itself.
