import { authSheetStore } from "./auth";
import { supabase } from "./supabase";
import { navHiddenStore } from "./uiStore";

/*
 * THE APP OFFER — the web's turn on the iPhone app's notification offer
 * (ios/…/Feed/NotificationOfferSheet.swift, VerseNotifications.shouldOffer).
 *
 * The app waits until the day's film has played through, then offers the 6am
 * "Verse of the day". The web cannot send that notification, so the same
 * moment offers the app that does: "offer" is that sheet, and its yes opens
 * "get", the sheet every Get app button opens (AppStrip, DesktopChrome's
 * Download app): the App Store for iPhone, and for Android, which has no app
 * yet, a list to join by email ("android").
 *
 * The app's pacing, kept in this browser: never twice inside three days,
 * three times at most, and never again once the reader has gone to the App
 * Store. Nothing is offered while another sheet is up.
 */

export type AppSheet = "offer" | "get" | "android" | null;

function makeStore<T>(initial: T) {
  const listeners = new Set<() => void>();
  let value = initial;
  return {
    read: () => value,
    serverSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: T) {
      if (Object.is(value, next)) return;
      value = next;
      listeners.forEach((l) => l());
    },
  };
}

export const appSheetStore = makeStore<AppSheet>(null);

export const openGetApp = () => appSheetStore.set("get");
export const closeAppSheet = () => appSheetStore.set(null);

const OFFERS_KEY = "dafod.appOffers";
const OFFERED_AT_KEY = "dafod.appOfferedAt";
const MAX_OFFERS = 3;
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Private mode: the offer just comes back sooner.
  }
}

/** A film has played to its end and looped: offer the app, if it is time to. */
export function filmPlayedThrough() {
  if (document.visibilityState !== "visible") return;
  if (appSheetStore.read() || authSheetStore.read() || navHiddenStore.read()) return;
  const offers = readNumber(OFFERS_KEY);
  if (offers >= MAX_OFFERS) return;
  if (Date.now() - readNumber(OFFERED_AT_KEY) < SNOOZE_MS) return;
  writeNumber(OFFERS_KEY, offers + 1);
  writeNumber(OFFERED_AT_KEY, Date.now());
  appSheetStore.set("offer");
}

/** The reader went to the App Store: the offer has done its work. */
export function wentToAppStore() {
  writeNumber(OFFERS_KEY, MAX_OFFERS);
}

/**
 * Puts an email on the Android list (supabase/migrations, android_waitlist).
 * Anyone may add a row and nobody may read one back, so an address already
 * there comes back as a duplicate key, which is as good as joining.
 */
export async function joinAndroidList(email: string): Promise<boolean> {
  const db = supabase();
  if (!db) return false;
  const { error } = await db.from("android_waitlist").insert({ email: email.trim().toLowerCase() });
  return !error || error.code === "23505";
}
