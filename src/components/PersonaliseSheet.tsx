"use client";

import { useState } from "react";
import AudioMixerSheet from "./AudioMixerSheet";

interface PersonaliseSheetProps {
  verseRef: string;
  verseText: string;
  onClose: () => void;
}

export default function PersonaliseSheet({ verseRef, verseText, onClose }: PersonaliseSheetProps) {
  const [name, setName] = useState("");
  const [showAudioMixer, setShowAudioMixer] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[20px] z-[110] animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[390px] z-[111] animate-slide-up">
        <div className="sheet-surface bg-black rounded-t-[16px] flex flex-col gap-[32px] items-start pt-[24px] pb-[48px] px-[16px]">

          {/* Header row */}
          <div className="flex gap-[10px] items-center w-full">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#1c1c1e] rounded-full w-[48px] h-[48px] flex-shrink-0 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <p className="text-white text-[20px] font-semibold leading-[1.5] tracking-[-0.26px] flex-1 min-w-0">
              Personalise
            </p>
            <svg width="48" height="49" viewBox="0 0 48 49" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect y="0.33313" width="47.7811" height="47.7811" rx="23.8905" fill="#1C1C1E"/>
              <path d="M22.3598 18.0979H19.2969V30.3495H22.3598V18.0979Z" stroke="white" strokeWidth="1.83773" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M28.4855 18.0979H25.4227V30.3495H28.4855V18.0979Z" stroke="white" strokeWidth="1.83773" strokeLinecap="round" strokeLinejoin="round"/>
              <mask id="path-3-inside-1_2540_3143" fill="white">
                <path d="M48.0006 21.2644C47.0976 15.0737 43.8928 9.45139 39.0262 5.51995C34.1596 1.58851 27.9893 -0.362767 21.7471 0.0556909L21.9251 2.71167C27.4987 2.33803 33.0081 4.08031 37.3534 7.59063C41.6988 11.101 44.5603 16.1211 45.3666 21.6486L48.0006 21.2644Z"/>
              </mask>
              <path d="M48.0006 21.2644C47.0976 15.0737 43.8928 9.45139 39.0262 5.51995C34.1596 1.58851 27.9893 -0.362767 21.7471 0.0556909L21.9251 2.71167C27.4987 2.33803 33.0081 4.08031 37.3534 7.59063C41.6988 11.101 44.5603 16.1211 45.3666 21.6486L48.0006 21.2644Z" fill="#1C1C1E"/>
              <path d="M48.0006 21.2644L51.2853 43.7817L70.518 17.9797L48.0006 21.2644ZM21.7471 0.0556909L20.225 -22.649L-0.957638 1.57776L21.7471 0.0556909ZM21.9251 2.71167L-0.779587 4.23374L23.4472 25.4164L21.9251 2.71167ZM45.3666 21.6486L22.8492 24.9333L48.6513 44.166L45.3666 21.6486ZM48.0006 21.2644L70.518 17.9797C68.788 6.12043 62.6488 -4.65003 53.326 -12.1813L39.0262 5.51995L24.7264 23.2212C25.1369 23.5528 25.4071 24.027 25.4833 24.5491L48.0006 21.2644ZM39.0262 5.51995L53.326 -12.1813C44.0033 -19.7126 32.1829 -23.4506 20.225 -22.649L21.7471 0.0556909L23.2691 22.7604C23.7956 22.7251 24.316 22.8897 24.7264 23.2212L39.0262 5.51995ZM21.7471 0.0556909L-0.957638 1.57776L-0.779587 4.23374L21.9251 2.71167L44.6298 1.1896L44.4518 -1.46638L21.7471 0.0556909ZM21.9251 2.71167L23.4472 25.4164C23.305 25.4259 23.1645 25.3815 23.0536 25.2919L37.3534 7.59063L51.6533 -10.1107C42.8518 -17.2209 31.6924 -20.7498 20.4031 -19.993L21.9251 2.71167ZM37.3534 7.59063L23.0536 25.2919C22.9428 25.2024 22.8698 25.0743 22.8492 24.9333L45.3666 21.6486L67.8839 18.3639C66.2507 7.16777 60.4548 -3.00046 51.6533 -10.1107L37.3534 7.59063ZM45.3666 21.6486L48.6513 44.166L51.2853 43.7817L48.0006 21.2644L44.7159 -1.25296L42.0819 -0.868724L45.3666 21.6486Z" fill="white" mask="url(#path-3-inside-1_2540_3143)"/>
            </svg>
          </div>

          {/* Verse card */}
          <div className="bg-[#1c1c1e] rounded-[24px] p-[16px] w-full flex flex-col gap-[11.771px]">
            <p className="text-white text-[15px] font-normal leading-normal">{verseRef}</p>
            <p className="text-white text-[22px] font-normal leading-[1.5] tracking-[-0.26px]">{verseText}</p>
          </div>

          {/* Input section */}
          <div className="flex flex-col gap-[16px] w-full">
            <p className="text-[#cecece] text-[20px] font-normal leading-[1.5] tracking-[-0.26px]">
              Make this verse speak directly to you or someone
            </p>
            <div className="bg-[#242425] h-[63px] rounded-[136px] px-[18px] flex items-center w-full">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                className="bg-transparent text-[#cecece] text-[16px] font-normal leading-normal w-full outline-none placeholder:text-[#cecece]"
              />
            </div>
          </div>

          {/* Continue CTA */}
          <button
            type="button"
            onClick={() => setShowAudioMixer(true)}
            className="bg-[#8ce4ff] h-[63px] rounded-[100px] w-full flex items-center justify-center px-[16px]"
          >
            <span className="text-black text-[20px] font-medium tracking-[-0.43px] leading-[22px]">
              Continue
            </span>
          </button>

        </div>
      </div>

      {showAudioMixer && (
        <AudioMixerSheet
          verseRef={verseRef}
          verseText={verseText}
          name={name}
          onBack={() => setShowAudioMixer(false)}
          onClose={onClose}
        />
      )}
    </>
  );
}
