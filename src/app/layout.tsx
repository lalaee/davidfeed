import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AgentationWrapper from "@/components/AgentationWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // 300 and 800 are the desktop headline's Light/Extra Bold pair.
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DavidFeed",
  description: "A devotional feed app inspired by Psalms",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {/*
          The desktop wordmark. Loaded by stylesheet rather than next/font
          because this Next version's Google-font list does not carry the
          family — it is on Google Fonts (its weight axis runs 200-900, which is
          why a 100..900 request 400s), just not in the bundled index. The
          trade-off is no build-time self-hosting, so it is preconnected and
          swapped rather than blocking.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:wght@600&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <AgentationWrapper />
      </body>
    </html>
  );
}
