"use client";

import Link from "next/link";

import { TABS, type TabKey } from "./BottomNav";

/*
 * The desktop top bar, shared by every page at 1028 and up.
 *
 * Figma "Navigation - Desktop Global Navigation" 2669:10922, and the same
 * instance again inside "Bible Deskop view" 2669:17047 — which is what settles
 * that it is one component whose filled pill follows the page rather than a
 * bar drawn per screen.
 *
 *   bar       1440x97, #000000, 1px #212121 rule along the bottom
 *   wordmark  "Dafod" at x=48, Zalando Sans Expanded SemiBold 24.55, -2%
 *   pills     170x64 at radius 50, 21 apart, ending 86.27 from the right
 *   inside    icon beside label, 6 gap, 16/12 padding — 32px icon, Inter
 *             Medium 18 at 2%
 *   active    a #212121 fill and nothing else. Every pill is named
 *             "Navicon/active" in the file, so the fill marks the current tab,
 *             not the name.
 */
export default function DesktopNav({ activeTab }: { activeTab: TabKey }) {
  return (
      <header
        className="fixed inset-x-0 top-0 z-[500] hidden h-[97px] items-center justify-between
                   desk-bar desk:flex"
        style={{ backgroundColor: "#000000", borderBottom: "1px solid #212121" }}
      >
        <span
          className="text-[24.55px] leading-none text-white"
          style={{ fontFamily: "var(--font-wordmark)", fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Dafod
        </span>

        <nav className="flex items-center gap-[21px]">
          {TABS.map((tab) => (
            <NavPill key={tab.key} tab={tab} active={activeTab === tab.key} />
          ))}
        </nav>
      </header>
  );
}

/*
 * A desktop nav tab. 170x64 at radius 50, icon and label side by side, and a
 * #212121 fill only when it is the current tab.
 */
function NavPill({
  tab,
  active,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
}) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className="flex h-[64px] w-[170px] items-center justify-center gap-[6px] rounded-[50px]
                 px-[12px] py-[16px] text-white no-underline
                 transition-[background-color,transform] duration-[190ms]
                 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
      style={{ backgroundColor: active ? "#212121" : "transparent" }}
    >
      <span className="flex flex-shrink-0">
        <tab.Icon active={active} size={32} />
      </span>
      <span
        className="whitespace-nowrap text-[18px] font-medium leading-[22px]"
        style={{ letterSpacing: "0.02em" }}
      >
        {tab.label}
      </span>
    </Link>
  );
}
