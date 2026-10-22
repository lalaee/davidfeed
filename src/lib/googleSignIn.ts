import { supabase } from "./supabase";

/*
 * Google sign-in from our own button, through a dafod.app return address.
 *
 * Two things this has to avoid. The Supabase redirect flow returns through
 * Supabase's callback, and Google names that address on its account chooser
 * — "to continue to ulmptivzgvcpbygpkkfv.supabase.co" — and lists supabase.co
 * as an authorised domain, which fails Google's brand verification. Google's
 * own rendered button (Identity Services) fixed that, but it is an iframe we
 * cannot style: its dark theme sits the G in a white disc, and it cannot be
 * made the sheet's primary, white button.
 *
 * So the button is ours, and it sends the reader to Google's OpenID Connect
 * endpoint asking for an ID token straight back to /auth/google on this site
 * (response_type=id_token). Google names dafod.app — "Dafod", with the brand
 * verified — and the callback page hands the token to Supabase with
 * signInWithIdToken. No secret is involved: an ID token is verified by its
 * signature, the audience (our client ID) and the nonce.
 *
 * The nonce: Google is given the SHA-256 of a random string and bakes it into
 * the token; Supabase is given the string itself and checks the two agree, so
 * a token lifted from somewhere else cannot be replayed here. The state guards
 * the return trip the same way. Both wait in localStorage, because the trip
 * normally runs in a NEW TAB (the sheet opens one), and a new tab does not
 * share this one's sessionStorage. The callback signs in there and closes;
 * Supabase broadcasts the session back to this tab, where the held save is
 * applied (lib/auth.ts).
 *
 * Google's branding rules allow a button of our own: the standard four-colour
 * G, unaltered, and "Continue with Google". On the light theme it sits on
 * white with no container of its own.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const KEY = "dafod.googleSignIn";
/** Where Google sends the reader back to. Registered on the OAuth client. */
export const GOOGLE_CALLBACK_PATH = "/auth/google";

export const googleSignInAvailable = Boolean(CLIENT_ID);

interface Pending {
  nonce: string;
  state: string;
  returnTo: string;
}

function random() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sends `tab` (opened by the sheet in the click) to Google's account chooser,
 * or this page if the browser refused a tab.
 */
export async function startGoogleSignIn(tab: Window | null) {
  if (!CLIENT_ID) throw new Error("Google sign-in is not configured.");
  const pending: Pending = {
    nonce: random(),
    state: random(),
    returnTo: window.location.pathname + window.location.search,
  };
  localStorage.setItem(KEY, JSON.stringify(pending));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: window.location.origin + GOOGLE_CALLBACK_PATH,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: await sha256Hex(pending.nonce),
    state: pending.state,
    prompt: "select_account",
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  if (tab && !tab.closed) tab.location.href = url;
  else window.location.assign(url);
}

/**
 * On /auth/google: trades the returned ID token for a Supabase session and
 * says where to send the reader. Throws if the trip did not start here, was
 * cancelled at Google, or Supabase refused the token.
 */
export async function finishGoogleSignIn(): Promise<string> {
  let pending: Pending | null = null;
  try {
    pending = JSON.parse(localStorage.getItem(KEY) ?? "null") as Pending | null;
    localStorage.removeItem(KEY);
  } catch {}
  const returned = new URLSearchParams(window.location.hash.slice(1));
  // Take the token out of the address bar and the history entry at once.
  window.history.replaceState(null, "", window.location.pathname);

  if (!pending || returned.get("state") !== pending.state) throw new Error("This sign-in did not start here.");
  const token = returned.get("id_token");
  if (!token) throw new Error(returned.get("error") ?? "Google did not return a token.");
  const sb = supabase();
  if (!sb) throw new Error("Sign-in is not configured.");
  const { error } = await sb.auth.signInWithIdToken({ provider: "google", token, nonce: pending.nonce });
  if (error) throw error;
  return pending.returnTo || "/";
}
