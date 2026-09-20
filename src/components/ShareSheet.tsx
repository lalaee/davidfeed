"use client";

import { useCallback, useEffect, useState } from "react";

import { navHiddenStore } from "@/lib/uiStore";
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
 * So what is left here is the desktop case, where there is no system sheet and
 * no way to hand over a file at all. Naming a row after an app would be a lie
 * twice over there: a page cannot pre-select a share target on any platform —
 * the OS decides, by design, and Instagram's own instagram-stories:// link
 * reads its media from a native-app pasteboard no web page can write to — and
 * on a desktop there is not even a sheet to open. These two rows are what the
 * platform genuinely does.
 */

const SHEET_ROW =
  "w-full bg-[#1c1c1e] rounded-[16px] px-[16px] py-[14px] flex items-center gap-[14px] text-left " +
  "press-soft " +
  "disabled:opacity-40";

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
  useEffect(() => {
    navHiddenStore.set(true);
    return () => navHiddenStore.set(false);
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

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[20px] z-[130] animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={`Share ${title}`}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[390px] z-[131] animate-slide-up"
      >
        <div className="sheet-surface bg-black rounded-t-[16px] flex flex-col gap-[20px] pt-[24px] pb-[48px] px-[16px]">
          <div className="flex items-center justify-between">
            <p className="text-white text-[17px] font-semibold tracking-[-0.3px]">Share {title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="bg-[#1c1c1e] rounded-full w-[40px] h-[40px] flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M5 5L15 15M15 5L5 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-[10px]">
            <button type="button" onClick={saveVideo} disabled={busy !== null} className={SHEET_ROW}>
              <span className="w-[40px] h-[40px] rounded-full bg-[#2a2a2c] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14" stroke="white" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="flex-1">
                <span className="block text-white text-[16px] font-medium">
                  {busy === "save" ? "Preparing video\u2026" : "Save video"}
                </span>
                <span className="block text-[#8e8e93] text-[13px] leading-[1.35]">
                  Download it, then post it from your phone
                </span>
              </span>
            </button>

            <button type="button" onClick={copyLink} disabled={busy !== null} className={SHEET_ROW}>
              <span className="w-[40px] h-[40px] rounded-full bg-[#2a2a2c] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M8 12a3 3 0 004.24 0l2.83-2.83a3 3 0 10-4.24-4.24l-.7.7M12 8a3 3 0 00-4.24 0L4.93 10.83a3 3 0 104.24 4.24l.7-.7"
                        stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="flex-1">
                <span className="block text-white text-[16px] font-medium">
                  {copied ? "Link copied" : "Copy link"}
                </span>
                <span className="block text-[#8e8e93] text-[13px] leading-[1.35]">
                  A link to this verse in the app
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
