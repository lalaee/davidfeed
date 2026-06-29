"use client";

import BottomNav from "./BottomNav";

const menuItems = [
  { label: "Feed", icon: "/assets/menu-feed-icon.svg", rotate: false },
  { label: "Verses", icon: "/assets/menu-verses-icon.svg", rotate: true },
  { label: "Personalisations", icon: "/assets/menu-personalisations-icon.svg", rotate: false },
];

const recentlyAdded = [
  { title: "Psalms 23", image: "/assets/library-psalms46.jpg" },
  { title: "Psalms 46", image: "/assets/library-psalms23.jpg" },
];

export default function Library() {
  return (
    <>
      <div className="fixed inset-0 bg-black z-[-1]" />
      <div className="relative w-full md:max-w-[390px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden">

        {/* Title */}
        <div className="flex-shrink-0 pt-[44.52px] px-[14px]">
          <h1 className="text-[32px] font-bold text-white tracking-[-0.408px] leading-[22px] mt-[32px]">
            Library
          </h1>

          {/* Menu Card */}
          <div className="mt-[49.52px] bg-[#1c1c1e] rounded-[24px] p-[8px]">
            {menuItems.map((item, index) => (
              <div key={item.label}>
                <div className="flex items-center gap-[16px] h-[52px] px-[16px] py-[4px]">
                  {/* Icon */}
                  <div className="w-[32px] h-[32px] flex-shrink-0 relative">
                    <img
                      src={item.icon}
                      alt={item.label}
                      className={`w-full h-full object-contain ${item.rotate ? "rotate-90" : ""}`}
                    />
                  </div>
                  {/* Label */}
                  <span className="flex-1 text-white text-[22px] tracking-[0.5px] leading-[22px]">
                    {item.label}
                  </span>
                  {/* Chevron */}
                  <img src="/assets/chevron-right.svg" alt="" className="w-[24px] h-[24px] flex-shrink-0" />
                </div>
                {/* Divider — not on last row */}
                {index < menuItems.length - 1 && (
                  <div className="pl-[16px]">
                    <div className="h-[0.5px] bg-[#444]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recently Added heading */}
          <h2 className="mt-[36px] text-[24px] font-bold text-white tracking-[-0.408px] leading-[22px]">
            Recently added
          </h2>

          {/* Artwork grid */}
          <div className="mt-[16px] flex gap-[16px]">
            {recentlyAdded.map((item) => (
              <div key={item.title} className="flex flex-col gap-[8px]">
                <div className="w-[160px] h-[160px] rounded-[13px] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-white text-[18px] tracking-[-0.24px] leading-[20px] w-[160px]">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <BottomNav activeTab="library" />
      </div>
    </>
  );
}
