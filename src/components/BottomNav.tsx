"use client";

import Link from "next/link";

interface BottomNavProps {
  activeTab?: "home" | "bible" | "library";
}

export default function BottomNav({ activeTab = "home" }: BottomNavProps) {
  return (
    <nav className="fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-black rounded-[52px] flex items-center justify-between p-[24px] w-[350px] z-[9999]">
      <Link
        href="/"
        className="flex flex-col gap-[10px] items-center w-[50px] cursor-pointer bg-transparent border-none no-underline"
      >
        <img
          src={activeTab === "home" ? "/assets/home-icon.svg" : "/assets/home-inactive-icon.svg"}
          alt="Home"
          width={32}
          height={32}
          className="pointer-events-none"
        />
        <span className="text-[13px] text-white tracking-[-0.26px] font-normal">
          Home
        </span>
      </Link>
      <Link
        href="/bible"
        className="flex flex-col gap-[10px] items-center w-[50px] cursor-pointer bg-transparent border-none no-underline"
      >
        <img
          src={activeTab === "bible" ? "/assets/bible-active-icon.svg" : "/assets/bible-icon.svg"}
          alt="Bible"
          width={32}
          height={32}
          className="pointer-events-none"
        />
        <span className="text-[13px] text-white tracking-[-0.26px] font-normal">
          Bible
        </span>
      </Link>
      <Link
        href="/library"
        className="flex flex-col gap-[10px] items-center w-[50px] cursor-pointer bg-transparent border-none no-underline"
      >
        <img
          src={activeTab === "library" ? "/assets/library-active-icon.svg" : "/assets/library-icon.svg"}
          alt="Library"
          width={32}
          height={32}
          className="pointer-events-none"
        />
        <span className="text-[13px] text-white tracking-[-0.26px] font-normal">
          Library
        </span>
      </Link>
    </nav>
  );
}
