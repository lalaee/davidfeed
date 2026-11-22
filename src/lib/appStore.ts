/** The iPhone app's App Store page. */
export const APP_STORE_URL = "https://apps.apple.com/us/app/dafod/id6826595194";

/** The Android app's Google Play page (package app.dafod). */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.dafod";

/**
 * Whether this browser is on an Android phone or tablet, so the app sheet can
 * put Google Play first. Client only: the sheet renders after a tap.
 */
export function onAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}
