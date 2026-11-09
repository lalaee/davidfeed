import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { fetchShareFile, readCanShareFiles, serverCanShareFiles, subscribeNever } from "@/lib/shareVideo";

/*
 * SHARING STRAIGHT TO THE SYSTEM SHEET — no menu of our own in between.
 *
 * Every app tile in ShareSheet opened the same system sheet on a phone, so the
 * menu was a step that chose nothing. A tap now opens the system sheet with
 * the video. The catch is the one ShareSheet was built around: a share sheet
 * only opens from a tap made moments before (~5 s of transient activation),
 * and the video is tens of megabytes, so it must be in hand at the tap.
 *
 *   prefetch   where the share is the page's own action (Home's "Share
 *              verse"), the file is fetched quietly a few seconds after the
 *              page settles, so the tap opens the sheet at once. Not on Save-
 *              Data or a 2G link. The HTTP cache holds it after.
 *   on tap     with the file in hand, share() calls the sheet synchronously.
 *              Without it, the tap starts (or joins) the fetch and the caller
 *              shows its progress; if it lands while the tap's activation
 *              still holds, the sheet opens; if not, the browser refuses and
 *              the state turns "armed" — the next tap opens it at once.
 *
 * `menu` is true where the browser has no sheet that takes a file (most
 * desktop browsers): those still open ShareSheet, whose tiles download the
 * video, the only way a file reaches those apps from a browser.
 *
 * One fetch per film for the whole page, shared through a module store, so
 * Home's prefetch, a feed card and a second tap all wait on the same bytes.
 */

interface Entry {
  file: File | null;
  progress: number;
  failed: boolean;
  promise: Promise<File> | null;
}

const entries = new Map<number, Entry>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function entryOf(postId: number): Entry {
  let e = entries.get(postId);
  if (!e) {
    e = { file: null, progress: 0, failed: false, promise: null };
    entries.set(postId, e);
  }
  return e;
}

function load(postId: number, title: string): Promise<File> {
  const e = entryOf(postId);
  if (e.promise) return e.promise;
  e.failed = false;
  e.promise = fetchShareFile(postId, title, (f) => {
    // Whole percents: a notify per network chunk re-rendered for nothing.
    const pct = Math.floor(f * 100) / 100;
    if (pct !== e.progress) {
      e.progress = pct;
      notify();
    }
  }).then(
    (file) => {
      e.file = file;
      e.progress = 1;
      notify();
      return file;
    },
    (err) => {
      e.promise = null;
      e.failed = true;
      notify();
      throw err;
    },
  );
  return e.promise;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** A stable primitive for useSyncExternalStore: "ready", "failed", or the progress. */
function snapshot(postId: number): string {
  const e = entries.get(postId);
  if (!e) return "0";
  if (e.file) return "ready";
  if (e.failed) return "failed";
  return String(e.progress);
}

/** Whether a quiet prefetch is worth the bytes on this connection. */
function prefetchAllowed(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return true;
  return !c.saveData && c.effectiveType !== "2g" && c.effectiveType !== "slow-2g";
}

export type SharePhase = "idle" | "preparing" | "armed" | "failed";

export function useShareVideo(postId: number, title: string, { prefetch = false } = {}) {
  const sheet = useSyncExternalStore(subscribeNever, readCanShareFiles, serverCanShareFiles);
  const snap = useSyncExternalStore(subscribe, () => snapshot(postId), () => "0");
  // Whether the reader has tapped and is waiting on this film's file.
  const [waiting, setWaiting] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);

  useEffect(() => {
    if (!prefetch || !sheet || !prefetchAllowed()) return;
    // After the page's own film has had the network to itself.
    const timer = setTimeout(() => {
      load(postId, title).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [prefetch, sheet, postId, title]);

  const open = useCallback(async (file: File) => {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      // Refused for want of a fresh tap: the next one opens it.
      if ((err as Error)?.name === "NotAllowedError") {
        setArmed(postId);
        return;
      }
      // AbortError is the reader closing the sheet, which is an answer.
    }
    setArmed(null);
  }, [postId]);

  /** Call straight from a tap. */
  const share = useCallback(() => {
    const file = entries.get(postId)?.file;
    if (file) {
      setWaiting(null);
      void open(file);
      return;
    }
    setWaiting(postId);
    load(postId, title)
      .then((f) => {
        setWaiting(null);
        return open(f);
      })
      // Still waiting, so the caller shows the failure; a tap tries again.
      .catch(() => {});
  }, [postId, title, open]);

  const phase: SharePhase =
    snap === "failed" && waiting === postId
      ? "failed"
      : armed === postId && snap === "ready"
        ? "armed"
        : waiting === postId
          ? "preparing"
          : "idle";
  const progress = snap === "ready" ? 1 : Number(snap) || 0;

  return { menu: !sheet, share, phase, progress };
}
