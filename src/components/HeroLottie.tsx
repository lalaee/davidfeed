"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { AnimationItem } from "lottie-web";

import { GLYPH_ICON_EM } from "./HeroGlyphs";

/*
 * An animated glyph standing in for a letter of the hero headline.
 *
 * Eight Iconly animations arrived as two sets — four "doom" faces for the o's
 * of Doomscrolling, four "hope" faces for the o of Hopescrolling. A slot plays
 * one animation through (1.5s, 90 frames at 60fps), then moves to the next in
 * its set, and cycles. Two slots on the same line start two apart, so the two
 * o's of Doom never wear the same face at the same moment.
 *
 * THE FULL PLAYER, NOT lottie_light. Every one of the eight files carries
 * expressions (3–10 each), and the light build has no expression engine —
 * it would render them frozen. Loaded on demand, so it costs the phone
 * nothing: this only ever mounts inside the desk-only chrome.
 *
 * TINTED TO THE LINE, in CSS. The icons export black strokes, invisible here,
 * so `.hero-lottie` in globals.css recolours black strokes and black fills to
 * currentColor — grey on Doom, the frame's teal on Hope. It is CSS and not an
 * attribute pass because Lottie builds some shapes lazily during playback, and
 * a one-shot pass at DOMLoaded misses them: 3 of 11 strokes stayed black on the
 * hearts icon, reading as a broken stroke. Red hearts and white mask rects are
 * left alone; see the note there.
 *
 * The box is the same 1.0114em the traced glyphs used, with the same
 * vertical-align, so nothing else on the line moves.
 */

/*
 * One fetch per file, ever.
 *
 * Without this each slot re-downloads its JSON at the end of every 1.5s face:
 * measured 84 requests in 30 seconds, growing for as long as the page is open.
 * The animation data is immutable, so it is cached by URL and the promise is
 * cached rather than the result — two slots starting together would otherwise
 * both miss and both fetch.
 */
const cache = new Map<string, Promise<unknown>>();
const loadAnimationData = (url: string) => {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    });
    // A failed fetch must not poison the slot forever.
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
};

const BOX: CSSProperties = {
  display: "inline-block",
  width: GLYPH_ICON_EM + "em",
  height: GLYPH_ICON_EM + "em",
  verticalAlign: "-0.173em",
  lineHeight: 0,
};

interface HeroLottieProps {
  /** URLs of the Lottie JSON files, played in order, cycling the set. */
  sources: string[];
  /** Index in `sources` to start at, so sibling slots can differ. */
  offset?: number;
  style?: CSSProperties;
  className?: string;
}

export default function HeroLottie({ sources, offset = 0, style, className }: HeroLottieProps) {
  const boxRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || sources.length === 0) return;

    let anim: AnimationItem | null = null;
    let index = ((offset % sources.length) + sources.length) % sources.length;
    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
     * NOTHING LOADS BELOW THE DESK BREAKPOINT.
     *
     * The hero is `desk:flex` — hidden, not unmounted — and a hidden component
     * still runs its effects. Measured at 390px: all eight JSONs fetched and
     * the player chunk pulled, for a headline the phone never shows. The query
     * matches globals.css's own 1028, and it is watched rather than read once,
     * so a window dragged wider starts the animation instead of leaving a hole.
     */
    const desk = window.matchMedia("(min-width: 1028px)");

    const play = async () => {
      const [{ default: lottie }, animationData] = await Promise.all([
        import("lottie-web"),
        loadAnimationData(sources[index]),
      ]);
      if (cancelled) return;

      anim?.destroy();
      box.replaceChildren();
      // One source loops in the player. Cycling back through play() would
      // rebuild the SVG every 1.5s for no reason, and drop a frame each time.
      anim = lottie.loadAnimation({
        container: box,
        renderer: "svg",
        loop: sources.length === 1,
        autoplay: !reduced,
        animationData,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: false },
      });
      if (reduced) {
        // Rest on the first frame of the first face; no cycling.
        anim.goToAndStop(0, true);
        return;
      }
      if (sources.length > 1) {
        anim.addEventListener("complete", () => {
          if (cancelled) return;
          index = (index + 1) % sources.length;
          void play();
        });
      }
    };

    const sync = () => {
      if (desk.matches) {
        void play();
      } else {
        anim?.destroy();
        anim = null;
        box.replaceChildren();
      }
    };
    sync();
    desk.addEventListener("change", sync);

    return () => {
      cancelled = true;
      desk.removeEventListener("change", sync);
      anim?.destroy();
      box.replaceChildren();
    };
  }, [sources, offset]);

  return (
    <span
      ref={boxRef}
      aria-hidden
      className={className ? `hero-lottie ${className}` : "hero-lottie"}
      style={{ ...BOX, ...style }}
    />
  );
}
