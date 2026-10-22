import type { Metadata } from "next";
import Link from "next/link";

import { ChevronIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Privacy — Dafod",
  description: "What Dafod keeps about you, why, and how to have it deleted.",
};

/*
 * The privacy policy. Required by Google's brand review for the "Sign in with
 * Google" consent screen, and owed to anyone who makes an account here.
 *
 * Written to what the code actually does — lib/auth.ts, lib/stores.ts and the
 * `library` migration — so it must change when they do: a new field stored, a
 * new service added, or analytics switched on.
 *
 * Set in the Library's type on its #000 column: Inter Semi Bold 17 headings,
 * Regular 18/150% body in #999999, white for emphasis.
 */
const UPDATED = "22 October 2026";
const CONTACT = "lakesofmotion@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-black" />
      {/* The page scrolls itself. html and body are overflow:hidden for the
          whole app (globals.css, so iOS cannot drag the fixed nav with the
          document), which is why every page is a 100dvh shell with its own
          scroller, as You and the Bible reader are. */}
      <div className="h-[100dvh] w-full overflow-y-auto overscroll-contain">
      <main className="mx-auto w-full max-w-[782px] px-[24px] pb-[140px] pt-[40px] text-[18px] leading-[27px] desk:pt-[121px]">
        {/* The way back. The phone has the bottom nav for this, but the desktop
            has no header on this page, so without it a reader who arrived from
            the sign-in sheet or the homepage footer had nowhere to go. The
            chevron is the collection header's back arrow (DesktopChrome),
            turned the same way. */}
        <Link
          href="/"
          className="mb-[24px] inline-flex items-center gap-[2px] text-[17px] font-medium text-white/70
                     no-underline press hover:text-white"
        >
          <span className="-ml-[6px] flex rotate-90">
            <ChevronIcon size={28} />
          </span>
          Home
        </Link>
        <h1 className="text-[28px] font-semibold leading-[34px] text-white" style={{ letterSpacing: "-0.5px" }}>
          Privacy
        </h1>
        <p className="mt-[8px] text-[15px] font-medium text-[#999999]">Last updated {UPDATED}</p>

        <Section title="Who we are">
          Dafod (<Link href="/" className="text-white underline">dafod.app</Link>) is a feed of short
          Bible films and a Bible reader, run by Olalekan Isaac. You can reach us at{" "}
          <a href={`mailto:${CONTACT}`} className="text-white underline">{CONTACT}</a>.
        </Section>

        <Section title="What we keep">
          <p>
            Watching the feed and reading the Bible need no account, and we keep nothing about you
            while you do. If you sign in, we keep:
          </p>
          <ul className="mt-[12px] flex list-disc flex-col gap-[8px] pl-[22px]">
            <li>
              <span className="text-white">Your account details from Apple or Google:</span> your name,
              your email address (with Apple this may be a private relay address) and the account ID
              they give us. We never see your Apple or Google password.
            </li>
            <li>
              <span className="text-white">What you save:</span> the films and verses you save and the
              verses you highlight, with their colours.
            </li>
          </ul>
          <p className="mt-[12px]">
            Your reading preferences (translation, sound on or off) stay in your browser and are
            never sent to us.
          </p>
        </Section>

        <Section title="How we use it">
          Only to sign you in and to keep what you save the same on every device you use. We do not
          show ads, sell or rent your information, or use it to profile you. There are no analytics
          or tracking cookies on Dafod.
        </Section>

        <Section title="Google user data">
          When you sign in with Google we ask only for your basic profile — name, email address and
          account ID — and use it only as described above. Dafod&apos;s use of information received
          from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-white underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </Section>

        <Section title="Who else handles it">
          <ul className="flex list-disc flex-col gap-[8px] pl-[22px]">
            <li>
              <span className="text-white">Supabase</span> stores your account and what you save.
            </li>
            <li>
              <span className="text-white">Vercel</span> hosts the site.
            </li>
            <li>
              <span className="text-white">Apple and Google</span> handle signing in, under their own
              privacy policies.
            </li>
          </ul>
          <p className="mt-[12px]">They process it for us and for nothing else. No one else receives it.</p>
        </Section>

        <Section title="Your browser">
          We use your browser&apos;s local storage to keep you signed in and to make the app quick to
          load what you have saved. Signing out clears it from that browser.
        </Section>

        <Section title="Keeping and deleting it">
          We keep your account and what you save for as long as you have an account. To delete them, email{" "}
          <a href={`mailto:${CONTACT}`} className="text-white underline">{CONTACT}</a> from the address
          you signed in with, and we will delete both within 30 days.
        </Section>

        <Section title="Children">
          Dafod is not directed at children under 13, and we do not knowingly keep accounts for them.
        </Section>

        <Section title="Changes">
          If this policy changes, we will update this page and the date at the top.
        </Section>
      </main>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[40px]">
      <h2 className="text-[17px] font-semibold leading-[25.5px] text-white">{title}</h2>
      <div className="mt-[8px] text-[#999999]">{children}</div>
    </section>
  );
}
