"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { authSheetStore, authStore, closeAuthSheet, startAuth } from "@/lib/auth";
import { googleSignInAvailable } from "@/lib/googleSignIn";
import { navHiddenStore } from "@/lib/uiStore";

import { AppleLogo, GoogleLogo, SignInStatus, useSignIn } from "./SignIn";

/*
 * The sign-in sheet.
 *
 * Mounted once in the root layout, like the bottom nav, and opened from
 * anywhere through authSheetStore: by a save or highlight made while signed
 * out (lib/auth.ts `gated`), or by the Sign in button on You. Signing out and
 * the rest of the account live on You; this sheet only ever signs in.
 *
 * THE CONTAINER is the compare card's: the column less 21 a side on the phone,
 * the reader's 740 at desk (.sheet-column), floating 8 above the bottom edge,
 * rising on the same slide-up while the page behind recedes as it does under
 * the compare card (globals.css, html.sheet-receded). The backdrop dims
 * nothing; it catches a tap. The bottom nav steps aside while it is up.
 *
 * THE CONTENT follows the account prompt the user pointed at (YouVersion's):
 * a grabber in place of a close button, a large bold promise, "No ads or
 * purchases", a short ruled checklist of what an account gives you with
 * green check rings, then one big light pill and a plain text link under it.
 * The reference also has a row of square provider tiles; with only two
 * providers, the pill and the link already are the choice, so the row is left
 * out rather than doubled.
 *
 *   Google is the pill, the primary (asked for), with the four-colour G on the
 *   light fill — Google's light-theme button, which we may draw ourselves
 *   (lib/googleSignIn.ts). Apple is the link: its logo and "Continue with
 *   Apple" in white, as the reference sets "Sign In".
 *
 * Closing: drag the grabber down (past 80 it goes, short of that it springs
 * back), tap outside, or Escape. Closing drops the save that opened it.
 */
const CHECKLIST = ["Save films to watch again", "Highlight verses", "On every device"];

export default function AuthSheet() {
  useEffect(() => {
    startAuth();
  }, []);

  const open = useSyncExternalStore(
    authSheetStore.subscribe,
    authSheetStore.read,
    authSheetStore.serverSnapshot,
  );
  const auth = useSyncExternalStore(authStore.subscribe, authStore.read, authStore.serverSnapshot);
  // The sign-in itself — the new tab, the wait, the error — is SignIn.tsx's,
  // shared with the prompt on You.
  const { busy, error, waiting, go, reset } = useSignIn();
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragFrom = useRef<number | null>(null);
  // A drag that springs back must not also count as a tap on the grabber.
  const dragged = useRef(false);
  // Signed in by the time it would show (another tab, a restored session):
  // there is nothing to ask, and nothing should recede.
  const showing = open && auth.status !== "signedIn";

  // The page recedes and the nav steps aside while the sheet is up.
  useEffect(() => {
    if (!showing) return;
    const root = document.documentElement;
    root.classList.add("sheet-receded");
    navHiddenStore.set(true);
    return () => {
      root.classList.remove("sheet-receded");
      navHiddenStore.set(false);
    };
  }, [showing]);

  // Escape closes it, as it closes the other sheets.
  useEffect(() => {
    if (!showing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showing]);

  if (!showing) return null;

  const close = () => {
    reset();
    setDrag(0);
    closeAuthSheet();
  };


  const onDragStart = (e: React.PointerEvent) => {
    dragFrom.current = e.clientY;
    dragged.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (dragFrom.current === null) return;
    const dy = Math.max(0, e.clientY - dragFrom.current);
    if (dy > 4) dragged.current = true;
    setDrag(dy);
  };
  const onDragEnd = () => {
    if (dragFrom.current === null) return;
    dragFrom.current = null;
    setDragging(false);
    if (drag > 80) close();
    else setDrag(0);
  };
  const onGrabberClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    close();
  };

  return (
    <>
      {/* Transparent, as the compare card's is — the recede says the page
          is waiting; this only catches a tap. */}
      <div className="fixed inset-0 z-[10000]" onClick={close} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-sheet-title"
        className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[10001]
                   flex max-h-[calc(100dvh-60px)] w-[calc(100%-42px)] -translate-x-1/2 flex-col
                   overflow-y-auto md:max-w-[348px] sheet-column rounded-[18.8333px] px-[24px] pb-[24px]
                   desk:px-[40px] desk:pb-[32px]"
        style={{
          // The reference's ground: near-black, lifting a touch at the top
          // and warming faintly toward the foot.
          background: "linear-gradient(180deg, #1A1A1A 0%, #0E0E0E 55%, #160F12 100%)",
          // The drag follows the finger as a negative bottom margin, which
          // moves a bottom-anchored fixed box down without touching
          // `translate` (the centring) or `transform` (held by the slide-up's
          // fill). The release springs back on the house curve.
          marginBottom: drag ? -drag : undefined,
          transition: dragging ? "none" : "margin-bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* The grabber, and the close for anyone who cannot drag. */}
        <button
          type="button"
          aria-label="Close"
          onClick={onGrabberClick}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="flex h-[32px] w-full flex-shrink-0 cursor-grab touch-none items-center justify-center
                     border-none bg-transparent"
        >
          <span className="block h-[5px] w-[40px] rounded-full" style={{ backgroundColor: "#4A4A4A" }} />
        </button>

        <h2
          id="auth-sheet-title"
          className="mt-[20px] text-[32px] font-bold leading-[1.08] text-white desk:text-[40px]"
          style={{ letterSpacing: "-0.8px" }}
        >
          Save the verses that speak to you. 100% free.
        </h2>
        <p className="mt-[16px] text-[17px] font-medium leading-[24px]" style={{ color: "rgba(255,255,255,0.9)" }}>
          No ads or purchases
        </p>

        <ul className="mt-[20px] border-t" style={{ borderColor: "#262626" }}>
          {CHECKLIST.map((item) => (
            <li
              key={item}
              className="flex h-[52px] items-center gap-[14px] border-b text-[17px] font-semibold text-white"
              style={{ borderColor: "#262626" }}
            >
              <CheckRing />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-[28px] flex flex-col items-center gap-[8px]">
          {googleSignInAvailable && (
            <button
              type="button"
              onClick={() => go("google")}
              disabled={busy !== null}
              className="flex h-[56px] w-full items-center justify-center gap-[10px] rounded-full border-none
                         text-[17px] font-semibold text-[#111111] press disabled:opacity-60"
              style={{ backgroundColor: "#EDEDED" }}
            >
              <GoogleLogo />
              {busy === "google" ? "Opening Google…" : "Continue with Google"}
            </button>
          )}
          <button
            type="button"
            onClick={() => go("apple")}
            disabled={busy !== null}
            className="flex h-[48px] items-center justify-center gap-[8px] border-none bg-transparent px-[16px]
                       text-[17px] font-semibold text-white press disabled:opacity-60"
          >
            <AppleLogo />
            {busy === "apple" ? "Opening Apple…" : "Continue with Apple"}
          </button>
        </div>

        <SignInStatus waiting={waiting} error={error} />

        <p className="mt-[12px] text-center text-[13px] font-medium leading-[18px]">
          <Link href="/privacy" onClick={close} className="underline" style={{ color: "#8A8A8A" }}>
            Privacy
          </Link>
        </p>
      </div>
    </>
  );
}

/* The reference's check: a green ring with a tick, drawn at 1.75 stroke. */
function CheckRing() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0">
      <circle cx="12" cy="12" r="10.25" stroke="#30D158" strokeWidth="1.75" />
      <path d="M7.75 12.25l2.75 2.75 5.75-5.75" stroke="#30D158" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
