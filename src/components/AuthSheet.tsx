"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { CloseIcon } from "./icons";
import {
  authSheetStore,
  authStore,
  closeAuthSheet,
  signIn,
  signOut,
  startAuth,
} from "@/lib/auth";
import { googleButtonAvailable, renderGoogleButton } from "@/lib/googleSignIn";

/*
 * Sign in, or — for a reader already signed in — who they are and the way out.
 *
 * Mounted once in the root layout, like the bottom nav, and opened from
 * anywhere through authSheetStore: by a save or highlight made while signed
 * out (lib/auth.ts `gated`), or by the Library's account button.
 *
 * Built from the Bible reader's sheet card rather than a new surface: #0E0E0E
 * at radius 18.8333, 24/16 padding, the 48 #212121 close circle and Inter Semi
 * Bold 17 title of BooksSheet, floating 8 above the bottom edge. Unlike those
 * sheets it dims the page — it interrupts something the reader just tried to
 * do, and the dim says the page is waiting on this.
 *
 * The provider buttons follow each provider's own rules rather than the app's
 * palette: Apple's is white with its logo and "Continue with Apple" (an
 * allowed title in the HIG). Google's is Google's own, drawn by its script
 * (lib/googleSignIn.ts) so its account chooser names dafod.app rather than the
 * Supabase callback; it is 40 tall at "large", the tallest Google draws, so
 * Apple's is cut to 40 to sit with it.
 *
 * There is deliberately no redirect fallback for Google. The redirect returns
 * through the Supabase callback, which made Google list supabase.co as an
 * authorised domain — one this app can never prove it owns, and so a domain
 * that would fail Google's brand verification. If Google's script cannot load
 * (a blocker, no network), a drawn stand-in says so instead.
 */
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
  const [busy, setBusy] = useState<"apple" | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Escape closes it, as it closes the other sheets.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const close = () => {
    setError(null);
    setBusy(null);
    closeAuthSheet();
  };

  const go = async (provider: "apple") => {
    setError(null);
    setBusy(provider);
    try {
      // Leaves the page on success, so there is nothing to reset after.
      await signIn(provider);
    } catch {
      setBusy(null);
      setError("Couldn't reach sign-in. Try again in a moment.");
    }
  };

  const leave = async () => {
    setBusy("out");
    await signOut();
    setBusy(null);
    closeAuthSheet();
  };

  const signedIn = auth.status === "signedIn" ? auth.reader : null;

  return (
    <>
      <div
        className="animate-fade-in fixed inset-0 z-[10000] bg-black/40"
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-sheet-title"
        className="animate-slide-up fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[10001]
                   flex w-[calc(100%-42px)] max-w-[348px] -translate-x-1/2 flex-col gap-[32px]
                   rounded-[18.8333px] px-[16px] py-[24px]"
        style={{ backgroundColor: "#0E0E0E" }}
      >
        <div className="flex h-[48px] flex-shrink-0 items-center gap-[10px]">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-[48px] w-[48px] flex-shrink-0 items-center justify-center rounded-full
                       border-none text-white press"
            style={{ backgroundColor: "#212121" }}
          >
            <CloseIcon size={20} />
          </button>
          <p
            id="auth-sheet-title"
            className="min-w-0 flex-1 text-[17px] font-semibold leading-[25.5px] text-white"
          >
            {signedIn ? "Your account" : "Sign in"}
          </p>
        </div>

        {signedIn ? (
          <div className="flex flex-col gap-[24px]">
            <div className="flex flex-col gap-[4px]">
              {signedIn.name && (
                <p className="text-[18px] font-normal leading-[27px] text-white">{signedIn.name}</p>
              )}
              {signedIn.email && (
                <p className="text-[15px] font-medium leading-[18px]" style={{ color: "#999999" }}>
                  {signedIn.email}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={leave}
              disabled={busy !== null}
              className="flex h-[52px] w-full items-center justify-center rounded-full border-none
                         text-[17px] font-semibold text-white press disabled:opacity-60"
              style={{ backgroundColor: "#212121" }}
            >
              {busy === "out" ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[24px]">
            <p className="text-[18px] font-normal leading-[27px]" style={{ color: "#999999" }}>
              Sign in to save films and verses and keep your highlights, on every device.
            </p>
            <div className="flex flex-col gap-[10px]">
              <button
                type="button"
                onClick={() => go("apple")}
                disabled={busy !== null}
                className="flex h-[40px] w-full items-center justify-center gap-[8px] rounded-full border-none
                           bg-white text-[15px] font-medium text-black press disabled:opacity-60"
              >
                <AppleLogo />
                {busy === "apple" ? "Opening Apple…" : "Continue with Apple"}
              </button>
              <GoogleButton onError={setError} />
            </div>
            <p className="text-[13px] font-medium leading-[18px]" style={{ color: "#999999" }}>
              We keep only your name, email and Library.{" "}
              <Link href="/privacy" onClick={close} className="text-white underline">
                Privacy
              </Link>
            </p>
            {error && (
              <p role="alert" className="text-[15px] font-medium leading-[18px] text-[#FF6B6B]">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* Google's own button. The 40px box is held while the script loads, so the
   sheet does not jump when it lands. When the script cannot load, a drawn
   button in its place explains rather than doing nothing. */
function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!googleButtonAvailable);

  useEffect(() => {
    const el = ref.current;
    if (!el || failed) return;
    renderGoogleButton(el, el.clientWidth, onError).catch(() => setFailed(true));
  }, [failed, onError]);

  if (failed) {
    return (
      <button
        type="button"
        onClick={() =>
          onError("Google sign-in couldn't load here. Allow accounts.google.com, or continue with Apple.")
        }
        className="flex h-[40px] w-full items-center justify-center gap-[10px] rounded-full border-none
                   text-[15px] font-medium text-white press"
        style={{ backgroundColor: "#212121" }}
      >
        <GoogleLogo />
        Continue with Google
      </button>
    );
  }
  return <div ref={ref} className="flex h-[40px] w-full justify-center overflow-hidden rounded-full" />;
}

function AppleLogo() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden fill="currentColor">
      <path d="M14.06 10.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.59-.03-.01-2.41-.93-2.43-3.65ZM11.78 3.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.76-.96 2.79 1.02.08 2.06-.52 2.69-1.27Z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
