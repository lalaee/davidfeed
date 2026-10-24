import type { Metadata } from "next";
import Link from "next/link";

import BackLink from "@/components/BackLink";

export const metadata: Metadata = {
  title: "Terms — Dafod",
  description: "The terms for using Dafod on the web and on iPhone.",
};

/*
 * The terms of use, beside the privacy policy. App Review and Google's consent
 * screen both look for one, and they must agree with what the app and site do:
 * free, no purchases, an optional account, films and Scripture that belong to
 * others, nothing posted by readers. Change this when any of that changes.
 *
 * Same shell and type as the privacy page.
 */
const UPDATED = "23 October 2026";
const CONTACT = "lakesofmotion@gmail.com";

export default function TermsPage() {
  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-black" />
      <div className="h-[var(--app-h)] w-full overflow-y-auto overscroll-contain">
      <main className="mx-auto w-full max-w-[782px] px-[24px] pb-[140px] pt-[40px] text-[18px] leading-[27px] desk:pt-[121px]">
        <BackLink />
        <h1 className="text-[28px] font-semibold leading-[34px] text-white" style={{ letterSpacing: "-0.5px" }}>
          Terms
        </h1>
        <p className="mt-[8px] text-[15px] font-medium text-[#999999]">Last updated {UPDATED}</p>

        <Section title="Using Dafod">
          Dafod (<Link href="/" className="text-white underline">dafod.app</Link> and the Dafod iPhone app)
          is a feed of short Bible films and a Bible reader, run by Olalekan Isaac. By using it you agree
          to these terms. Dafod is free: there are no ads, subscriptions or purchases.
        </Section>

        <Section title="Your account">
          You don&apos;t need an account to watch or read. An account, made by signing in with Apple or
          Google, keeps the films and verses you save and the verses you highlight, on every device. You
          can delete it at any time from You › Delete account, in the app or on the web; that removes it
          and everything saved to it. How we handle your information is in the{" "}
          <Link href="/privacy" className="text-white underline">privacy policy</Link>.
        </Section>

        <Section title="The films and the text">
          <p>
            The films are Dafod&apos;s. You may watch them here and share them with the Share button for
            personal, non-commercial use. Please don&apos;t re-upload, sell or edit them, or present them
            as your own.
          </p>
          <p className="mt-[12px]">
            Scripture quotations in the films are taken from The Holy Bible, New International Version®
            NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights
            reserved worldwide.
          </p>
          <p className="mt-[12px]">
            The Bible reader&apos;s New International Version, New King James Version and New Living
            Translation are supplied by API.Bible under licence from their publishers, and each chapter
            shows its publisher&apos;s copyright notice. Its King James Version, American Standard
            Version and World English Bible are in the public domain.
          </p>
        </Section>

        <Section title="Using it fairly">
          Don&apos;t try to break, overload or get around how Dafod works, access other people&apos;s
          accounts, or copy its content in bulk. We may close an account that does.
        </Section>

        <Section title="No guarantees">
          We work to keep Dafod running and accurate, but it is provided as it is, without warranties of
          any kind, and it may change or be unavailable at times. To the extent the law allows, we are
          not liable for losses that come from using it or from not being able to.
        </Section>

        <Section title="Changes">
          If these terms change, we will update this page and the date at the top. Using Dafod after a
          change means you accept the new terms.
        </Section>

        <Section title="Contact">
          Questions about these terms: <a href={`mailto:${CONTACT}`} className="text-white underline">{CONTACT}</a>.
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
