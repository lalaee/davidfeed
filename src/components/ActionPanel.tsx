"use client";

import { useEffect } from "react";
import { useHaptic } from "@/hooks/useHaptic";

interface ActionPanelProps {
  title: string;
  verse: string;
  onClose: () => void;
}

export default function ActionPanel({ title, verse, onClose }: ActionPanelProps) {
  const { trigger: haptic } = useHaptic();

  useEffect(() => {
    haptic("light");
  }, [haptic]);

  const handleAction = (action: string) => {
    haptic("light");
    console.log(`Action: ${action} for ${title}`);
    // Implement actual actions here
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-[80px] w-[280px] bg-zinc-900 z-[9999] animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-white text-lg font-semibold">{title}</h2>
          <p className="text-zinc-400 text-sm mt-1">{verse}</p>
        </div>

        {/* Actions */}
        <div className="flex-1 p-4 space-y-2">
          <button
            onClick={() => handleAction("read")}
            className="w-full p-4 bg-zinc-800 rounded-xl text-left text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">📖</span>
            <div>
              <p className="font-medium">Read Full Chapter</p>
              <p className="text-sm text-zinc-400">Open in Bible reader</p>
            </div>
          </button>

          <button
            onClick={() => handleAction("listen")}
            className="w-full p-4 bg-zinc-800 rounded-xl text-left text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">🎧</span>
            <div>
              <p className="font-medium">Listen to Audio</p>
              <p className="text-sm text-zinc-400">Play audio version</p>
            </div>
          </button>

          <button
            onClick={() => handleAction("share")}
            className="w-full p-4 bg-zinc-800 rounded-xl text-left text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">📤</span>
            <div>
              <p className="font-medium">Share</p>
              <p className="text-sm text-zinc-400">Share with friends</p>
            </div>
          </button>

          <button
            onClick={() => handleAction("copy")}
            className="w-full p-4 bg-zinc-800 rounded-xl text-left text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-medium">Copy Verse</p>
              <p className="text-sm text-zinc-400">Copy to clipboard</p>
            </div>
          </button>

          <button
            onClick={() => handleAction("add-to-collection")}
            className="w-full p-4 bg-zinc-800 rounded-xl text-left text-white hover:bg-zinc-700 active:bg-zinc-600 transition-colors flex items-center gap-3"
          >
            <span className="text-2xl">📁</span>
            <div>
              <p className="font-medium">Add to Collection</p>
              <p className="text-sm text-zinc-400">Save to your library</p>
            </div>
          </button>
        </div>

        {/* Close button */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full p-3 bg-zinc-800 rounded-xl text-white font-medium hover:bg-zinc-700 active:bg-zinc-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
