import { useCallback, useEffect, useState } from "react";

/*
 * When the bottom nav should be minimized — the iOS 26 tab bar rule.
 *
 * Apple states the behaviour and not the numbers: the bar minimizes on scroll
 * down, re-expands on scroll up, on reaching the top, or on a tap of the
 * minimized tab (WWDC25 284 at 2:31; HIG "Tab bars"). What follows fills in
 * the parts they left to the implementation, and says so where it does.
 *
 * Two signals, one contract. A continuous scroller reports direction; the feed
 * snaps card to card and reports index. Both answer `minimized` and expose
 * `expand`, so the nav does not know which it is talking to.
 */

export interface NavCollapse {
  minimized: boolean;
  /** The tap-the-minimized-tab exit; also useful after a sheet closes. */
  expand: () => void;
}

export interface ScrollNavCollapse extends NavCollapse {
  /**
   * Put this on the scroller's `ref`. A callback ref, for the reason given
   * below. Not itself NAMED ref: the React Compiler infers any object with a
   * property called `ref` to be a ref, and then refuses to let render read
   * `minimized` off it. It failed the build under that name.
   */
  attach: (el: HTMLElement | null) => void;
  /**
   * The scroller the ref captured, for a caller that also needs to scroll or
   * measure it. Handed out so the caller does not keep a second RefObject and
   * write to it from inside a ref callback — the React Compiler rejects that
   * as mutating a hook value, and it failed the build.
   */
  el: HTMLElement | null;
}

/*
 * Hysteresis, not a raw sign. A finger never moves in one direction only:
 * the last frames of a downward swipe drift up, and a raw sign flips the bar
 * on every one of them. 24px of NET travel in the new direction before it
 * counts is enough to absorb that jitter and still feel immediate.
 *
 * Nothing collapses in the first 40px. The top of a page is where the bar is
 * most useful and where iOS itself keeps it expanded.
 */
const TRAVEL = 24;
const TOP = 40;

/*
 * A CALLBACK ref, not a RefObject. The first version took a RefObject and
 * subscribed in an effect, and the Library never collapsed: its list renders
 * an empty state until the chapter text arrives, so at the moment the effect
 * ran there was no scroller to subscribe to — and an effect keyed on a stable
 * ref object never runs again when one mounts later. The grid has the same
 * hole on a real first load, where the server snapshot is empty. React calls
 * a callback ref with the element the moment it exists and with null the
 * moment it goes, which is exactly the lifecycle a subscription needs.
 *
 * `key` covers the other case: a scroller that stays put while its CONTENT is
 * swapped, like the reader paging from Psalms 46 to 47. Same element, new
 * chapter, and a new chapter opens at its top, expanded.
 */
export function useScrollCollapse(key: string | number = ""): ScrollNavCollapse {
  const [minimized, setMinimized] = useState(false);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const attach = useCallback((node: HTMLElement | null) => setEl(node), []);

  // React's documented "adjust state when a prop changes" pattern, as Feed and
  // FeedItem already use it: a new scroller or a new key starts expanded, and
  // doing that in an effect is the cascading render this project rejects at
  // build time.
  const [seen, setSeen] = useState<{ el: HTMLElement | null; key: string | number }>({ el, key });
  if (seen.el !== el || seen.key !== key) {
    setSeen({ el, key });
    setMinimized(false);
  }

  useEffect(() => {
    if (!el) return;
    let last = el.scrollTop;
    // Net travel since the last direction change; sign is the direction.
    let travel = 0;

    const onScroll = () => {
      // Rubber-band overscroll is not a scroll direction. WebKit reports
      // negative scrollTop at the top and past-max at the bottom while the
      // finger is still down; clamped, both read as "no movement".
      const max = el.scrollHeight - el.clientHeight;
      const top = Math.min(Math.max(el.scrollTop, 0), Math.max(max, 0));
      const delta = top - last;
      last = top;
      if (delta === 0) return;

      if (top <= TOP) {
        travel = 0;
        setMinimized(false);
        return;
      }
      // Reset the accumulator on a reversal, then accumulate.
      travel = Math.sign(travel) === Math.sign(delta) ? travel + delta : delta;
      if (travel >= TRAVEL) setMinimized(true);
      else if (travel <= -TRAVEL) setMinimized(false);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [el, key]);

  const expand = useCallback(() => setMinimized(false), []);
  return { minimized, expand, attach, el };
}

/*
 * The feed's version. Its scroller snaps whole cards, so "scroll down" is the
 * active index going up. Card 0 counts as the top, and only an INCREASE
 * collapses — the Library can open a feed on card 5, which must not arrive
 * already minimized.
 */
export function useIndexCollapse(index: number): NavCollapse {
  const [minimized, setMinimized] = useState(false);
  // State, not a ref: the previous index is read during render to compare,
  // and the React Compiler forbids reading a ref there. This is the same
  // "adjust state when a prop changes" shape Feed uses for wasActive.
  const [prev, setPrev] = useState(index);
  if (prev !== index) {
    setPrev(index);
    setMinimized(index > prev && index > 0);
  }
  const expand = useCallback(() => setMinimized(false), []);
  return { minimized, expand };
}
