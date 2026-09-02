"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { navHiddenStore } from "@/lib/uiStore";

/*
 * The share menu.
 *
 * WHY THIS EXISTS RATHER THAN BUTTONS NAMED AFTER APPS. The obvious design is
 * a row each for Instagram Story, WhatsApp Status and Instagram Feed. A website
 * cannot build that honestly. navigator.share hands the payload to the OS and
 * the OS alone decides what is offered — a page cannot pre-select a target, add
 * one, or even find out what is installed, by design. Instagram's own
 * instagram-stories:// deep link reads its media from a native-app pasteboard
 * namespace that a web page has no way to write to.
 *
 * So an "Instagram Story" button here could only open the same OS sheet the
 * generic one opens, while promising to do more. Every row below does exactly
 * and only what its label says, and the destinations the reader actually wants
 * are one tap further in, inside the system sheet where they genuinely live.
 *
 * FILE-ONLY, no text. The first version sent { files, text } together, which is
 * valid but narrows the field: several iOS share extensions — Instagram's among
 * them — take a share that is purely media and refuse or flatten one that mixes
 * media with a string. The caption is worth less than the target list.
 */

const SHEET_ROW =
  "w-full bg-[#1c1c1e] rounded-[16px] px-[16px] py-[14px] flex items-center gap-[14px] text-left " +
  "transition-transform duration-[190ms] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] " +
  "disabled:opacity-40";

const subscribeNever = () => () => {};

/*
 * Whether this browser will hand a video to the system sheet.
 *
 * useSyncExternalStore rather than a mount effect, the same shape Feed uses for
 * the autoplay verdict: the server cannot know the answer, the client can know
 * it before first paint, and this reconciles the two without a hydration
 * mismatch. The server assumes yes, so the row is not missing from the first
 * frame on the phones where it does work.
 */
const readCanShareFiles = () => {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File([new Blob([new Uint8Array(1)])], "probe.mp4", { type: "video/mp4" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

interface ShareSheetProps {
  postId: number;
  title: string;
  onClose: () => void;
}

type Busy = null | "share" | "save" | "copy";

export default function ShareSheet({ postId, title, onClose }: ShareSheetProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [copied, setCopied] = useState(false);
  const canShareFiles = useSyncExternalStore(
    subscribeNever,
    readCanShareFiles,
    () => true,
  );

  // The nav floats in the same slot and outranks this at z-[9999], so it steps
  // aside while the sheet is up — the same handshake the reader's sheets use.
  useEffect(() => {
    navHiddenStore.set(true);
    return () => navHiddenStore.set(false);
  }, []);

  const videoUrl = `/assets/share/${postId}.mp4`;
  const pageUrl = typeof window === "undefined" ? "" : `${window.location.origin}/library/${postId}`;
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-dafod.mp4`;

  const getFile = useCallback(async () => {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`share asset ${res.status}`);
    return new File([await res.blob()], fileName, { type: "video/mp4" });
  }, [videoUrl, fileName]);

  const shareVideo = useCallback(async () => {
    setBusy("share");
    try {
      const file = await getFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        onClose();
        return;
      }
      await navigator.share?.({ title, url: pageUrl });
      onClose();
    } catch (err) {
      // Dismissing the system sheet throws AbortError. That is an answer, not a
      // failure, and must not cascade into another attempt.
      if ((err as Error)?.name !== "AbortError") onClose();
    } finally {
      setBusy(null);
    }
  }, [getFile, onClose, pageUrl, title]);

  const saveVideo = useCallback(async () => {
    setBusy("save");
    try {
      const file = await getFile();
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked on the next turn of the loop; revoking synchronously races the
      // navigation the click just started.
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      onClose();
    } catch {
      onClose();
    } finally {
      setBusy(null);
    }
  }, [getFile, fileName, onClose]);

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
            {canShareFiles && (
              <button type="button" onClick={shareVideo} disabled={busy !== null} className={SHEET_ROW}>
                <span className="w-[40px] h-[40px] rounded-full bg-[#2a2a2c] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M18 10L10 2v5C5 7 2 10 2 18c2-4 5-6 8-6v5l8-7z" fill="white" />
                  </svg>
                </span>
                <span className="flex-1">
                  <span className="block text-white text-[16px] font-medium">
                    {busy === "share" ? "Preparing video…" : "Share video"}
                  </span>
                  <span className="block text-[#8e8e93] text-[13px] leading-[1.35]">
                    Opens your phone&apos;s share sheet — Instagram Story, WhatsApp Status,
                    Messages
                  </span>
                </span>
              </button>
            )}

            <button type="button" onClick={saveVideo} disabled={busy !== null} className={SHEET_ROW}>
              <span className="w-[40px] h-[40px] rounded-full bg-[#2a2a2c] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 16h14" stroke="white" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="flex-1">
                <span className="block text-white text-[16px] font-medium">
                  {busy === "save" ? "Preparing video…" : "Save video"}
                </span>
                <span className="block text-[#8e8e93] text-[13px] leading-[1.35]">
                  Download it, then post it yourself from your gallery
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
