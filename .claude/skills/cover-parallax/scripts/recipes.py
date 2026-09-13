"""
The chosen effect for every cover, and the batch that renders them.

These are not derived — they were picked by eye from the per-cover effect
sheets. Written as the user wrote them; the normalisation below is the only
liberty taken, and it is a mechanical one.

  ./i2v-env/bin/python recipes.py --list          show the plan, render nothing
  ./i2v-env/bin/python recipes.py [--jobs 5]      render every cover
"""
from __future__ import annotations
import argparse, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
VERSES = ROOT / "public/assets/verses"
HERE = Path(__file__).parent

# A resample effect moves the pixels; everything else paints on top of the
# result. So whichever resample appears in a recipe becomes the primary,
# whatever order it was written in — "motes+deep" and "deep+motes" are the
# same picture, and applying deep as a LAYER would warp the motes along with
# the scene instead of drifting them through it.
RESAMPLE = {"parallax", "crane", "dolly", "vertigo", "deep"}

# Covers that must NOT use the house strength of round(60 * width / 736).
# web-verses.ts documents why for the only one: the giant's forearm in
# gate-in-the-cloud-wall is a thin limb against empty sky, the exact depth
# discontinuity that tears first, and at 104 it broke into visible banding.
# A blanket re-render reset it to 104 once already — keeping the number here,
# beside the recipe, is what stops that happening a third time.
STRENGTH = {"gate-in-the-cloud-wall": 46.0}

CHOSEN = {
    "arches-opening-on-light":     ["relight"],                 # Psalm 61:3 — rays removed
    "caught-on-the-water":         ["vertigo", "relight"],
    "cradled-in-the-dark":         ["crane", "motes"],
    "face-down-on-stone":          ["deep"],                    # Psalm 44 — motes removed
    "figure-between-rock-walls":   ["crane", "relight"],
    "flame-carried-at-dusk":       ["rays", "motes"],
    "gate-in-the-cloud-wall":      ["dolly"],                   # Isaiah 45:2 — rays removed
    "guard-behind-the-child":      ["deep"],
    "lamb-reflected-as-lion":      ["relight"],
    "lioness-on-the-path":         ["motes"],
    "lit-door-down-a-dark-run":    ["deep", "rays"],
    "reaching-back-on-the-steps":  ["vertigo"],
    "reaching-into-the-well":      ["crane"],
    "rider-on-white-horse":        ["rays", "grade"],
    "sea-in-uproar":               ["rays", "deep"],
    "shepherd-carrying-lamb":      ["deep", "grade"],
    "small-figure-and-colossus":   ["deep"],
    "stair-into-cloud":            ["parallax"],
    "walked-with-through-fog":     ["vertigo"],
    "winged-guard":                ["grade", "deep"],
    # ---- covers from the FigJam PRESSURE board -------------------------------
    # These two are chosen; the rest of that set still falls to DEFAULT. motes
    # alone means the frame does not move — only the dust drifts.
    "spear-against-the-red-sun":   ["motes"],                   # 2 Chronicles 20:15
    "eagle-against-the-sky":       ["motes"],                   # Isaiah 40:30-31
}
# Psalm 3's knight was chosen and shipped separately; "the others" meant covers
# that had not been ruled on, not a reversal of that one.
KEEP = {"knight-resting-among-flowers": ["deep", "relight", "motes"]}
# Referenced by nothing in src/ — not rendered.
ORPHANS = {"crowd-in-one-beam", "hands-raising-a-head"}
# Covers that carry NO loop at all. Not an effect of "none" — those cards drop
# their video element entirely and show the still, so rendering a loop for them
# would leave an orphan that the next blanket render keeps refreshing.
STILL = {"leaning-on-the-horse",        # Psalm 20:7-8
         "one-facing-the-host",         # Exodus 14:13-14
         "two-running-under-the-tree"}  # 2 Corinthians 4:8-9

DEFAULT = ["deep"]


def split(recipe):
    """(primary, layers) — the resample leads, the rest follow in written order."""
    prim = next((e for e in recipe if e in RESAMPLE), recipe[0])
    return prim, [e for e in recipe if e is not prim and e != prim]


def plan():
    rows = []
    for jpg in sorted(VERSES.glob("*.jpg")):
        stem = jpg.stem
        if stem in ORPHANS or stem in STILL or stem in KEEP:
            continue
        recipe = CHOSEN.get(stem, DEFAULT)
        prim, layers = split(recipe)
        rows.append((jpg, prim, layers, stem in CHOSEN))
    return rows


def render(job):
    jpg, prim, layers, _ = job
    out = jpg.with_name(jpg.stem + "-loop.mp4")
    cmd = [str(ROOT / "i2v-env/bin/python"), str(HERE / "render_effect.py"),
           str(jpg), str(out), "--primary", prim]
    if layers:
        cmd += ["--layers", ",".join(layers)]
    if jpg.stem in STRENGTH:
        cmd += ["--strength", str(STRENGTH[jpg.stem])]
    r = subprocess.run(cmd, capture_output=True, text=True)
    tail = [l for l in r.stdout.strip().splitlines() if "activity" in l]
    return f"{jpg.stem:<30} {prim + (' + ' + ' + '.join(layers) if layers else ''):<22} " + \
           (tail[-1].strip() if tail else ("FAILED: " + r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "no output"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--jobs", type=int, default=5)
    ap.add_argument("--only", default="", help="comma-separated stems")
    a = ap.parse_args()
    rows = plan()
    if a.only:
        want = set(a.only.split(","))
        rows = [r for r in rows if r[0].stem in want]
    if a.list:
        for jpg, prim, layers, chosen in rows:
            mark = " " if chosen else "*"
            print(f"{mark} {jpg.stem:<30} {prim}" + (" + " + " + ".join(layers) if layers else ""))
        print(f"\n{len(rows)} to render  ({sum(1 for r in rows if not r[3])} marked * defaulted to deep)")
        print("kept as shipped: " + ", ".join(KEEP))
        return 0
    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for line in ex.map(render, rows):
            print(line, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
