"use client";

import Link from "next/link";

import { TABS, type TabKey } from "./BottomNav";
import LiquidGlass from "./LiquidGlass";

/*
 * The desktop top bar, shared by every page at 1028 and up.
 *
 * Figma "Navigation - Desktop Global Navigation" 2669:10922, and the same
 * instance again inside "Bible Deskop view" 2669:17047 — which is what settles
 * that it is one component whose filled pill follows the page rather than a
 * bar drawn per screen.
 *
 *   bar       1440x97. The frame's #000000 fill and its 1px #212121 rule
 *             are both gone — see the note on the element.
 *   wordmark  "Dafod" at x=48, Zalando Sans Expanded SemiBold 24.55, -2%
 *   pills     170x64 at radius 50, 21 apart, ending 86.27 from the right
 *             (now centred on the card's axis instead, see globals.css) —
 *             now 140x52, with a 26px icon and Inter Medium 16, asked down
 *             twice by eye once they became glass over the ambience: at the
 *             frame's size three panes read as a toolbar, not a nav
 *   inside    icon beside label, 6 gap, 12 side padding (was 32px icon,
 *             Inter Medium 18 at 2%)
 *   active    the frame marks it with a #212121 fill and nothing else. Every
 *             pill is named "Navicon/active" in the file, so the fill marks
 *             the current tab, not the name.
 *
 * THE PILLS ARE GLASS. With the bar's black gone and the ambience behind it,
 * a flat #212121 capsule read as a sticker on a swirl. Each pill is now a
 * LiquidGlass pane — dafod-2's reader pills, with its "book-pill" numbers
 * (depth 6, strength 50, aberration 3, blur 4), which refract the swirl at
 * their rim, carry the smoked tint, the specular top edge and the cursor
 * glow, and answer a press with the 420ms overshoot the wrapper owns. The
 * frame's active fill becomes a translucent white over the glass, so the
 * current tab still reads as lit rather than as a different material.
 */
export default function DesktopNav({ activeTab }: { activeTab: TabKey }) {
  return (
      <header
        // NO CONTAINER. The frame paints the bar #000000 with a 1px #212121
        // rule; both went when the ambience arrived, and the backdrop blur
        // that replaced them went next — over an already-blurred swirl it was
        // invisible at rest and, the moment a card passed beneath, it drew
        // itself as a lighter band with a hard bottom edge. So the header is
        // layout only: a wordmark and three glass pills over the ambience.
        // What keeps a card from sliding under the wordmark sharp is the top
        // soft edge, which now reaches the top of the viewport at full
        // strength (globals.css, THE TOP BAND REACHES THE TOP).
        className="fixed inset-x-0 top-0 z-[500] hidden h-[97px] items-center justify-between
                   desk-bar desk:flex"
      >
        <span
          className="text-[24.55px] leading-none text-white"
          style={{ fontFamily: "var(--font-wordmark)", fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Dafod
        </span>

        {/* CENTRED ON THE CARD (globals.css, .desk-nav-morph), and it
            SHRINKS ONCE THE FEED HAS LEFT ITS FIRST CARD — the iOS toolbar
            morph the Bible header already does on verse scroll. It reads the
            column's --edge-top (0 at the head of the list, 1 by 32px in),
            the same value the top soft edge fades on, so the two move as one
            gesture. The value settles within a few frames of a page starting,
            so a transition on the transform is safe here where the Bible
            header's is not: it is not chasing a continuously driven value,
            it eases once to a value that has stopped. */}
        <nav className="desk-nav-morph flex items-center gap-[21px]">
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
    // The wrapper owns hover, press and release (.lg-wrap); the link owns
    // nothing but its shape and the active tint, so the two never fight over
    // one transform.
    <LiquidGlass radius={50} depth={6} strength={50} chromaticAberration={3} blur={4} className="lg-quiet">
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className="flex h-[52px] w-[140px] items-center justify-center gap-[6px] rounded-[50px]
                   px-[12px] text-white no-underline"
        style={{ backgroundColor: active ? "rgba(255, 255, 255, 0.14)" : "transparent" }}
      >
      <span className="flex flex-shrink-0">
        <tab.Icon active={active} size={26} />
      </span>
      <span
        className="whitespace-nowrap text-[16px] font-medium leading-[20px]"
        style={{ letterSpacing: "0.02em" }}
      >
        {tab.label}
      </span>
      </Link>
    </LiquidGlass>
  );
}
