import type { SharePhase } from "@/hooks/useShareVideo";

import { InstagramIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon } from "./icons";

/*
 * "Share verse" (Figma "New Feed UI" 2790:1055), under the film on Home
 * (VerseOfTheDay) and in the Saved feed (FeedItem's "saved" variant): #8CE4FF,
 * 63 tall, 16 in each side, radius 100, padding 13/16; the Instagram,
 * WhatsApp, TikTok and Threads glyphs at 24, 2 apart, then 8, then the label
 * in Inter Medium 20/22, -0.43 tracking, all black. 13.6 under the film, as
 * each caller sets it. The label follows the share video as it comes down
 * (hooks/useShareVideo.ts).
 */
export default function SharePill({
  phase,
  progress,
  onClick,
  className = "",
}: {
  phase: SharePhase;
  progress: number;
  onClick: () => void;
  className?: string;
}) {
  const label =
    phase === "preparing"
      ? `Preparing… ${Math.round(progress * 100)}%`
      : phase === "armed"
        ? "Tap to share"
        : phase === "failed"
          ? "Couldn't load. Try again"
          : "Share verse";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-busy={phase === "preparing" || undefined}
      className={`press mx-[16px] mt-[13.6px] flex h-[63px] flex-shrink-0 items-center justify-center
                  gap-[8px] rounded-[100px] border-none px-[16px] py-[13px] text-black ${className}`}
      style={{ backgroundColor: "#8CE4FF" }}
    >
      <span className="flex gap-[2px]">
        <InstagramIcon size={24} />
        <WhatsAppIcon size={24} />
        <TikTokIcon size={24} />
        <ThreadsIcon size={24} />
      </span>
      <span className="text-[20px] font-medium leading-[22px] tracking-[-0.43px] tabular-nums">{label}</span>
    </button>
  );
}
