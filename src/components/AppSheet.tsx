"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { appSheetStore, closeAppSheet, openGetApp, wentToAppStore, type AppSheet as Step } from "@/lib/appOffer";
import { APP_STORE_URL, onAndroid, PLAY_STORE_URL } from "@/lib/appStore";
import { navHiddenStore } from "@/lib/uiStore";

import { AndroidIcon, AppleIcon } from "./icons";

/*
 * THE APP SHEET — mounted once in the root layout, like AuthSheet, and
 * driven by appSheetStore (lib/appOffer.ts). Two steps:
 *
 *   offer    after a film has played through: the iPhone app's notification
 *            offer (NotificationOfferSheet.swift), its preview of the 6am
 *            notification, its words, its blue yes — which here gets the app,
 *            since the app is what sends it.
 *   get      what every Get app button opens: the App Store and Google
 *            Play, the reader's own store first (Google Play on Android).
 *
 * THE CONTAINER is AuthSheet's: the column less 21 a side, 740 at desk,
 * floating 8 above the bottom, the slide-up, the page receding behind it, the
 * nav stepping aside. Drag the grabber down, tap outside or press Escape to
 * close.
 */
export default function AppSheet() {
  const step = useSyncExternalStore(appSheetStore.subscribe, appSheetStore.read, appSheetStore.serverSnapshot);

  const open = step !== null;

  // Moving between steps keeps the page receded; only opening and closing move it.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("sheet-receded");
    navHiddenStore.set(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAppSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("sheet-receded");
      navHiddenStore.set(false);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!step) return null;
  return <Frame step={step} />;
}

function Frame({ step }: { step: NonNullable<Step> }) {
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragFrom = useRef<number | null>(null);
  // A drag that springs back must not also count as a tap on the grabber.
  const dragged = useRef(false);

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
    if (drag > 80) closeAppSheet();
    else setDrag(0);
  };
  const onGrabberClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    closeAppSheet();
  };

  return (
    <>
      <div className="fixed inset-0 z-[10000]" onClick={closeAppSheet} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-sheet-title"
        className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[10001]
                   flex max-h-[calc(100dvh-60px)] w-[calc(100%-42px)] -translate-x-1/2 flex-col
                   overflow-y-auto md:max-w-[348px] sheet-column rounded-[18.8333px] px-[24px] pb-[24px]
                   desk:px-[40px] desk:pb-[32px]"
        style={{
          background: "linear-gradient(180deg, #1A1A1A 0%, #0E0E0E 55%, #160F12 100%)",
          marginBottom: drag ? -drag : undefined,
          transition: dragging ? "none" : "margin-bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
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

        {step === "offer" ? <Offer /> : <GetApp />}
      </div>
    </>
  );
}

const BLUE = "#8CE4FF";
const SOFT = "rgba(255,255,255,0.7)";

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2
      id="app-sheet-title"
      className="text-[28px] font-bold leading-[1.12] text-white desk:text-[34px]"
      style={{ letterSpacing: "-0.6px" }}
    >
      {children}
    </h2>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-[8px] text-[17px] leading-[24px]" style={{ color: SOFT }}>
      {children}
    </p>
  );
}

const pill =
  "flex h-[54px] w-full items-center justify-center gap-[10px] rounded-full border-none text-[17px] font-semibold no-underline press";

function NotNow({ children = "Not now", onClick = closeAppSheet }: { children?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-[8px] flex h-[44px] w-full items-center justify-center border-none bg-transparent text-[17px]
                 font-medium press"
      style={{ color: SOFT }}
    >
      {children}
    </button>
  );
}

/* The app's offer, word for word, with the app as its yes. */
function Offer() {
  return (
    <div className="mt-[12px] flex flex-col">
      {/* The notification as the app books it (VerseNotifications.swift). */}
      <div
        className="flex items-start gap-[12px] rounded-[22px] p-[14px] text-white"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        aria-label="Your verse of the day is here. Tap to watch."
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" width={38} height={38} className="flex-shrink-0 rounded-[9px]" />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]" aria-hidden>
          {/* Wraps rather than truncating where the time leaves it short. */}
          <span className="flex items-baseline justify-between gap-[8px]">
            <span className="text-[15px] font-semibold leading-[20px]">Your verse of the day is here</span>
            <span className="flex-shrink-0 text-[13px]" style={{ color: "rgba(255,255,255,0.55)" }}>
              6:00
            </span>
          </span>
          <span className="text-[15px] leading-[20px]">Tap to watch.</span>
        </span>
      </div>

      <div className="mt-[28px]">
        <Title>Start tomorrow with hope</Title>
      </div>
      <Body>Get the Dafod app and wake up to a new verse every morning. One notification a day, nothing else.</Body>

      <button
        type="button"
        onClick={openGetApp}
        className={`${pill} mt-[28px] text-black`}
        style={{ backgroundColor: BLUE }}
      >
        Get the app
      </button>
      <NotNow />
    </div>
  );
}

/*
 * Every Get app button's sheet: both stores, the reader's own first. The
 * buttons are plain pills in the sheet's own style, not the stores' badges.
 */
function GetApp() {
  const android = onAndroid();
  const went = () => {
    wentToAppStore();
    closeAppSheet();
  };
  const primary = { className: `${pill} text-[#111111]`, style: { backgroundColor: "#EDEDED" } };
  const secondary = { className: `${pill} text-white`, style: { backgroundColor: "rgba(255,255,255,0.1)" } };

  const appStore = (
    <a key="ios" href={APP_STORE_URL} onClick={went} {...(android ? secondary : primary)}>
      <AppleIcon height={20} />
      Download on the App Store
    </a>
  );
  const googlePlay = (
    <a key="android" href={PLAY_STORE_URL} onClick={went} {...(android ? primary : secondary)}>
      <AndroidIcon />
      Get it on Google Play
    </a>
  );

  return (
    <div className="mt-[12px] flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={64} height={64} className="rounded-[15px]" />
      <div className="mt-[20px]">
        <Title>Get the Dafod app</Title>
      </div>
      <Body>A new verse every morning, saved films and the whole Bible, free on iPhone and Android.</Body>
      <div className="mt-[28px] flex flex-col gap-[10px]">
        {android ? [googlePlay, appStore] : [appStore, googlePlay]}
      </div>
      <NotNow />
    </div>
  );
}
