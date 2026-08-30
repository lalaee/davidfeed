"use client";

import { useRef, useEffect, useLayoutEffect, useMemo, useState, useCallback, useSyncExternalStore } from "react";
import FeedItem from "./FeedItem";
import BottomNav from "./BottomNav";
import SoundBadge from "./SoundBadge";
import FeedHeader from "./FeedHeader";
import { chapterPosts, type Post } from "@/data/posts";
import { DEFAULT_TOPIC, postsForTopic } from "@/data/topics";

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

/** Remembers only an explicit choice, so a deliberate mute survives a reload. */
const SOUND_PREF = "davidfeed:sound";

/** The verdict never changes after load, so there is nothing to subscribe to. */
const subscribeNever = () => () => {};

/**
 * Whether this browser will let the feed open with sound. Must return a stable
 * primitive — useSyncExternalStore re-reads it on every render.
 */
function readAudioVerdict(): "allowed" | "blocked" | "chosen-silent" {
  try {
    if (localStorage.getItem(SOUND_PREF) === "off") return "chosen-silent";
  } catch {}
  const getPolicy = (
    navigator as Navigator & { getAutoplayPolicy?: (t: string) => string }
  ).getAutoplayPolicy;
  // No policy API (Safari, older Chrome): stay optimistic and let the rejected
  // play() below report back, which is the behaviour that shipped before.
  if (!getPolicy) return "allowed";
  return getPolicy.call(navigator, "mediaelement") === "allowed" ? "allowed" : "blocked";
}


interface FeedProps {
  /**
   * Which cards to render. Defaults to the full chapter readings, which nothing
   * currently passes — Home renders the shorts instead. The chapter list is
   * kept as the default so the long-form feed can be brought back by passing
   * chapterPosts, without reassembling it.
   */
  posts?: Post[];
  /** Which bottom-nav tab this feed sits under. */
  activeTab?: "home";
}

export default function Feed({ posts: allPosts = chapterPosts, activeTab = "home" }: FeedProps) {
  const [topicId, setTopicId] = useState(DEFAULT_TOPIC);
  const posts = useMemo(() => postsForTopic(allPosts, topicId), [allPosts, topicId]);

  const [activeIndexRaw, setActiveIndex] = useState(0);
  // Derived, not synced: a shorter topic can leave the stored index past the
  // end, and clamping in an effect would be a cascading render.
  const activeIndex = Math.min(activeIndexRaw, posts.length - 1);
  // Sound is a feed-wide preference, not per-card: every card scrolled to
  // inherits it. It starts ON so the feed opens with narration where the
  // browser permits it — Chrome grants autoplay-with-sound on sites the viewer
  // has engaged with before. Where it is refused, FeedItem falls back to muted
  // and reports back through onAutoplayBlocked, and the first interaction of
  // any kind turns it on for the rest of the session.
  // Sound is DERIVED, not synced. The obvious shape — read the autoplay policy
  // in a mount effect and setState — is a cascading render, and the browser
  // value is knowable before first paint anyway. useSyncExternalStore is the
  // hook meant for this: it takes a server snapshot and a client snapshot and
  // reconciles them without a hydration mismatch.
  //
  // It is also what makes Chrome's self-healing observable. Its Media
  // Engagement Index accrues across visits that play sound for 7s+, and once
  // it clears the threshold getAutoplayPolicy returns "allowed" — so a
  // returning viewer lands with audio and never sees the badge, with nothing
  // to configure and no code change.
  const audioVerdict = useSyncExternalStore(
    subscribeNever,
    readAudioVerdict,
    () => "allowed" as const,      // server: assume the best, reconcile on the client
  );

  // null until the viewer expresses a preference; their choice always wins.
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  // A play() that was actually rejected, for browsers with no policy API.
  const [refused, setRefused] = useState(false);

  const soundOn = userChoice ?? (audioVerdict === "allowed" && !refused);
  // Only a REFUSAL earns an explanation. Someone who chose silence is left alone.
  const soundBlocked =
    userChoice === null && (audioVerdict === "blocked" || refused);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const remember = (on: boolean) => {
    try { localStorage.setItem(SOUND_PREF, on ? "on" : "off"); } catch {}
  };
  const toggleSound = useCallback(() => {
    setUserChoice((prev) => {
      const next = !(prev ?? true);
      remember(next);
      return next;
    });
  }, []);
  const enableSound = useCallback(() => {
    setUserChoice(true);
    remember(true);
  }, []);

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
    setRefused(true);
    if (armedRef.current) return;
    armedRef.current = true;
    const unlock = () => {
      armedRef.current = false;
      setUserChoice(true);
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

  // The bed is audio, so a hidden tab usually leaves it alone — but a
  // backgrounded mobile browser does stop it, and nothing else would restart it.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const bed = bedRef.current;
      if (soundOn && bed?.paused) bed.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [soundOn]);


  // Intersection Observer to detect active post.
  // A card is shorter than the scroll viewport, so more than one can clear 50%
  // at the same time. Tracking every ratio and taking the single most-visible
  // card makes the winner deterministic, instead of depending on the order
  // entries happen to arrive in within a batch.
  // Keyed on `posts` so a topic switch rebuilds it. With [] it was created once
  // on mount and went on observing the ORIGINAL elements, which a topic change
  // detaches — the new cards were never observed at all. Worse, `ratios` kept
  // the pre-switch winner, so after switching from a 5-card topic while card 3
  // was active, `best` stayed 3, which is out of range in a 3-card topic and
  // left NO card marked active. Rebuilding gives a fresh map and fresh
  // observations together.
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
  }, [posts]);

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

  // Changing topic swaps the whole list under the scroller. Without this the
  // scroller keeps its old offset — landing mid-list, or past the end of a
  // shorter topic — and the card that was playing keeps playing, because its
  // element is simply reused by the next post at that index.
  const chooseTopic = useCallback((next: string) => {
    if (next === topicId) return;
    itemRefs.current.forEach((wrapper) =>
      wrapper?.querySelectorAll<HTMLMediaElement>("audio, video").forEach((el) => {
        if (!el.paused) el.pause();
        el.muted = true;
      }),
    );
    itemRefs.current = [];
    setActiveIndex(0);
    setTopicId(next);
  }, [topicId]);

  // The scroll reset has to happen AFTER the new list is in the DOM, which is
  // why it is a layout effect rather than a line in chooseTopic.
  //
  // Cards are keyed by psalm id, so switching from a topic to one that also
  // contains that psalm makes React MOVE the existing node rather than replace
  // it — and the browser's scroll anchoring faithfully follows it to its new
  // position. Going from Renewal to All psalms landed on Psalm 51 at index 11,
  // scrollTop 7546, still playing. Resetting before the render was undone by
  // the anchoring; overflow-anchor:none on the scroller stops it happening at
  // all.
  useLayoutEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [topicId]);

  // How far either side of the active card keeps its media attached.
  //
  // Asymmetric because scrolling forward is the norm: reading ahead is worth
  // paying for, reading back is not. Mux use 5 ahead / 1 behind for HLS; our
  // clips are 200-500KB so 3 ahead is cheap and keeps the attached set at 5
  // cards instead of all 13.
  const AHEAD = 3;
  const BEHIND = 1;

  // Warm the cards ahead. Images were already being preloaded; the narration
  // was not, and that was the real reason a card could sit silent for seconds
  // after you swiped to it. Every <audio> ships as preload="metadata", so the
  // browser knows the duration but has fetched none of the audio — play() then
  // has to wait on the network before a word is heard.
  //
  // Upgrading an upcoming card to preload="auto" starts that fetch while the
  // reader is still on the previous card, so the next play() has data in hand.
  //
  // Only ever done to INACTIVE elements: changing preload on the playing
  // element interrupts it (that stalled playback ~0.2s in when tried before).
  // The window is 1 for audio against 2 for images because chapter narrations
  // run to 2.5MB and there is no point paying for cards the reader may never
  // reach.
  useEffect(() => {
    const IMAGE_WINDOW = 2;
    const AUDIO_WINDOW = 1;   // which upcoming card gets upgraded to preload="auto"

    for (let i = activeIndex + 1; i <= Math.min(activeIndex + IMAGE_WINDOW, posts.length - 1); i++) {
      const img = new window.Image();
      img.src = posts[i].backgroundImage;
    }

    for (let i = activeIndex + 1; i <= Math.min(activeIndex + AUDIO_WINDOW, posts.length - 1); i++) {
      itemRefs.current[i]?.querySelectorAll<HTMLAudioElement>("audio").forEach((el) => {
        if (el.preload === "auto") return;
        el.preload = "auto";
        // preload alone is a hint; load() is what reliably starts the fetch on
        // an element that has already settled at metadata.
        if (el.readyState < 2) el.load();
      });
    }
  }, [activeIndex, posts]);

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
        className="flex-1 overflow-y-scroll snap-y snap-mandatory overscroll-y-contain scrollbar-hide pb-[20px] [overflow-anchor:none]"
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
              startAt={post.startAt}
              eagerAudio={index === 0}
              restartToken={topicId}
              inWindow={index >= activeIndex - BEHIND && index <= activeIndex + AHEAD}
              onAutoplayBlocked={armUnlock}
            />
          </div>
        ))}
      </div>

      <FeedHeader topicId={topicId} onSelect={chooseTopic} />

      <SoundBadge visible={soundBlocked} onEnable={enableSound} />

      {/* Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} />

    </div>
    </>
  );
}
