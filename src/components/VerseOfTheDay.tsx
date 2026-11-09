"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import DesktopChrome from "./DesktopChrome";
import FeedAmbience from "./FeedAmbience";
import FeedItem from "./FeedItem";
import ShareSheet from "./ShareSheet";
import SoundBadge from "./SoundBadge";
import { useFilmCatalog } from "./FilmCatalog";
import { InstagramIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon } from "./icons";
import { useFeedSound } from "@/hooks/useFeedSound";
import { posterInkStore } from "@/lib/posterInk";
import { dateOfKey, dayKey, filmForDay } from "@/lib/verseOfTheDay";

/*
 * HOME: ONE FILM A DAY — the iPhone app's Home, on the web
 * (ios/…/Feed/VerseOfTheDayView.swift).
 *
 * Figma "New Feed UI" 2789:1009, a 375x747 frame, transcribed:
 *
 *   film     edge to edge from the top, at its own 9:16 where the screen has
 *            room, square at the top and rounded 40 at the foot (.day-card in
 *            globals.css crops a short screen around the film's words, as the
 *            feed does)
 *   title    "Verse of the day" (2798:1197), Inter Semi Bold 19, -2% tracking,
 *            bottom-left: 36.8 in from the film's left edge, 27.8 above its
 *            foot. Black over a film whose foot is light, white over a dark
 *            one, judged as the rail's heart and bookmark are
 *            (lib/posterInk.ts); no shadow
 *   pill     "Share verse" (2790:1055): #8CE4FF, 343x63 (16 in each side),
 *            radius 100, padding 13/16; the Instagram, WhatsApp, TikTok and
 *            Threads glyphs at 24, 2 apart, then 8, then the label in Inter
 *            Medium 20/22, -0.43 tracking, all black. 13.6 under the film
 *            (572.37 -> 585.69 in the frame, read as the app reads it) and 13
 *            above the nav.
 *
 * The rail keeps the save and gains a like (FeedItem's "day" variant); the
 * pill is the share, opening the same menu the feed's share did, with the
 * film and its Dafod ending.
 *
 * At desk the page keeps its desktop chrome — the nav, the "Stop Doomscrolling
 * / Start Hopescrolling" copy with Download app on the left, Privacy — and the
 * film stands where the feed's card stood, right of the copy, at the height
 * the window allows and rounded all round, since its top no longer meets the
 * screen's edge. Only the paging chevrons go: there is one film. The ambience
 * still turns the film's colours across the rest of the window.
 *
 * Which film: the schedule's for the reader's local date, else the rotation
 * the app uses (lib/verseOfTheDay.ts), from the list in Supabase
 * (lib/filmCatalog.ts). It turns over at local midnight, open page or not.
 */

/** Wakes at the next local midnight, and when the page comes back to the front. */
function subscribeDay(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    timer = setTimeout(() => {
      onChange();
      arm();
    }, next.getTime() - now.getTime());
  };
  arm();
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const readDay = () => dayKey(new Date());

export default function VerseOfTheDay({ serverDay }: { serverDay: string }) {
  const { films, days } = useFilmCatalog();
  // The server renders the day it had (UTC, at most five minutes old); the
  // browser then renders its own local day, which may be a different film.
  const day = useSyncExternalStore(subscribeDay, readDay, () => serverDay);
  const post = useMemo(() => filmForDay(films, days, dateOfKey(day)), [films, days, day]);

  const { soundOn, enableSound, toggleSound, armUnlock } = useFeedSound();
  const [shareOpen, setShareOpen] = useState(false);

  const ink = useSyncExternalStore(
    posterInkStore.subscribe,
    () => posterInkStore.read(post?.backgroundImage),
    () => "dark-bottom" as const,
  );

  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-black" />
      <FeedAmbience src={post?.backgroundImage} topOnly />
      <DesktopChrome
        activeTab="home"
        topicId="all"
        onSelectTopic={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
        canPrev={false}
        canNext={false}
        ambienceSrc={post?.backgroundImage}
        paging={false}
      />

      {post && (
        <div className="day-column relative mx-auto flex w-full flex-col md:max-w-[375px]">
          <div className="relative">
            <FeedItem
              // A new day is a new film: remount, so nothing of yesterday's
              // playback state carries over.
              key={post.id}
              variant="day"
              postId={post.id}
              title={post.title}
              backgroundImage={post.backgroundImage}
              videoSrc={post.videoSrc}
              posterVideoSrc={post.posterVideoSrc}
              audioSrc={post.audioSrc}
              captions={post.captions}
              startAt={post.startAt}
              isActive
              eagerAudio
              soundOn={soundOn}
              onAutoplayBlocked={armUnlock}
              onToggleSound={toggleSound}
            />
            <h1
              className="pointer-events-none absolute bottom-[27.8px] left-[36.8px] z-[50] m-0
                         text-[19px] font-semibold leading-[23px] tracking-[-0.38px]"
              style={{ color: ink === "light-bottom" ? "#000000" : "#FFFFFF" }}
            >
              Verse of the day
            </h1>
            <SoundBadge inFilm visible={!soundOn} onEnable={enableSound} />
          </div>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="press mx-[16px] mt-[13.6px] flex h-[63px] flex-shrink-0 items-center justify-center
                       gap-[8px] rounded-[100px] border-none px-[16px] py-[13px] text-black"
            style={{ backgroundColor: "#8CE4FF" }}
          >
            <span className="flex gap-[2px]">
              <InstagramIcon size={24} />
              <WhatsAppIcon size={24} />
              <TikTokIcon size={24} />
              <ThreadsIcon size={24} />
            </span>
            <span className="text-[20px] font-medium leading-[22px] tracking-[-0.43px]">Share verse</span>
          </button>
        </div>
      )}

      {shareOpen && post && (
        <ShareSheet postId={post.id} title={post.title} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}
