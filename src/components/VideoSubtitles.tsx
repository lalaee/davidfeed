"use client";

import { useState, useEffect, RefObject } from "react";
import { Subtitle } from "@/data/psalm23-subtitles";

interface VideoSubtitlesProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  subtitles: Subtitle[];
  isPlaying: boolean;
}

export default function VideoSubtitles({
  videoRef,
  subtitles,
  isPlaying,
}: VideoSubtitlesProps) {
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateSubtitle = () => {
      const currentTime = video.currentTime;
      const subtitle = subtitles.find(
        (sub) => currentTime >= sub.startTime && currentTime < sub.endTime
      );
      setCurrentSubtitle(subtitle || null);
    };

    // Update on timeupdate event
    video.addEventListener("timeupdate", updateSubtitle);

    // Also update immediately
    updateSubtitle();

    return () => {
      video.removeEventListener("timeupdate", updateSubtitle);
    };
  }, [videoRef, subtitles]);

  if (!currentSubtitle || !isPlaying) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[20]">
      <div className="px-[24px] max-w-[320px]">
        <p
          className="text-white text-center text-[24px] font-semibold leading-[1.3] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{
            textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          {currentSubtitle.text}
        </p>
      </div>
    </div>
  );
}
