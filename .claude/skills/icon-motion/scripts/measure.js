/*
 * Read a button's delivered motion back off the browser and differentiate it.
 * Rendering cannot show you timing; only the numbers can.
 *
 * FRONT THE TAB FIRST. requestAnimationFrame does not run in a background tab,
 * so a hidden measurement reports a flat line that looks exactly like a broken
 * animation. That has caused three false diagnoses in this project.
 *
 * Paste into the console, or run through the browser tools:
 *
 *   await measureIcon('Share')      // any button aria-label
 *   await measureIcon('Bookmark', 1500)
 */
async function measureIcon(label, windowMs = 1400) {
  if (document.hidden) {
    return { error: "tab is hidden — rAF is throttled, measurement is meaningless" };
  }

  const btn =
    document.querySelector(`button[aria-label="${label}"]`) ||
    document.querySelector(`button[aria-label^="${label}"]`);
  if (!btn) return { error: `no button matching "${label}"` };

  const read = () => {
    const m = getComputedStyle(btn).transform;
    if (m === "none") return { s: 1, x: 0, y: 0 };
    const v = m.slice(7, -1).split(",").map(Number);
    return { s: Math.hypot(v[0], v[1]), x: v[4], y: v[5] };
  };

  const S = [];
  btn.click();
  const t0 = performance.now();
  await new Promise((done) => {
    const tick = () => {
      const t = performance.now() - t0;
      S.push({ t, ...read() });
      if (t < windowMs) requestAnimationFrame(tick);
      else done();
    };
    requestAnimationFrame(tick);
  });

  const xs = S.map((p) => p.s);
  const turns = [];
  for (let i = 2; i < xs.length; i++) {
    if ((xs[i] - xs[i - 1]) * (xs[i - 1] - xs[i - 2]) < 0) {
      turns.push({ atMs: Math.round(S[i - 1].t), scale: +xs[i - 1].toFixed(3) });
    }
  }

  // when did it genuinely stop moving? if that is well before the animation's
  // duration, a reset timer is clearing the class early and truncating it.
  let lastMotion = 0;
  for (let i = S.length - 1; i > 0; i--) {
    if (Math.abs(xs[i] - xs[i - 1]) > 0.0015) { lastMotion = Math.round(S[i].t); break; }
  }

  return {
    frames: S.length,
    peak: +Math.max(...xs).toFixed(3),
    lowest: +Math.min(...xs).toFixed(3),
    turningPoints: turns,
    bounceCount: turns.length,
    diminishing: turns.every(
      (t, i) => i === 0 || Math.abs(t.scale - 1) <= Math.abs(turns[i - 1].scale - 1) + 0.001,
    ),
    lastMotionAtMs: lastMotion,
    endsAt: +xs[xs.length - 1].toFixed(4),
    landsExactlyAtRest: Math.abs(xs[xs.length - 1] - 1) < 0.0005,
    verdict:
      turns.length >= 4 && Math.abs(xs[xs.length - 1] - 1) < 0.0005
        ? "springs, diminishes, lands clean"
        : turns.length < 4
          ? "too few beats — raise the release velocity or lower dampingFraction"
          : "does not land on rest — check the final keyframe is exactly scale(1)",
  };
}
