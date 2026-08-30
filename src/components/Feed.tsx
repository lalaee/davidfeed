"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import FeedItem from "./FeedItem";
import BottomNav from "./BottomNav";
import { chapterPosts, type Post } from "@/data/posts";

/**
 * Ambient bed level under the narration. dafod mixes voice 0.95 / bed 0.25.
 *
 * The chapter mp3s are pure speech — 16 genuine silent gaps at -50dB, including
 * a full second of silence between the spoken title and the first verse — so
 * the bed has to come from here. (An earlier reading suggested the narrations
 * already carried one; that was a mismeasurement: `silencedetect` had been run
 * with `-v error`, which suppresses the filter's own output.)
 */
const BED_VOLUME = 0.25;


interface FeedProps {
  /** Which cards to render. Defaults to the full chapter readings. */
  posts?: Post[];
  /** Which bottom-nav tab this feed sits under. */
  activeTab?: "home" | "shorts";
}

export default function Feed({ posts = chapterPosts, activeTab = "home" }: FeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Sound is a feed-wide preference, not per-card: every card scrolled to
  // inherits it. It starts ON so the feed opens with narration where the
  // browser permits it — Chrome grants autoplay-with-sound on sites the viewer
  // has engaged with before. Where it is refused, FeedItem falls back to muted
  // and reports back through onAutoplayBlocked, and the first interaction of
  // any kind turns it on for the rest of the session.
  const [soundOn, setSoundOn] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleSound = useCallback(() => setSoundOn((prev) => !prev), []);


  // "Blessing" — the technique AMP Stories uses, and the reason sound kept
  // dropping out on iOS when swiping to a new card.
  //
  // Autoplay permission is granted PER MEDIA ELEMENT, not per document. Only
  // the element that was playing during the user's gesture becomes allowed to
  // make sound; every other card's <audio> is still unblessed, so unmuting it
  // later counts as "gaining audio without a gesture" — and WebKit's documented
  // response to that is to pause playback. Hence: tap, hear this card, swipe,
  // silence, tap again.
  //
  // The fix is to unmute-then-immediately-remute EVERY media element on the
  // first gesture. That is audibly a no-op but marks them all as user-initiated
  // for the rest of the session. It must run synchronously inside the gesture —
  // transient activation only lasts ~5s and does not survive an await.
  const blessedRef = useRef(false);
  useEffect(() => {
    const bless = () => {
      if (blessedRef.current) return;
      blessedRef.current = true;

      document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((el) => {
        const wasMuted = el.muted;
        el.muted = false;
        if (wasMuted) el.muted = true;
      });

      // Without this the hardware ring/silent switch mutes the whole feed,
      // which the native apps do not do. Safari 16.4+ only; harmless elsewhere.
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback";
    };

    // Capture phase, so this runs before the card's own tap handler.
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", bless, opts);
    window.addEventListener("touchstart", bless, opts);
    window.addEventListener("keydown", bless, opts);
    return () => {
      window.removeEventListener("pointerdown", bless, opts);
      window.removeEventListener("touchstart", bless, opts);
      window.removeEventListener("keydown", bless, opts);
    };
  }, []);

  // Autoplay-with-sound was refused, so the card fell back to muted. Arm a
  // one-shot unlock on the first gesture.
  //
  // Deliberately NOT pointerdown/click: the card has its own tap handler, and
  // a window-level pointerdown fires first and turns sound on, then the card's
  // click toggles it straight back off — which read as "click once, get a mute
  // icon; click again to actually hear it". Listening only to gestures the
  // card does not handle keeps a single tap doing a single thing.
  const armedRef = useRef(false);
  const armUnlock = useCallback(() => {
    setSoundOn(false);
    if (armedRef.current) return;
    armedRef.current = true;
    const unlock = () => {
      armedRef.current = false;
      setSoundOn(true);
    };
    const opts = { once: true, passive: true } as const;
    containerRef.current?.addEventListener("scroll", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("wheel", unlock, opts);
  }, []);

  // Ambient bed. Owned by the Feed, not by a card, so it plays continuously
  // underneath the whole feed and never restarts when the active card changes.
  // It is rendered outside the item wrappers, which is what keeps the
  // "only the focused card may play" sweep below from touching it.
  const bedRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const bed = bedRef.current;
    if (!bed) return;
    bed.volume = BED_VOLUME;
    if (soundOn) {
      // Never muted, so this is the first thing a browser refuses; route the
      // refusal into the same fallback a card uses.
      bed.play().catch(armUnlock);
    } else {
      bed.pause();      // pause, never reset — resuming keeps its position
    }
  }, [soundOn, armUnlock]);


  // Intersection Observer to detect active post.
  // A card is shorter than the scroll viewport, so more than one can clear 50%
  // at the same time. Tracking every ratio and taking the single most-visible
  // card makes the winner deterministic, instead of depending on the order
  // entries happen to arrive in within a batch.
  useEffect(() => {
    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = itemRefs.current.findIndex((ref) => ref === entry.target);
          if (index !== -1) {
            ratios.set(index, entry.isIntersecting ? entry.intersectionRatio : 0);
          }
        });

        let best = -1;
        let bestRatio = 0;
        ratios.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = index;
          }
        });
        if (best !== -1) setActiveIndex(best);
      },
      {
        root: containerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Hard guarantee: only the focused card's media may play. Child effects run
  // before the parent's, so this sweep is the final word on every scroll —
  // anything outside the focused card is stopped, rewound and muted.
  useEffect(() => {
    itemRefs.current.forEach((wrapper, index) => {
      if (!wrapper || index === activeIndex) return;
      wrapper.querySelectorAll<HTMLMediaElement>("audio, video").forEach((el) => {
        if (!el.paused) el.pause();
        el.currentTime = 0;
        el.muted = true;
      });
    });
  }, [activeIndex]);

  // Preload next images
  useEffect(() => {
    const preloadWindow = 2;
    for (let i = activeIndex + 1; i <= Math.min(activeIndex + preloadWindow, posts.length - 1); i++) {
      const img = new window.Image();
      img.src = posts[i].backgroundImage;
    }
  }, [activeIndex]);

  return (
    <>
      {/* Fixed background that extends into Safari safe area */}
      <div className="fixed inset-0 bg-black z-[-1]" />

      {/* Continuous ambient bed — one element for the whole feed, outside the
          card wrappers so scrolling never interrupts it. */}
      <audio ref={bedRef} src="/assets/ambient-bed.m4a" loop preload="auto" />
    <div className="relative w-full md:max-w-[375px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden">
      {/* Scrollable Feed Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory overscroll-y-contain scrollbar-hide pb-[20px]"
      >
        {posts.map((post, index) => (
          <div
            key={post.id}
            ref={(el) => { itemRefs.current[index] = el; }}
          >
            <FeedItem
              title={post.title}
              backgroundImage={post.backgroundImage}
              videoSrc={post.videoSrc}
              posterVideoSrc={post.posterVideoSrc}
              audioSrc={post.audioSrc}
              isActive={index === activeIndex}
              subtitles={post.subtitles}
              soundOn={soundOn}
              onToggleSound={toggleSound}
              effect={post.effect}
              clip={post.clip}
              onAutoplayBlocked={armUnlock}
            />
          </div>
        ))}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} />

    </div>
    </>
  );
}
