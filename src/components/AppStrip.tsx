/*
 * THE APP STRIP — the phone web's invitation to the iOS app, across the top
 * of every page, in the shape of Safari's Smart App Banner: the icon, what
 * the app gives that the site cannot, and one button. It cannot be closed, by
 * request. The copy leads with the benefit, not the name (the icon carries
 * that): the app's "Verse of the day" notification, booked for 6am every
 * morning (ios/…/Feed/VerseNotifications.swift). The copy is the owner's.
 *
 * Phone widths only (globals.css hides it at desk, where the hero carries
 * its own Download app pill). It takes real room rather than floating over
 * the page: --strip-h is its height there, and every page shell is --app-h
 * tall — 100dvh less the strip — so nothing is covered and the feed's card
 * still fits above the nav.
 *
 * "Get app", with the Apple mark, opens the App Store page (lib/appStore.ts).
 */
import { AppleIcon } from "./icons";
import { APP_STORE_URL } from "@/lib/appStore";

export default function AppStrip() {
  return (
    <aside className="app-strip" aria-label="Get the Dafod app">
      {/* The app icon, as the home screen shows it (app/icon.png). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={36} height={36} className="app-strip-icon" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold leading-[19px] text-white">
          Start your day with hope
        </span>
        {/* Two lines where a phone is too narrow for one, at 16 a line so
            the three still sit inside the strip's 56. */}
        <span className="line-clamp-2 text-[13px] font-medium leading-[16px]" style={{ color: "#999999" }}>
          Wake up to a new verse every morning
        </span>
      </span>
      <a href={APP_STORE_URL} className="app-strip-get press">
        <AppleIcon height={16} />
        Get app
      </a>
    </aside>
  );
}
