import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AgentationWrapper from "@/components/AgentationWrapper";
import AppStrip from "@/components/AppStrip";
import AuthSheet from "@/components/AuthSheet";
import BottomNav from "@/components/BottomNav";
import RouteTrail from "@/components/RouteTrail";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // 300 and 800 are the desktop headline's Light/Extra Bold pair.
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  // The product's name, as the app icon, the iOS app and Google's sign-in
  // consent screen all give it. Google's brand review checks that the
  // homepage carries the same name the consent screen does.
  title: "Dafod",
  description: "Stop doomscrolling, start hopescrolling: short films of the Bible's verses.",
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
      <body className="min-h-full flex flex-col">
        <AppStrip />
        {children}
        {/* Once, here, not per page: a layout survives navigation, and that
            is what lets the nav's selected pill glide between tabs instead of
            being remounted with each page. See BottomNav. */}
        <BottomNav />
        {/* Also once, here: it restores the session on every page and is the
            sheet any save made while signed out opens. See lib/auth.ts. */}
        <AuthSheet />
        <RouteTrail />
        <AgentationWrapper />
      </body>
    </html>
  );
}
