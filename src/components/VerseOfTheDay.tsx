"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

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
 *            (lib/posterInk.ts), unless the film's row sets its ink by hand
 *            (title_ink); no shadow. Left off a film whose words would
 *            sit under it (titleFits, below), as the app does
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

/**
 * The title's band over the film's foot: 27.8 up, 23 tall, and 8 of air, as
 * the app has it. Below the desk .day-card sets its own, --title-clear
 * (globals.css), without the air, and that is the one read there.
 */
const TITLE_CLEAR = 58.8;

/*
 * Whether "Verse of the day" can sit over this film without covering its
 * words — the app's rule (VerseOfTheDayView). .day-card (globals.css) crops
 * the head to lift the lowest words clear of the title where it can, capped at
 * the head's words; four films (302, 303, 4501, 4503) carry words to 0.94-0.96
 * of their height, which no crop can lift clear, and on those the title is
 * left off. Read off the laid-out card, so it is the crop the CSS resolved:
 * the lowest word at --cap-bottom of the film's 9:16 height, less the crop,
 * must end the title's band above the card's foot. No span: the title shows.
 */
function titleFits(column: HTMLElement | null): boolean {
  const card = column?.querySelector<HTMLElement>(".day-card");
  const lowest = parseFloat(card?.style.getPropertyValue("--cap-bottom") ?? "");
  if (!card || Number.isNaN(lowest)) return true;
  const layer = card.querySelector(".film-layer");
  // "50% -46.67px" below the desk; at desk the card is the film's own 9:16
  // and nothing is cropped.
  const y = layer ? getComputedStyle(layer).objectPosition.split(" ")[1] : undefined;
  const crop = y?.endsWith("px") ? -parseFloat(y) : 0;
  // Fractional sizes: the crop is resolved to the sub-pixel, and a rounded
  // height read the fit wrong by a fraction of a pixel on every film.
  const { width, height } = card.getBoundingClientRect();
  const film = (width * 16) / 9;
  const clear = parseFloat(getComputedStyle(card).getPropertyValue("--title-clear")) || TITLE_CLEAR;
  // The span carries a hundredth of the film's height of margin past the ink
  // (data/films.ts); the words themselves may come into it.
  return (lowest - 0.01) * film - crop <= height - clear;
}

export default function VerseOfTheDay({ serverDay }: { serverDay: string }) {
  const { films, days } = useFilmCatalog();
  // The server renders the day it had (UTC, at most five minutes old); the
  // browser then renders its own local day, which may be a different film.
  const day = useSyncExternalStore(subscribeDay, readDay, () => serverDay);
  const post = useMemo(() => filmForDay(films, days, dateOfKey(day)), [films, days, day]);

  const { soundOn, enableSound, toggleSound, armUnlock } = useFeedSound();
  const [shareOpen, setShareOpen] = useState(false);

  // The column, held in state from a callback ref so the title's fit can be
  // read off it (and re-read as it resizes) without touching a ref in render.
  const [column, setColumn] = useState<HTMLDivElement | null>(null);
  const watchColumn = useCallback(
    (onChange: () => void) => {
      if (!column) return () => {};
      const ro = new ResizeObserver(onChange);
      ro.observe(column);
      return () => ro.disconnect();
    },
    [column],
  );
  const showTitle = useSyncExternalStore(watchColumn, () => titleFits(column), () => true);

  const ink = useSyncExternalStore(
    posterInkStore.subscribe,
    () => posterInkStore.read(post?.backgroundImage),
    () => "dark-bottom" as const,
  );
  // A film's row can set the title's ink by hand; otherwise the foot decides.
  const titleInk = post?.titleInk ?? (ink === "light-bottom" ? "black" : "white");

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
        <div ref={setColumn} className="day-column relative mx-auto flex w-full flex-col md:max-w-[375px]">
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
            {showTitle && (
              <h1
                className="pointer-events-none absolute bottom-[27.8px] left-[36.8px] z-[50] m-0
                           text-[19px] font-semibold leading-[23px] tracking-[-0.38px]"
                style={{ color: titleInk === "black" ? "#000000" : "#FFFFFF" }}
              >
                Verse of the day
              </h1>
            )}
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
