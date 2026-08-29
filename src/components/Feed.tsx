"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import FeedItem, { type CoverEffect } from "./FeedItem";
import BottomNav from "./BottomNav";
import { psalm91Subtitles, type Subtitle } from "@/data/psalm91-subtitles";
import { chapterSubtitles } from "@/data/chapter-subtitles";

interface Post {
  id: number;
  title: string;
  backgroundImage: string;
  videoSrc?: string;
  posterVideoSrc?: string;
  audioSrc?: string;
  subtitles?: Subtitle[];
  effect?: CoverEffect;
}

// NOTE: no ambient bed here. dafod's chapter mp3s already carry one — they
// measure -22 LUFS before the first spoken word — so layering our own on top
// played two beds at once.

// The hero is the sheep footage, and it now carries Psalm 23 — "The LORD is my
// shepherd" over grazing sheep. That makes the deer-in-shrubs cover redundant as
// a separate Psalm 23 card, so it is gone; Psalm 7 is now its only user.
// Psalm 91 becomes an ordinary chapter card with its own artwork.
//
// Every other chapter carries a depth-parallax loop generated from its own cover
// (Depth Anything V2 -> displacement along a closed elliptical camera path). The
// still stays as the fallback beneath and shows until the video decodes.
const posts: Post[] = [
  {
    id: 23,
    title: "Psalm 23",
    backgroundImage: "/assets/feed-poster-frame.jpg",
    videoSrc: "/assets/feed-video.mp4",
    posterVideoSrc: "/assets/feed-poster-video-loop.mp4",
    audioSrc: "/assets/chapters/psalm23.mp3",
    subtitles: chapterSubtitles.psalm23,
  },
  { id: 27, title: "Psalm 27", backgroundImage: "/assets/chapters/psalm27.jpg", posterVideoSrc: "/assets/chapters/psalm27-loop.mp4", audioSrc: "/assets/chapters/psalm27.mp3", subtitles: chapterSubtitles.psalm27 },
  { id: 91, title: "Psalm 91", backgroundImage: "/assets/chapters/psalm91.jpg", posterVideoSrc: "/assets/chapters/psalm91-loop.mp4", audioSrc: "/assets/psalm91.mp3", subtitles: psalm91Subtitles },
  { id: 5,  title: "Psalm 5",  backgroundImage: "/assets/chapters/psalm5.jpg",  posterVideoSrc: "/assets/chapters/psalm5-loop.mp4",  audioSrc: "/assets/chapters/psalm5.mp3", subtitles: chapterSubtitles.psalm5  },
  { id: 7,  title: "Psalm 7",  backgroundImage: "/assets/chapters/psalm7.jpg",  posterVideoSrc: "/assets/chapters/psalm7-loop.mp4",  audioSrc: "/assets/chapters/psalm7.mp3", subtitles: chapterSubtitles.psalm7  },
  { id: 16, title: "Psalm 16", backgroundImage: "/assets/chapters/psalm16.jpg", posterVideoSrc: "/assets/chapters/psalm16-loop.mp4", audioSrc: "/assets/chapters/psalm16.mp3", subtitles: chapterSubtitles.psalm16 },
  { id: 20, title: "Psalm 20", backgroundImage: "/assets/chapters/psalm20.jpg", posterVideoSrc: "/assets/chapters/psalm20-loop.mp4", audioSrc: "/assets/chapters/psalm20.mp3", subtitles: chapterSubtitles.psalm20 },
  { id: 25, title: "Psalm 25", backgroundImage: "/assets/chapters/psalm25.jpg", posterVideoSrc: "/assets/chapters/psalm25-loop.mp4", audioSrc: "/assets/chapters/psalm25.mp3", subtitles: chapterSubtitles.psalm25 },
  { id: 3,  title: "Psalm 3",  backgroundImage: "/assets/chapters/psalm3.jpg",  posterVideoSrc: "/assets/chapters/psalm3-loop.mp4",  audioSrc: "/assets/chapters/psalm3.mp3", subtitles: chapterSubtitles.psalm3  },
  { id: 45, title: "Psalm 45", backgroundImage: "/assets/chapters/psalm45.jpg", posterVideoSrc: "/assets/chapters/psalm45-loop.mp4", audioSrc: "/assets/chapters/psalm45.mp3", subtitles: chapterSubtitles.psalm45 },
  { id: 44, title: "Psalm 44", backgroundImage: "/assets/chapters/psalm44.jpg", posterVideoSrc: "/assets/chapters/psalm44-loop.mp4", audioSrc: "/assets/chapters/psalm44.mp3", subtitles: chapterSubtitles.psalm44 },
  { id: 51, title: "Psalm 51", backgroundImage: "/assets/chapters/psalm51.jpg", posterVideoSrc: "/assets/chapters/psalm51-loop.mp4", audioSrc: "/assets/chapters/psalm51.mp3", subtitles: chapterSubtitles.psalm51 },
  { id: 4,  title: "Psalm 4",  backgroundImage: "/assets/chapters/psalm4.jpg",  posterVideoSrc: "/assets/chapters/psalm4-loop.mp4",  audioSrc: "/assets/chapters/psalm4.mp3", subtitles: chapterSubtitles.psalm4  },
];

export default function Feed() {
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
    <div className="relative w-full md:max-w-[375px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden">
      {/* Scrollable Feed Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide pb-[20px]"
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
              onAutoplayBlocked={armUnlock}
            />
          </div>
        ))}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav activeTab="home" />

    </div>
    </>
  );
}
