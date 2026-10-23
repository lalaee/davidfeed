# App Store screenshots

`screenshots/iphone-6.9/` holds the 6.9" set (1320x2868, RGB, no alpha), in upload order.

How they were made, so the set can be redone:

1. An iPhone 17 Pro Max simulator (iOS 26), status bar overridden to 9:41:
   `xcrun simctl status_bar <udid> override --time 9:41 --batteryState charged --batteryLevel 100 ...`
2. The app launched with `-AppStoreScreenshots` (`xcrun simctl launch <udid> com.davidfeed.ios -AppStoreScreenshots`):
   the status bar is hidden and the cards' top corners are square, so a film runs flush to the top
   (`ScreenshotMode` in Design/StatusBar.swift; off in normal use).
3. `xcrun simctl io <udid> screenshot shot.png` on each film. Screenshot mode also signs in a sample reader
   ("Dafod Reader") with six saved films and two highlighted verses of Psalm 46 (`ScreenshotMode.sampleLibrary`),
   locally only — nothing is stored or sent — so the reader, You and Saved can be shown.
4. The Dynamic Island is drawn into every simulator capture. On a film, `./film-island.py shot.png <film>.mp4
   out.png` finds the exact frame on screen (matching the band below the island against every frame of the
   bundled film) and lays the film's own top rows over it — the real picture, seamless, on any film (~40 s
   each). `./unisland.sh` (a feathered clone patch) is the old fallback; it fails on films with faces or words
   at the top. On the reader and Saved the island sits on pure black and needs nothing.
5. The current set (23 Oct 2026): ink wash, art deco, watercolour, engraving, the reader (Psalm 46 with two
   highlights), Saved. Retake when the UI changes.
