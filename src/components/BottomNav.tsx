"use client";

import Link from "next/link";
import LiquidGlass from "./LiquidGlass";

/*
 * Built verbatim from the `Nav` component set in Dafod Reels (Figma 2619:485),
 * sitting on the iOS 26 Liquid Glass pane (see LiquidGlass.tsx).
 *
 * The design was uniformly scaled by 1.190476x (100/84) after the first pass,
 * which is why these are fractional: every value below is the Figma number, not
 * a rounded approximation.
 *
 * Container      296.4x75, radius 47.619, no effects
 *                horizontal auto-layout, padding 4.762/38.095, gap 47.619, top-aligned
 *
 *                Side padding is tightened to 30px from Figma's 38.095, and the
 *                width is left to fit-content so the padding actually drives it.
 *                At a fixed 296.4 with justify-center the two cancel out and
 *                changing the padding does nothing visible.
 *
 *                30px is close to the floor. nav.selected overhangs its 41.7
 *                item by (91.3-41.7)/2 = 24.8 each side and the label band by
 *                25, so below ~25.2 they start poking out of the bar.
 *
 * Navicon        41.7x65.5, sitting at y=4.8 in the container
 * nav.selected   91.3x64.3 at x=-25.2 y=0.3, radius 57.143
 *                fill #4F544E at 50% — a deliberate departure from Figma's flat
 *                rgb(86,86,86); the slight green cast and the 50% transparency
 *                let the glass behind the marker read through instead of
 *                flattening it into an opaque slab.
 * icon           23.8x23.8 at x=8.5 y=10.7
 * label          Inter 11.905px, Medium when active / Regular when inactive,
 *                letter-spacing 2%, centred, white; band 91.7 wide at y=40.5
 *
 * Figma's flat rgba(38,38,38,0.641) fill moves onto the glass pane rather than
 * the wrapper — a wrapper background would paint UNDERNEATH the pane (negative
 * z-index children paint after the stacking context's own background) and the
 * pane's tint would then stack on top of it, doubling the darkness. See the
 * .bottom-nav-glass rules in globals.css.
 *
 * radius 47.619 exceeds half the 75px height, so the pill is fully rounded at
 * 37.5 either way; LiquidGlass clamps it to min(w,h)/2 when building the
 * displacement map.
 *
 * The pill and the label are both ~91.5 wide inside a 41.7-wide item, so they
 * overflow ~25px each side. That is how the design is drawn — clipsContent is
 * false on both the item and the container — so they are positioned absolutely
 * and allowed to overflow rather than being forced to fit. The widest overflow
 * still lands 12.9px inside the container, so nothing clips.
 *
 * Neighbouring bands do graze each other, so both the pill and the label carry
 * pointer-events-none; without it one tab's label can swallow taps aimed at the
 * next tab's icon.
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
    <nav className="fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 z-[9999] -translate-x-1/2">
      <LiquidGlass
        radius={47.619}
        depth={10}
        strength={60}
        chromaticAberration={4}
        blur={4}
        className="bottom-nav-glass flex h-[75px] w-fit items-start justify-center
                   gap-[47.619px] rounded-[47.619px] px-[30px] py-[4.762px]"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="relative block h-[65.5px] w-[41.7px] flex-shrink-0 no-underline"
            >
              {/* nav.selected — the pill behind the active tab */}
              {isActive && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-[-25.2px] top-[0.3px] h-[64.3px] w-[91.3px] rounded-[57.143px]"
                  style={{ backgroundColor: "rgba(79, 84, 78, 0.5)" }}
                />
              )}
              <img
                src={isActive ? tab.active : tab.inactive}
                alt=""
                width={24}
                height={24}
                className="pointer-events-none absolute left-[8.5px] top-[10.7px] h-[23.8px] w-[23.8px]"
              />
              <span
                className={`pointer-events-none absolute left-[-25px] top-[40.5px] block h-[14px] w-[91.7px]
                            text-center leading-none text-white ${isActive ? "font-medium" : "font-normal"}`}
                style={{ fontSize: "11.905px", letterSpacing: "0.02em" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </LiquidGlass>
    </nav>
  );
}
