# PreviewDeck

A local harness for actually *running* the 38 SwiftUI repositories in the iOS 26 index,
instead of reading their READMEs.

Everything here is generated or cloned by the scripts in `bin/` — nothing is hand-maintained
except `repos.tsv` (the repo manifest) and `batch-priority.txt` (which demos to sweep).

```
previewdeck/
├─ bin/deck              the CLI — build, install, launch, screenshot any demo
├─ bin/catalog.py        scans repos/ for buildable Xcode targets → catalog.json
├─ bin/gallery.py        results.json + shots/ → gallery.html
├─ bin/clone-one.sh      one shallow clone (driven by bin/clone.sh)
├─ bin/prepare.sh        per-repo setup the upstream READMEs require (run after cloning)
├─ bin/grab.sh           capture the current simulator screen into shots/<name>.jpg
├─ bin/apps.sh           list the demo apps installed on the device, with their deck ids
├─ repos/                38 shallow clones (~5.8 GB)
├─ DeckHost/             generated host app for repos that ship source but no app
├─ catalog.json          481 runnable iOS app targets found across the clones
├─ results.json          build/launch outcome per demo attempted
├─ shots/                full-resolution simulator captures
├─ logs/                 full xcodebuild output for every attempt, pass or fail
└─ gallery.html          the visual index
```

## Using it

```bash
./bin/deck ls                      # every runnable target in the catalog
./bin/deck ls glass                # filter by id, repo or scheme (all 481 targets)
./bin/apps.sh glass                # only the ones already installed on the simulator
./bin/deck run "FabBar/FabBarExample"    # build → install → launch → open Simulator
./bin/deck shot "GlassExplorer"          # same, plus a screenshot into shots/
./bin/deck record "GlassExplorer" 15     # same, but film 15s of it into shots/*.mp4
./bin/deck record --live tabbar 8        # film whatever is already on screen
./bin/deck open "my-toybox/MyToybox"     # just open it in Xcode
./bin/deck status                  # what succeeded, what failed and why
./bin/deck batch batch-priority.txt      # re-run the whole sweep
./bin/deck gallery                 # rebuild gallery.html
./bin/deck clean                   # delete DerivedData (it grows fast)
```

Ids are the catalog ids — `repo` for a single-project repo, `repo/ProjectName` where a repo
holds many. Quote them; several contain spaces.

## How it works

`deck` drives `xcodebuild` and `simctl` directly. For each demo it resolves the best scheme
from the project's real scheme list (skipping Test/UITest/Clip/Widget schemes), builds for
`iphonesimulator` with code signing off into a shared DerivedData, locates the produced
`.app`, installs it on the iOS 26 simulator, launches it, waits six seconds, and captures a
screenshot.

When a build fails in a way that's known to be a settings problem rather than a real
breakage, it retries once with a workaround: `SWIFT_DEFAULT_ACTOR_ISOLATION=nonisolated`
for Xcode 26's new main-actor-by-default inference, `IPHONEOS_DEPLOYMENT_TARGET=26.0` for
projects that ask for a runtime newer than the one installed, and `SWIFT_VERSION=5` for
Swift 6 concurrency errors. Any flags a demo needed are recorded in `results.json`.

## Configuration

Edit the constants at the top of `bin/deck`:

- `DEVICE_NAME` — currently `iPhone 17 Pro`; must exist under an iOS 26 runtime

Two are also overridable per-invocation, for the occasional heavy project:

```bash
DECK_BUILD_TIMEOUT=1500 ./bin/deck shot IceCubesApp   # default 420s
DECK_SETTLE=12 ./bin/deck shot IceCubesApp            # default 6s launch → screenshot
```

## DeckHost

Some repositories ship only source files or a Swift package, so there is nothing to run.
`DeckHost/` is a generated Xcode 26 app that gives those a home — a browsable list where
each entry pushes the upstream view. It currently hosts GetStream's eight Liquid Glass
motion studies and four gists from `amosgyamfi/swiftui_tutorial_projects`.

The vendored files under `DeckHost/DeckHost/Vendored/` are byte-identical to upstream.
Where a file wouldn't compile on its own, the fix lives beside it rather than inside it:

- `Vendored/GetStream/_Support.swift` supplies a `Server` model that
  `LiquidGlassTabBar.swift` uses but the repo never defines, and aliases `MyControls` to
  `SliderControls` — `LiquidGlassJello.swift` declares one and calls the other.
- `Assets.xcassets/kid1` and `kids` replace image assets the GetStream files reference but
  don't include. They are synthesised patterns — diagonal spectral bands and concentric
  rings — rather than photographs, because high-frequency colour makes the refraction
  through the glass far easier to read than a photo does.
- `LiquidGlassPhaseAnimator.swift` is the one exception — its top-level struct was renamed
  because upstream gives it the same name as another gist in the same folder. The header
  comment in the file says so.

Run it with `./bin/deck run DeckHost`. Four of its GetStream screens are in the gallery under
`awesome-liquid-glass` — they were captured by driving the running app, so their copy-command
points at `DeckHost` rather than a catalog id of their own.

## Recording

`./bin/deck record` films the device through CoreSimulator's own h264 stream
(`simctl io recordVideo`), which is a different path from macOS screen capture — it needs no
Screen Recording permission and works whether or not any simulator window is visible. Use
`--live` to film a demo while you drive it by hand; the recording runs for the given number of
seconds and finalises on its own.

## Known limits

- Screenshots are taken six seconds after launch, so gesture-triggered effects show their
  resting state. Use `./bin/deck record` for motion, or run the demo and drive it yourself.
- Only the iOS 26.0 runtime is installed. A demo targeting 26.1+ is retried with the
  deployment target overridden, which works unless it genuinely calls 26.1 API.
- `MeloX`'s only iOS scheme embeds a watchOS app, so building it needs the watchOS 26
  simulator runtime installed. `bin/prepare.sh` says so rather than pretending otherwise.
- The large production apps (IceCubesApp, Swiftfin) build once `bin/prepare.sh` has copied
  their gitignored `.xcconfig` templates into place, but they pull big dependency graphs.
- `repos/` is ~5.8 GB and DerivedData adds several more. `./bin/deck clean` reclaims the
  latter — worth running after a sweep, it freed 7.2 GB here.
