"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { NavBibleIcon, NavHomeIcon, NavLibraryIcon } from "./icons";
import { navHiddenStore } from "@/lib/uiStore";

/*
 * Built verbatim from the `Nav` instance in Dafod Reels (Figma 2623:939, an
 * instance of Type=Home). Values are fractional because the component set was
 * scaled by 1.190476x (100/84); each one is the Figma number, not a rounding.
 *
 * The glass is gone. This was a LiquidGlass pane with a translucent tint and a
 * drop shadow; the design is now a flat, fully opaque black pill with no
 * effects at all, so the pane, its backdrop-filter chain and the
 * .bottom-nav-glass overrides have been removed. LiquidGlass itself stays in
 * the codebase but nothing renders it now: BibleReader's compact Read/Listen
 * pills were its last caller, and they went with the toggle.
 *
 * Container      281x75, radius 47.619, no effects. Figma says #000000; the
 *                shipped fill is #0E0E0E, lifted off pure black by eye so the
 *                pill reads as a surface over dark artwork instead of a hole
 *                in it. The #212121 selected pill is measured against this.
 *                horizontal auto-layout, gap 47.619, top-aligned
 *
 *                Figma declares 38.095 side padding, but the frame is FIXED at
 *                281 with primaryAxisAlignItems CENTER, so the content centres
 *                and the EFFECTIVE inset is 30.381 — that is the number to
 *                build against. width:fit-content with 30.381 reproduces 281
 *                exactly: 3*41.667 + 2*47.619 + 2*30.381 = 281.
 *
 * Navicon        41.667x65.476, at y=4.762 (so 4.762 + 65.476 + 4.762 = 75)
 * nav.selected   91.31x64.286 at x=-25.25 y=0.262, radius 57.143, fill #212121
 * icon           23.81x23.81 at x=8.5 y=10.714
 * label          Inter 11.9048, Medium when active / Regular when inactive,
 *                letter-spacing 2%, centred, white; band 91.667 at y=40.476
 *
 * The pill and label are ~91.5 wide inside a 41.667 item, so they overflow
 * ~25px each side. That is how the design is drawn — clipsContent is false on
 * both the item and the container. Neighbouring bands graze each other, so
 * both carry pointer-events-none; without it one tab's label swallows taps
 * aimed at the next tab's icon.
 *
 * THE GLIDING SELECTOR — the iOS 26 tab bar's one moving capsule.
 *
 *   iOS draws the selected-tab highlight as a single "system-standard"
 *   capsule that travels to the tab you choose (Apple, devforums 821539; it
 *   even moves to the PRESSED tab before you let go). This used to be three
 *   pills, one inside each tab, mounted and unmounted with `isActive` — so a
 *   tab change was a hard cut, and there was nothing to animate between.
 *
 *   Now there is ONE pill, a sibling of the tabs rather than a child of the
 *   active one, and it moves by `translate` (the independent property — a
 *   transform would fall into the Tailwind trap this codebase has hit twice).
 *   Its rest position is the design's own: the old per-tab pill sat at
 *   x=-25.25 inside a tab that starts at the 30.381 padding, so the shared
 *   pill starts at 30.381 - 25.25 = 5.131, and moves one tab pitch — 41.667
 *   plus the 47.619 gap, 89.286 — per index. y is 4.762 + 0.262 = 5.024.
 *   Measured: the Bible tab's pill lands where it always did, to the pixel.
 *
 *   For anything to glide, the nav has to SURVIVE the navigation. So it is
 *   rendered once from the root layout — "on navigation, layouts preserve
 *   state, remain interactive, and do not rerender" (Next docs) — and reads
 *   the active tab from the pathname rather than being told by each page. A
 *   page that needs the slot (the reader's sheets) raises navHiddenStore.
 *
 *   420ms on the app's iOS curve, no overshoot. The one published port of the
 *   native bar slides on a 420ms spring at damping 0.82 — a whisper of settle
 *   — and Apple's own default since iOS 17 is 0.55s at 0.825; both are near
 *   critical. A transition and not an animation: the position changes in
 *   STEPS, which the header-morph note says is the one case a transition is
 *   for. The whole thing is one property on one element, so it composites.
 */

export type TabKey = "home" | "bible" | "library";

export const TABS = [
  { key: "home", href: "/", label: "Home", Icon: NavHomeIcon },
  { key: "bible", href: "/bible", label: "Bible", Icon: NavBibleIcon },
  { key: "library", href: "/library", label: "Library", Icon: NavLibraryIcon },
] as const;

/** /bible and /bible/psalms/46 are both the Bible; /library/27 is the Library. */
export function tabForPath(pathname: string): TabKey {
  if (pathname.startsWith("/bible")) return "bible";
  if (pathname.startsWith("/library")) return "library";
  return "home";
}

/** One tab pitch: item width plus the gap. */
const PITCH = 41.667 + 47.619;

export default function BottomNav() {
  const pathname = usePathname();
  const activeTab = tabForPath(pathname ?? "/");
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.key === activeTab));
  const hidden = useSyncExternalStore(
    navHiddenStore.subscribe,
    navHiddenStore.read,
    navHiddenStore.serverSnapshot,
  );
  if (hidden) return null;

  return (
    <nav
      // Read by the Bible reader to find the floor its action bar must stay
      // above. DesktopNav renders a <nav> too, and earlier in the document.
      data-bottom-nav
      aria-label="Main"
      className="fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[9999] flex h-[75px] w-fit
                 -translate-x-1/2 items-start justify-center gap-[47.619px] rounded-[47.619px]
                 px-[30.381px] py-[4.762px] desk:hidden"
      style={{ backgroundColor: "#0E0E0E" }}
    >
      {/* nav.selected — ONE pill, travelling. Under the tabs in paint order
          so their icons and labels sit on top of it. */}
      <span
        aria-hidden
        data-nav-selected
        className="pointer-events-none absolute left-[5.131px] top-[5.024px] h-[64.286px] w-[91.31px] rounded-[57.143px]"
        style={{
          backgroundColor: "#212121",
          translate: `${activeIndex * PITCH}px 0`,
        }}
      />
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className="relative block h-[65.476px] w-[41.667px] flex-shrink-0 no-underline"
          >
            {/* Inline, not <img>. A failed request used to leave a
                broken-image box sitting in the nav with the label still under
                it; there is nothing to request now. */}
            <span className="pointer-events-none absolute left-[8.5px] top-[10.714px] block text-white">
              <tab.Icon active={isActive} size={23.81} />
            </span>
            <span
              className={`pointer-events-none absolute left-[-25.43px] top-[40.476px] block h-[14px] w-[91.667px]
                          text-center leading-none text-white ${isActive ? "font-medium" : "font-normal"}`}
              style={{ fontSize: "11.9048px", letterSpacing: "0.02em" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
