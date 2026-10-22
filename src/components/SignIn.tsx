"use client";

import { useState } from "react";

import { signIn } from "@/lib/auth";
import { startGoogleSignIn } from "@/lib/googleSignIn";

/*
 * Starting a sign-in, shared by the sign-in sheet (AuthSheet) and the
 * signed-out prompt on You (Library), which both offer Google and Apple.
 *
 * Sign-in runs in a NEW TAB, so the page — the film, the verse, the save the
 * reader was making — stays put behind it. The tab is opened here, in the
 * click, before anything is awaited: a tab opened after an await is a popup
 * the browser blocks. It starts blank and is sent on once the sign-in address
 * is ready. When it finishes it closes itself, Supabase hands this tab the
 * session, and lib/auth.ts takes it from there. If the browser refuses the
 * tab, sign-in runs in this one, as before.
 */
export type Provider = "apple" | "google";

export function useSignIn() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  const go = async (provider: Provider) => {
    setError(null);
    setBusy(provider);
    const tab = window.open("", "_blank");
    if (tab) {
      tab.document.title = "Signing in — Dafod";
      tab.document.body.style.background = "#000";
    }
    try {
      if (provider === "google") await startGoogleSignIn(tab);
      else await signIn(provider, tab);
      // With a tab, this page waits; say where the sign-in went.
      if (tab) setWaiting(true);
    } catch {
      tab?.close();
      setError("Couldn't reach sign-in. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setError(null);
    setBusy(null);
    setWaiting(false);
  };

  return { busy, error, waiting, go, reset };
}

/* Where the sign-in went, or why it did not. */
export function SignInStatus({ waiting, error }: { waiting: boolean; error: string | null }) {
  return (
    <>
      {waiting && !error && (
        <p role="status" className="mt-[8px] text-center text-[15px] font-medium leading-[20px] text-white">
          Finish signing in in the new tab. This page will update when you&apos;re done.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-[8px] text-center text-[15px] font-medium leading-[18px] text-[#FF6B6B]">
          {error}
        </p>
      )}
    </>
  );
}

export function AppleLogo() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden fill="currentColor">
      <path d="M14.06 10.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.59-.03-.01-2.41-.93-2.43-3.65ZM11.78 3.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.76-.96 2.79 1.02.08 2.06-.52 2.69-1.27Z" />
    </svg>
  );
}

export function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
