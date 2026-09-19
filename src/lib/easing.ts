/*
 * cubic-bezier(0.32, 0.72, 0, 1) — the house curve, solved for use in JS.
 *
 * Every press, sheet and page in the app rides this curve in CSS. Anything
 * that has to animate a value CSS cannot reach — scrollTop, a WebGL alpha —
 * takes it from here, so the two never disagree about what "settling" looks
 * like. Standard CSS timing-function solver: Newton's method with a bisection
 * fallback, trimmed to what a screen can distinguish.
 */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const A = (a: number, b: number) => 1 - 3 * b + 3 * a;
  const B = (a: number, b: number) => 3 * b - 6 * a;
  const C = (a: number) => 3 * a;
  const calc = (t: number, a: number, b: number) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t: number, a: number, b: number) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2);
      if (s === 0) break;
      const dx = calc(t, x1, x2) - x;
      if (Math.abs(dx) < 1e-5) return calc(t, y1, y2);
      t -= dx / s;
    }
    let lo = 0, hi = 1;
    t = x;
    while (hi - lo > 1e-5) {
      t = (lo + hi) / 2;
      if (calc(t, x1, x2) < x) lo = t; else hi = t;
    }
    return calc(t, y1, y2);
  };
}

export const HOUSE = bezier(0.32, 0.72, 0, 1);

/** One card's travel in the desktop feed; anything that should land with a page uses it. */
export const STEP_MS = 620;
