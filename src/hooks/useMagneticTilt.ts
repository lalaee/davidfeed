import { useEffect, useRef } from "react";

/*
 * MAGNETIC PULL + GYRO TILT, ported from dafod-2.
 *
 * Source: dafod-2 src/routes/[slug]/+page.svelte (the reader's cover thumb),
 * and the React port of the same thing in its src/lib/morph.jsx
 * (`useMagneticTilt`). The behaviour and every constant below are theirs:
 *
 *   pointer offset       nx, ny in -0.5..0.5 across the element's own box
 *   magnetic pull        translate3d(nx * 60, ny * 60, 0)   — dominates
 *   gyro tilt            rotateY(nx * 6), rotateX(-ny * 6)  — depth under it
 *   perspective          700px
 *   smoothing            current += (target - current) * 0.15, every frame
 *   settle               below 0.05 of travel, and only at rest
 *   size guard           elements under 120px wide never tilt
 *
 * The magnet is the loud half and the gyro is the quiet one — 60px of travel
 * against 6 degrees of rotation. Inverting that ratio gives the flashy CSS-demo
 * tilt this is deliberately not.
 *
 * THE LERP IS WHY IT FEELS ATTACHED. The transform is not set to the pointer;
 * it is eased 15% of the remaining distance toward it on every frame, so the
 * card is always a little behind the cursor and arrives after it stops. That
 * lag is the whole effect — a transition on the transform cannot stand in for
 * it, because the pointer target changes faster than any transition can finish
 * and each mousemove would restart the ease from wherever the last one reached.
 * (The same reasoning the header morph already carries in globals.css.)
 *
 * The rAF loop STOPS when the element is home: settled, with a zero target.
 * It clears the inline transform on the way out rather than leaving
 * `translate3d(0,0,0)` behind, so nothing holds a compositor layer or a
 * containing block open while the feed is idle.
 */

const LERP = 0.15;
const SETTLE = 0.05;
const PULL = 60; // px of magnetic travel at the element's edge
const TILT = 6; // degrees of gyro at the same point
const MIN_WIDTH = 120;

/**
 * Attach to an element to give it the pull. `enabled` gates it — a card that
 * is not the active one must not answer the pointer, and coarse pointers have
 * nothing to answer with.
 */
export function useMagneticTilt<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // Hover is the whole premise. A touch screen reports no hover, and firing
    // this on a tap would leave the card parked off-centre with no leave event
    // coming to bring it back.
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tTx = 0, tTy = 0, tRx = 0, tRy = 0;
    let cTx = 0, cTy = 0, cRx = 0, cRy = 0;
    let raf = 0;

    const tick = () => {
      cTx += (tTx - cTx) * LERP;
      cTy += (tTy - cTy) * LERP;
      cRx += (tRx - cRx) * LERP;
      cRy += (tRy - cRy) * LERP;
      el.style.transform =
        `perspective(700px) translate3d(${cTx.toFixed(2)}px, ${cTy.toFixed(2)}px, 0) ` +
        `rotateX(${cRx.toFixed(2)}deg) rotateY(${cRy.toFixed(2)}deg)`;

      const settled =
        Math.abs(tTx - cTx) < SETTLE &&
        Math.abs(tTy - cTy) < SETTLE &&
        Math.abs(tRx - cRx) < SETTLE &&
        Math.abs(tRy - cRy) < SETTLE;
      if (settled && tTx === 0 && tTy === 0 && tRx === 0 && tRy === 0) {
        raf = 0;
        el.style.transform = "";
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      if (r.width < MIN_WIDTH) return;
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      tTx = nx * PULL;
      tTy = ny * PULL;
      tRy = nx * TILT;
      tRx = -ny * TILT;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      tTx = 0; tTy = 0; tRx = 0; tRy = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [enabled]);

  return ref;
}
