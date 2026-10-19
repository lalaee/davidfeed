# App Store screenshots

`screenshots/iphone-6.9/` holds the 6.9" set (1320x2868, RGB, no alpha), in upload order.

How they were made, so the set can be redone:

1. An iPhone 17 Pro Max simulator (iOS 26), status bar overridden to 9:41:
   `xcrun simctl status_bar <udid> override --time 9:41 --batteryState charged --batteryLevel 100 ...`
2. The app launched with `-AppStoreScreenshots` (`xcrun simctl launch <udid> com.davidfeed.ios -AppStoreScreenshots`):
   the status bar is hidden and the cards' top corners are square, so a film runs flush to the top
   (`ScreenshotMode` in Design/StatusBar.swift; off in normal use).
3. `xcrun simctl io <udid> screenshot shot.png` on each film.
4. The Dynamic Island is drawn into every simulator capture. `./unisland.sh in.png out.png` clone-stamps it out
   with a feathered patch from just below it. That works on films whose top is open sky, glass or a plain
   ground; it copies faces or text upward on films with figures or captions at the top (art deco, engraving,
   shadow puppet), so those are not in the set.
5. The Bible and Library shots were taken with the status bar showing; the band behind it is the app's pure
   black, so rows 0-140 were painted black (`drawbox`), leaving every other pixel as captured.
