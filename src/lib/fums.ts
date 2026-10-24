/*
 * FUMS — API.Bible's Fair Use Management System.
 *
 * The licence for NIV, NKJV and NLT asks every WEB app to report each time
 * their text is shown, so the publishers can see what is read. Each chapter
 * comes back from our route with a token (lib/apiBible.ts); showing it means
 * sending that token here.
 *
 * Reported by hand rather than with their tracker script: it is the same GET
 * the script makes, without loading third-party code into every page. It
 * carries the token, a random id for this browser and one for this visit —
 * never the account, which the protocol leaves optional. The privacy page says
 * so (app/privacy).
 */

const DEVICE_KEY = "dafod.fums.device";
const SESSION_KEY = "dafod.fums.session";

/** Tokens already reported on this page, so a re-render is not a second view. */
const reported = new Set<string>();

function storedId(storage: () => Storage, key: string): string {
  try {
    const s = storage();
    const existing = s.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    s.setItem(key, id);
    return id;
  } catch {
    // Storage blocked (a private window): a throwaway id still counts the view.
    return crypto.randomUUID();
  }
}

/** Report that the text these tokens came with is on screen. Tokens may be null. */
export function reportScriptureView(...tokens: (string | null | undefined)[]) {
  if (typeof window === "undefined") return;
  const fresh = tokens.filter((t): t is string => !!t && !reported.has(t));
  if (!fresh.length) return;
  fresh.forEach((t) => reported.add(t));

  const params = new URLSearchParams();
  fresh.forEach((t) => params.append("t", t));
  params.set("dId", storedId(() => localStorage, DEVICE_KEY));
  params.set("sId", storedId(() => sessionStorage, SESSION_KEY));
  // Fire and forget: a lost report must never get in the way of reading.
  fetch(`https://fums.api.bible/f3?${params}`, {
    mode: "no-cors",
    credentials: "omit",
    keepalive: true,
  }).catch(() => {});
}
