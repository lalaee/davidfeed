import type { PostHog } from "posthog-js";

/*
 * INNOVATION ACCOUNTING — the events PostHog (project "Dafod", US cloud) needs
 * to answer whether Dafod's bets are working: who arrives, who watches a film
 * through (activation), who comes back (retention), who passes a film on
 * (referral) and who goes to get the app (the app-install funnel).
 *
 * How it identifies, as the privacy page says (app/privacy):
 *   - a random ID kept in this browser's localStorage, no cookies
 *     (persistence: "localStorage");
 *   - the client IP discarded (the project's "Discard client IP data");
 *   - nothing at all from a browser that sends Do Not Track;
 *   - no session replay, no autocapture of clicks or text (verses are
 *     licensed text and stay out of it), no heatmaps or exception capture;
 *   - a signed-in reader joined to their account by its Supabase user id
 *     only, never their name or email.
 *
 * Only dafod.app reports. Localhost and Vercel previews load nothing, so the
 * numbers are readers, not us. `localStorage["dafod.analytics"] = "on"` turns
 * it on anywhere, to check a change before it ships (filter $host to drop
 * those events).
 *
 * The library (about 60KB) loads after the page, not with it, so it costs
 * the first paint nothing; what happens before it arrives is held and sent
 * when it does, in order, after the first pageview.
 *
 * The token is PostHog's public project key: it can only send events, and
 * every visitor's browser receives it anyway.
 */
const TOKEN = "phc_AVscpkN7iTDzBNJSZqoF4gPZ85M8Y22SHJoYb4dmubZp";
const HOST = "https://us.i.posthog.com";

function wanted(): boolean {
  const host = window.location.hostname;
  if (host === "dafod.app" || host === "www.dafod.app") return true;
  try {
    return localStorage.getItem("dafod.analytics") === "on";
  } catch {
    return false;
  }
}

let ph: PostHog | null = null;
let started = false;
const held: Array<(p: PostHog) => void> = [];

function withPostHog(fn: (p: PostHog) => void) {
  if (ph) fn(ph);
  else if (started) held.push(fn);
}

export function startAnalytics() {
  if (typeof window === "undefined" || started || !wanted()) return;
  started = true;
  void import("posthog-js").then(({ default: posthog }) => {
    init(posthog);
    ph = posthog;
    for (const fn of held.splice(0)) fn(posthog);
  });
}

function init(posthog: PostHog) {
  posthog.init(TOKEN, {
    api_host: HOST,
    ui_host: "https://us.posthog.com",
    defaults: "2026-08-30",
    persistence: "localStorage",
    person_profiles: "identified_only",
    autocapture: false,
    capture_dead_clicks: false,
    enable_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    // As the privacy page promises: a browser asking not to be tracked isn't.
    respect_dnt: true,
    loaded: (ph) => ph.register({ surface: "web" }),
  });
}

/** The events, one place, so the dashboards and the code agree on names. */
export type AnalyticsEvent =
  // Films (FeedItem): a card became the one on screen; it played to its end.
  | "film_viewed"
  | "film_completed"
  | "film_liked"
  | "film_saved"
  // Passing a film on (useShareVideo, ShareSheet) or a verse (BibleReader).
  | "film_shared"
  | "verse_shared"
  // The Bible reader.
  | "chapter_viewed"
  | "chapter_finished"
  | "translation_changed"
  | "verses_saved"
  | "verses_highlighted"
  // The app (appOffer, AppSheet, AppStrip, DesktopChrome).
  | "app_offer_shown"
  | "app_offer_declined"
  | "get_app_opened"
  | "store_clicked"
  // Accounts (auth.ts).
  | "sign_in_prompted"
  | "signed_in";

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  // A held event takes the time it is sent, a moment late, rather than when
  // it happened: stamped earlier, it would come before the first pageview
  // and break the funnels that start from it.
  withPostHog((p) => p.capture(event, properties));
}

/** A signed-in reader: their account id, nothing else about them. */
export function identifyReader(id: string) {
  withPostHog((p) => {
    if (p.get_distinct_id() !== id) p.identify(id);
  });
}

/** Signed out or deleted: the next reader on this browser starts fresh. */
export function forgetReader() {
  withPostHog((p) => p.reset());
}
