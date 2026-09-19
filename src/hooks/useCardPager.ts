import { useCallback, useEffect, useRef, type RefObject } from "react";

import { HOUSE, STEP_MS } from "@/lib/easing";

/*
 * ONE CARD PER GESTURE, ON THE HOUSE CURVE.
 *
 * The feed pages: every gesture is a request for the next card, not for
 * "some scrolling". Native scroll answered a different question. A wheel or
 * trackpad moved the column by however far the browser's own physics decided,
 * then `scroll-snap-type: mandatory` yanked it to the nearest card with the
 * browser's own snap animation — a linear-ish correction it does not let us
 * time or shape. Chevrons and arrow keys went through scrollIntoView({smooth}),
 * whose curve is the browser's too. Three different motions for the same
 * verb, none of them ours, and the trackpad one visibly fought the snap.
 *
 * So the pager owns the motion. It moves scrollTop itself, frame by frame,
 * from rest position to rest position on cubic-bezier(0.32, 0.72, 0, 1) — the
 * curve every press and every sheet in this app already rides — and the
 * scroller stays a real scroller: the intersection observer, the soft-edge
 * variables, the Library's "open at" and everything else that listens to
 * scroll keeps working, because scroll is what it is still doing.
 *
 * THE TRACKPAD IS THE HARD PART. A single flick fires forty-odd wheel events
 * over a second and a half as the browser simulates the finger's momentum.
 * Counted naively, one flick was four cards. Throttling by a fixed interval
 * (600ms, 900ms — both tried elsewhere) makes the SECOND intentional flick
 * either get eaten or fire late, and feels like a coin toss. But momentum
 * has a signature, and the signature is what gets filtered, not the clock:
 * an event is momentum when it follows the last one closely, in the same
 * direction, with a delta no larger than the last. Real intent breaks at
 * least one of those — it is a new direction, or it comes after a pause, or
 * the finger is pushing harder than the tail it interrupts. That third clause
 * is what lets a reader flick twice in quick succession and get two cards.
 * (The pattern is documented in Liepenieks' "Mac trackpad hell" write-up; the
 * thresholds here are his, re-measured on this feed.)
 *
 * A mouse wheel has no momentum: every notch is a discrete 100 (or, in
 * line-mode, 3 lines — normalised below), so the same test lets every notch
 * through and the reader gets a card per click, which is what a wheel means.
 *
 * ENDS. At the first card going up, or the last going down, the request has
 * no card to go to. Ignoring it read as a dead input. So the column gives a
 * little — 28px of travel on the same curve, and back — the rubber band iOS
 * uses to say "this is the end" without saying it. It is a transform on the
 * scroller, not a scroll: scrollTop cannot go below 0.
 *
 * REDUCED MOTION. The step is instant. The rubber band is not shown at all;
 * a bounce is precisely the motion that setting asks not to see.
 */

const BAND_PX = 28;       // rubber band at either end
const BAND_MS = 380;
const MOMENTUM_GAP_MS = 1500;
const MIN_DELTA = 3;      // below this a trackpad is being brushed, not pushed

interface Pager {
  /** Scroll so that `index` sits on the rest line. */
  go: (index: number) => void;
  /** Whether a step is in flight — the keyboard chains off this. */
  moving: () => boolean;
}

export function useCardPager(
  scroller: RefObject<HTMLDivElement | null>,
  items: RefObject<(HTMLDivElement | null)[]>,
  count: number,
  /** Steps from the currently active card when the wheel asks. */
  activeIndexRef: RefObject<number>,
  /**
   * Told the target the moment a step is accepted — before the scroll has
   * moved, well before the observer flips activeIndex at the halfway mark.
   * Anything that should change WITH the page, not after it, listens here.
   */
  onAim?: (index: number) => void,
): Pager {
  const onAimRef = useRef(onAim);
  useEffect(() => { onAimRef.current = onAim; }, [onAim]);
  // The whole engine lives inside one effect and is reached through a ref.
  // Memoised callbacks that read `scroller.current` are exactly what the
  // React Compiler refuses to preserve (see the ref-taint note in the repo
  // memory), and an effect is where ref access belongs anyway.
  const engine = useRef<{ go: (i: number) => void; moving: () => boolean } | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    let raf = 0;
    let target: number | null = null;
    const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const restTop = () => parseFloat(getComputedStyle(el).scrollPaddingTop) || 0;

    const cancel = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      target = null;
    };

    const tween = (to: number, ms: number) => {
      cancel();
      const from = el.scrollTop;
      if (from === to || reduced()) {
        el.scrollTop = to;
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / ms);
        el.scrollTop = from + (to - from) * HOUSE(p);
        if (p < 1) raf = requestAnimationFrame(step);
        else { raf = 0; target = null; }
      };
      raf = requestAnimationFrame(step);
    };

    // Out on the house curve, back on it reversed: the same shape a sheet
    // makes when it is pulled past its rest and let go.
    const band = (dir: 1 | -1) => {
      if (reduced()) return;
      cancel();
      const t0 = performance.now();
      const half = BAND_MS / 2;
      const step = (now: number) => {
        const e = now - t0;
        const p = e < half ? HOUSE(e / half) : 1 - HOUSE((e - half) / half);
        el.style.transform = `translateY(${-dir * BAND_PX * p}px)`;
        if (e < BAND_MS) raf = requestAnimationFrame(step);
        else { el.style.transform = ""; raf = 0; }
      };
      raf = requestAnimationFrame(step);
    };

    const go = (index: number) => {
      const item = items.current?.[index];
      if (!item) return;
      target = index;
      onAimRef.current?.(index);
      tween(item.offsetTop - restTop(), STEP_MS);
    };

    engine.current = { go, moving: () => target !== null };

    // The wheel, desktop only. On the phone a finger drives a real scroll and
    // CSS snap settles it; there is no wheel to own.
    const desk = matchMedia("(min-width: 1028px)");
    let lastAt = 0;
    let lastDir = 0;
    let lastMag = 0;

    const onWheel = (e: WheelEvent) => {
      if (!desk.matches) return;
      if (e.ctrlKey) return;                          // pinch-zoom, not a scroll
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();                             // the pager moves the column, not the browser

      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const mag = Math.abs(dy);
      const dir = Math.sign(dy) as 1 | -1 | 0;
      const now = performance.now();
      const momentum =
        now - lastAt < MOMENTUM_GAP_MS && dir === lastDir && mag <= lastMag;
      lastAt = now; lastDir = dir; lastMag = mag;

      if (!dir || mag < MIN_DELTA || momentum) return;
      if (target !== null) return;                    // a step is in flight; this gesture is spent on it

      const from = activeIndexRef.current ?? 0;
      const next = from + dir;
      if (next < 0 || next >= count) { band(dir); return; }
      go(next);
    };

    // A finger on the column takes it back from any tween in flight.
    const onTouch = () => cancel();

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouch);
      cancel();
      engine.current = null;
    };
  }, [scroller, items, count, activeIndexRef]);

  const go = useCallback((index: number) => engine.current?.go(index), []);
  const moving = useCallback(() => engine.current?.moving() ?? false, []);
  return { go, moving };
}
