"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import HeartAnimation from "./HeartAnimation";
import VideoSubtitles from "./VideoSubtitles";
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
  /** Optional life effect applied to the static cover art. */
  effect?: CoverEffect;
  /**
   * Whether this card is close enough to the viewport to be worth fetching.
   * With 13 cards, preloading every loop pulled ~27MB on first paint, which
   * stalls on mobile and exceeds what iOS will decode at once — the stills
   * showed instead of the video. Only the focused card and its neighbours
   * fetch eagerly; the rest take metadata only until scrolled near.
   */
  isNear?: boolean;
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
  isNear = true,
}: FeedItemProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);
  const [hearts, setHearts] = useState<HeartPosition[]>([]);
  const [muteHint, setMuteHint] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const heartIdRef = useRef(0);
  const lastTapRef = useRef(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muteHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaBoxRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // The element carrying the narration/sound and driving subtitle timing:
  // a dedicated audio track when provided, otherwise the underlying video.
  const soundRef = audioSrc ? audioRef : videoRef;

  // Play/pause media based on active state. Only the focused card may make sound.
  useEffect(() => {
    // Guards against a stale play() promise resolving after we've already left
    // this card — without it a fast scroll can leave the previous card audible.
    let left = false;

    const cleanups: Array<() => void> = [];

    const start = (el: HTMLMediaElement | null) => {
      if (!el) return;
      // A card scrolled to from far away carries preload="metadata", so it has
      // no media data yet and play() would be refused. Kick the fetch first.
      if (el.readyState === 0) el.load();
      el.play()
        .then(() => {
          if (left) el.pause();
        })
        .catch(() => {
          if (left) return;
          // Autoplay with sound is refused until the page has a user gesture.
          if (!el.muted) {
            el.muted = true;
            el.play().catch(() => {});
            return;
          }
          // Already muted, so the refusal was "no data yet" — these cards carry
          // preload="metadata" until they are scrolled near, so the first play()
          // can land before any bytes arrive. Retry once the element is ready,
          // otherwise the card sits on its still image forever.
          const retry = () => {
            if (!left) el.play().catch(() => {});
          };
          el.addEventListener("canplay", retry, { once: true });
          cleanups.push(() => el.removeEventListener("canplay", retry));
        });
    };

    const stop = (el: HTMLMediaElement | null) => {
      if (!el) return;
      el.pause();
      el.currentTime = 0;
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
      left = true;
      cleanups.forEach((fn) => fn());
    };
  }, [isActive, soundOn, soundRef]);

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

      if (!isLiked) {
        setIsLiked(true);
      }

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    },
    [isLiked]
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
        // Double tap → like. Cancel the pending single-tap mute toggle.
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
        handleDoubleTap(x, y);
        lastTapRef.current = 0;
        lastPosRef.current = null;
      } else {
        // Provisional single tap — wait to see if a second tap follows.
        lastTapRef.current = now;
        lastPosRef.current = { x, y };
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = setTimeout(() => {
          toggleMute();
          tapTimeoutRef.current = null;
        }, 300);
      }
    },
    [handleDoubleTap, toggleMute]
  );

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleLike = useCallback(() => {
    setIsLiked((prev) => !prev);
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleSave = useCallback(() => {
    setIsSaved((prev) => !prev);
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 300);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleShare = useCallback(() => {
    setShareAnimating(true);
    setTimeout(() => setShareAnimating(false), 300);
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
              src={videoSrc}
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
              src={posterVideoSrc}
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
        <audio ref={audioRef} src={audioSrc} loop muted preload="metadata" />
      )}

      {/* Mute/unmute indicator — briefly shown on tap */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none z-[30] transition-opacity duration-300 ${
          muteHint ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center justify-center w-[72px] h-[72px] rounded-full bg-black/45 backdrop-blur-sm">
          {!soundOn ? (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </div>
      </div>

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
        <button
          type="button"
          onClick={handleLike}
          className="w-[40px] h-[40px] flex items-center justify-center cursor-pointer bg-transparent border-none"
        >
          <img
            src={isLiked ? "/assets/heart-filled.svg" : "/assets/heart-icon.svg"}
            alt="Like"
            width={40}
            height={40}
            className={`pointer-events-none transition-transform ${likeAnimating ? "animate-icon-pop" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="w-[40px] h-[40px] flex items-center justify-center cursor-pointer bg-transparent border-none"
        >
          <img
            src="/assets/send-icon.svg"
            alt="Share"
            width={40}
            height={40}
            className={`pointer-events-none transition-transform ${shareAnimating ? "animate-icon-pop" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="w-[40px] h-[40px] flex items-center justify-center cursor-pointer bg-transparent border-none"
        >
          <img
            src={isSaved ? "/assets/bookmark-filled.svg" : "/assets/bookmark-icon.svg"}
            alt="Save"
            width={40}
            height={40}
            className={`pointer-events-none transition-transform ${saveAnimating ? "animate-icon-pop" : ""}`}
          />
        </button>
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
