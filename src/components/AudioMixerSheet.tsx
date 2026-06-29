"use client";

import { useState } from "react";
import AudioSavedSheet from "./AudioSavedSheet";

interface AudioMixerSheetProps {
  verseRef: string;
  verseText: string;
  name: string;
  onBack: () => void;
  onClose: () => void;
}

const VOICES = [
  { id: "male", label: "Male", src: "/assets/voice-male.png" },
  { id: "female", label: "Female", src: "/assets/voice-female.png" },
];

export default function AudioMixerSheet({ verseRef, verseText, name, onBack, onClose }: AudioMixerSheetProps) {
  const [selectedVoice, setSelectedVoice] = useState("male");
  const [showSaved, setShowSaved] = useState(false);

  const personalisedText = name
    ? verseText.replace(/^God is/, `${name}, God is`).replace(/trouble\.$/, `trouble for you.`)
    : verseText;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[20px] z-[120] animate-fade-in" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[390px] z-[121] animate-slide-up">
        <div className="sheet-surface bg-black rounded-t-[16px] flex flex-col gap-[32px] items-center pt-[24px] pb-[48px] px-[16px]">

          {/* Header row */}
          <div className="flex gap-[10px] items-center w-full">
            <button
              type="button"
              onClick={onBack}
              className="bg-[#1c1c1e] rounded-full w-[48px] h-[48px] flex-shrink-0 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <p className="text-white text-[20px] font-semibold leading-[1.5] tracking-[-0.26px] flex-1 min-w-0">
              Audio mixer
            </p>
            <div className="bg-[#1c1c1e] w-[48px] h-[48px] rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="3" width="4" height="14" rx="1" fill="white"/>
                <rect x="12" y="3" width="4" height="14" rx="1" fill="white"/>
              </svg>
            </div>
          </div>

          {/* Verse card */}
          <div className="bg-[#1c1c1e] rounded-[24px] p-[16px] w-full flex flex-col gap-[11.771px]">
            <p className="text-white text-[15px] font-normal leading-normal">{verseRef}</p>
            <p className="text-white text-[22px] font-normal leading-[1.5] tracking-[-0.26px]">{personalisedText}</p>
          </div>

          {/* Voice section */}
          <div className="flex flex-col gap-[24px] items-start w-full">
            <div className="flex flex-col gap-[16px] w-full">
              <p className="text-[#cecece] text-[20px] font-normal leading-[1.5] tracking-[-0.26px]">
                Choose the voice of the audio
              </p>
              <div className="flex flex-col gap-[16px]">
                <p className="text-white text-[16px] font-normal leading-normal">Voice</p>
                <div className="flex gap-[16px] items-start relative">
                  {VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => setSelectedVoice(voice.id)}
                      className="relative flex flex-col items-center gap-[4px]"
                    >
                      <div className="w-[57px] h-[57px] rounded-full overflow-hidden">
                        <img
                          src={voice.src}
                          alt={voice.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-white text-[12px] font-normal leading-normal">{voice.label}</p>
                      {selectedVoice === voice.id && (
                        <div className="absolute top-[-1px] right-[-1px] w-[22px] h-[22px] rounded-full bg-[#08f] flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save audio mix CTA */}
            <button
              type="button"
              onClick={() => setShowSaved(true)}
              className="bg-[#8ce4ff] h-[63px] rounded-[100px] w-full flex items-center justify-center gap-[4px] px-[16px]"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V4a1 1 0 011-1z" fill="black"/>
                <path d="M4 15a1 1 0 011 1h10a1 1 0 110 2H5a1 1 0 01-1-1v-1a1 1 0 011-1z" fill="black"/>
              </svg>
              <span className="text-black text-[20px] font-medium tracking-[-0.43px] leading-[22px]">
                Save audio mix
              </span>
            </button>
          </div>

        </div>
      </div>

      {showSaved && (
        <AudioSavedSheet
          verseRef={verseRef}
          verseText={personalisedText}
          onClose={onClose}
        />
      )}
    </>
  );
}
