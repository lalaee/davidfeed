import type { Metadata } from "next";
import Link from "next/link";

import BackLink from "@/components/BackLink";

export const metadata: Metadata = {
  title: "Privacy — Dafod",
  description: "What Dafod keeps about you, why, and how to have it deleted.",
};

/*
 * The privacy policy. Required by Google's brand review for the "Sign in with
 * Google" consent screen, and owed to anyone who makes an account here.
 *
 * Written to what the code actually does — lib/auth.ts, lib/stores.ts and the
 * `library` migration, and the iPhone app (ios/: Account/, PrivacyInfo.xcprivacy)
 * — so it must change when they do: a new field stored, a new service added, or
 * analytics switched on. The API.Bible paragraphs follow lib/fums.ts. App Review reads it, so the app is covered here too.
 *
 * Set in the Library's type on its #000 column: Inter Semi Bold 17 headings,
 * Regular 18/150% body in #999999, white for emphasis.
 */
const UPDATED = "24 October 2026";
const CONTACT = "lakesofmotion@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-black" />
      {/* The page scrolls itself. html and body are overflow:hidden for the
          whole app (globals.css, so iOS cannot drag the fixed nav with the
          document), which is why every page is a 100dvh shell with its own
          scroller, as You and the Bible reader are. */}
      <div className="h-[var(--app-h)] w-full overflow-y-auto overscroll-contain">
      <main className="mx-auto w-full max-w-[782px] px-[24px] pb-[140px] pt-[40px] text-[18px] leading-[27px] desk:pt-[121px]">
        {/* The way back, to wherever the reader came from: You, the sign-in
            sheet over the feed or a chapter, the homepage footer. Without it
            the desktop, which has no header here, had nowhere to go. */}
        <BackLink />
        <h1 className="text-[28px] font-semibold leading-[34px] text-white" style={{ letterSpacing: "-0.5px" }}>
          Privacy
        </h1>
        <p className="mt-[8px] text-[15px] font-medium text-[#999999]">Last updated {UPDATED}</p>

        <Section title="Who we are">
          Dafod (<Link href="/" className="text-white underline">dafod.app</Link>) is a feed of short
          Bible films and a Bible reader, on the web and as an iPhone app, run by Olalekan Isaac. This
          policy covers both. You can reach us at{" "}
          <a href={`mailto:${CONTACT}`} className="text-white underline">{CONTACT}</a>.
        </Section>

        <Section title="What we keep">
          <p>
            Watching the feed and reading the Bible need no account, on the web or in the app, and we
            keep nothing about you while you do. If you sign in, we keep:
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
            Your reading preferences (translation, sound on or off) stay in your browser or on your
            iPhone and are never sent to us.
          </p>
        </Section>

        <Section title="How we use it">
          Only to sign you in and to keep what you save the same on every device you use. We do not
          show ads, sell or rent your information, or use it to profile you. There are no analytics
          or tracking cookies on the website, and no analytics, advertising or tracking code in the
          app.
        </Section>

        <Section title="Licensed Bible translations">
          The NIV, NKJV and NLT in the website&apos;s Bible reader come from API.Bible, run by the
          American Bible Society, under licence from their publishers. The licence asks that each
          time one of them is shown, your browser tells API.Bible which passage it was, so the
          publishers know what is being read. That report carries a random ID for your browser and
          another for the visit. It never includes your name, email address or account, and nothing
          is sent while you read the KJV, ASV or WEB.
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
              <span className="text-white">Vercel</span> hosts the website, and the films the app
              fetches when you share one.
            </li>
            <li>
              <span className="text-white">Apple and Google</span> handle signing in, under their own
              privacy policies.
            </li>
            <li>
              <span className="text-white">API.Bible</span> supplies the NIV, NKJV and NLT, and
              receives the anonymous reading reports described above.
            </li>
          </ul>
          <p className="mt-[12px]">They process it for us and for nothing else. No one else receives it.</p>
        </Section>

        <Section title="On your device">
          On the web we use your browser&apos;s local storage to keep you signed in, to make Dafod
          quick to load what you have saved, and to hold the random ID for the reading reports. In the iPhone app, your sign-in is kept in the iPhone&apos;s
          Keychain and a copy of what you have saved is kept on the phone for the same reason. Signing
          out clears your sign-in and that copy from the browser or phone.
        </Section>

        <Section title="Keeping and deleting it">
          We keep your account and what you save for as long as you have an account. On the website
          or in the iPhone app, You › Delete account deletes your account and everything saved to it
          straight away, on every device. You can also email{" "}
          <a href={`mailto:${CONTACT}`} className="text-white underline">{CONTACT}</a> from the address
          you signed in with, and we will delete both within 30 days.
        </Section>

        <Section title="Children">
          Dafod is not directed at children under 13, and we do not knowingly keep accounts for them.
        </Section>

        <Section title="Changes">
          If this policy changes, we will update this page and the date at the top. The terms for using
          Dafod are at <Link href="/terms" className="text-white underline">dafod.app/terms</Link>.
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
