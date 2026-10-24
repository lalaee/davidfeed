# iOS handoff — Dafod (updated 24 October 2026)

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
- **On Olalekan's phone:** the `ios-parity` branch (23 Oct): nine films, accounts, You tab. His phone is an
  iPhone 17 Pro on **iOS 26.6.1**.
- **Parity with the web (23 Oct):** the app now follows the web's phone app (branch `fit-phone-card` →
  `ios-parity`): nine films with the web's ids, no card label, the web's `spread()` order, cards cropped
  around each film's words on short screens, the web's share file (with the Dafod ending and white strip),
  and **accounts** — Sign in with Apple / Google through the same Supabase project, the Library synced with
  the web (one account, both apps), saving and highlighting gated behind sign-in, a **You** tab in place of
  Library. See §5 "Accounts".
- **Licensed Bibles (24 Oct, `6b7cec7`):** the reader now has NIV, NKJV and NLT as well as KJV, ASV and
  WEB, **NIV the default**. The three are fetched from the website's `/api/bible` route, not bundled — see
  §5 "Bible". This is on `main` but on no phone and in no build yet: the next archive must include it.
- **Not yet on TestFlight or the App Store.** What is left is listed in §8.
- **Size:** ~157 MB built (144 MB of it the nine films).
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
│  ├─ DavidFeed.entitlements       Sign in with Apple; associated domains webcredentials:(www.)dafod.app
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
│     │  ├─ ShareFilm.swift        the share item: the web's share file from dafod.app, cached
│     │  └─ FeedHeaderView.swift   topic switcher (topics are parked: Topic.enabled = false)
│     ├─ Bible/                    reader, books sheet, compare sheet, verse action bar, highlight swatches
│     ├─ Account/
│     │  ├─ Account.swift          session, sign-in (Apple native, Google via the web's callback), gating, sync
│     │  ├─ Supabase.swift         the REST calls (no SDK), Keychain session
│     │  ├─ SignInViews.swift      the sign-in sheet, the provider buttons, an in-app Safari view
│     │  └─ YouView.swift          the You tab: prompt or Account (Saved, Privacy, Delete account, Sign out)
│     ├─ Library/LibraryView.swift Saved: films + highlights (opened from You)
│     ├─ Models/                   Post (+ PostStore), AppState (saved/highlights + the web row), Topic
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
- **Content:** `Resources/data/shorts.json` → `PostStore.shorts`, written by the import **from the web's
  `src/data/films.ts`** (§6). Each post: `id` (the web's), `title` (reference; not shown on the card),
  `backgroundImage` (poster), `posterVideoSrc` (the film), `translation` ("NIV"), `aspect` (h/w), `captions`
  ([highest, lowest] of the burned-in words, fractions of the height, OCR-measured on the web). Paths are
  web-style (`/assets/verses/x.mp4`); the bundle is flat, so only the file name is used.
- **Order:** `TopicStore.dealt` (seeded mulberry32 Fisher–Yates, new seed per launch), then
  `FeedView.spread` — the web's `spread()`: never two films of the same passage back to back. Topics are
  parked (`Topic.enabled = false`).
- **Card size = the film's shape:** width = screen width, height = width × `aspect` (9:16 → ~715 pt on a
  17 Pro), **capped at the room above the tab bar less the gap** — on short iPhones (SE, mini) the card is
  cut short and `FeedCardView.cropTop` crops the film's head by only what its lowest words need to sit
  inside the card (the web's `.feed-card` rule; a film whose words span more than the card keeps its head).
  Cards are separated by `DF.filmGap` (24 pt), so ~135 pt of the next film shows below on a 17 Pro. This
  was tuned with Olalekan over several rounds; gap and tip trade one for one.
- **Snapping:** `.scrollTargetBehavior(.viewAligned(limitBehavior: .alwaysByOne))` — one card per flick,
  like the web's `scroll-snap-stop: always`. Bottom padding lets the last card snap too. The scroll view
  ignores all safe areas so a snapped card's top is the screen's top.
- **Ambience:** behind the feed, the active film's poster at 1.25×, blur 60, saturation 2.75, crossfading
  over 0.5 s (`FeedAmbience`, the web's CSS stand-in for its Pixi scene).
- **No label on the card** (taken off on the web; the title is the card's VoiceOver label and the share
  sheet's preview). The rail icons take their colour from the film: **dark on a film whose
  poster is light at the bottom** (watercolour, woodcuts), white otherwise, with a small soft shadow
  (`ArtworkCache.isLightAtBottom`, threshold luminance 150). There is **no scrim**: the films end on their
  own caption bands (some cream), and a dark gradient read as a grey bar. A whole chapter is named alone
  ("Psalm 23"); verses only for part of one ("Psalm 45:2-8").
- **Share** (`ShareFilm`) sends the web's share file — the film with its "See more at: Dafod.app" ending
  over the white Dafod.app strip, 1080×2132 — fetched from `https://www.dafod.app/assets/share/<id>.mp4`
  when a destination asks for it, cached in Caches/share/; offline it falls back to the bundled film.
  **Save** is the bookmark; double-tap also saves and bursts a heart. **Both need an account** (below).

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
- **NIV, NKJV, NLT — licensed, fetched.** `BibleStore.load` asks the website's
  `https://www.dafod.app/api/bible/<id>/<slug>/<chapter>` (the API.Bible key lives only on the server;
  see the root `docs/HANDOFF.md` §6) and keeps each chapter in memory and under Caches/licensed-bible
  for 29 days (API.Bible wants cached text refreshed within 30). NIV is the default translation, as on
  the web. The chapter's copyright line shows under the last verse; the compare sheet leaves it out by
  request. Offline with nothing cached, the reader says the translation needs a connection. FUMS view
  reporting is required of web apps only, so the app reports nothing. Slugs and canon are the KJV
  index's, which match the web's BOOKS.
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

### Accounts, You and the synced Library (`Account/*`, `Models/AppState.swift`)
- **The same accounts as dafod.app:** Supabase project `ulmptivzgvcpbygpkkfv`, table `public.library` (one
  row per reader: `saved_posts {"2301": true}`, `saved_verses {"Psalms 23": {"3": true}}`, `highlights
  {"Psalms 23": {"1": "#FFFE54"}}`), RLS-protected. The app talks to it over plain HTTPS
  (`Supabase.swift`, no SDK) with the public anon key the website ships. Session in the Keychain
  (`app.dafod.session`), refreshed when within a minute of expiry.
- **Gating:** saving a film, the double-tap heart and highlighting a verse go through
  `Account.shared.gated { … }` — signed in, done now; signed out, the **sign-in sheet** opens and the action
  is applied once they're in (closing the sheet drops it). Actions set END STATES, never toggles (the web's
  rule: a replayed toggle could undo a save made on another device).
- **Sync** (a port of the web's `lib/auth.ts`): AppState stays the instant cache; every local change pushes
  the whole row (debounced 400 ms, `dafod.libraryDirty` until confirmed). On sign-in: `dafod.libraryOwner`
  absent → the phone's pre-account saves are merged into the account (device wins per verse); same reader →
  server wins unless dirty; another reader → local dropped. Pulled again whenever the app returns to the
  front. Sign-out clears the local Library. The app's verse keys (`psalms/23/1`) are converted to the web's
  chapter keys (`Psalms 23` + `1`) via `bible/index.json` (same 66 names as the web).
- **Ids:** films use the web's ids (2301…, 301…, 4501, 4503, 41001). Saves made under the app's old ids
  (101–110) are migrated on launch (`AppState.webID`).
- **Sign in with Apple:** native (`ASAuthorizationController`), SHA-256 nonce, token straight to Supabase
  (`com.davidfeed.ios` is one of the Apple provider's client IDs). Apple's name arrives only on the first
  authorisation; it's written to the account's `full_name`. Needs the entitlement (the App ID already has
  the capability on). Not testable on the simulator (no Apple Account).
- **Google:** the web's own flow — Google's OpenID endpoint with the **web** client
  (`62034029832-8od4…`), `response_type=id_token`, returning to `https://www.dafod.app/auth/google` — run in
  `ASWebAuthenticationSession` with an **https callback** (iOS 17.4+), which iOS allows only if dafod.app's
  `/.well-known/apple-app-site-association` names `LZ7G2KT2U7.com.davidfeed.ios` under `webcredentials`
  (added in this branch; served as JSON by `next.config.ts`). **Until that file is deployed, Google can't
  return to the app** — iOS reports it as a cancel ("not associated with domain"); the app then says
  "Google sign-in isn't ready in the app yet. Use Continue with Apple for now." Verified on the simulator:
  Google's page opens; the return is refused for exactly that reason. The https callback needs iOS 17.4,
  below the app's 18.0 target, so it's available everywhere the app runs. No Google iOS client was created
  on purpose: it would need a second client ID in Supabase's Google
  provider and changes to Google Cloud.
- **You tab** (`YouView`): signed out — "Keep what speaks to you", Continue with Google / Apple, Privacy
  (opens dafod.app/privacy in an in-app Safari view). Signed in — "Account", the reader (initial, name,
  email), rows **Saved** (the old Library, now pills Films / Highlights), Privacy, **Delete account**, Sign
  out.
- **Delete account** calls `public.delete_my_account()` (migration
  `supabase/migrations/20261023000000_delete_account.sql`, **apply by hand in the Supabase SQL editor**).
  Until it exists the app shows "Couldn't delete your account" and offers the email request
  (lakesofmotion@gmail.com) the web uses. App Review requires in-app deletion for apps with accounts
  (guideline 5.1.1(v)) — apply the migration before submitting.
- **Privacy manifest** now declares email, user ID and other user content (saves/highlights), linked, not
  tracking, for app functionality. App Store Connect's App Privacy answers must match (no longer "Data Not
  Collected").

### Screenshot mode
- Launch with `-AppStoreScreenshots` (simulator): status bar hidden, cards' top corners square. Never on in
  normal use. See `AppStore/README.md`.

---

## 6. The films

- **Source:** `github.com/lalaee/lemo-opuscar`, folder `Bible/no-outro` (private repo; the no-outro cut has
  no "See more at Dafod.app" end card). Download with
  `gh api -H "Accept: application/vnd.github.raw" "repos/lalaee/lemo-opuscar/contents/Bible/no-outro/<name>.mp4" > <name>.mp4`.
  The same films are already public on the web (`../public/assets/films/no-outro/`).
- **The nine** (the web's ids): Psalm 23 paper-cut lightbox (2301), watercolor (2302), woodcut (2303); Psalm
  3 shadow puppet (301), stained glass (302), woodcut (303); Psalm 45:2-8 art deco (4501), engraving (4503);
  Isaiah 41:10-13 ink wash (41001). Psalm 45's impasto (4502) is off the feed on both (its words sit at both
  ends of the frame and can't clear the bar on a short phone). All 1080×1920, 24 fps, 54–92 s, NIV, voice +
  score + burned-in captions.
- **Verse ranges** come from each film's brief in lemo-opuscar (`dafod/<passage>/shared/BRIEF.md`): Psalm
  23:1–6 and Psalm 3:1–8 (whole chapters), Psalm 45:2–8, Isaiah 41:10–13 (also in its file name).
- **Import:** `./tools/import-bible-films.sh [folder]`. **The list of films, their ids, verses and caption
  spans come from the web's `src/data/films.ts`** (this repo, `../../src/data/films.ts`), so the two feeds
  can't drift: add a film there first. With a folder of originals it (re-)encodes; without one it only
  rewrites `shorts.json` and removes media for films no longer listed. Encoding: HEVC
  (libx265 crf 28, **capped at 3 Mbps** — the woodcuts' hatching came out bigger than the originals
  uncapped), ≤1080 wide, AAC 96 k stereo; cuts a poster at 10 %; removes media for films no longer in the
  folder. ~3 min per film on 6 threads.

---

## 7. App Store screenshots and review notes

Six at 6.9" in `AppStore/screenshots/iphone-6.9/` (retaken 23 Oct): ink wash, art deco, watercolour,
engraving, the reader (Psalm 46, two highlights), Saved. No status bar, no Dynamic Island, no rounded top
corners. Method in `AppStore/README.md`: `-AppStoreScreenshots` (status bar off, square top corners, and a
local sample reader + Library so You/Saved/highlights can be shown), then `AppStore/film-island.py` restores
the film's real pixels under the island by matching the exact frame in the bundled film.

The reader screenshot is from before the licensed Bibles and shows KJV, which is still true of the app —
no need to retake it. If you do retake it, NIV is now the default and needs the network (or pick KJV).

`AppStore/REVIEW_NOTES.md` is the text for App Review › Notes (updated 24 Oct for NIV/NKJV/NLT): how to sign in (Sign in with Apple, any Apple
ID), where account deletion is, why background audio, the one permission (add to Photos, from Save Video),
no purchases/UGC/tracking, and the content rights.

## 8. Open items

**Olalekan, in App Store Connect (needs his login):**
1. Create the app record for `com.davidfeed.ios` (name Dafod, category, age rating).
2. Privacy policy URL — `https://www.dafod.app/privacy`, which covers the app as well as the site. Support URL.
3. App Privacy: **Data collected** now — Contact Info › Name and Email Address, Identifiers › User ID,
   User Content › Other User Content; all linked to the user, none used for tracking, purpose App
   Functionality (matches `PrivacyInfo.xcprivacy`). Name is there because Sign in with Apple asks for
   `.fullName` and the app stores it as the reader's name.
4. Listing text; upload the six screenshots; paste `AppStore/REVIEW_NOTES.md` into App Review › Notes.
   Privacy policy URL https://www.dafod.app/privacy; the terms are at https://www.dafod.app/terms (App Store
   Connect › App Information › License Agreement can stay Apple's standard EULA).
5. Xcode → Product → Archive → Distribute → App Store Connect (automatic signing creates the distribution
   certificate on first upload). TestFlight internal testing first (no review), then submit.

**The licensed Bibles (from the 24 Oct web session):**
- **Build, put it on the phone and check:** NIV opens on the Bible tab with the Biblica line under the last
  verse; NKJV and NLT from the translation menu; Compare lists six with no copyright lines (removed by
  request); aeroplane mode on a chapter never opened shows "NIV needs a connection…"; a highlight in You
  quotes the NIV text. Verified on the 26.0 simulator only (Psalm 23, NIV and Compare).
- **The translation choice is not persisted** (it never was: `BibleStore.translation` is plain state). It
  used to reset to KJV each launch and now resets to NIV. Persisting it (UserDefaults, as the web keeps
  its in localStorage) is a small, unrequested improvement — ask before doing it.
- **App Store privacy answers do not change:** the chapter requests carry no user data, and the app sends
  API.Bible no FUMS reports (required of web apps only). `PrivacyInfo.xcprivacy` is unchanged.
- **Quota:** the app and the site share API.Bible's Starter plan, 5,000 calls a month, through the site's
  29-day cache. The phone adds its own 29-day copy under Caches/licensed-bible, so it re-asks rarely. No
  overage billing exists on that plan: past the limit the route returns 503 and the app shows the
  connection message for chapters it does not already hold.

**Before accounts work fully in the app:**
- **Deploy the web** with `public/.well-known/apple-app-site-association` and the `next.config.ts` header
  (branch `ios-parity`), so Google can return to the app. Check:
  `curl -sI https://www.dafod.app/.well-known/apple-app-site-association` → 200, `application/json`.
  Apple's CDN caches it; a fresh install picks it up.
- ~~Apply the delete-account migration~~ — applied 23 October 2026; `delete_my_account()` refuses anon.
- **Test on the phone:** Continue with Apple → save a film → see it on dafod.app/you/saved with the same
  account; highlight a verse on the web → see it in the app after bringing it to the front.

**Checked against common rejections (23 Oct, from Reddit threads he shared):** in-app account deletion
that really deletes ✓; report/block — not applicable, no user content ✓; not a web wrapper ✓; no purchases
✓; privacy policy linked in the app (sign-in sheet, You prompt, Account) and App Privacy matching the
manifest ✓; reviewer access — Sign in with Apple + notes ✓ (a dedicated review login is optional, see
below); permissions — only NSPhotoLibraryAddUsageDescription, for the share sheet's Save Video (without it,
Save Video crashes the app; verified the prompt shows and the app survives) ✓; terms of service page ✓.

**Decisions / risks to raise with him:**
- **Sign in with Apple token revocation — built (24 Oct), needs deploying.** On Delete account, an
  Apple-linked account (checked via `auth/v1/user` providers) asks the reader to confirm with Apple (a fresh
  authorization code), posts it to the **`apple-revoke` Edge Function** (`supabase/functions/apple-revoke`),
  which signs a 5-minute client secret for `com.davidfeed.ios` with the Sign in with Apple key, trades the code
  at appleid.apple.com/auth/token and revokes the refresh token at /auth/revoke; then the account is deleted.
  Closing Apple's sheet cancels the deletion; a failed revocation is logged and the deletion goes ahead. The
  client-secret signing was checked under Node with a throwaway key (valid ES256 JWT). **Not yet deployed:**
  Olalekan sets the secret `APPLE_P8` (the .p8's contents — he does this himself; never read it) and deploys
  the function (dashboard › Edge Functions, or `supabase functions deploy apple-revoke --project-ref
  ulmptivzgvcpbygpkkfv` after `supabase login`). Check after: delete a throwaway Apple-linked account on the
  phone; Settings › Apple Account › Sign in with Apple should no longer list Dafod.
- **Review login.** 2.1 asks for demo account details if the app has a login. Sign in with Apple lets the
  reviewer in with their own Apple ID, which is normally accepted; if review asks, create a Google account for
  review and put it in the notes.
- **NIV credit.** The films quote the NIV. Biblica's notice ("Scripture quotations taken from The Holy Bible,
  New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by
  permission. All rights reserved worldwide.") is shown **nowhere in the app** — he had it on the cards and
  asked for it off. The films' briefs say it must appear; Biblica's terms generally require it. Suggest an
  About/credits line or at least the App Store description. Their permission for an app that is mostly NIV
  films was not verified.
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
- **Never bundle NIV, NKJV or NLT text, or put the API.Bible key in the app.** The licence is for text
  served through API.Bible, refreshed within 30 days, and the key lives only on Vercel. Change the route
  (`../src/app/api/bible/…`, `../src/lib/apiBible.ts`) and both apps follow; the verse parser lives there.
- In the simulator, a tap on the verse action bar during its fade-in does not register — tap again after
  it settles. Not a bug in the bar.

---

## 10. How it got here (iOS commits, newest first, abridged)

| Commit | What |
| --- | --- |
| `6b7cec7` | NIV, NKJV, NLT fetched from dafod.app (NIV default), copyright under the chapter, review notes |
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
