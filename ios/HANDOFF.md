# iOS handoff — Dafod (22 October 2026)

The native iPhone app for dafod.app: a feed of LemoLab Bible films, a Bible reader and a Library. This file
is everything the previous sessions (4 September – 22 October 2026) learned, for the agent who continues.
Read it in full before changing anything. The web app's own handoff is `../docs/HANDOFF.md`; its §3 (the
user's standing rules) applies here too. `../AGENTS.md` (the Next.js warning) is about the web app only.

---

## 1. Where things stand

- **App:** "Dafod" on the home screen. Xcode project and target are still called `DavidFeed`; bundle id
  `com.davidfeed.ios`; version 1.0 (1). Team `LZ7G2KT2U7` — Olalekan's **paid** Apple Developer account
  (provisioning profiles last 365 days). Automatic signing.
- **Runs on:** iPhone only, portrait only, iOS 18.0+. Every iOS 26 API is gated (`Design/Compat.swift`); on 18
  the glass falls back to a dark surface. Not offered as "Designed for iPhone" on Mac or Vision Pro.
- **On Olalekan's phone:** the current `main` of this folder (`b239912`): ten films, Dafod icon and name.
  His phone is an iPhone 17 Pro on **iOS 26.6.1**.
- **Not yet on TestFlight or the App Store.** What is left is listed in §8.
- **Size:** ~191 MB built (179 MB of it the ten films). Just under the 200 MB point where iOS asks before
  downloading over cellular — adding films will cross it.
- **Where the code lives:** here, `ios/` in `lalaee/davidfeed` (public repo), with the full iOS history
  (52 commits) merged in by `git subtree`. Before this it was a standalone repo at
  `~/Downloads/Code/davidfeed-ios` with no remote; that copy is now the old home — work here.

---

## 2. How to work with Olalekan (iOS-specific; see `../docs/HANDOFF.md` §3 for the rest)

- **He tests on his phone, not the simulator.** Every visible change ends with a build installed and
  launched on the phone (§4). Say "unlock your phone" when a build is waiting; the phone locks often and a
  locked phone fails the build ("Developer Disk Image is not mounted … device is locked") — re-run.
- **Verify before claiming.** He checks. Prefer evidence (pixels measured from a screenshot, values read out
  of the built `.app`, the binary's timestamp against the sources) over reasoning. If something can't be
  verified from here (audio, haptics, how it feels on the phone), say so and say what to look for.
- **The simulator is not his phone.** This Xcode (26.0.1) only has the iOS 26.0 simulator; the phone runs
  26.6.1. One bug (`.scrollEdgeEffectStyle(.soft, for: .bottom)`) rendered on 26.0 and not on 26.6.1.
- **Design cues are one or two words.** Ask what he is seeing and what it should feel like before building
  a visible change from "make it more X". He judges on the phone and iterates fast: "too thick", "too
  subtle", "remove", "bring it back". Keep each iteration small and installable.
- **Commit only when asked**, explicit paths, messages that say why. End with the `Co-Authored-By` line
  the harness gives. In this repo **never stage** the files listed in `../docs/HANDOFF.md` §2.
- **The Mac is tight:** 16 cores, often ~12 GB free disk. Cap encoders and builds at half the cores and
  `nice` them; **boot one simulator at a time** — two simulators decoding the HEVC films in software drove
  the load average to ~530 and wedged `simctl install` (2026-10-19). Shut simulators down when done.

---

## 3. What's in `ios/`

```
ios/
├─ HANDOFF.md                      this file
├─ DavidFeed/
│  ├─ DavidFeed.xcodeproj          the app (target DavidFeed; file-system-synchronised groups)
│  ├─ Info.plist                   background audio, encryption = NO, status bar not VC-based
│  ├─ run-on-device.sh             build + install + launch on the connected iPhone
│  ├─ tools/
│  │  ├─ import-bible-films.sh     the films → HEVC + posters + shorts.json (§5)
│  │  ├─ sync-from-web.sh          LEGACY: the old 37-card feed from the web; not used since the films
│  │  ├─ export.mjs, alias.mjs     its helpers (export the web's TypeScript data to JSON)
│  │  ├─ make-art34.sh             LEGACY: 3:4 lock-screen art for the old feed
│  │  └─ icons.cjs                 renders the web's nav glyphs to the asset catalogue
│  └─ DavidFeed/
│     ├─ DavidFeedApp.swift        app entry; .preferredColorScheme(.dark); audio session; remote commands
│     ├─ RootView.swift            TabView Home/Bible/Library; reflector overlay; status bar style
│     ├─ Feed/
│     │  ├─ FeedView.swift         the vertical film feed, sizing, snapping, ambience
│     │  ├─ FeedCardView.swift     one card: film, label, share + save rail, double-tap like
│     │  ├─ LoopPlayerView.swift   AVQueuePlayer + AVPlayerLooper per visible card; mute; restart on arrival
│     │  ├─ Playback.swift         which card is current, sound on/off, Now Playing, remote commands
│     │  ├─ ReflectionSampler.swift reads the playing frames: rim colours, motion, top brightness
│     │  ├─ Artwork.swift          decoded-poster cache; light/dark measure of a poster's bottom
│     │  └─ FeedHeaderView.swift   topic switcher (topics are parked: Topic.enabled = false)
│     ├─ Bible/                    reader, books sheet, compare sheet, verse action bar, highlight swatches
│     ├─ Library/LibraryView.swift saved films + highlighted verses
│     ├─ Models/                   Post (+ PostStore), AppState (saved/highlights), Topic
│     ├─ Design/
│     │  ├─ Design.swift           tokens (DF.*): colours, card radius 53, filmGap 24, type
│     │  ├─ Compat.swift           iOS 26 API gates with iOS 18 fallbacks
│     │  ├─ TabBarReflector.swift  the coloured rim on the tab bar's top edge
│     │  ├─ StatusBar.swift        status bar style setter + ScreenshotMode
│     │  └─ Haptics.swift
│     ├─ Resources/
│     │  ├─ media/                 the ten films (.mp4, HEVC) + a poster .jpg each
│     │  ├─ data/shorts.json       the feed (written by the import); topics.json (parked)
│     │  └─ bible/                 {kjv,asv,web}-<book>.json + index.json
│     ├─ Assets.xcassets           AppIcon (the Dafod mark), nav glyphs, rail icons
│     └─ PrivacyInfo.xcprivacy     UserDefaults (CA92.1); no tracking; no data collected
├─ AppStore/
│  ├─ README.md                    how the screenshots were made
│  ├─ unisland.sh                  clone-stamps the Dynamic Island out of a capture
│  └─ screenshots/iphone-6.9/      the six 1320×2868 store screenshots
└─ previewdeck/                    a separate harness for browsing third-party SwiftUI demos (DeckHost);
                                   not part of the app. Its clones (repos/) and build dirs (.dd*/) are
                                   gitignored; build caches for the app also land in previewdeck/.dd-*.
```

---

## 4. Build and run

- **Xcode 26.0.1.** If a build fails with "missing Metal Toolchain", the toolchain is downloaded but its disk
  image isn't mounted; running any `xcrun -f metal` / opening Xcode mounts it (it lives under
  `~/Library/Developer/DVTDownloads/MetalToolchain`). There is no `.metal` file left in the app, so this
  should not recur.
- **Phone:** `cd ios/DavidFeed && ./run-on-device.sh`. It finds the phone, builds Debug on half the cores
  into `../previewdeck/.dd-device`, installs, and launches with `--terminate-existing` (without it, a
  launch only foregrounds the old process and you test the old build). IDs: `xcodebuild` destination
  `00008150-001059303AF0C01C`, `devicectl` device `2DF854AB-CF91-5E53-A2B1-38BDB7676966`.
  Wait for the phone first (it must be unlocked twice in a row 5 s apart, or the build may still fail):
  ```bash
  ID=00008150-001059303AF0C01C; ok=0
  for i in $(seq 1 40); do
    line=$(xcodebuild -project DavidFeed.xcodeproj -scheme DavidFeed -showdestinations 2>/dev/null | grep "$ID")
    if [ -n "$line" ] && ! echo "$line" | grep -qi error; then ok=$((ok+1)); else ok=0; fi
    [ "$ok" -ge 2 ] && break; sleep 5
  done
  ```
  Afterwards confirm what shipped from the built app, not the sources, e.g.
  `ls ../previewdeck/.dd-device/Build/Products/Debug-iphoneos/DavidFeed.app/*.mp4 | wc -l`.
- **Simulators** (iOS 26.0 runtime only): `iPhone 17 Pro` `C1E4D38A-7B40-449B-8221-2BEB48AA1AB4` (everyday)
  and `Dafod 6.9 screenshots` (iPhone 17 Pro Max) `BF8F92C2-83BD-4EC5-A402-04F375EBBEE5` (store
  screenshots, 1320×2868). An iOS 18.5 runtime was downloaded once to check the fallbacks; it may since
  have been removed. Build into `../previewdeck/.dd-sim`. The simulator decodes HEVC in software — heavy.
- **Release check** (what an archive compiles):
  `xcodebuild -project DavidFeed.xcodeproj -scheme DavidFeed -configuration Release -destination 'generic/platform=iOS' -derivedDataPath ../previewdeck/.dd-release CODE_SIGNING_ALLOWED=NO build`
  — it built clean on 2026-10-19 with no private symbols in the binary.

---

## 5. How the app works

### The feed (`Feed/FeedView.swift`, `FeedCardView.swift`)
- **Content:** `Resources/data/shorts.json` → `PostStore.shorts`. Each post: `id`, `title` (the label),
  `backgroundImage` (poster), `posterVideoSrc` (the film), `translation` ("NIV"), `aspect` (h/w). Paths are
  web-style (`/assets/verses/x.mp4`); the bundle is flat, so only the file name is used.
- **Order:** `TopicStore.dealt` — a seeded shuffle (mulberry32 Fisher–Yates, new seed per launch). Topics
  are parked (`Topic.enabled = false`), so the feed is all films.
- **Card size = the film's shape:** width = screen width, height = width × `aspect` (9:16 → ~715 pt on a
  17 Pro). Cards are separated by `DF.filmGap` (24 pt), so ~135 pt of the next film shows below. This
  was tuned with Olalekan over several rounds ("reduce the tip" → "gap too much" → "increase the tip");
  gap and tip trade one for one because the film and the screen are both fixed.
- **Snapping:** `.scrollTargetBehavior(.viewAligned(limitBehavior: .alwaysByOne))` — one card per flick,
  like the web's `scroll-snap-stop: always`. Bottom padding lets the last card snap too. The scroll view
  ignores all safe areas so a snapped card's top is the screen's top.
- **Ambience:** behind the feed, the active film's poster at 1.25×, blur 60, saturation 2.75, crossfading
  over 0.5 s (`FeedAmbience`, the web's CSS stand-in for its Pixi scene).
- **The label** (`post.title`) and the rail icons take their colour from the film: **dark on a film whose
  poster is light at the bottom** (watercolour, woodcuts), white otherwise, with a small soft shadow
  (`ArtworkCache.isLightAtBottom`, threshold luminance 150). There is **no scrim**: the films end on their
  own caption bands (some cream), and a dark gradient read as a grey bar. A whole chapter is named alone
  ("Psalm 23"); verses only for part of one ("Psalm 45:2-8").
- **Share** sends the film file itself (it carries voice, score and captions). **Save** is the bookmark;
  double-tap also saves and bursts a heart.

### Playback and sound (`LoopPlayerView.swift`, `Playback.swift`)
- The films carry their own audio. There is **no narration player and no ambient bed** (both removed on
  2026-10-18 when the films arrived).
- Only the visible cards build a player (the active one and the one peeking below) — iOS caps video
  decoders and fails silently past the cap. The active card is unmuted when `Playback.isPlaying` (sound on,
  **true by default**); the peeking one is muted. A tap toggles sound; "Tap for sound" shows when off.
- A card **arriving** seeks its film to 0 (the peeking card has been playing silently; joining a voice
  mid-sentence was wrong).
- Background audio: `.playback` session + `UIBackgroundModes: audio` + the player's
  `audiovisualBackgroundPlaybackPolicy = .continuesIfPossible`. Lock screen shows title, "Dafod", poster;
  next/previous move the feed.

### The tab bar reflector (`Design/TabBarReflector.swift`, `Feed/ReflectionSampler.swift`)
- A 1 pt coloured rim along the **top edge of the system tab bar's capsule**, with a soft glow band under
  it (6 pt stroke, blur 3.5, opacity 0.6), clipped to the capsule so nothing spills outside. Feed tab only.
- **Colours are read off the playing film**, not the poster: an `AVPlayerItemVideoOutput` on the active
  loop (following the looper's item swaps), a 24 Hz display link, the band 72–88 % down the frame (what the
  reader sees above the bar; the bottom 12 % sits under the card's caption band) scaled to 24 bins by vImage.
  Brightness = the strip stretched over its own range (never over less than 0.25) **plus a motion glint**:
  each bin's frame-to-frame luminance change, absolute (noise floor 0.008, full at 0.04), fast rise / slow
  decay. It was tuned until the rim changed in proportion to the film (an earlier version normalised motion
  to its own peak, so codec noise flickered at full strength — "the glow is random").
- **How it finds the capsule:** a public walk of the window's views for `UITabBar`, then a subview whose
  class name contains `"Platter"` (string match only; no private API called). If a future iOS renames it,
  the rim falls back to the bar's straight top edge.
- **History — don't repeat:** a vibrancy hairline and a white "floor" line were tried and rejected ("the
  line is weird"); a mirrored band *under* the bar (`backgroundExtensionEffect`) was researched and was not
  what he meant. He wants the coloured, moving light on the top edge.

### Status bar (`Design/StatusBar.swift`, `RootView.swift`)
- Dark clock over a film whose top is light, white otherwise. `ReflectionSampler` also measures the top 7 %
  of the playing frame (hysteresis 0.62 on / 0.5 off); `RootView` sets the style on the feed tab.
- Needs `UIViewControllerBasedStatusBarAppearance = NO` (Info.plist) and the deprecated
  `UIApplication.setStatusBarStyle` — SwiftUI's hosting controller gives no other hook. Verified working on
  the 26.0 simulator and on the phone.

### Bible (`Bible/*`, `Resources/bible/`)
- KJV, ASV, WEB — all public domain. JSON per book: `{slug, name, chapters: {"23": ["v1", ...]}}`;
  `index.json` lists books per translation.
- **Built by the web app's `../scripts/build-bible.py`** from cached sources (`../.bible-cache/`), then
  converted to this per-book layout. On 2026-10-19 its OSIS parser was fixed: verses used to run to the
  *next* verse's start marker and swallowed every `<title>` between them — psalm superscriptions, Psalm
  119's ALEPH–TAV, the Book I–V markers and the next book's title on 65 books' last verses. Both apps now
  carry the fixed text (31,102 KJV verses). To regenerate the iOS files from the web output:
  ```python
  # from ios/DavidFeed/DavidFeed/Resources/bible
  import json, pathlib
  web = pathlib.Path('../../../../public/bible/kjv')
  for b in json.load(open('index.json'))['kjv']:
      f = pathlib.Path(f"kjv-{b['slug']}.json"); d = json.loads(f.read_text())
      for ch in d['chapters']:
          d['chapters'][ch] = json.load(open(web / b['slug'] / f'{ch}.json'))['v']
      f.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
  ```
- Opening the Bible tab from the feed lands on the chapter the current film quotes.

### Library and persistence (`Models/AppState.swift`)
- UserDefaults keys `davidfeed.saved` (film ids), `davidfeed.highlights` (verse → colour hex),
  `davidfeed.savedVerses`. Highlight colours `#F19AEA #FFFE54 #FF548D #61D3FA`. No account; nothing leaves
  the device (the web app has accounts; the iOS app does not).
- **Film ids are stable** (101–110) across re-imports so saved films stay saved. Don't renumber.

### Screenshot mode
- Launch with `-AppStoreScreenshots` (simulator): status bar hidden, cards' top corners square. Never on in
  normal use. See `AppStore/README.md`.

---

## 6. The films

- **Source:** `github.com/lalaee/lemo-opuscar`, folder `Bible/no-outro` (private repo; the no-outro cut has
  no "See more at Dafod.app" end card). Download with
  `gh api -H "Accept: application/vnd.github.raw" "repos/lalaee/lemo-opuscar/contents/Bible/no-outro/<name>.mp4" > <name>.mp4`.
  The same films are already public on the web (`../public/assets/films/no-outro/`).
- **The ten** (ids): Psalm 23 paper-cut lightbox (101), watercolor (102), woodcut (103); Psalm 3 shadow
  puppet (104), stained glass (105), woodcut (106); Psalm 45:2-8 art deco (107), impasto (108), engraving
  (110); Isaiah 41:10-13 ink wash (109). All 1080×1920, 24 fps, 54–92 s, NIV, voice + score + burned-in
  captions.
- **Verse ranges** come from each film's brief in lemo-opuscar (`dafod/<passage>/shared/BRIEF.md`): Psalm
  23:1–6 and Psalm 3:1–8 (whole chapters), Psalm 45:2–8, Isaiah 41:10–13 (also in its file name).
- **Import:** download the folder, then `./tools/import-bible-films.sh <folder>`. It encodes HEVC
  (libx265 crf 28, **capped at 3 Mbps** — the woodcuts' hatching came out bigger than the originals
  uncapped), ≤1080 wide, AAC 96 k stereo; cuts a poster at 10 %; removes media for films no longer in the
  folder; writes `shorts.json` (keeps existing ids, new films take the next id). ~3 min per film on 6
  threads. Adding a film: put it in the folder; if its name doesn't carry verses and it isn't a whole
  chapter, add it to `BRIEF_VERSES` in the script.

---

## 7. App Store screenshots

Six at 6.9" in `AppStore/screenshots/iphone-6.9/`: ink wash, stained glass, watercolour, impasto, reader,
Library. No status bar, no Dynamic Island, no rounded top corners. Method in `AppStore/README.md`. The
island is drawn into every iOS 26 simulator capture (`--mask` doesn't remove it); `unisland.sh` clone-stamps
it with a feathered patch — it works on open tops (sky, glass, plain ground) and copies faces or captions
on films with figures at the top (art deco, engraving, shadow puppet), so those aren't in the set. The
mask must be full-range (a gray frame is 16–235 — a 92 % opaque patch left a ghost of the pill).

---

## 8. Open items

**Olalekan, in App Store Connect (needs his login):**
1. Create the app record for `com.davidfeed.ios` (name Dafod, category, age rating).
2. Privacy policy URL — dafod.app has a page at `/privacy` (check it covers the iOS app: nothing collected,
   UserDefaults only). Support URL.
3. App Privacy: "Data Not Collected" (matches `PrivacyInfo.xcprivacy`).
4. Listing text; upload the six screenshots.
5. Xcode → Product → Archive → Distribute → App Store Connect (automatic signing creates the distribution
   certificate on first upload). TestFlight internal testing first (no review), then submit.

**Decisions / risks to raise with him:**
- **NIV credit.** The films quote the NIV. Biblica's notice ("Scripture quotations taken from The Holy Bible,
  New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by
  permission. All rights reserved worldwide.") is shown **nowhere in the app** — he had it on the cards and
  asked for it off. The films' briefs say it must appear; Biblica's terms generally require it. Suggest an
  About/credits line or at least the App Store description. Their permission for an app that is mostly NIV
  films was not verified.
- **Size:** at ~191 MB, one or two more films cross 200 MB (cellular download prompt).
- **iOS 18:** the films build has not been checked on an iOS 18 simulator (the fallbacks were checked with
  the earlier feed). Worth one pass before submitting.
- **The reflector's class-name walk** (`"Platter"`) is allowed but fragile across iOS releases.

**Cleanups (not urgent):** `tools/sync-from-web.sh` and `make-art34.sh` belong to the old 37-card feed; the
`Post` model still has the old feed's fields (`audioSrc`, `subtitles`, `shareURL`, `animatedArtworkURL`)
which are unused by the films; `Topic`/`topics.json` are parked.

---

## 9. Gotchas learned the hard way

- `devicectl process launch` without `--terminate-existing` foregrounds the old process.
- "Binary newer than every source" proves the link ran after the edits, not that they compiled in. `nm` /
  `strings` on a linked Debug device binary gave false negatives — check `.o` files under `Objects-normal`.
- SwiftUI: an overlay's frame stops at the safe area (`.offset(y: inset)` to reach under the bar);
  `.blendMode` doesn't composite over UIKit backdrop layers; `.underline()` is text content (animating it
  crossfades). A `func` declared inside a `GeometryReader` closure won't compile in a ViewBuilder.
- Editing a bash script while it runs corrupts the run — write a new file and `mv` it over.
- zsh: never name a loop variable `path` (it is bound to `PATH`).
- `ffprobe … stream=width,height -of csv=p=0` can print a trailing comma (`1080,1920,`).
- `.scrollEdgeEffectStyle(.soft, for: .bottom)` didn't render on 26.6.1 (FB18350439); `variableBlur` via
  CAFilter (BlurUIKit) works but is private API — it was removed before the App Store.
- `simctl` hangs when the Mac is overloaded; shut extra simulators, then retry.

---

## 10. How it got here (iOS commits, newest first, abridged)

| Commit | What |
| --- | --- |
| `b239912` | No-outro films (10), screenshot mode, clean App Store set |
| `5df5d37`, `7f86f54` | Status bar follows the film; KJV titles stripped (parser fix on the web) |
| `0064995` | Named Dafod; Dafod icon; first screenshots |
| `8816add` | Whole chapters named without verses |
| `bbacfe3`, `815d408`, `35731bd` | Gap/tip tuning; label colour from the film, no scrim |
| `994884e`, `042bb2a` | NIV notice off the cards; private blur removed; iPhone only |
| `e402553` | The feed becomes the LemoLab films, each with its own sound |
| `4f8a1f0` … `42d6f91` | The tab bar reflector, through several rejected and accepted versions |
| `f7cfc2c` | HEVC/AAC slimming (275 → 140 MB, old feed) |
| `d00c0d2` | iOS 18 support (Compat) |
| `aaf2c4e` | App Store prep: privacy manifest, encryption flag, icon placeholder |
| earlier | The port of the web feed (37 cards, narration, ambient bed, topics), the Bible reader, the Library, Liquid Glass and edge-blur experiments |
