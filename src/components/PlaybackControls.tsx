"use client";

import { useState } from "react";

interface PlaybackControlsProps {
  onPrevious?: () => void;
  onPlayPause?: () => void;
  onNext?: () => void;
  isPlaying?: boolean;
}

export default function PlaybackControls({
  onPrevious,
  onPlayPause,
  onNext,
  isPlaying = true,
}: PlaybackControlsProps) {
  const [playing, setPlaying] = useState(isPlaying);

  const handlePlayPause = () => {
    setPlaying(!playing);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onPlayPause?.();
  };

  const handlePrevious = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onPrevious?.();
  };

  const handleNext = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onNext?.();
  };

  return (
    <div className="flex items-center justify-center gap-[40px]">
      {/* Previous Button - Figma exported icon with background */}
      <button
        type="button"
        onClick={handlePrevious}
        className="active:scale-95 transition-transform"
      >
        <img
          src="/assets/prev-icon.svg"
          alt="Previous"
          width={50}
          height={50}
        />
      </button>

      {/* Play/Pause Button - Figma exported icon with background */}
      <button
        type="button"
        onClick={handlePlayPause}
        className="active:scale-95 transition-transform"
      >
        <img
          src={playing ? "/assets/pause-icon.svg" : "/assets/play-icon.svg"}
          alt={playing ? "Pause" : "Play"}
          width={86}
          height={86}
        />
      </button>

      {/* Next Button - Figma exported icon with background */}
      <button
        type="button"
        onClick={handleNext}
        className="active:scale-95 transition-transform"
      >
        <img
          src="/assets/next-icon.svg"
          alt="Next"
          width={50}
          height={50}
        />
      </button>
    </div>
  );
}
