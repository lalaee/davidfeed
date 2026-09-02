import { useEffect, useState } from "react";

/*
 * Whether the reader is scrolling DOWN, anywhere in the document.
 *
 * The bottom nav lives in the root layout now, so it has no reference to the
 * scroller on the page beneath it — and there is a different one per page (the
 * feed's snap column, the reader's verses, either of the Library's lists). So
 * this listens on the document in the CAPTURE phase: a scroll event does not
 * bubble, but it does propagate downward to its target, which means one
 * listener sees every scroller and no page has to wire anything up.
 *
 * Hysteresis, not a raw sign. A finger never moves in one direction only: the
 * last frames of a downward swipe drift up, and a raw sign flips the bar on
 * every one of them. 24px of NET travel in the new direction before it counts
 * absorbs that and still feels immediate. Nothing shrinks in the first 40px,
 * where the bar is most useful and where iOS itself keeps it expanded.
 *
 * Both numbers are carried over from the minimize-on-scroll build that was
 * reverted, where they were measured on device rather than guessed.
 */
const TRAVEL = 24;
const TOP = 40;

export function useScrolledDown(key: string): boolean {
  const [down, setDown] = useState(false);

  // React's documented "adjust state when a prop changes" pattern, as Feed and
  // FeedItem already use it: a new route starts at rest, and doing that in an
  // effect is the cascading render this project rejects at build time.
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setDown(false);
  }

  useEffect(() => {
    // Per element, because several scrollers exist at once and each has its
    // own position. Weak so a scroller that unmounts is not held alive.
    const lastTop = new WeakMap<EventTarget, number>();
    // Net travel since the last direction change; its sign is the direction.
    let travel = 0;

    const onScroll = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      // A horizontally-scrolling row — the Library's tab strip, the verse
      // action bar — is not a scroll direction. Nor is a scroller with
      // nothing to scroll.
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) return;

      // Rubber-band overscroll is not a direction either: WebKit reports a
      // negative scrollTop at the top and past-max at the bottom while the
      // finger is still down. Clamped, both read as "no movement".
      const top = Math.min(Math.max(el.scrollTop, 0), max);
      // A scroller seen for the first time is measured from 0, not from where
      // it already is. Seeding it with its own position made the FIRST scroll
      // on a page a no-op — the event was consumed establishing a baseline and
      // produced a delta of zero. A finger produces dozens of events so it
      // self-corrected in practice, but the first gesture after a page load
      // genuinely did nothing, and every page here opens at its top anyway.
      const prev = lastTop.get(el) ?? 0;
      lastTop.set(el, top);
      const delta = top - prev;
      if (delta === 0) return;

      if (top <= TOP) {
        travel = 0;
        setDown(false);
        return;
      }
      // Reset the accumulator on a reversal, then accumulate.
      travel = Math.sign(travel) === Math.sign(delta) ? travel + delta : delta;
      if (travel >= TRAVEL) setDown(true);
      else if (travel <= -TRAVEL) setDown(false);
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
    // Re-armed per route, which also clears the accumulator and the WeakMap.
  }, [key]);

  return down;
}
