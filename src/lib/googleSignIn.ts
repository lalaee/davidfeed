import { supabase } from "./supabase";

/*
 * Google sign-in through Google's own button, not a redirect via Supabase.
 *
 * The redirect flow sends the reader to Google with Supabase's callback as the
 * return address, and Google names that address on its account chooser —
 * "to continue to ulmptivzgvcpbygpkkfv.supabase.co", which reads like a
 * phishing page. Google Identity Services instead runs on this page: Google
 * returns an ID token here, names this site ("dafod.app", or "Dafod" once the
 * brand is verified), and Supabase is handed the token directly with
 * signInWithIdToken. No round trip, so a held save is applied on the spot.
 *
 * Google's terms require its own rendered button for this flow, which is why
 * the sheet shows Google's pill rather than one drawn to match Apple's.
 *
 * The nonce: Google is given the SHA-256 of a random string and bakes it into
 * the token; Supabase is given the string itself and checks the two agree, so
 * a token lifted from somewhere else cannot be replayed here.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    nonce?: string;
    ux_mode?: "popup" | "redirect";
    use_fedcm_for_button?: boolean;
    itp_support?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

export const googleButtonAvailable = Boolean(CLIENT_ID);

let loading: Promise<GoogleId> | null = null;

function loadGis(): Promise<GoogleId> {
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () =>
      window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("GIS missing"));
    script.onerror = () => reject(new Error("GIS failed to load"));
    document.head.appendChild(script);
  }).catch((error) => {
    // Let the next sheet try again rather than caching the failure.
    loading = null;
    throw error;
  });
  return loading;
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Draws Google's button into `parent`. Resolves once it is drawn; rejects if
 * Google's script cannot load, so the caller can fall back to the redirect.
 * `onError` reports a sign-in that Google completed but Supabase refused.
 */
export async function renderGoogleButton(
  parent: HTMLElement,
  width: number,
  onError: (message: string) => void,
) {
  const sb = supabase();
  if (!CLIENT_ID || !sb) throw new Error("Google sign-in is not configured.");
  const id = await loadGis();
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const hashed = await sha256Hex(raw);
  id.initialize({
    client_id: CLIENT_ID,
    nonce: hashed,
    ux_mode: "popup",
    use_fedcm_for_button: true,
    itp_support: true,
    callback: async ({ credential }) => {
      const { error } = await sb.auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
      // Success needs no handling here: the session change reaches
      // lib/auth.ts, which closes the sheet and applies the held save.
      if (error) onError("Google sign-in didn't go through. Try again.");
    },
  });
  parent.replaceChildren();
  id.renderButton(parent, {
    type: "standard",
    theme: "filled_black",
    size: "large",
    shape: "pill",
    text: "continue_with",
    logo_alignment: "center",
    // Google caps the width at 400.
    width: Math.min(400, Math.round(width)),
  });
}
