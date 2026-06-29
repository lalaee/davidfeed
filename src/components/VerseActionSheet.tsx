"use client";

import { useState } from "react";
import CompareSheet from "./CompareSheet";

interface Verse {
  number: number;
  text: string;
}

interface VerseActionSheetProps {
  verse: Verse;
  chapterTitle: string;
  version: string;
  onClose: () => void;
}

export default function VerseActionSheet({ verse, chapterTitle, version, onClose }: VerseActionSheetProps) {
  const [showCompare, setShowCompare] = useState(false);
  const reference = `${chapterTitle.replace("Psalm", "Ps")} v ${verse.number} | ${version}`;
  const verseRef = `${chapterTitle.replace("Psalm", "Ps")} v ${verse.number}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        text: `"${verse.text}" — ${reference}`,
        url: window.location.href,
      });
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[20px] z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[390px] z-[101] animate-slide-up">
        <div className="sheet-surface bg-black rounded-t-[16px] flex flex-col gap-[32px] items-start pt-[24px] pb-[48px] px-[16px]">

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="bg-[#1c1c1e] border border-black rounded-full w-[48px] h-[48px] flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Verse card */}
          <div className="bg-[#1c1c1e] rounded-[24px] p-[16px] w-full flex flex-col gap-[11.771px]">
            <p className="text-white text-[15px] font-normal leading-normal">{reference}</p>
            <p className="text-white text-[22px] font-normal leading-[1.5] tracking-[-0.26px]">{verse.text}</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-[10px] w-full">
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="bg-[#101010] rounded-[100px] h-[63px] flex-1 flex items-center justify-center gap-[4px] px-[16px] py-[13px]"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.731 2.88013C5.59948 2.88013 4.56364 3.77485 4.56364 10.972C4.56364 19.0292 4.41292 21.1201 5.94508 21.1201C7.47628 21.1201 9.97704 17.5835 11.731 17.5835C13.4849 17.5835 15.9857 21.1201 17.5169 21.1201C19.049 21.1201 18.8983 19.0292 18.8983 10.972C18.8983 3.77485 17.8625 2.88013 11.731 2.88013Z"
                  stroke="#E2C02B"
                  strokeWidth="1.44"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[#e2c02b] text-[20px] font-medium tracking-[-0.43px] leading-[22px]">Compare</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="bg-[#101010] rounded-[100px] h-[63px] flex-1 flex items-center justify-center gap-[4px] px-[16px] py-[13px]"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12.9254 5.16194C9.40002 6.13258 5.73051 7.43609 4.13117 8.35926C3.74915 8.57979 3.66479 8.72692 3.64973 8.75931C3.65683 8.78418 3.68466 8.84389 3.78171 8.94683C3.9596 9.1355 4.273 9.35678 4.72455 9.59452C5.16645 9.82719 5.69813 10.0538 6.27488 10.2682C7.42811 10.6969 8.71275 11.0591 9.71723 11.3153C10.2177 11.4429 10.6449 11.5433 10.9464 11.6118C11.097 11.646 11.2162 11.6721 11.2972 11.6896L11.3894 11.7093L11.4123 11.7141L11.419 11.7156C11.7002 11.7737 11.9202 11.9935 11.9784 12.2748L11.9799 12.2817L11.9847 12.3046L12.0043 12.3968C12.0219 12.4778 12.048 12.5969 12.0822 12.7476C12.1506 13.0491 12.2511 13.4763 12.3786 13.9767C12.6349 14.9812 12.9971 16.2659 13.4257 17.4191C13.6402 17.9959 13.8667 18.5275 14.0994 18.9694C14.3372 19.421 14.5585 19.7343 14.7472 19.9122C14.8501 20.0093 14.9098 20.0371 14.9346 20.0442C14.9671 20.0292 15.1142 19.9448 15.3347 19.5628C16.2579 17.9634 17.5614 14.2939 18.5321 10.7686C19.0141 9.01788 19.4051 7.33491 19.6219 5.99931C19.7306 5.3299 19.7927 4.76506 19.804 4.33081C19.8087 4.15769 19.8048 4.01432 19.7948 3.89915C19.6796 3.88918 19.5363 3.88536 19.3631 3.88989C18.9289 3.90125 18.364 3.96333 17.6946 4.07203C16.3591 4.28892 14.6761 4.67991 12.9254 5.16194ZM14.9484 20.0461C14.9484 20.0461 14.9453 20.0468 14.9387 20.0453C14.9449 20.0447 14.9484 20.0461 14.9484 20.0461ZM10.6687 13.0253C10.6553 13.0223 10.6417 13.0192 10.6278 13.0161C10.3162 12.9454 9.87631 12.842 9.36131 12.7106C8.33485 12.4488 6.99481 12.0722 5.77308 11.6179C5.16235 11.3909 4.56898 11.14 4.05369 10.8687C3.54804 10.6024 3.07212 10.2933 2.73396 9.93467C2.39697 9.57723 2.09771 9.0558 2.246 8.43255C2.38358 7.85428 2.85616 7.43258 3.41126 7.11213C5.18359 6.0891 9.00982 4.74643 12.5431 3.7736C14.3217 3.2839 16.0588 2.87882 17.4639 2.65065C18.1648 2.53684 18.8004 2.46412 19.3255 2.45039C19.5881 2.44351 19.8372 2.45093 20.0608 2.47968C20.2757 2.50732 20.5136 2.56013 20.7245 2.67244C20.8508 2.73973 20.9542 2.84314 21.0215 2.96948C21.1338 3.18036 21.1866 3.41824 21.2143 3.6332C21.2431 3.85683 21.2505 4.10591 21.2436 4.36848C21.2298 4.89358 21.1572 5.52921 21.0433 6.23013C20.8151 7.63516 20.4101 9.37226 19.9204 11.1509C18.9475 14.6842 17.6049 18.5103 16.5818 20.2827C16.2615 20.8378 15.8397 21.3104 15.2614 21.4479C14.6382 21.5963 14.1167 21.297 13.7593 20.96C13.4007 20.6219 13.0914 20.1459 12.8252 19.6403C12.5539 19.125 12.3031 18.5317 12.0761 17.9209C11.6218 16.6992 11.2452 15.3591 10.9834 14.3327C10.852 13.8177 10.7486 13.3778 10.6779 13.0662C10.6747 13.0523 10.6717 13.0387 10.6687 13.0253ZM3.64794 8.74561C3.64794 8.74561 3.64924 8.74901 3.64868 8.75528C3.64714 8.74865 3.64794 8.74561 3.64794 8.74561Z"
                  fill="#E2852E"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M20.8956 2.79877C21.1768 3.07995 21.1768 3.53583 20.8956 3.817L11.7829 12.9297C11.5017 13.2109 11.0458 13.2109 10.7646 12.9297C10.4834 12.6485 10.4834 12.1926 10.7646 11.9114L19.8773 2.79877C20.1585 2.5176 20.6144 2.5176 20.8956 2.79877Z"
                  fill="#E2852E"
                />
              </svg>
              <span className="text-[#e2852e] text-[20px] font-medium tracking-[-0.43px] leading-[22px]">Share</span>
            </button>
          </div>

        </div>
      </div>

      {showCompare && (
        <CompareSheet
          verseRef={verseRef}
          onClose={() => setShowCompare(false)}
        />
      )}
    </>
  );
}
