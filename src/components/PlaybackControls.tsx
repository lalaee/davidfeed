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
    <div className="flex items-end justify-center w-full px-[12.5px]">
      {/* Previous Button */}
      <button
        type="button"
        onClick={handlePrevious}
        className="active:scale-95 transition-transform flex-shrink-0"
      >
        <img
          src="/assets/prev-icon.svg"
          alt="Previous"
          width={50}
          height={50}
        />
      </button>

      {/* Play/Pause Button - sits 18px higher than prev/next */}
      <button
        type="button"
        onClick={handlePlayPause}
        className="active:scale-95 transition-transform mb-[-18px] mx-auto"
      >
        <img
          src={playing ? "/assets/pause-icon.svg" : "/assets/play-icon.svg"}
          alt={playing ? "Pause" : "Play"}
          width={85}
          height={85}
        />
      </button>

      {/* Next Button */}
      <button
        type="button"
        onClick={handleNext}
        className="active:scale-95 transition-transform flex-shrink-0"
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
