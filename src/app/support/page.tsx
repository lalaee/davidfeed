import type { Metadata } from "next";
import Link from "next/link";

import BackLink from "@/components/BackLink";

export const metadata: Metadata = {
  title: "Support — Dafod",
  description: "Help with Dafod on the web and on iPhone, and how to reach us.",
};

/*
 * Support: App Store Connect requires a support URL with a way to reach us, and
 * this is it. Answers only what the app and site actually do; keep it in step
 * with them (accounts, deletion, sound, the licensed Bibles needing a
 * connection). Same shell and type as the privacy and terms pages.
 */
const CONTACT = "lakesofmotion@gmail.com";

export default function SupportPage() {
  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-black" />
      <div className="h-[var(--app-h)] w-full overflow-y-auto overscroll-contain">
      <main className="mx-auto w-full max-w-[782px] px-[24px] pb-[140px] pt-[40px] text-[18px] leading-[27px] desk:pt-[121px]">
        <BackLink />
        <h1 className="text-[28px] font-semibold leading-[34px] text-white" style={{ letterSpacing: "-0.5px" }}>
          Support
        </h1>

        <Section title="Contact us">
          Email <a href={`mailto:${CONTACT}`} className="text-white underline">{CONTACT}</a> with a question,
          a problem or a suggestion, and we will get back to you. Telling us your device and what you were
          doing helps.
        </Section>

        <Section title="Do I need an account?">
          No. Watching the films and reading the Bible work without one. An account, made by signing in
          with Apple or Google, keeps the films you save and the verses you highlight on every device.
        </Section>

        <Section title="How do I delete my account?">
          In the iPhone app or on the web, go to You › Delete account. It deletes your account and
          everything saved to it straight away, on every device. If you signed in with Apple, you will
          confirm with Apple and Dafod&apos;s access to your Apple Account is removed too.
        </Section>

        <Section title="There's no sound">
          Tap the film to turn sound on or off. On iPhone, check the ringer switch and the volume. The film
          pauses when you leave the Home tab and carries on when you come back.
        </Section>

        <Section title="A translation says it needs a connection">
          NIV, NKJV and NLT are fetched when you first open a chapter and then kept on your phone for a
          while. Without a connection, chapters you haven&apos;t opened yet can&apos;t load; KJV, ASV and WEB
          always work offline.
        </Section>

        <Section title="Privacy and terms">
          What we keep and why is in the <Link href="/privacy" className="text-white underline">privacy
          policy</Link>; the terms for using Dafod are at{" "}
          <Link href="/terms" className="text-white underline">dafod.app/terms</Link>.
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
