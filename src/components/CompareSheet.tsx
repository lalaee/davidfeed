"use client";

const versions = [
  {
    label: "NIV",
    text: "God is our refuge and strength, a very present help in trouble.",
  },
  {
    label: "NLT",
    text: "God is our refuge and strength, always ready to help in times of trouble.",
  },
  {
    label: "KJV",
    text: "God is our refuge and strength, a very present help in trouble.",
  },
];

interface CompareSheetProps {
  verseRef: string;
  onClose: () => void;
}

export default function CompareSheet({ verseRef, onClose }: CompareSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[20px] z-[110] animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[390px] z-[111] animate-slide-up">
        <div className="sheet-surface bg-black rounded-t-[16px] flex flex-col gap-[32px] items-start pt-[24px] pb-[48px] px-[16px] overflow-y-auto max-h-[90dvh] scrollbar-hide">

          {/* Header row — X button + reference */}
          <div className="flex gap-[10px] items-center w-full shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#1c1c1e] border border-black rounded-full w-[48px] h-[48px] flex-shrink-0 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <p className="text-white text-[20px] font-semibold leading-[1.5] tracking-[-0.26px] flex-1 min-w-0">
              {verseRef}
            </p>
          </div>

          {/* Version cards */}
          {versions.map((v) => (
            <div key={v.label} className="bg-[#1c1c1e] rounded-[24px] p-[16px] w-full flex flex-col gap-[11.771px] shrink-0">
              <p className="text-white text-[15px] font-normal leading-normal">{v.label}</p>
              <p className="text-white text-[22px] font-normal leading-[1.5] tracking-[-0.26px]">{v.text}</p>
            </div>
          ))}

        </div>
      </div>
    </>
  );
}
