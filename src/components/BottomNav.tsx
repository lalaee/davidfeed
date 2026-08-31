"use client";

import Link from "next/link";

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
 */

interface BottomNavProps {
  activeTab?: "home" | "bible" | "library";
}

const TABS = [
  { key: "home", href: "/", label: "Home", active: "/assets/home-icon.svg", inactive: "/assets/home-inactive-icon.svg" },
  { key: "bible", href: "/bible", label: "Bible", active: "/assets/bible-active-icon.svg", inactive: "/assets/bible-icon.svg" },
  { key: "library", href: "/library", label: "Library", active: "/assets/library-active-icon.svg", inactive: "/assets/library-icon.svg" },
] as const;

export default function BottomNav({ activeTab = "home" }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[9999]
                 flex h-[75px] w-fit -translate-x-1/2 items-start justify-center
                 gap-[47.619px] rounded-[47.619px] px-[30.381px] py-[4.762px]"
      style={{ backgroundColor: "#0E0E0E" }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className="relative block h-[65.476px] w-[41.667px] flex-shrink-0 no-underline"
          >
            {/* nav.selected — the pill behind the active tab */}
            {isActive && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-[-25.25px] top-[0.262px] h-[64.286px] w-[91.31px] rounded-[57.143px]"
                style={{ backgroundColor: "#212121" }}
              />
            )}
            <img
              src={isActive ? tab.active : tab.inactive}
              alt=""
              width={24}
              height={24}
              className="pointer-events-none absolute left-[8.5px] top-[10.714px] h-[23.81px] w-[23.81px]"
            />
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
