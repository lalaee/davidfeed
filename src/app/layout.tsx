import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AgentationWrapper from "@/components/AgentationWrapper";
import AppStrip from "@/components/AppStrip";
import AuthSheet from "@/components/AuthSheet";
import BottomNav from "@/components/BottomNav";
import RouteTrail from "@/components/RouteTrail";
import { APP_STRIP_KEY } from "@/lib/appStrip";

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
      // has-app-strip: the phone's app strip shows unless the inline script
      // below finds it was closed on this device (AppStrip.tsx).
      className={`${inter.variable} has-app-strip h-full antialiased`}
      // That script edits this class before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script
          // Before first paint, so a reader who closed the strip never sees
          // the page laid out around it and then jump.
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem(${JSON.stringify(APP_STRIP_KEY)})==="closed")document.documentElement.classList.remove("has-app-strip")}catch(e){}`,
          }}
        />
      </head>
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
