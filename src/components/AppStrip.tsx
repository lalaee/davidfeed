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
 * Dafod is not on the App Store yet (ios/HANDOFF.md). Until
 * NEXT_PUBLIC_APP_STORE_URL is set the button reads "Soon" and goes nowhere,
 * the rule the desktop pill follows, rather than linking to a store search
 * that finds nothing.
 */
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || undefined;

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
      {APP_STORE_URL ? (
        <a href={APP_STORE_URL} className="app-strip-get press">
          Get
        </a>
      ) : (
        <span className="app-strip-get" aria-disabled title="Coming soon to the App Store" style={{ opacity: 0.6 }}>
          Soon
        </span>
      )}
    </aside>
  );
}
