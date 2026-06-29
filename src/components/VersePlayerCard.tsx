"use client";

import { useState } from "react";

interface VersePlayerCardProps {
  verseNumber: number;
  verseText: string;
  onSave?: () => void;
  onPersonalise?: () => void;
  onShare?: () => void;
  isSaved?: boolean;
}

export default function VersePlayerCard({
  verseNumber,
  verseText,
  onSave,
  onPersonalise,
  onShare,
  isSaved = false,
}: VersePlayerCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [saveAnimating, setSaveAnimating] = useState(false);

  const handleSave = () => {
    setSaved(!saved);
    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 300);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onSave?.();
  };

  return (
    <div className="relative w-full rounded-[27px] bg-[#1c1c1e] pt-[24px] pb-[15px] pl-[16px] pr-[16px] flex flex-col">
      {/* Verse Content with verse number */}
      <div className="flex flex-1">
        <span className="text-[15px] font-normal text-white leading-[20px] flex-shrink-0 pt-[4px] w-[17px]">
          {verseNumber}
        </span>
        <p className="text-[27px] font-medium text-white leading-[1.5] tracking-[-0.4px] ml-[16px] flex-1 min-w-0">
          {verseText}
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center mt-[15px] w-full">
        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-[50px] h-[50px] rounded-full bg-[#101010] flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
        >
          <img
            src={saved ? "/assets/save-filled-icon.svg" : "/assets/save-icon.svg"}
            alt="Save"
            width={24}
            height={24}
            className={`transition-transform ${saveAnimating ? "scale-125" : ""}`}
          />
        </button>

        {/* Personalise Button */}
        <button
          type="button"
          onClick={onPersonalise}
          className="w-[146px] h-[54px] px-[15px] rounded-[27px] bg-[#101010] flex items-center justify-center gap-[3px] active:scale-95 transition-transform mx-auto"
        >
          <img
            src="/assets/personalise-icon.svg"
            alt="Personalise"
            width={24}
            height={24}
          />
          <span className="text-[17px] font-medium text-[#8CE4FF] tracking-[-0.43px] leading-[22px]">
            Personalise
          </span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={onShare}
          className="w-[50px] h-[50px] rounded-full bg-[#101010] flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
        >
          <img
            src="/assets/share-icon.svg"
            alt="Share"
            width={24}
            height={24}
          />
        </button>
      </div>
    </div>
  );
}
