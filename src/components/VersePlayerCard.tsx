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
    <div className="relative w-[345px] min-h-[241px] rounded-[27px] bg-[#1c1c1e] p-[24px] flex flex-col">
      {/* Verse Content with verse number */}
      <div className="flex gap-[12px] flex-1 max-w-[296px]">
        <span className="text-[15px] font-normal text-white/80 leading-[150%] flex-shrink-0 pt-[4px]">
          {verseNumber}
        </span>
        <p className="text-[27px] font-medium text-white leading-[150%] tracking-[-0.4px]">
          {verseText}
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-[12px] mt-[24px] w-full">
        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-[50px] h-[50px] rounded-full bg-[#101010] flex items-center justify-center active:scale-95 transition-transform"
        >
          <img
            src={saved ? "/assets/save-filled-icon.svg" : "/assets/save-icon.svg"}
            alt="Save"
            width={20}
            height={20}
            className={`transition-transform ${saveAnimating ? "scale-125" : ""}`}
          />
        </button>

        {/* Personalise Button */}
        <button
          type="button"
          onClick={onPersonalise}
          className="flex-1 h-[54px] px-[20px] rounded-[27px] bg-[#101010] flex items-center justify-center gap-[10px] active:scale-95 transition-transform"
        >
          <img
            src="/assets/personalise-icon.svg"
            alt="Personalise"
            width={20}
            height={20}
          />
          <span className="text-[17px] font-medium text-[#8CE4FF] tracking-[-0.43px] leading-[22px]">
            Personalise
          </span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          onClick={onShare}
          className="w-[50px] h-[50px] rounded-full bg-[#101010] flex items-center justify-center active:scale-95 transition-transform"
        >
          <img
            src="/assets/share-icon.svg"
            alt="Share"
            width={20}
            height={20}
          />
        </button>
      </div>
    </div>
  );
}
