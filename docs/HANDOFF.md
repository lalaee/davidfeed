# Handoff — 22 October 2026

What changed in the session that ran 18–22 October 2026, what is live, how it is
wired, and what is still open. Read it before touching the feed, sign-in or
deploys. Read `AGENTS.md` too: this repo runs a Next.js version that differs
from the one you know.

---

## 1. Where things stand

- **Live:** https://www.dafod.app (and dafod.app). It runs exactly `main`.
- **Branches:** `main` and `auth` point at the same commit. Check with
  `git log -1 origin/main origin/auth`. `match-ios` is an older ancestor of
  both and has no unmerged work.
- **Remote:** https://github.com/lalaee/davidfeed (`origin`). **The repo is
  public.** Never commit a secret; IDs are fine.
- **The repo now holds the iOS app too,** under `ios/` (see §2a).
- **The live product:**
  - a feed of ten LemoLab Bible films;
  - a desktop layout with soft edges, one-card paging, a magnetic lean and an
    Apple Music style ambience;
  - the Bible reader;
  - **You**, the account centre (it was the Library).
  - The nav tabs are **Home, Bible, You** (Library became You; for a while
    they were Watch, Read, You).
  - Saving films and verses and highlighting need an account. Sign-in is Apple
    or Google, through Supabase.
- **Not yet confirmed by a real person:** a full sign-in round trip on
  dafod.app. The user was asked to sign in with Google or Apple, bookmark a film
  and check it shows under You → Saved. See §9.

---

## 2. How to work here

### Commit, push and deploy
- **Commit and push only when the user asks.** Branch first if you are on
  `main`. Commit messages end with the `Co-Authored-By` line the harness gives.
- **A git push deploys nothing.** Vercel is not wired to GitHub for this
  project. To deploy:
  ```bash
  vercel --prod --yes
  ```
  It uploads the working tree and builds on Vercel, then aliases to
  www.dafod.app. That means **uncommitted changes go live too**. Check
  `git status` before deploying.
- **Other sessions push to `main`,** the iOS one included. Run
  `git fetch origin` before pushing. If `git push origin <branch>:main` is
  rejected, merge `origin/main` into your branch (never force), push the
  branch, then fast-forward `main`. That happened on 22 October; see §2a.
- **Building locally while the dev server runs corrupts the dev server.** Stop
  the preview first. If `preview_start` reports "reused" after a build, restart
  it. After a local build, `rm -rf .next` before running dev again.

### 2a. The iOS app lives here now (`ios/`)
- **How it arrived:** on 22 October 2026 another session merged the native app
  ("Dafod", bundle `com.davidfeed.ios`) into this repo under `ios/`, with
  `git subtree` and its full history (52 commits).
  - The merge commits are `b20da42` (the subtree add) and `9cbbdad` (handoff
    and ignores).
  - The old standalone copy at `~/Downloads/Code/davidfeed-ios` is retired.
    Work in `ios/`.
- **Read `ios/HANDOFF.md` before touching the app.** It covers how the user
  tests on their phone, building and running, the film pipeline, App Store
  readiness and the iOS gotchas. Its §2 points back to §3 here for the user's
  standing rules.
- **Keeping it out of the website:**
  - `.vercelignore` lists `ios/`, so `vercel --prod` doesn't upload the Xcode
    project and its roughly 200MB of films.
  - `eslint.config.mjs` ignores `ios/**`.
  - Neither touches the site.
- **The race on 22 October:** this web session's push to `main` was rejected
  because the iOS merge had landed first. `origin/main` was merged into
  `auth` (`28172b8`) and `main` was fast-forwarded.
  - The deploy just before ran from the tree without `ios/`. The site files
    were identical, so nothing needed redeploying.
- **Web and iOS have drifted:**
  - Tab names: the app's tabs still read Home, Bible, Library
    (`ios/DavidFeed/DavidFeed/RootView.swift`); the web's are Home, Bible, You.
  - Accounts: the app has none; the web has sign-in and You.
  - Bring the app across only when the user asks.

### The dev server
- `.claude/launch.json` has an entry named `davidfeed-dev` (`npm run dev`, port
  3005). Use `preview_start` with that name, never Bash.

### Environment variables (`NEXT_PUBLIC_*` are baked in at build time)

| Variable | Production (Vercel) | Local (`.env.local`, gitignored) |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ulmptivzgvcpbygpkkfv.supabase.co` | `http://127.0.0.1:54321` (local Supabase) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon key (public by design) | the local "Publishable" key `supabase start` prints |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `62034029832-8od42qjc3laha1g25i7j47feebmfn1qu.apps.googleusercontent.com` | same |
| `ELEVENLABS_*` | — | local only, for older narration scripts |

### Local Supabase (Docker)
```bash
open -a Docker
supabase start -x studio,imgproxy,storage-api,edge-runtime,logflare,vector,supavisor,realtime,postgres-meta
```
- Migrations in `supabase/migrations/` are applied on start.
- Apple and Google sign-in do **not** work locally. To test the save and sync
  flow:
  1. Create a user through the local admin API with the `sb_secret_…` key that
     `supabase start` prints.
  2. Fetch a session from `/auth/v1/token?grant_type=password`.
  3. Write it to the page's `localStorage['sb-127-auth-token']` and reload.
- Don't print test credentials or tokens in chat.
- Stop it with `supabase stop`.

### Files you must never stage or commit
These were already modified or untracked before this session and belong to the
user:
- `.claude/launch.json`
- `.claude/skills/cover-parallax/scripts/*` (recipes, render_effect,
  render_grid, choices_final.json, choose_effect, render_pairs, verify_effect)
- `.gitignore`
- `motion/song-slide-vertical-heart.json`
- `motion/music-library-slide-up.json`
- `motion/video-slides-vertical.json`
- `public/assets/chapters/figure-looking-up-loop.mp4`
- `public/assets/share/5.mp4`

Always `git add` explicit paths.

---

## 3. The user's standing rules (from this session)

- **"Previous videos must not be deleted."** The first LemoLab cut (with the
  dafod outro) is still in `public/assets/films/*.{mp4,m4a,jpg}`, about 152MB.
  Nothing uses it any more. Leave it there.
- **Don't let the same psalm play twice in a row.** `spread()` in `Feed.tsx`
  enforces this; see §4.
- **Titles name the passage only** ("Psalm 45:2-8", "Isaiah 41:10-13"). Never
  show the style name.
- **Each film carries its own audio.** There is no ambient sound bed on the feed.
- **Card height is the film's own 9:16 shape.**
- **Buttons are glass.** Use `LiquidGlass` (`src/components/LiquidGlass.tsx`,
  ported from `~/Downloads/Code/dafod-2`), not plain `.press` buttons.
- **Effects must preserve the painting.** Parallax is the house look. Effects
  that repaint pixels look bad to this user, and a measured pass is not the
  same as good taste.
- **Figma selections are applied verbatim.**
- **The user often says "commit and push to prod".** That means: commit, push
  the branch, run `vercel --prod --yes`, then check the live site.
- **"fast forward main"** means push the branch to `main`; it has always been a
  clean fast-forward.

---

## 4. The feed

### Films
- **Source:** github.com/lalaee/lemo-opuscar, folder `Bible/no-outro`. These are
  the films without the dafod outro card.
- **Downloading:** use `curl` against raw.githubusercontent.com with
  `gh auth token`. `gh api` mangles binary files. Check sizes against the API.
- **Encoding** (the recipe is in the comments of `src/data/films.ts`):
  - picture: H.264 CRF 25 with `-maxrate 2.5M -bufsize 5M`, no audio track,
    faststart;
  - sound: a separate AAC 128k `.m4a`;
  - poster: a `.jpg` frame taken 1s in.
- **Output:** `public/assets/films/no-outro/`, 191MB in all.

### The ten films (`src/data/films.ts`)
- IDs are chapter × 100 + take; Isaiah is chapter × 1000 + take.

| IDs | Passage | Styles |
| --- | --- | --- |
| 2301–2303 | Psalm 23 | paper-cut lightbox, watercolor, woodcut |
| 301–303 | Psalm 3 | shadow puppet, stained glass, woodcut |
| 4501–4503 | Psalm 45:2-8 | art deco, impasto, engraving |
| 41001 | Isaiah 41:10-13 | ink wash |

- `src/data/shorts.ts` exports `shortPosts = filmPosts`. The older spoken
  shorts are kept as `spokenPosts`, but nothing uses them.

### Order
- `Feed.tsx` shuffles the films with a seeded mulberry32 shuffle, then
  `spread()` re-deals them greedily so no passage plays twice in a row.
- It was tested over 100k seeds with the 3/3/3/1 mix: no repeats and no cards
  lost.

### How a card plays
- The film plays muted and looped as `posterVideoSrc`; its sound plays from
  `audioSrc`.
- A single tap toggles sound and a double tap likes, as in the iOS app.
- The title and rail colour come from `src/lib/posterInk.ts`. It measures the
  bottom tenth of the poster: bright posters get dark ink, dark posters get
  white ink.
- **Save and share icons** grow to 1.2× on hover (`.icon-press:hover`,
  pointer devices only).

### Sharing (what the share button sends)
**The film itself, never a link.** The user saw a link arrive on a WhatsApp
Status as a bare card and asked for the video.

**The share file:** `public/assets/share/<post id>.mp4`, made by
`scripts/build-film-share.sh`.
- **Source:** the film as LemoLab delivered it *with* the dafod ending ("See
  more at: Dafod.app"), from lemo-opuscar's `Bible/outro`.
- **Picture:** the whole 1080×1920 film, uncropped, with its bottom corners
  rounded.
- **Strip:** a white strip under the film holding the Dafod icon and
  "Dafod.app", for the whole video, ending included. No title on the film.
- **Size:** 1080×2132 overall, 10–27MB per film.
- **Where the design comes from:** Figma "Dafod Reels" › **New Feed UI**
  (`2753:935`), applied as the user directed: keep the whole film, no title,
  strip throughout.
- **The overlay:** strip and corners are one PNG exported from that frame at
  2.88×, `scripts/assets/share/strip-overlay.png`.
- **The Figma plugin quirk:** the export came out via the Sunnyside plugin
  (`use_figma` + `exportAsync`). A boolean subtract's result defaults to grey
  `#D9D9D9`, so set its fill explicitly.

**The menu:** `src/components/ShareSheet.tsx`, on every device.
- **Rendering:** it renders into `<body>` through a portal. Inside the feed
  column it was masked and clipped to a sliver, which made the button look
  dead.
- **Loading:** it fetches the share file as soon as it opens, with a progress
  bar (`fetchShareFile` in `lib/shareVideo.ts`), and the tiles wait for it.
  The order matters: a system share sheet only opens straight after a tap, so
  the file must already be in hand.
- **Tiles, in order:**
  - Share video: only where the browser can share files;
  - Download;
  - WhatsApp, Instagram, TikTok, X, Facebook, Telegram;
  - Copy link, last.
- **What an app tile does** (a web page cannot post a file into another app):
  - **With a system share sheet** (phones; Safari or Chrome on a Mac): it
    opens that sheet with the video, and the reader picks the app there. A
    page can't pre-pick the app.
  - **Without one:** it downloads the video and opens that app's website to
    attach it.
- **Logos:** from Simple Icons 16.32.0 (CC0), in `src/lib/socialIcons.ts`.
  LinkedIn is absent because its owner had it removed from the set.

### Desktop
These are all in `globals.css`, `Feed.tsx`, `DesktopChrome.tsx` and
`DesktopNav.tsx`:
- **Soft edges:** stacked `backdrop-filter` blur bands at the nav divider and at
  the fold, with a 10px peek of the previous and next card.
- **Masking:** a `.feed-mask` wrapper does the masking, not the scroll
  container, because masking the scroller cost about 8fps.
- **Paging:** `src/hooks/useCardPager.ts` moves one card per gesture with a
  620ms tween on the house curve (`lib/easing.ts`).
- **Magnetic lean:** removed from the card (see Header below).
- **Ambience:** `src/components/FeedAmbience.tsx` is an Apple Music "Now
  Playing" style background.
  - Desktop: a Pixi.js scene.
  - Phone: a CSS stand-in, the cover at 1.25× with blur 60 and saturate 2.75,
    crossfading in the gaps between films.
  - The Pixi scene is built **once**; rebuilding it hangs on WebGL context loss.
- **Header:**
  - the wordmark is now the logo `public/brand/dafod-wordmark.svg`;
  - the nav pills are glass;
  - the nav shrinks once the feed scrolls;
  - a "Privacy" link sits bottom-left under the hero copy (Google's review
    looks for it).
- **Hero copy:** the subtitle reads "Experience a collection of short verses
  that brings hope.", then a white **Download app** pill with the Apple mark.
  - There is no App Store listing yet.
  - The pill links to `NEXT_PUBLIC_APP_STORE_URL` once that's set in Vercel;
    until then it goes nowhere and says "Coming soon" on hover.
- **The Hopescrolling face** (the teal "o") keeps 3:1 contrast against the
  ambience. That is WCAG's ratio for an icon.
  - `src/lib/heroContrast.ts` estimates the wash from the active poster's
    average colour, run through the ambience's saturation 2.75 and 32% dim.
  - The teal pales first and deepens only on pale washes, because a dark face
    inside white words reads as a hole.
  - `Feed.tsx` passes `ambienceSrc` to `DesktopChrome`.
- **The magnetic tilt is off,** at the user's request. `useMagneticTilt.ts`
  remains, unused, and the `--desk-lean` room in the layout stays so nothing
  shifts.

---

## 5. Accounts, and You (the account centre)

### What is gated
- Saving a film (the bookmark), saving verses and highlighting need a signed-in
  reader.
- Nothing else does: the feed, reading, the translation picker and sound work
  for everyone.

### The code

**`src/lib/supabase.ts`**
- The browser-only client, using PKCE.
- There is no server half. Pages are prerendered, and the database's row-level
  security is the access control.

**`src/lib/auth.ts`**
- **`authStore`:** the session state.
- **`authSheetStore`:** whether the sign-in sheet is open.
- **`gated(intent)`:**
  - signed in: applies the save;
  - signed out: stores the intent in `sessionStorage` (`dafod.pendingIntent`)
    and opens the sheet.
  - Intents say where things should **end up**, never "toggle".
- **Sync:** the existing localStorage stores in `lib/stores.ts` stay the
  instant cache and are pushed up to one row per reader, debounced 400ms.
- **On sign-in, `dafod.libraryOwner` decides what happens:**
  - absent: the anonymous saves on this device are merged into the account;
  - the same reader: the server copy wins, unless `dafod.libraryDirty` marks
    unsent local writes;
  - a different reader: the local cache is dropped.
- **Afterwards:** the held intent is applied, and the Library is pulled again
  when the tab becomes visible.
- **Sign-out** clears the local cache. A visitor's old saves are kept until
  they sign in.

**`src/lib/googleSignIn.ts`** and **`src/app/auth/google/page.tsx`**
- **The button is ours,** not Google's Identity Services iframe. That iframe
  sat the G in a white disc, and it couldn't be the white primary button.
- **The flow:**
  1. `startGoogleSignIn()` sends the reader to Google's OpenID Connect endpoint
     with `response_type=id_token`, a SHA-256 nonce and a state.
  2. Google returns them to **`/auth/google` on dafod.app**.
  3. That page hands the token to `signInWithIdToken`, giving Supabase the raw
     nonce, then sends the reader back to the page they came from.
- **Why it returns to dafod.app:** Google's chooser names Dafod, and
  supabase.co never becomes an authorised domain (see §6).
- **No sync on the callback page.** `lib/auth.ts` skips syncing on `/auth/*`
  so a held save isn't applied there and then lost to the redirect; the page
  the reader returns to does the sync.

**Sign-in runs in a new tab** (`AuthSheet.go`).
- **Opening it:** the sheet opens a blank tab in the click, before anything is
  awaited, or it's blocked as a popup. It then sends that tab to Google, or to
  Apple via `signInWithOAuth` with `skipBrowserRedirect`.
- **Where it returns:**
  - Google comes back to `/auth/google`.
  - Apple comes back to the new `/auth/done`, where the client's
    `detectSessionInUrl` trades the PKCE code.
- **Finishing:** both pages use `src/app/auth/AuthReturn.tsx`, which closes
  the tab when it has an opener.
- **The original tab:** it gets the session through Supabase's BroadcastChannel
  between tabs; lib/auth then closes the sheet and applies the held save.
- **Why localStorage:** Google's nonce and state are kept there, since a new
  tab doesn't share the opener's sessionStorage.
- **Fallback:** if a tab can't be opened, sign-in runs in place, as before. The
  built-in browser pane blocks new tabs, so only the fallback was seen
  working. **The new-tab path is unverified.**

**`src/components/AuthSheet.tsx`**
- Mounted once in `app/layout.tsx`. It only ever signs in; the account itself
  lives on You.
- **Layout,** modelled on YouVersion's account prompt (the user sent it as the
  reference):
  - a grabber;
  - the headline "Save the verses that speak to you. 100% free.", then "No ads
    or purchases";
  - a ruled checklist with green check rings;
  - a light pill, **Continue with Google** (the primary);
  - a white text link, **Continue with Apple** (redirects through Supabase);
  - a privacy line.
- The reference's row of provider tiles was left out, because two providers
  don't need both a row and buttons.
- **Closing:** drag the grabber down (past 80px it closes, short of that it
  springs back), tap the grabber, tap outside, or press Escape.
- **Container:** the compare card's, `.sheet-column`, 740 wide at desk.
- **The page behind recedes,** as under the compare card:
  - AuthSheet puts `sheet-receded` on `<html>`;
  - `globals.css` scales `body > main`;
  - the bottom nav steps aside.

**The You tab**
- **Files and addresses:**
  - The nav tabs are Home (`/`), Bible (`/bible`) and You (`/you`), defined in
    `TABS` and `tabForPath` in `src/components/BottomNav.tsx`.
  - `DesktopNav` reuses those tabs.
  - The tab keys are `"home" | "bible" | "you"`.
  - You has a new icon, `NavYouIcon` in `icons.tsx`, drawn to sit with the
    Iconly set.
  - `/library` redirects to `/you` (`next.config.ts`, temporary).
  - A saved set still plays at `/library/[id]`, which counts as You.
- **The page:** `src/app/you/page.tsx` renders `src/components/Library.tsx`.
  The component kept its old name. It is one scrolling column:
  - **the reader:** an initial in a 56px circle, the name and the email.
    Signed out, this is the sign-in prompt instead.
  - **Saved:** the old Library, pills "Films" and "Highlights" (they were
    "Saved Feed" and "Highlighted Verses"), with the grid and the colour-filtered
    highlights.
  - **Account:** rows on the sheets' `#0E0E0E` card.
    - Privacy (`/privacy`).
    - Delete account: a `mailto:lakesofmotion@gmail.com` request. There is no
      self-serve deletion.
    - Sign out.
    - Signed out, only Privacy shows.
- **What's gone:** the old account button in the tab row. `AuthSheet`'s
  signed-in "Your account" view is now unreachable, because nothing opens the
  sheet while you are signed in. It can go.

**`src/app/privacy/page.tsx`**
- The privacy policy, with contact lakesofmotion@gmail.com. It is written
  against what the code does, so update it if the stored data, the services or
  analytics change.

**`supabase/migrations/20261019000000_library.sql`**
- Table `public.library`: `user_id` (primary key and foreign key to
  `auth.users`), plus `saved_posts`, `saved_verses` and `highlights` as jsonb,
  plus `updated_at`.
- Row-level security: select, insert and update allowed only where
  `auth.uid() = user_id`.
- It has been applied to production by hand in the SQL editor.

**`supabase/README.md`**
- The full setup steps for production.

### Not covered
- `/library/[psalm]` (playing your saved set as a feed) reads the local cache
  and is not separately gated.
- **Saved verses are stored and synced but never listed.** The Bible reader's
  Save writes `saved_verses`, and nothing shows them: You → Saved lists films
  and highlights only. This was true of the old Library as well.
- The iOS app (`ios/`) has accounts as of 23 October 2026 (branch
  `ios-parity`): native Sign in with Apple (`com.davidfeed.ios` as the Apple
  client ID), Google through this site's own `/auth/google` callback, the same
  `library` row synced both ways. It needs
  `public/.well-known/apple-app-site-association` deployed (for Google) and
  `supabase/migrations/20261023000000_delete_account.sql` applied (in-app
  account deletion). See `ios/HANDOFF.md` §5.

---

## 6. External services (IDs only; no secrets live in this repo)

### Supabase
- Project `ulmptivzgvcpbygpkkfv`, org "lalaee's Org", free plan.
- Site URL: `https://www.dafod.app`.
- Redirect URLs: `https://www.dafod.app/**` and `https://dafod.app/**`.
- Providers on: Apple, Google, and Email (Email is Supabase's default and is
  unused).
- Google provider client ID: the web client below.
- Apple provider client IDs: `app.dafod.web,com.davidfeed.ios`.

### Google Cloud
- Project `dafod-512122` ("Dafod").
- OAuth client "Dafod web":
  - type: Web application;
  - JavaScript origins: `https://dafod.app` and `https://www.dafod.app`;
  - redirect URIs: `https://www.dafod.app/auth/google` and
    `https://dafod.app/auth/google`, our own callback. **Never** the Supabase
    callback.
- Consent screen:
  - External, **In production**;
  - home page `https://www.dafod.app`, privacy policy
    `https://www.dafod.app/privacy`;
  - logo: the Dafod mark;
  - the only authorised domain is `dafod.app`.
- **The branding is verified and published,** so Google shows "Dafod" with the
  logo.
- Support and developer email is olalekanisaaccb@gmail.com. Google only allows
  the account's own address or a Google Group the account manages.
- **Why there is no Supabase redirect:**
  - the redirect flow made Google name `…supabase.co` on its account chooser;
  - it also added supabase.co as an authorised domain, which can never pass
    brand verification.
  - **Don't add it back.**

### Google Search Console
- dafod.app is a verified Domain property.
- It is verified by a TXT record in Vercel DNS; see `docs/dns.md`. **Keep the
  record.**

### Apple Developer
- Team `LZ7G2KT2U7`.
- App ID `com.davidfeed.ios`: Sign in with Apple is on, as the primary App ID.
  Turning it on invalidated the app's provisioning profiles, so regenerate them
  (or let Xcode's automatic signing do it) before the next build.
- Services ID `app.dafod.web`, named "Dafod":
  - domain `ulmptivzgvcpbygpkkfv.supabase.co`;
  - return URL `https://ulmptivzgvcpbygpkkfv.supabase.co/auth/v1/callback`.
  - Apple's flow still goes through Supabase, so its account sheet reads
    "Dafod".
- Key "Dafod Sign in with Apple 2", ID `SV82W38GAF`, is the one in use. The
  user holds its `.p8` file (`~/Downloads/AuthKey_SV82W38GAF.p8`).
- Key `5H8V79T9CA` is an orphan; its file was never saved. It can be revoked.
- **The Apple client secret expires on 21 April 2027.** Regenerate it before
  then:
  ```bash
  node scripts/apple-secret.mjs ~/Downloads/AuthKey_SV82W38GAF.p8
  ```
  The user pastes the output into Supabase → Providers → Apple. Never read,
  print or commit the `.p8` or the secret yourself.

### Vercel
- Project `davidfeed`, team `olalekanisaaccb-gmailcoms-projects`.
- Domain dafod.app: Vercel is the registrar, Vercel runs the DNS, and it
  renews on 30 August 2027.

---

## 7. Brand

- **Favicon and app icons:** `src/app/favicon.ico` (48px), `src/app/icon.png`
  (512) and `src/app/apple-icon.png` (180). All come from the user's
  `~/Downloads/dafod-logo.png`.
- **Header logo:** `public/brand/dafod-wordmark.svg` (white, 70×13, shown 24px
  tall), from `~/Downloads/site-logo.svg`.
- **Site title:** "Dafod" (it was "DavidFeed"). The iOS app is also called
  Dafod.

---

## 8. Gotchas learned the hard way

**React Compiler**
- Never read `ref.current` in render.
- Don't destructure from an object whose callback went to `ref=`.
- Don't `setState` synchronously in an effect. Adjust state when the input
  changes instead.
- The build fails on these.

**The browser pane**
- It can wedge after a hang: screenshots go stale while the page has moved on.
  Open a fresh tab.
- While the pane is hidden, `requestAnimationFrame` and CSS animations freeze,
  so timing and fps can't be measured. Prefer `read_page` and `javascript_tool`.
- Some sites are refused in it. search.google.com was refused once and allowed
  later.
- **Never click Download for an Apple key in the pane.** A cancelled save still
  uses up the one-time download.
- File inputs: the pane can't use an OS file picker. Set
  `input.files = new DataTransfer(...)` from a base64 blob in
  `javascript_tool`. That is how the logo got onto Google's consent screen.

**Backdrop filters**
- `backdrop-filter: url()` and turbulence masks hung the renderer, and the user
  said they looked like dirt. Use the clean stacked blurs instead.
- `overflow-clip-margin` does nothing on scroll containers.

**Google sign-in**
- The Google client's redirect URIs list only dafod.app's `/auth/google`.
  Locally, Continue with Google reaches Google but comes back with
  `redirect_uri_mismatch`, and local Supabase has no Google provider anyway.
  Test it on dafod.app.

---

## 9. Open items

1. **Have the user do a real sign-in on dafod.app:** Google and Apple, then
   bookmark, check You → Saved, sign out and sign in again. Nothing has
   exercised this end to end with a real account.
2. **The phone ambience crossfade and scroll fps were never measured,** because
   the pane was hidden. They are worth checking on a real phone.
3. **Apple secret renewal before 21 April 2027** (§6).
4. **Revoke the orphan Apple key `5H8V79T9CA`** (optional).
5. **iOS:** regenerate provisioning profiles, since Sign in with Apple was
   added to the App ID. Native sign-in and sync for the iOS app are not built
   yet.
6. **Account deletion is manual:** the privacy page says email
   lakesofmotion@gmail.com. Deleting the `auth.users` row cascades to
   `library`. There is no self-serve delete yet; Apple expects one inside the
   iOS app once it has accounts.
7. **`*.p8` is not in `.gitignore`.** `.gitignore` is one of the user's
   untouched files, so ask before adding the pattern.
8. **The Agentation feedback toolbar** (`AgentationWrapper`) appears on the
   live site at desktop widths. Confirm with the user whether it should be
   dev-only.
9. **Twelve more LemoLab films** are in lemo-opuscar `Bible/outro`, not yet in
   the feed: Isaiah 41 woodcut, Jeremiah 29, John 3, Joshua 1, Matthew 6,
   Philippians 4, Proverbs 3, Psalm 121, Psalm 91 ×2, Romans 8 and 12.
   - `Bible/outro` has every film; check `Bible/no-outro` for which have a
     feed (no-ending) cut.
   - Adding one takes three things: an encode into
     `public/assets/films/no-outro/`, an entry in `src/data/films.ts`, and a
     share file built with `scripts/build-film-share.sh`.
10. **The App Store link** for Download app (`NEXT_PUBLIC_APP_STORE_URL`), once
    the iOS app is listed.
11. **Not yet confirmed by the user:**
    - the share flow on a phone and on a Mac's share sheet;
    - sign-in in a new tab.
12. **Saved verses have no list** (§5). Add them to You → Saved if the user
   wants them.
13. **iOS has drifted from the web** on tab names and accounts (§2a).
14. **Old lint warnings:** unused `TOPICS`, `_paused`, `onPausedChange`, and
   `<img>` warnings. They don't block the build.

---

## 10. What the session did, in order

1. Desktop feed: soft blur edges, peeks, one-card paging, magnetic lean, Apple
   Music ambience, glass header (`f5594f6`, `4e2680c`).
2. The feed became the eight LemoLab films (`26c9123`), then the web matched
   the iOS feed: tap for sound, poster-driven ink, the phone ambience
   (`5c6c76b`).
3. Switched to the ten no-outro films, adding Psalm 45 engraving and Isaiah
   41:10-13 (`5a15fc6`).
4. Supabase accounts: the `library` table with row-level security, the sign-in
   sheet, gated saves and highlights, sync (`5346b39`). Then the production
   setup: the Supabase project, the Google OAuth client and consent screen,
   the Apple App ID, Services ID and key.
5. Google's own sign-in button so Google names dafod.app; the privacy page; the
   new favicon and logo; Google brand verification (Search Console DNS
   verification, logo, verify and publish) (`fb5e25b`, `ab52008`).
6. `main` fast-forwarded to `auth`, deployed and live.
7. The privacy page got its own scroller (the document never scrolls here), a
   "Home" link, and lost the copy-of-your-data line (`9b622d6`).
8. The iOS app arrived in `ios/` from another session; `origin/main` was merged
   into `auth` (`28172b8`). See §2a.
9. The tabs became Watch, Read, You, and the Library became You, the account
   centre, at `/you` (§5).
10. The sign-in sheet became the YouVersion-style prompt (grabber, bold
    promise, checklist, Google pill, Apple link). Google moved to our own
    button through `/auth/google`. Also the Download app pill, no tilt, and
    icon hover (`93ea0a9`).
11. Sign-in in a new tab, the share menu as a row of apps, and the Hope face
    keeping contrast (`637875f`).
12. Share files for the films (`e764e20`), then remade as the film with its
    sound, the Dafod ending and the Figma strip under it. The share menu now
    shares the video on every device (§4, Sharing) (`4bb2466`).
13. The tabs went back to Home and Bible; You stays.
