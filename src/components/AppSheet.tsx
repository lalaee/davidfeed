"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { appSheetStore, closeAppSheet, joinAndroidList, openGetApp, wentToAppStore, type AppSheet as Step } from "@/lib/appOffer";
import { APP_STORE_URL } from "@/lib/appStore";
import { navHiddenStore } from "@/lib/uiStore";

import { AppleIcon } from "./icons";

/*
 * THE APP SHEET — mounted once in the root layout, like AuthSheet, and
 * driven by appSheetStore (lib/appOffer.ts). Three steps:
 *
 *   offer    after a film has played through: the iPhone app's notification
 *            offer (NotificationOfferSheet.swift), its preview of the 6am
 *            notification, its words, its blue yes — which here gets the app,
 *            since the app is what sends it.
 *   get      what every Get app button opens: the App Store for iPhone, and
 *            a way onto the Android list.
 *   android  Android has no app yet: an email, kept in android_waitlist, so
 *            we can write the day it's out.
 *
 * THE CONTAINER is AuthSheet's: the column less 21 a side, 740 at desk,
 * floating 8 above the bottom, the slide-up, the page receding behind it, the
 * nav stepping aside. Drag the grabber down, tap outside or press Escape to
 * close. Android goes to its own step from "get"'s second button; the App
 * Store is first and primary on every phone.
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

        {step === "offer" ? <Offer /> : step === "get" ? <GetApp /> : <Android />}
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

/* Every Get app button's sheet: the App Store first, on every phone. */
function GetApp() {
  const appStore = (
    <a
      href={APP_STORE_URL}
      onClick={() => {
        wentToAppStore();
        closeAppSheet();
      }}
      className={`${pill} text-[#111111]`}
      style={{ backgroundColor: "#EDEDED" }}
    >
      <AppleIcon height={20} />
      Download on the App Store
    </a>
  );
  const androidList = (
    <button
      type="button"
      onClick={() => appSheetStore.set("android")}
      className={`${pill} text-white`}
      style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
    >
      <AndroidIcon />
      On Android? Get notified
    </button>
  );

  return (
    <div className="mt-[12px] flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={64} height={64} className="rounded-[15px]" />
      <div className="mt-[20px]">
        <Title>Get the Dafod app</Title>
      </div>
      <Body>A new verse every morning, saved films and the whole Bible, free on iPhone. Android is on its way.</Body>
      <div className="mt-[28px] flex flex-col gap-[10px]">
        {appStore}
        {androidList}
      </div>
      <NotNow />
    </div>
  );
}

/* Android has no app yet: an email, to write once the day it's out. */
function Android() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <div className="mt-[12px] flex flex-col">
        <CheckRing />
        <div className="mt-[20px]">
          <Title>You&rsquo;re on the list</Title>
        </div>
        <Body>We&rsquo;ll email you once, the day Dafod is out on Android.</Body>
        <button
          type="button"
          onClick={closeAppSheet}
          className={`${pill} mt-[28px] text-[#111111]`}
          style={{ backgroundColor: "#EDEDED" }}
        >
          Done
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    setState((await joinAndroidList(email)) ? "done" : "error");
  };

  return (
    <form className="mt-[12px] flex flex-col" onSubmit={submit}>
      <AndroidIcon size={40} />
      <div className="mt-[20px]">
        <Title>Dafod is coming to Android</Title>
      </div>
      <Body>Leave your email and we&rsquo;ll write immediately it&rsquo;s out.</Body>

      <input
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        aria-label="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        className="mt-[24px] h-[54px] w-full rounded-[16px] border px-[18px] text-[17px] text-white outline-none
                   placeholder:text-white/40 focus:border-white/50"
        style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.14)" }}
      />
      {state === "error" && (
        <p role="alert" className="mt-[10px] text-[15px] font-medium" style={{ color: "#FF8A80" }}>
          Couldn&rsquo;t add you. Try again.
        </p>
      )}

      <button
        type="submit"
        disabled={state === "busy"}
        className={`${pill} mt-[16px] text-black disabled:opacity-60`}
        style={{ backgroundColor: BLUE }}
      >
        {state === "busy" ? "Adding…" : "Notify me"}
      </button>
      <NotNow onClick={openGetApp}>Back</NotNow>
    </form>
  );
}

/* AuthSheet's green check ring, larger. */
function CheckRing() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10.25" stroke="#30D158" strokeWidth="1.5" />
      <path d="M7.75 12.25l2.75 2.75 5.75-5.75" stroke="#30D158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* The Android robot's head, drawn plain (the mark itself is Google's). */
function AndroidIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className="flex-shrink-0">
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22A11.4 11.4 0 0 0 12 8.08c-1.77 0-3.43.4-4.92 1.06L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}
