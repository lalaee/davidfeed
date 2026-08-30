---
name: icon-motion
description: "How DavidFeed's icon buttons answer a tap — an instant press, then an iOS-style spring bounce on commit. Use when adding or changing an icon button, when motion reads sharp, hard, stiff or dead, when a button sticks shrunk or an animation looks cut off, and before touching any @keyframes in globals.css."
---

# Icon motion

Every icon button does two separate things, and they mean different things.

| | when | what |
|---|---|---|
| **Press** | while the finger is down | scale to `0.94`, 190ms, gentle curve |
| **Commit** | on release | a damped spring that overshoots, comes back under, and settles |

A control that does nothing until its action completes feels dead under the
thumb. Apple's rule is to respond **on pointer-down**, not on release — the
press is the acknowledgement, the commit is the confirmation.

## The bounce

An iOS bounce is a **damped spring**, not a single overshoot. It passes rest,
comes back under, passes again, and settles. Five diminishing beats is what
"bouncy" actually looks like:

```
0.94 → 1.358 (91ms) → 0.846 (289ms) → 1.066 (490ms) → 0.972 (705ms) → 1.012 (910ms) → 1.0
```

Modelled the way SwiftUI defines a spring — a `response` (period) and a
`dampingFraction` — plus the **release velocity** the finger imparts.

```
response         0.40s
dampingFraction  0.26
release velocity 8.5
duration         1.13s
```

`0.26` is far looser than Apple's own presets (`.smooth` 1.0, `.snappy` 0.85,
`.bouncy` 0.7), and deliberately so: this is a feed, and a save should feel
playful. It is also near the practical floor — settling time is
`4.6 / (zeta * omega)`, so anything looser will not finish inside the ~1100ms a
single gesture is allowed. 1.13s is the natural settling time at this damping,
and a five-beat gesture is legitimately allowed 1.0-1.3s — do not shorten it
below the settle, or the last keyframe has to snap to rest.

**`dampingFraction` is the only dial.** Lower is bouncier. Change it and
regenerate; never hand-edit the keyframes.

```bash
./.claude/skills/icon-motion/scripts/spring.py --zeta 0.26 --name icon-pop
```

## The rule that matters most

**Bake the spring's POSITIONS into dense keyframes. Never use a spring as an
easing function.**

An easing function describes *one* journey from start to finish. Applied to a
multi-keyframe animation, the browser re-applies it **between every pair** — so
the icon re-accelerates on its way into rest and arrives with velocity still on
it. That is exactly what "lands sharp" is, and it is not fixable by softening
the curve, because the curve was never the problem.

With ~72 sampled keyframes the samples *are* the curve, so the timing between
them must be `linear`. Easing them again distorts what you carefully computed.

```css
.animate-icon-pop {
  animation: icon-pop 1.13s linear forwards;   /* linear ON PURPOSE */
}
```

## Amplitude, not easing, is what reads as "hard"

When motion feels sharp, measure the curve before rewriting it. Ours peaked at
**4.22×** average speed; a real spring peaks at **4.04×**. Swapping in a spring
would have changed nothing. The hardness was a 0.72 scale dip, 13px of travel
and 10° of rotation crammed into 620ms. Cutting those to 7px, 5° and 0.88 over
780ms is what actually fixed it.

## Failure catalog

Each of these cost real debugging. They are not hypothetical.

**1. The reset timer truncates the spring.** Removing the animation class kills
the animation outright. `saveAnimating` cleared after 300ms against a 620ms
animation, so the bounce was cut off mid-flight for weeks — and worse, the snap
to rest *looked* like a clean settle when measured. Any timer must outlast its
animation:

```
icon-pop  1.13s  →  clear at 1200ms
send-off  1.15s  →  clear at 1200ms
```

**2. CSS `:active` cannot drive the press.** It matches the pressed element and
its **ancestors**, never its children — so it never reaches an icon inside a
button. On iOS Safari it is unreliable even on the button itself. Press state is
React state, driven by pointer events. See `IconButton.tsx`.

**3. A missed release leaves the button permanently shrunk.** Once the commit
animation ends, the inline press transform reappears. Every exit must clear it:
`pointerup`, `pointerleave`, `pointerout`, `pointercancel`, `blur`, **and** the
click itself.

**4. Nominal icon sizes are not visual sizes.** Glyphs fill their own viewBoxes
by wildly different amounts — 86.5% (audio-on), 71.3% (audio-off), 64.7% (play),
49.0% (pause). Equal `size` props left the play mark at 0.295 of its circle
against the speaker's 0.419. Derive the size:

```
size = (target_ratio × circle) / glyph_fills_viewBox      target_ratio ≈ 0.50
```

Some spread always remains — a slash is smaller than sound waves, two bars
smaller than a triangle. Accept it. Giving each state its own size makes the
glyph jump as it toggles.

**5. Icons must be inline SVG, not `<img src>`.** An `<img>` with `alt=""`
renders a broken-image box on any load hiccup, and CSS custom properties do not
cross the `<img>` boundary — so the `fill="var(--fill-0, …)"` in every Figma
export silently resolves to nothing. Inline, paths take `currentColor`. See
`icons.tsx`.

**6. Reduced motion needs the right property.** `animation: none` does nothing
to a *transition*. The press is direct manipulation rather than decoration, so
it stays under `prefers-reduced-motion` — just instant, via `transition: none`.
The commit animations drop entirely.

## Verify by measuring

Rendering cannot show you timing. Read the transform back off the browser and
differentiate it. `scripts/measure.js` pastes into the console, or run it
through the browser tools:

- **Turning points** — a real spring has 4–5, each closer to rest than the last.
- **Not truncated** — last motion must land near the animation's full duration.
  If it stops early, a reset timer is cutting it (failure #1).
- **Ends at exactly 1.0** — never 0.99, never 1.01.
- **Front the tab first.** `requestAnimationFrame` does not fire in a background
  tab, and Chrome suspends video there while letting audio run. Measurements
  taken hidden are worthless and look like real bugs. This caught us three times.

## Where it lives

```
globals.css   @keyframes icon-pop, send-off; .icon-press
IconButton    press state, release on every exit, commit class
icons.tsx     every glyph inline, currentColor
```

`send-off` is the share glyph's own gesture — it flies off along its nose,
vanishes at `opacity: 0` across two adjacent keyframes, and a fresh one arrives
on the same spring. A gesture should be something only *that* icon could do; a
generic pulse on a paper plane is decoration.
