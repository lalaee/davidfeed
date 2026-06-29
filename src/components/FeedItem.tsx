"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import HeartAnimation from "./HeartAnimation";
import VideoSubtitles from "./VideoSubtitles";
import { Subtitle } from "@/data/psalm23-subtitles";

interface FeedItemProps {
  title: string;
  backgroundImage: string;
  videoSrc?: string;
  posterVideoSrc?: string;
  isActive?: boolean;
  subtitles?: Subtitle[];
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
  isActive = false,
  subtitles,
}: FeedItemProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);
  const [hearts, setHearts] = useState<HeartPosition[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const heartIdRef = useRef(0);
  const lastTapRef = useRef(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterVideoRef = useRef<HTMLVideoElement>(null);

  // Play/pause videos based on active state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
    if (posterVideoRef.current) {
      if (isActive) {
        posterVideoRef.current.play().catch(() => {});
      } else {
        posterVideoRef.current.pause();
        posterVideoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  // Track video playing state for subtitles
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsVideoPlaying(true);
    const handlePause = () => setIsVideoPlaying(false);
    const handleEnded = () => setIsVideoPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

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

  const handleBackgroundTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Unmute video on first interaction
      if (!hasInteracted && videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(() => {});
        setHasInteracted(true);
      }

      const now = Date.now();
      const x = e.clientX;
      const y = e.clientY;

      const isNearLastTap =
        lastPosRef.current &&
        Math.abs(x - lastPosRef.current.x) < 50 &&
        Math.abs(y - lastPosRef.current.y) < 50;

      if (now - lastTapRef.current < 300 && isNearLastTap) {
        handleDoubleTap(x, y);
        lastTapRef.current = 0;
        lastPosRef.current = null;
      } else {
        lastTapRef.current = now;
        lastPosRef.current = { x, y };
      }
    },
    [handleDoubleTap, hasInteracted]
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
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Video plays underneath for audio */}
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Background image as fallback */}
          <img
            src={backgroundImage}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Visual video displays on top when available */}
          {posterVideoSrc && (
            <video
              ref={posterVideoRef}
              src={posterVideoSrc}
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
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
          videoRef={videoRef}
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
