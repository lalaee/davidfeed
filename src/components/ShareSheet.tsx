"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { navHiddenStore } from "@/lib/uiStore";
import { SOCIAL_PATHS } from "@/lib/socialIcons";
import { fetchShareFile, readCanShareFiles, shareFileName } from "@/lib/shareVideo";

/*
 * The share menu, on every device. What is shared is THE VIDEO: the film with
 * its sound and the "See more at Dafod.app" ending, from /assets/share/<id>.mp4
 * — not a link, which arrives as a bare card (the user saw exactly that on a
 * WhatsApp Status and asked for the film instead).
 *
 * A web page cannot post a file into another app by itself. What it can do,
 * and what each tile does:
 *
 *   With a system share sheet (phones; Safari and Chrome on a Mac) every app
 *   tile hands the video to that sheet, where WhatsApp Status, Instagram
 *   Stories and Reels, TikTok and the rest are listed from what the reader has
 *   installed. A page cannot pre-pick the app in that sheet — the OS decides,
 *   by design — so the reader taps it once more there.
 *
 *   Without one (most desktop browsers) the tile downloads the video and opens
 *   that app's website in a new tab, and the sheet says to attach the file
 *   there. That is the only way a file reaches those apps from a browser.
 *
 * The file is fetched as soon as the sheet opens, with the progress shown, and
 * the tiles wait for it. That order is not cosmetic: a share sheet will only
 * open from a tap made moments before, so the file has to be in hand when the
 * tile is tapped, not fetched after it.
 *
 * Copy link stays, last, for the reader who does want the link.
 *
 * Rendered into <body> over the page, which recedes behind it like the other
 * sheets, because the feed column is masked and clipped (see the note below).
 */

interface App {
  id: string;
  label: string;
  /** The tile's fill: the app's own brand colour. */
  bg: string;
  icon: React.ReactNode;
  /** Where to attach the downloaded video, when there is no share sheet. */
  site: string;
}

function Mark({ d }: { d: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden fill="#FFFFFF">
      <path d={d} />
    </svg>
  );
}

const APPS: App[] = [
  { id: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: <Mark d={SOCIAL_PATHS.whatsapp} />, site: "https://web.whatsapp.com/" },
  { id: "instagram", label: "Instagram", bg: "#E4405F", icon: <Mark d={SOCIAL_PATHS.instagram} />, site: "https://www.instagram.com/" },
  { id: "tiktok", label: "TikTok", bg: "#000000", icon: <Mark d={SOCIAL_PATHS.tiktok} />, site: "https://www.tiktok.com/upload" },
  { id: "x", label: "X", bg: "#000000", icon: <Mark d={SOCIAL_PATHS.x} />, site: "https://x.com/compose/post" },
  { id: "facebook", label: "Facebook", bg: "#0866FF", icon: <Mark d={SOCIAL_PATHS.facebook} />, site: "https://www.facebook.com/" },
  { id: "telegram", label: "Telegram", bg: "#26A5E4", icon: <Mark d={SOCIAL_PATHS.telegram} />, site: "https://web.telegram.org/" },
];

interface ShareSheetProps {
  postId: number;
  title: string;
  onClose: () => void;
}

export default function ShareSheet({ postId, title, onClose }: ShareSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Asked once: whether this browser has a share sheet that takes a file.
  const [systemSheet] = useState(() => readCanShareFiles());

  // The page recedes and the nav steps aside, as under the other sheets.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sheet-receded");
    navHiddenStore.set(true);
    return () => {
      root.classList.remove("sheet-receded");
      navHiddenStore.set(false);
    };
  }, []);

  // Fetch the video now, so it is in hand when a tile is tapped.
  useEffect(() => {
    const ac = new AbortController();
    fetchShareFile(postId, title, setProgress, ac.signal)
      .then(setFile)
      .catch(() => {
        if (!ac.signal.aborted) setFailed(true);
      });
    return () => ac.abort();
  }, [postId, title]);

  const pageUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/library/${postId}`;

  const download = useCallback((video: File) => {
    const href = URL.createObjectURL(video);
    const a = document.createElement("a");
    a.href = href;
    a.download = shareFileName(title);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoked later; revoking synchronously races the download just started.
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  }, [title]);

  /* The system sheet with the video. Called straight from a tap. */
  const shareVideo = useCallback(async (video: File) => {
    try {
      await navigator.share({ files: [video] });
      onClose();
    } catch (err) {
      // Dismissing the sheet is the reader answering, not a failure.
      if ((err as Error)?.name !== "AbortError") setNote("Couldn't open the share sheet. Download the video instead.");
    }
  }, [onClose]);

  const sendTo = (app: App) => {
    if (!file) return;
    if (systemSheet) {
      void shareVideo(file);
      return;
    }
    download(file);
    window.open(app.site, "_blank", "noopener,noreferrer");
    setNote(`Video downloaded. Attach it in ${app.label} to post it.`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(onClose, 700);
    } catch {
      onClose();
    }
  };

  const ready = file !== null;
  const status = failed
    ? "Couldn't load the video. Copy the link instead."
    : !ready
      ? `Preparing the video… ${Math.round(progress * 100)}%`
      : note ??
        (systemSheet
          ? "Pick an app, then choose it again in your share sheet. Your device decides which apps appear."
          : "Pick an app: the video downloads and the app opens, ready to attach it.");

  /*
   * Rendered into <body>, not where the card is. The card lives inside the
   * feed column, and on desktop that column is masked (.feed-mask fades its
   * top and bottom edges) and clipped, which makes it the box a fixed child
   * is painted in: the sheet opened, but only as a sliver at the card's edge.
   * A portal puts it over the whole page, above the desktop chrome (z-500).
   */
  return createPortal(
    <>
      {/* Transparent, as the other sheets' are; the recede says the page is
          waiting. This only catches a tap. */}
      <div className="fixed inset-0 z-[10000]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={`Share ${title}`}
        className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[10001]
                   flex w-[calc(100%-42px)] -translate-x-1/2 flex-col gap-[20px] md:max-w-[348px] sheet-column
                   rounded-[18.8333px] px-[16px] pb-[24px] pt-[20px] desk:px-[24px]"
        style={{ backgroundColor: "#0E0E0E" }}
      >
        <div className="flex items-center justify-between gap-[12px]">
          <p className="min-w-0 truncate text-[17px] font-semibold text-white" style={{ letterSpacing: "-0.3px" }}>
            Share {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-full border-none press"
            style={{ backgroundColor: "#212121" }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* One row of 60 tiles, 8 apart, scrolling sideways where it runs out.
            The video's own tiles come first; Copy link, the one that does not
            carry the film, comes last. */}
        <div className="scrollbar-hide -mx-[16px] flex gap-[8px] overflow-x-auto px-[16px] desk:-mx-[24px] desk:px-[24px]">
          {systemSheet && (
            <Tile label="Share video" bg="#2C7BE5" onClick={() => file && void shareVideo(file)} disabled={!ready}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3v12m0-12L8 7m4-4l4 4M5 12v6.5A2.5 2.5 0 007.5 21h9a2.5 2.5 0 002.5-2.5V12"
                      stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Tile>
          )}
          <Tile label="Download" bg="#3A3A3C" onClick={() => file && download(file)} disabled={!ready}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14" stroke="white" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Tile>
          {APPS.map((app) => (
            <Tile key={app.id} label={app.label} bg={app.bg} onClick={() => sendTo(app)} disabled={!ready}>
              {app.icon}
            </Tile>
          ))}
          <Tile label={copied ? "Copied" : "Copy link"} bg="#3A3A3C" onClick={copyLink}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M8 12a3 3 0 004.24 0l2.83-2.83a3 3 0 10-4.24-4.24l-.7.7M12 8a3 3 0 00-4.24 0L4.93 10.83a3 3 0 104.24 4.24l.7-.7"
                    stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Tile>
        </div>

        {/* The wait, then how the tiles work here. A thin bar under the row
            while the video arrives. */}
        <div className="flex flex-col gap-[10px]">
          {!ready && !failed && (
            <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ backgroundColor: "#212121" }}>
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.round(progress * 100)}%`, transition: "width 200ms linear" }}
              />
            </div>
          )}
          <p role="status" className="text-[13px] font-medium leading-[18px]" style={{ color: "#8A8A8A" }}>
            {status}
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
}

function Tile({
  label,
  bg,
  onClick,
  disabled,
  children,
}: {
  label: string;
  bg: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-[72px] flex-shrink-0 flex-col items-center gap-[8px] border-none bg-transparent p-0
                 press disabled:opacity-40"
    >
      <span
        className="flex h-[60px] w-[60px] items-center justify-center rounded-full"
        // A black tile (X, TikTok) would vanish into the sheet; a hairline
        // ring gives it an edge without changing its colour.
        style={{ backgroundColor: bg, boxShadow: bg === "#000000" ? "inset 0 0 0 1px #333333" : undefined }}
      >
        {children}
      </span>
      <span className="w-full truncate text-center text-[12px] leading-[16px]" style={{ color: "rgba(255,255,255,0.8)" }}>
        {label}
      </span>
    </button>
  );
}
