"use client";

import { useEffect, useRef, useState } from "react";

import { HOUSE, STEP_MS } from "@/lib/easing";

/*
 * THE ARTWORK, BLED ACROSS THE DESKTOP — Apple Music's Now Playing background,
 * behind the feed, sourced from whichever card is active.
 *
 * This is Apple's own recipe, not an approximation of it. The Music web app
 * ships the effect as a Pixi.js scene inside its bundle, and aadishv decompiled
 * it (aadishv.dev/music; github.com/aadishv/html-music). It is not colour
 * extraction and not a mesh gradient — every recreation that starts from "pick
 * the dominant colours" is guessing at what this does directly with pixels:
 *
 *   FOUR SQUARE COPIES of the cover, anchored at centre, sized to the viewport
 *   width — 1.25x, 0.8x, 0.5x, 0.25x. The two big ones spin in place; the two
 *   small ones spin while riding a circular track of radius width/4.
 *
 *   MOTION per 30fps frame, in radians, adjacent layers in opposite directions
 *   so it never reads as one image turning:
 *     1.25x  +0.003     0.8x  -0.008
 *     0.5x   -0.006 on the track      0.25x  +0.004 on the track, centre +5%
 *
 *   ONE FILTER CHAIN on the group, in this order:
 *     TwistFilter  angle -3.25 rad, radius 900, centred — the swirl. Each pixel
 *                  turns by angle * ((radius - d) / radius)^2, fiercest at the
 *                  centre and nothing at the rim, which is what makes four
 *                  rotating squares read as fluid.
 *     Kawase blur  5/q1, 10/q1, 20/q2, 40/q2, 80/q2 — a progressive blur built
 *                  the same way the bar's soft edge is, small radii compounding
 *                  instead of one huge Gaussian.
 *     Adjustment   saturation 2.75 — the part everyone misses. The background
 *                  is far more vivid than the cover; that is a 275% boost, not
 *                  colour picking.
 *
 *   BUDGET  15fps cap, low-power GPU preference, half resolution (it is
 *           blurred to nothing; the pixels would be paid for and never seen),
 *           and the ticker freezes while the feed is scrolling — at 0.003 rad
 *           a frame the swirl does not visibly move across a 620ms page, and
 *           the scroll is where every frame is already spoken for.
 *
 * Three things are ours.
 *
 * THE TURN LANDS WITH THE PAGE. The reference swaps textures in place on a
 * track change. Here the new cover fades in over the old on the same rotations
 * and positions — so the swirl never restarts — and the fade runs on the house
 * curve over STEP_MS, the pager's own duration, starting from the pager's AIM
 * rather than from the observer's activeIndex. The observer speaks at the
 * halfway point of a page; by then the background would already be late. Fed
 * from the aim, background and card start together and settle together. The
 * neighbours' textures are warmed ahead (±2 cards) so there is nothing to
 * fetch at the moment of the turn: Assets.load on a warm key resolves in a
 * microtask.
 *
 * THE FIRST FRAME IS NOT BLACK. The card is HTML and paints at once; the
 * swirl needs a chunk, a context and a texture. Until it has drawn, a CSS
 * stand-in holds the ground: the cover itself, which the browser already has
 * for the card, at 1.25x, blurred and saturated to the same recipe. It is
 * one static paint, then it fades out under the canvas's first frame. It is
 * also what a machine with no WebGL keeps.
 *
 * THE DIM (globals.css, --ambience-dim): Apple has only controls on top of
 * this; we have a painting, whose job is to stay the brightest thing on the
 * screen.
 *
 * Desktop only, and Pixi is imported inside the effect, so the phone never
 * downloads it — there the card IS the screen and there is nothing behind it.
 */

const SIZES = [1.25, 0.8, 0.5, 0.25] as const;
const SPIN = [0.003, -0.008, -0.006, 0.004] as const;
const FADE_MS = STEP_MS;

type Scene = {
  setSource: (src: string) => void;
  warm: (srcs: string[]) => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
};

async function createScene(
  canvas: HTMLCanvasElement,
  initial: string,
  onFirstFrame: () => void,
): Promise<Scene> {
  const [{ Application, Assets, Container, Sprite }, { AdjustmentFilter, KawaseBlurFilter, TwistFilter }] =
    await Promise.all([import("pixi.js"), import("pixi-filters")]);

  const app = new Application();
  await app.init({
    canvas,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundAlpha: 0,
    // Half resolution. The output is blurred beyond any detail, so the buffer
    // can be a quarter of the pixels and stretched by the canvas's CSS size;
    // the ten filter passes cost a quarter as much and nothing is visibly
    // lost. (autoDensity off, so the canvas keeps its CSS size regardless.)
    resolution: 0.5,
    autoDensity: false,
    antialias: false,
    powerPreference: "low-power",
  });
  app.ticker.maxFPS = 15;

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The group that carries the filters. Covers come and go inside it as
  // child groups so a cross-fade is two alphas, and the chain runs once over
  // whatever is there.
  const stage = new Container();
  app.stage.addChild(stage);

  const twist = new TwistFilter({
    angle: -3.25,
    radius: 900,
    offset: { x: app.screen.width / 2, y: app.screen.height / 2 },
  });
  const blurs = [
    new KawaseBlurFilter({ strength: 5, quality: 1 }),
    new KawaseBlurFilter({ strength: 10, quality: 1 }),
    new KawaseBlurFilter({ strength: 20, quality: 2 }),
    new KawaseBlurFilter({ strength: 40, quality: 2 }),
    new KawaseBlurFilter({ strength: 80, quality: 2 }),
  ];
  const saturate = new AdjustmentFilter({ saturation: 2.75 });
  stage.filters = [twist, ...blurs, saturate];

  // The rotations live here, not on the sprites, so a new cover picks up
  // exactly where the old one is and the motion is continuous across a fade.
  const rot = [0, 0, 0, 0];
  let groups: { group: InstanceType<typeof Container>; born: number; dying: number | null }[] = [];

  const layout = () => {
    const w = app.screen.width, h = app.screen.height;
    twist.offset = { x: w / 2, y: h / 2 };
    for (const { group } of groups) {
      group.children.forEach((c, i) => {
        const s = c as InstanceType<typeof Sprite>;
        s.width = s.height = w * SIZES[i];
      });
    }
  };

  const place = () => {
    const w = app.screen.width, h = app.screen.height;
    for (const { group } of groups) {
      const [t, s, i, r] = group.children as InstanceType<typeof Sprite>[];
      t.rotation = rot[0]; t.position.set(w / 2, h / 2);
      s.rotation = rot[1]; s.position.set(w / 2.5, h / 2.5);
      i.rotation = rot[2];
      i.position.set(w / 2 + (w / 4) * Math.cos(rot[2] * 0.75), h / 2 + (w / 4) * Math.sin(rot[2] * 0.75));
      r.rotation = rot[3];
      r.position.set(
        w / 2 + (w / 2) * 0.1 + (w / 4) * Math.cos(rot[3] * 0.75),
        h / 2 + (w / 2) * 0.1 + (w / 4) * Math.sin(rot[3] * 0.75),
      );
    }
  };

  let latest = initial;
  const setSource = async (src: string) => {
    latest = src;
    const texture = await Assets.load(src);
    if (latest !== src || app.renderer === null) return; // superseded while loading, or torn down
    const group = new Container();
    for (let i = 0; i < 4; i++) {
      const sp = new Sprite(texture);
      sp.anchor.set(0.5);
      group.addChild(sp);
    }
    group.alpha = groups.length ? 0 : 1;
    stage.addChild(group);
    const now = performance.now();
    for (const g of groups) if (g.dying === null) g.dying = now;
    groups.push({ group, born: now, dying: null });
    layout();
    place();
  };

  // The spin can be held (scrolling, narrow window) without holding the fade,
  // which has to finish with the page it started with.
  let spinning = true;
  app.ticker.add((ticker) => {
    const n = ticker.deltaMS / 33.333333;
    if (spinning && !still) for (let i = 0; i < 4; i++) rot[i] += SPIN[i] * n;
    place();
    const now = performance.now();
    for (const g of groups) {
      if (g.dying !== null) {
        g.group.alpha = 1 - HOUSE(Math.min(1, (now - g.dying) / FADE_MS));
      } else {
        g.group.alpha = HOUSE(Math.min(1, (now - g.born) / FADE_MS));
      }
    }
    const dead = groups.filter((g) => g.dying !== null && g.group.alpha === 0);
    for (const g of dead) { stage.removeChild(g.group); g.group.destroy({ children: true }); }
    if (dead.length) groups = groups.filter((g) => !dead.includes(g));
  });

  const onResize = () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    layout();
  };
  window.addEventListener("resize", onResize);

  await setSource(initial);
  // Not "loaded" — DRAWN. The stand-in must not leave until there is a frame
  // beneath it, and the first render is a tick away from the first sprite.
  app.ticker.addOnce(() => requestAnimationFrame(onFirstFrame));

  return {
    setSource: (src) => { void setSource(src); },
    warm: (srcs) => { void Assets.load(srcs).catch(() => {}); },
    pause: () => { spinning = false; },
    resume: () => { spinning = true; },
    destroy: () => {
      window.removeEventListener("resize", onResize);
      app.destroy({ removeView: false }, { children: true });
    },
  };
}

export default function FeedAmbience({ src, warm = [] }: { src?: string; warm?: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [desk, setDesk] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(min-width: 1028px)");
    const sync = () => setDesk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Built ONCE, the first time the window is desktop-wide, and kept for the
  // life of the feed. It is not rebuilt when the width crosses 1028 and back:
  // Pixi's destroy loses the WebGL context, and a canvas whose context has
  // been lost will not hand out another — the second build hung the tab. So
  // a narrow window pauses the ticker and hides the canvas (CSS), and a wide
  // one resumes it. Only unmount tears it down.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!desk || !canvas || !src || sceneRef.current) return;
    let alive = true;
    void createScene(canvas, src, () => { if (alive) setDrawn(true); })
      .then((scene) => {
        if (!alive) { scene.destroy(); return; }
        sceneRef.current = scene;
        scene.warm(warm);
      })
      .catch(() => { /* no WebGL: the stand-in stays, and that is the design */ });
    return () => { alive = false; };
    // src/warm are read once at build; changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desk]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (desk) scene.resume(); else scene.pause();
  }, [desk]);

  useEffect(() => () => { sceneRef.current?.destroy(); sceneRef.current = null; }, []);

  // Frozen while anything scrolls, resumed 200ms after the last scroll event.
  // Capture phase on the document, as useScrolledDown does: scroll does not
  // bubble, but it does propagate down to its target, so one listener sees
  // the feed's scroller without being handed a reference to it.
  //
  // The fade is exempt: a turn that starts with a page has to keep running
  // through it, or it would land 200ms after the card instead of with it.
  // pause() only stops the spin; see the ticker above.
  useEffect(() => {
    if (!desk) return;
    let idle = 0;
    const onScroll = () => {
      sceneRef.current?.pause();
      clearTimeout(idle);
      idle = window.setTimeout(() => sceneRef.current?.resume(), 200);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      clearTimeout(idle);
    };
  }, [desk]);

  useEffect(() => {
    if (src) sceneRef.current?.setSource(src);
  }, [src]);

  useEffect(() => {
    if (warm.length) sceneRef.current?.warm(warm);
    // A new array each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warm.join("|")]);

  // z-0, not z-[-1]. A negative z-index paints BENEATH the page's own in-flow
  // boxes, and <main> is bg-black: at -1 the canvas rendered perfectly and was
  // never seen. At 0 it paints after the flow and before the column, which is
  // later in the document at the same level.
  return (
    <>
      {src && (
        <div
          aria-hidden
          className="feed-ambience-standin pointer-events-none fixed inset-0 z-0 hidden overflow-hidden desk:block"
          data-drawn={drawn ? "" : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the cover the card already holds; no optimisation pass wanted between it and the first frame */}
          <img src={src} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="feed-ambience pointer-events-none fixed inset-0 z-0 hidden h-full w-full desk:block"
      />
      <div aria-hidden className="feed-ambience-dim pointer-events-none fixed inset-0 z-0 hidden desk:block" />
    </>
  );
}
