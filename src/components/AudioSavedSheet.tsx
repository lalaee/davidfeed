"use client";

interface AudioSavedSheetProps {
  verseRef: string;
  verseText: string;
  onClose: () => void;
}

export default function AudioSavedSheet({ verseRef, verseText, onClose }: AudioSavedSheetProps) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: `"${verseText}" — ${verseRef}`, url: window.location.href });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[20px] z-[130] animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[390px] z-[131] animate-slide-up">
        <div className="sheet-surface bg-black rounded-t-[16px] flex flex-col gap-[32px] items-center pt-[24px] pb-[48px] px-[16px]">

          {/* Header — X only */}
          <div className="flex items-center w-full">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#1c1c1e] rounded-full w-[48px] h-[48px] flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-[32px] items-center w-full">

            {/* Verse card */}
            <div className="bg-[#1c1c1e] rounded-[24px] p-[16px] w-full flex flex-col gap-[11.771px]">
              <p className="text-white text-[15px] font-normal leading-normal">{verseRef}</p>
              <p className="text-white text-[22px] font-normal leading-[1.5] tracking-[-0.26px]">{verseText}</p>
            </div>

            {/* Large pause/play button */}
            <div className="bg-[#1c1c1e] w-[78px] h-[78px] rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="3" width="4" height="14" rx="1" fill="white"/>
                <rect x="12" y="3" width="4" height="14" rx="1" fill="white"/>
              </svg>
            </div>

            {/* Save + Share buttons */}
            <div className="flex gap-[10px] w-full">
              <button
                type="button"
                className="flex-1 bg-[#101010] h-[63px] rounded-[100px] flex items-center justify-center gap-[4px] px-[16px]"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#e2c02b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 2v5h4M7 9h6M7 13h6" stroke="#e2c02b" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="text-[#e2c02b] text-[20px] font-medium tracking-[-0.43px] leading-[22px]">Save</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex-1 bg-[#101010] h-[63px] rounded-[100px] flex items-center justify-center gap-[4px] px-[16px]"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M18 10L10 2v5C5 7 2 10 2 18c2-4 5-6 8-6v5l8-7z" fill="#e2852e"/>
                </svg>
                <span className="text-[#e2852e] text-[20px] font-medium tracking-[-0.43px] leading-[22px]">Share</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
