/*
 * THE APP STRIP — the phone web's invitation to the iOS app, across the top
 * of every page, in the shape of Safari's Smart App Banner: the icon, the name
 * and what it is, and one button. It cannot be closed, by request.
 *
 * Phone widths only (globals.css hides it at desk, where the hero carries
 * its own Download app pill). It takes real room rather than floating over
 * the page: --strip-h is its height there, and every page shell is --app-h
 * tall — 100dvh less the strip — so nothing is covered and the feed's card
 * still fits above the nav.
 *
 * Get opens the app's App Store page (lib/appStore.ts).
 */
import { APP_STORE_URL } from "@/lib/appStore";

export default function AppStrip() {
  return (
    <aside className="app-strip" aria-label="Get the Dafod app">
      {/* The app icon, as the home screen shows it (app/icon.png). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={36} height={36} className="app-strip-icon" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold leading-[19px] text-white">Dafod</span>
        <span className="truncate text-[13px] font-medium leading-[17px]" style={{ color: "#999999" }}>
          Get the app for iPhone
        </span>
      </span>
      <a href={APP_STORE_URL} className="app-strip-get press">
        Get
      </a>
    </aside>
  );
}
