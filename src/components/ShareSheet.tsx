"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { navHiddenStore } from "@/lib/uiStore";
import { SOCIAL_PATHS } from "@/lib/socialIcons";
import { fetchShareFile, shareFileName } from "@/lib/shareVideo";

/*
 * The desktop share menu.
 *
 * This never opens on a phone. Where the browser can hand a file to the system
 * sheet, the share button goes straight there — that sheet already lists
 * WhatsApp Status, Instagram Feed and Story from what the reader has installed,
 * and a menu of ours in front of it is only a tap in the way. See
 * lib/shareVideo.ts for the split.
 *
 * On a desktop there is no system sheet, so this is it: one row of round
 * app tiles, as share menus have (the user's reference), scrolling sideways.
 * Copy link and Download first, then the apps.
 *
 * ONLY APPS A PAGE CAN ACTUALLY POST TO. Each app tile opens that app's own
 * public share address in a new tab with the link and a line of text filled
 * in: WhatsApp, X, Facebook, Telegram, Threads and Reddit all take one, and
 * Email is a mailto. Instagram and TikTok are not here because they take
 * nothing from the web — no share address exists, and their own links read
 * from a native-app pasteboard no page can write to. A tile for them could
 * only pretend. What they do take is a video file, so Download sits up front,
 * and the line under the row says that is the way to them.
 */

interface App {
  id: string;
  label: string;
  /** The tile's fill: the app's own brand colour. */
  bg: string;
  icon: React.ReactNode;
  /** The app's share address for this link and text. */
  href: (url: string, text: string) => string;
}

const e = encodeURIComponent;

function Mark({ d }: { d: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden fill="#FFFFFF">
      <path d={d} />
    </svg>
  );
}

const APPS: App[] = [
  { id: "whatsapp", label: "WhatsApp", bg: "#25D366", icon: <Mark d={SOCIAL_PATHS.whatsapp} />,
    href: (url, text) => `https://wa.me/?text=${e(`${text} ${url}`)}` },
  { id: "x", label: "X", bg: "#000000", icon: <Mark d={SOCIAL_PATHS.x} />,
    href: (url, text) => `https://x.com/intent/tweet?text=${e(text)}&url=${e(url)}` },
  { id: "facebook", label: "Facebook", bg: "#0866FF", icon: <Mark d={SOCIAL_PATHS.facebook} />,
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${e(url)}` },
  { id: "telegram", label: "Telegram", bg: "#26A5E4", icon: <Mark d={SOCIAL_PATHS.telegram} />,
    href: (url, text) => `https://t.me/share/url?url=${e(url)}&text=${e(text)}` },
  { id: "threads", label: "Threads", bg: "#000000", icon: <Mark d={SOCIAL_PATHS.threads} />,
    href: (url, text) => `https://www.threads.net/intent/post?text=${e(`${text} ${url}`)}` },
  { id: "reddit", label: "Reddit", bg: "#FF4500", icon: <Mark d={SOCIAL_PATHS.reddit} />,
    href: (url, text) => `https://www.reddit.com/submit?url=${e(url)}&title=${e(text)}` },
  { id: "email", label: "Email", bg: "#3A3A3C",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" stroke="#FFFFFF" strokeWidth="1.8" />
        <path d="M4 7.5l8 5.5 8-5.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    href: (url, text) => `mailto:?subject=${e(text)}&body=${e(`${text}\n\n${url}`)}` },
];

interface ShareSheetProps {
  postId: number;
  title: string;
  onClose: () => void;
}

export default function ShareSheet({ postId, title, onClose }: ShareSheetProps) {
  const [busy, setBusy] = useState<null | "save" | "copy">(null);
  const [copied, setCopied] = useState(false);

  // The nav floats in the same slot and outranks this at z-[9999], so it steps
  // aside while the sheet is up — the same handshake the reader's sheets use.
  // And the page recedes behind it, as it does under the sign-in sheet and
  // the compare card (globals.css, html.sheet-receded).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sheet-receded");
    navHiddenStore.set(true);
    return () => {
      root.classList.remove("sheet-receded");
      navHiddenStore.set(false);
    };
  }, []);


  const pageUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/library/${postId}`;

  const saveVideo = useCallback(async () => {
    setBusy("save");
    try {
      const file = await fetchShareFile(postId, title);
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = shareFileName(title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked later; revoking synchronously races the download the click
      // has only just started.
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } finally {
      setBusy(null);
      onClose();
    }
  }, [postId, title, onClose]);

  const copyLink = useCallback(async () => {
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(onClose, 700);
    } catch {
      onClose();
    } finally {
      setBusy(null);
    }
  }, [pageUrl, onClose]);

  const shareText = `${title} — a short film on Dafod`;
  const openApp = (app: App) => {
    const href = app.href(pageUrl, shareText);
    if (href.startsWith("mailto:")) window.location.assign(href);
    else window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  };

  /*
   * Rendered into <body>, not where the card is. The card lives inside the
   * feed column, and on desktop that column is masked (.feed-mask fades its
   * top and bottom edges) and clipped, which makes it the box a fixed child
   * is painted in: the sheet opened, but only as a sliver at the card's edge,
   * faded by the mask, with its backdrop blurring the column alone — "the
   * share icon does nothing". A portal puts it over the whole page, above the
   * desktop chrome (z-500), as the sign-in sheet sits.
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
                   flex w-[calc(100%-42px)] -translate-x-1/2 flex-col gap-[24px] md:max-w-[348px] sheet-column
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
            The label sits under each in 12/16 at 80% white. */}
        <div className="scrollbar-hide -mx-[16px] flex gap-[8px] overflow-x-auto px-[16px] desk:-mx-[24px] desk:px-[24px]">
          <Tile label={copied ? "Copied" : "Copy link"} bg="#2C7BE5" onClick={copyLink} disabled={busy !== null}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M8 12a3 3 0 004.24 0l2.83-2.83a3 3 0 10-4.24-4.24l-.7.7M12 8a3 3 0 00-4.24 0L4.93 10.83a3 3 0 104.24 4.24l.7-.7"
                    stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Tile>
          <Tile label={busy === "save" ? "Preparing…" : "Download"} bg="#3A3A3C" onClick={saveVideo} disabled={busy !== null}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14" stroke="white" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Tile>
          {APPS.map((app) => (
            <Tile key={app.id} label={app.label} bg={app.bg} onClick={() => openApp(app)} disabled={busy !== null}>
              {app.icon}
            </Tile>
          ))}
        </div>

        <p className="text-[13px] font-medium leading-[18px]" style={{ color: "#8A8A8A" }}>
          For Instagram or TikTok, download the video and post it from the app.
        </p>
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
        // A black tile (X, Threads) would vanish into the sheet; a hairline
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
