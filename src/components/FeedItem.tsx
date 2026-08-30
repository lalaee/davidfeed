"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import HeartAnimation from "./HeartAnimation";
import VideoSubtitles from "./VideoSubtitles";
import PlaybackOverlay from "./PlaybackOverlay";
import IconButton from "./IconButton";
import { BookmarkIcon, SendIcon } from "./icons";
import { Subtitle } from "@/data/psalm23-subtitles";

/** A/B-testable cover-art life effects — each feed card can carry one. */
export type CoverEffect = "kenburns" | "breathe" | "grain" | "parallax";

interface FeedItemProps {
  title: string;
  backgroundImage: string;
  videoSrc?: string;
  posterVideoSrc?: string;
  audioSrc?: string;
  isActive?: boolean;
  subtitles?: Subtitle[];
  /** Feed-wide sound preference — shared by every card so it survives scrolling. */
  soundOn?: boolean;
  onToggleSound?: () => void;
  /**
   * Called when the browser refuses to start audio with sound. Autoplay with
   * sound needs a prior user gesture, so the feed optimistically tries it and
   * falls back to muted; this tells the Feed to flip its preference and wait
   * for the first interaction.
   */
  onAutoplayBlocked?: () => void;
  /** Optional life effect applied to the static cover art. */
  effect?: CoverEffect;
  /**
   * Seconds of dead air at the head of the narration. The card starts here
   * instead of 0 and loops back here, so the reader is audible the moment the
   * artwork lands rather than after a beat of silence.
   */
  startAt?: number;
  /**
   * Fetch the narration up front rather than on demand. Set on the landing
   * card, whose audio has no earlier card to have warmed it.
   */
  eagerAudio?: boolean;
  /**
   * Whether this card is near enough to the active one to hold its media.
   * Outside the window the sources are detached, which is the only way to
   * hand the memory back.
   */
  inWindow?: boolean;
  /**
   * Changes whenever the feed's list is swapped out. Cards are keyed by psalm
   * id, so a card present in both the old and new topic is MOVED rather than
   * remounted, and isActive never changes — meaning the activation effect
   * would not re-run and the card would sit muted after the switch. Including
   * this in its deps forces a fresh evaluation.
   */
  restartToken?: string | number;
}

interface HeartPosition {
  id: number;
  x: number;
  y: number;
}

export default function FeedItem({
  title,
  backgroundImage,
  videoSrc,
  posterVideoSrc,
  audioSrc,
  isActive = false,
  subtitles,
  soundOn = false,
  onToggleSound,
  effect,
  onAutoplayBlocked,
  startAt,
  eagerAudio,
  restartToken,
  inWindow = true,
}: FeedItemProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);
  const [hearts, setHearts] = useState<HeartPosition[]>([]);
  const [muteHint, setMuteHint] = useState(false);
  // A deliberate pause by the viewer, distinct from every other reason media
  // stops. Everything that restarts playback has to respect it.
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);

  // A pause belongs to the visit, not to the card: scrolling away and back
  // should play. Clearing it in the activation effect is a cascading render,
  // so this uses React's documented "adjust state when a prop changes"
  // pattern, which runs during render instead.
  const [wasActive, setWasActive] = useState(isActive);
  if (wasActive !== isActive) {
    setWasActive(isActive);
    // The ref is synced by the effect below, which is declared before the
    // activation effect and so lands first.
    if (userPaused) setUserPaused(false);
  }
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const heartIdRef = useRef(0);
  const lastTapRef = useRef(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muteHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Held so a repeat tap can cancel the previous one. Without this the earlier
  // tap's timer survives and clears the class partway through the NEW
  // animation. Measured: tapping share ~1100ms after the last tap killed the
  // fresh animation 84ms in — before its launch at 288ms — so nothing moved,
  // while a tap at 300ms was cut at 884ms, after the flight, and looked fine.
  // That gap-dependence is why it read as random.
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartFrameRef = useRef<number | null>(null);
  const shareFrameRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaBoxRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // The element carrying the narration/sound and driving subtitle timing:
  // a dedicated audio track when provided, otherwise the underlying video.
  const soundRef = audioSrc ? audioRef : videoRef;

  // Live view of isActive for async callbacks. The play() guard must ask "is
  // this card still the active one?" rather than "did the effect re-run?" —
  // toggling sound re-runs the effect while the card is still active, and a
  // re-run-based guard paused the audio it had just started.
  const isActiveRef = useRef(isActive);
  // Attach media only inside the window; detach outside it.
  //
  // The feed used to mount every card's <video> and <audio> with a live src —
  // 28 elements over ~28MB — and browsers keep buffers alive per element, not
  // per visible pixel. Clearing the attribute alone is not enough: load() is
  // what actually tears the buffer down.
  //
  // Declared above the activation effect on purpose. Effects run in order, so
  // a card entering the window gets its source before start() tries to play.
  useEffect(() => {
    const pairs: [React.RefObject<HTMLMediaElement | null>, string | undefined][] = [
      [videoRef, videoSrc],
      [posterVideoRef, posterVideoSrc],
      [audioRef, audioSrc],
    ];
    for (const [ref, src] of pairs) {
      const el = ref.current;
      if (!el) continue;
      if (inWindow && src) {
        if (el.getAttribute("src") !== src) {
          el.setAttribute("src", src);
          el.load();
        }
      } else if (el.getAttribute("src")) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
    }
  }, [inWindow, videoSrc, posterVideoSrc, audioSrc]);

  useEffect(() => {
    userPausedRef.current = userPaused;
  }, [userPaused]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Play/pause media based on active state. Only the focused card may make sound.
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const start = (el: HTMLMediaElement | null) => {
      if (!el) return;
      // Detached by the windowing effect — nothing to play yet.
      if (!el.getAttribute("src")) return;
      // The viewer stopped this card on purpose; leave it stopped.
      if (userPausedRef.current) return;
      // Re-invoking play() on an element that is already playing interrupts it
      // and rejects the in-flight promise, which is the AbortError storm a fast
      // scroll produces. AMP guards its PlayTask the same way.
      if (!el.paused) return;
      // A card scrolled to from far away carries preload="metadata", so it has
      // no media data yet and play() would be refused. Kick the fetch first.
      if (el.readyState === 0) el.load();
      // Skip the track's leading silence. currentTime is ignored before
      // metadata arrives, so defer the seek until the duration is known.
      if (startAt && el === audioRef.current) {
        const seek = () => {
          if (el.currentTime < startAt) el.currentTime = startAt;
        };
        if (el.readyState >= 1) seek();
        else {
          el.addEventListener("loadedmetadata", seek, { once: true });
          cleanups.push(() => el.removeEventListener("loadedmetadata", seek));
        }
      }
      el.play()
        .then(() => {
          if (!isActiveRef.current) el.pause();
        })
        .catch(() => {
          if (!isActiveRef.current) return;
          // Autoplay with sound is refused until the page has a user gesture.
          // Fall back to muted so the card still animates and captions still
          // run, and tell the Feed so it can wait for the first interaction.
          if (!el.muted) {
            el.muted = true;
            el.play().catch(() => {});
            onAutoplayBlocked?.();
            return;
          }
          // Already muted, so the refusal was "no data yet" — these cards carry
          // preload="metadata" until they are scrolled near, so the first play()
          // can land before any bytes arrive. Retry once the element is ready,
          // otherwise the card sits on its still image forever.
          const retry = () => {
            if (isActiveRef.current) el.play().catch(() => {});
          };
          el.addEventListener("canplay", retry, { once: true });
          cleanups.push(() => el.removeEventListener("canplay", retry));
        });
    };

    const stop = (el: HTMLMediaElement | null) => {
      if (!el) return;
      el.pause();
      // Park at the first word, not at 0, so re-entry is instant too.
      el.currentTime = startAt && el === audioRef.current ? startAt : 0;
    };

    if (isActive) {
      const sound = soundRef.current;
      // Only the narration track is allowed to make sound; the visuals stay
      // silent (feed-video.mp4 carries its own baked-in reading).
      if (videoRef.current && videoRef.current !== sound) videoRef.current.muted = true;
      if (posterVideoRef.current) posterVideoRef.current.muted = true;
      if (sound) sound.muted = !soundOn;

      start(videoRef.current);
      start(posterVideoRef.current);
      start(audioRef.current);
    } else {
      stop(videoRef.current);
      stop(posterVideoRef.current);
      stop(audioRef.current);
      // Silence on the way out; the preference is re-applied on re-entry.
      if (videoRef.current) videoRef.current.muted = true;
      if (audioRef.current) audioRef.current.muted = true;
      // Cancel any pending single-tap sound toggle when leaving this card
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [isActive, soundOn, soundRef, onAutoplayBlocked, startAt, restartToken, inWindow]);

  // The <audio> carries `loop`, which restarts at 0 and would replay the dead
  // air every cycle. Catch that and jump back to the first word instead.
  useEffect(() => {
    if (!startAt) return;
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.currentTime < startAt - 0.25) el.currentTime = startAt;
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [startAt]);

  // Chrome suspends VIDEO in a backgrounded tab while letting audio carry on,
  // and it does not resume the video when the tab comes back. The card then
  // sits on a frozen frame with the narration still running — which is exactly
  // what "switch apps, come back, the artwork is dead" looks like.
  //
  // The activation effect cannot cover this: isActive never changed, so it
  // never re-runs. Restart whatever the browser stopped, on the way back in.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !isActiveRef.current) return;
      if (userPausedRef.current) return;
      [videoRef.current, posterVideoRef.current, audioRef.current].forEach((el) => {
        if (el?.paused) el.play().catch(() => {});
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Track playing state (of the sound-bearing element) for subtitles
  useEffect(() => {
    const el = soundRef.current;
    if (!el) return;

    const handlePlay = () => setIsVideoPlaying(true);
    const handlePause = () => setIsVideoPlaying(false);
    const handleEnded = () => setIsVideoPlaying(false);

    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handleEnded);

    return () => {
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handleEnded);
    };
  }, [soundRef]);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (muteHintTimeoutRef.current) clearTimeout(muteHintTimeoutRef.current);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (restartFrameRef.current) cancelAnimationFrame(restartFrameRef.current);
      if (shareFrameRef.current) cancelAnimationFrame(shareFrameRef.current);
    };
  }, []);

  // "breathe" effect — the cover glows/swells with the narration's amplitude.
  // A Web Audio analyser taps the narration element and a rAF loop feeds the
  // smoothed RMS into the --breathe CSS var (0..1) on the media box.
  useEffect(() => {
    if (effect !== "breathe" || !audioSrc || !isActive) return;
    const el = audioRef.current;
    const box = mediaBoxRef.current;
    if (!el || !box) return;

    if (!audioCtxRef.current) {
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const source = ctx.createMediaElementSource(el);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch {
        return;
      }
    }
    // Re-run on soundOn changes so the resume lands inside the unmute gesture.
    audioCtxRef.current.resume().catch(() => {});

    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let level = 0;
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const d = (data[i] - 128) / 128;
        sum += d * d;
      }
      const target = Math.min(1, Math.sqrt(sum / data.length) * 4);
      // Fast attack, slow decay — swells with speech, eases out in silences.
      level += (target - level) * (target > level ? 0.3 : 0.06);
      box.style.setProperty("--breathe", level.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      box.style.setProperty("--breathe", "0");
    };
  }, [effect, audioSrc, isActive, soundOn]);

  // Tear the audio graph down with the card.
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // "parallax" effect — the oversized cover slides against its frame as the
  // card traverses the viewport (cheap stand-in for depth-map 2.5D).
  useEffect(() => {
    if (effect !== "parallax") return;
    const box = mediaBoxRef.current;
    if (!box) return;
    const scroller = box.closest(".overflow-y-scroll");
    if (!scroller) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = box.getBoundingClientRect();
      const vh = window.innerHeight;
      // -1..1 as the card's centre crosses the viewport's centre
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
      box.style.setProperty("--py", `${(p * 44).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [effect]);

  const handleDoubleTap = useCallback(
    (x: number, y: number) => {
      const newHeart: HeartPosition = {
        id: heartIdRef.current++,
        x,
        y,
      };
      setHearts((prev) => [...prev, newHeart]);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    },
    []
  );

  // Flip the feed-wide sound preference. The effect above applies it to this
  // card, and every card scrolled to afterwards inherits it.
  const toggleMute = useCallback(() => {
    onToggleSound?.();

    // Brief on-screen feedback (video keeps playing silently, so muting is otherwise invisible)
    setMuteHint(true);
    if (muteHintTimeoutRef.current) clearTimeout(muteHintTimeoutRef.current);
    muteHintTimeoutRef.current = setTimeout(() => setMuteHint(false), 600);

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [onToggleSound]);

  // Pause/resume this card. Reels toggles playback on tap; sound gets its own
  // control inside the overlay.
  const togglePlayback = useCallback(() => {
    const next = !userPausedRef.current;
    userPausedRef.current = next;
    setUserPaused(next);
    [videoRef.current, posterVideoRef.current, audioRef.current].forEach((el) => {
      if (!el?.getAttribute("src")) return;
      if (next) el.pause();
      else el.play().catch(() => {});
    });
    if (navigator.vibrate) navigator.vibrate(8);
  }, []);

  const handleBackgroundTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const now = Date.now();
      const x = e.clientX;
      const y = e.clientY;

      const isNearLastTap =
        lastPosRef.current &&
        Math.abs(x - lastPosRef.current.x) < 50 &&
        Math.abs(y - lastPosRef.current.y) < 50;

      if (now - lastTapRef.current < 300 && isNearLastTap) {
        // Second tap: this was a double tap all along. Undo the pause the
        // first tap applied, then like.
        togglePlayback();
        handleDoubleTap(x, y);
        lastTapRef.current = 0;
        lastPosRef.current = null;
        return;
      }

      // Act on the FIRST tap rather than waiting out the double-tap window.
      // Deferring 300ms to disambiguate made pausing feel broken; undoing it
      // on a second tap costs nothing, because either way the pause is
      // instant. Apple's rule: respond on the gesture, not after it.
      lastTapRef.current = now;
      lastPosRef.current = { x, y };
      togglePlayback();

      // Show the pair, then let it fade if the card is still playing.
      setMuteHint(true);
      if (muteHintTimeoutRef.current) clearTimeout(muteHintTimeoutRef.current);
      muteHintTimeoutRef.current = setTimeout(() => setMuteHint(false), 900);
    },
    [handleDoubleTap, togglePlayback]
  );

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    setIsSaved((prev) => !prev);
    // Drop the class for a frame first. Setting it true when it is already
    // true is not a state change, so React does not re-render and the CSS
    // animation never replays — the second tap would do nothing.
    setSaveAnimating(false);
    if (restartFrameRef.current) cancelAnimationFrame(restartFrameRef.current);
    restartFrameRef.current = requestAnimationFrame(() => setSaveAnimating(true));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // Must outlast the 1.13s pop, or the spring is truncated.
    saveTimerRef.current = setTimeout(() => setSaveAnimating(false), 1250);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleShare = useCallback(() => {
    // Restart cleanly if it is tapped again mid-flight; re-applying the same
    // class without clearing it first would not replay the animation.
    setShareAnimating(false);
    if (shareFrameRef.current) cancelAnimationFrame(shareFrameRef.current);
    shareFrameRef.current = requestAnimationFrame(() => setShareAnimating(true));
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    // Must outlast the 1.15s send animation; clearing the class early
    // would cut the spring off mid-bounce.
    shareTimerRef.current = setTimeout(() => setShareAnimating(false), 1250);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Check out ${title} on DavidFeed`,
        url: window.location.href,
      });
    }
  }, [title]);

  return (
    <div className="relative w-full h-[calc(100dvh-138px)] min-h-[calc(100svh-138px)] snap-start snap-always flex-shrink-0 mb-[12px]">
      {/* Tappable Background Area for Double-Tap */}
      <div
        className={`absolute inset-0 z-[1] overflow-hidden ${isActive ? "rounded-b-[32px]" : "rounded-[32px]"}`}
        onClick={handleBackgroundTap}
      >
        {/* Feed Background Video/Image */}
        <div ref={mediaBoxRef} className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Video plays underneath for audio */}
          {videoSrc && (
            <video
              ref={videoRef}
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Background image as fallback */}
          <img
            src={backgroundImage}
            alt={title}
            data-active={isActive || undefined}
            className={`absolute inset-0 w-full h-full object-cover ${
              effect === "kenburns"
                ? "fx-kenburns"
                : effect === "breathe"
                  ? "fx-breathe"
                  : effect === "parallax"
                    ? "fx-parallax"
                    : ""
            }`}
          />
          {/* Visual video displays on top when available */}
          {posterVideoSrc && (
            <video
              ref={posterVideoRef}
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Cover-art life overlays */}
          {effect === "breathe" && <div className="fx-breathe-glow" aria-hidden />}
          {effect === "grain" && (
            <>
              <div className="fx-grain" aria-hidden />
              <div className="fx-lightsweep" aria-hidden />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
        </div>
      </div>

      {/* Narration audio track (drives sound + subtitle timing when present) */}
      {audioSrc && (
        <audio ref={audioRef} loop muted preload={eagerAudio ? "auto" : "metadata"} />
      )}

      <PlaybackOverlay
        paused={userPaused}
        soundOn={soundOn}
        hinting={muteHint}
        onToggleSound={toggleMute}
      />

      {/* Heart animations from double tap */}
      {hearts.map((heart) => (
        <HeartAnimation
          key={heart.id}
          x={heart.x}
          y={heart.y}
          onComplete={() => removeHeart(heart.id)}
        />
      ))}

      {/* Video Subtitles */}
      {subtitles && subtitles.length > 0 && (
        <VideoSubtitles
          videoRef={soundRef}
          subtitles={subtitles}
          isPlaying={isVideoPlaying}
        />
      )}

      {/* Action Icons */}
      <div className="absolute right-[20px] bottom-[24px] flex flex-col gap-[32px] z-[100]">
        <IconButton
          onClick={handleShare}
          label="Share"
          animating={shareAnimating}
          animationClass="animate-send"
        >
          <SendIcon size={40} className="pointer-events-none block" />
        </IconButton>

        <IconButton
          onClick={handleSave}
          label={isSaved ? "Remove bookmark" : "Bookmark"}
          animating={saveAnimating}
          animationClass="animate-icon-pop"
        >
          {/* #EAC72C is the saved colour from the Figma export; unsaved
              inherits white through currentColor. */}
          <span className={isSaved ? "text-[#EAC72C]" : "text-white"}>
            <BookmarkIcon filled={isSaved} className="pointer-events-none block" />
          </span>
        </IconButton>
      </div>

      {/* Title */}
      <div className="absolute left-[20px] right-[80px] bottom-[24px] z-10 pointer-events-none">
        <h1 className="text-[24px] font-semibold text-white tracking-[-0.48px] drop-shadow-lg">
          {title}
        </h1>
      </div>
    </div>
  );
}
