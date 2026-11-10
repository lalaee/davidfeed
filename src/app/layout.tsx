import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AgentationWrapper from "@/components/AgentationWrapper";
import AppSheet from "@/components/AppSheet";
import AppStrip from "@/components/AppStrip";
import AuthSheet from "@/components/AuthSheet";
import BottomNav from "@/components/BottomNav";
import { FilmCatalogProvider } from "@/components/FilmCatalog";
import RouteTrail from "@/components/RouteTrail";
import { loadFilmCatalog } from "@/lib/filmCatalog";
import { SITE } from "@/lib/site";

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
  // Resolves every page's relative canonical against the www address, which
  // the apex and http variants redirect to. Each page names its own; one here
  // would be inherited by every page that doesn't.
  metadataBase: new URL(SITE),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The films and the verse-of-the-day schedule, shared with the iPhone app
  // through Supabase and cached for five minutes. See lib/filmCatalog.ts.
  const catalog = await loadFilmCatalog();
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppStrip />
        <FilmCatalogProvider catalog={catalog}>{children}</FilmCatalogProvider>
        {/* Once, here, not per page: a layout survives navigation, and that
            is what lets the nav's selected pill glide between tabs instead of
            being remounted with each page. See BottomNav. */}
        <BottomNav />
        {/* Also once, here: it restores the session on every page and is the
            sheet any save made while signed out opens. See lib/auth.ts. */}
        <AuthSheet />
        <AppSheet />
        <RouteTrail />
        {/* Development only: the feedback toolbar is a tool for building,
            not part of the site. */}
        {process.env.NODE_ENV === "development" && <AgentationWrapper />}
      </body>
    </html>
  );
}
