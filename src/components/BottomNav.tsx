"use client";

import Link from "next/link";

/*
 * Built verbatim from the `Nav` component set in Dafod Reels (Figma 2619:485).
 *
 * Container      249x63, radius 40, fill rgb(38,38,38) @ 64.1%, no effects
 *                horizontal auto-layout, padding 4/32, gap 40, align top
 * Navicon        35x55, sitting at y=4 in the container
 * nav.selected   76.7x54 at x=-20.8 y=0.5, radius 48, fill rgb(86,86,86)
 * icon           20x20 at x=7.5 y=9
 * label          Inter 10px, Medium when active / Regular when inactive,
 *                letter-spacing 2%, centred, white; band 77 wide at y=34
 *
 * The pill and the label are both 77 wide inside a 35-wide item, so they
 * overflow ~21px each side. That is how the design is drawn — clipsContent is
 * false on both the item and the container — so they are positioned absolutely
 * and allowed to overflow rather than being forced to fit.
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
      className="fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2
                 z-[9999] flex h-[63px] w-[249px] items-start justify-center gap-[40px]
                 rounded-[40px] px-[32px] py-[4px]"
      style={{ backgroundColor: "rgba(38, 38, 38, 0.641)" }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className="relative block h-[55px] w-[35px] flex-shrink-0 no-underline"
          >
            {/* nav.selected — the pill behind the active tab */}
            {isActive && (
              <span
                aria-hidden
                className="absolute left-[-20.8px] top-[0.5px] h-[54px] w-[76.7px] rounded-[48px]"
                style={{ backgroundColor: "rgb(86, 86, 86)" }}
              />
            )}
            <img
              src={isActive ? tab.active : tab.inactive}
              alt=""
              width={20}
              height={20}
              className="pointer-events-none absolute left-[7.5px] top-[9px] h-[20px] w-[20px]"
            />
            <span
              className={`absolute left-[-21px] top-[34px] block h-[12px] w-[77px] text-center
                          text-[10px] leading-none text-white ${isActive ? "font-medium" : "font-normal"}`}
              style={{ letterSpacing: "0.02em" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
