"use client";

import { useRef, useEffect, useState } from "react";
import FeedItem from "./FeedItem";
import BottomNav from "./BottomNav";

const posts = [
  {
    id: 1,
    title: "Psalms 23",
    backgroundImage: "/assets/feed-poster-frame.jpg",
    videoSrc: "/assets/feed-video.mp4",
    posterVideoSrc: "/assets/feed-poster-video-loop.mp4",
  },
  {
    id: 2,
    title: "Psalms 91",
    backgroundImage: "/assets/feed-poster-frame.jpg",
    videoSrc: "/assets/feed-video.mp4",
    posterVideoSrc: "/assets/feed-poster-video-loop.mp4",
  },
  {
    id: 3,
    title: "Proverbs 3:5-6",
    backgroundImage: "/assets/feed-poster-frame.jpg",
    videoSrc: "/assets/feed-video.mp4",
    posterVideoSrc: "/assets/feed-poster-video-loop.mp4",
  },
  {
    id: 4,
    title: "John 3:16",
    backgroundImage: "/assets/feed-poster-frame.jpg",
    videoSrc: "/assets/feed-video.mp4",
    posterVideoSrc: "/assets/feed-poster-video-loop.mp4",
  },
  {
    id: 5,
    title: "Romans 8:28",
    backgroundImage: "/assets/feed-poster-frame.jpg",
    videoSrc: "/assets/feed-video.mp4",
    posterVideoSrc: "/assets/feed-poster-video-loop.mp4",
  },
];

export default function Feed() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Intersection Observer to detect active post
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = itemRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.5,
      }
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Preload next images
  useEffect(() => {
    const preloadWindow = 2;
    for (let i = activeIndex + 1; i <= Math.min(activeIndex + preloadWindow, posts.length - 1); i++) {
      const img = new window.Image();
      img.src = posts[i].backgroundImage;
    }
  }, [activeIndex]);

  return (
    <>
      {/* Fixed background that extends into Safari safe area */}
      <div className="fixed inset-0 bg-black z-[-1]" />
    <div className="relative w-full md:max-w-[375px] h-[100dvh] bg-black mx-auto flex flex-col overflow-hidden">
      {/* Scrollable Feed Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide pb-[20px]"
      >
        {posts.map((post, index) => (
          <div
            key={post.id}
            ref={(el) => { itemRefs.current[index] = el; }}
          >
            <FeedItem
              title={post.title}
              backgroundImage={post.backgroundImage}
              videoSrc={post.videoSrc}
              posterVideoSrc={post.posterVideoSrc}
              isActive={index === activeIndex}
            />
          </div>
        ))}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav activeTab="home" />

    </div>
    </>
  );
}
