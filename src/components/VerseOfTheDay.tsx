"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import DesktopChrome from "./DesktopChrome";
import FeedAmbience from "./FeedAmbience";
import FeedItem from "./FeedItem";
import ShareSheet from "./ShareSheet";
import SoundBadge from "./SoundBadge";
import { useFilmCatalog } from "./FilmCatalog";
import { InstagramIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon } from "./icons";
import { useFeedSound } from "@/hooks/useFeedSound";
import { INK, measurePoster, posterInkStore } from "@/lib/posterInk";
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
 *            foot. Black over light picture, white over dark, read live off
 *            the playing film right behind the words (liveInk, below), so
 *            it turns as the film does; until a frame has been read, the
 *            film's own foot decides (lib/posterInk.ts). A film's row can
 *            set its ink by hand (title_ink). A short soft shadow in the
 *            opposite tone, the rail's (lib/posterInk.ts INK), carries it
 *            over a picture half light and half dark, which no one ink can. Left off a film whose words would
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

/** How far above the span's lowest edge the foot's words can start, as a fraction of the film. */
const FOOT_LINES = 0.1;

/*
 * Whether "Verse of the day" can sit over this film without covering its
 * words — the app's rule (VerseOfTheDayView). .day-card (globals.css) crops
 * the head to lift the lowest words clear of the title where it can, capped at
 * the head's words; four films (302, 303, 4501, 4503) carry words to 0.94-0.96
 * of their height, which no crop can lift clear, and on those the title is
 * left off. Read off the laid-out card, so it is the crop the CSS resolved:
 * the lowest word at --cap-bottom of the film's 9:16 height, less the crop,
 * must end the title's band above the card's foot, or the words must start
 * below the foot, cropped off. No span: the title shows.
 */
function titleFits(column: HTMLElement | null): boolean {
  const fit = cardFit(column);
  if (!fit) return true;
  const { card, lowest, film, crop, height } = fit;
  const clear = parseFloat(getComputedStyle(card).getPropertyValue("--title-clear")) || TITLE_CLEAR;
  // The span carries a hundredth of the film's height of margin past the ink
  // (data/films.ts); the words themselves may come into it.
  if ((lowest - 0.01) * film - crop <= height - clear) return true;
  // A short browser can crop the foot's words off altogether (the crop stops
  // at the head's words), and then the title covers nothing. The span gives
  // only the foot's lowest edge; its lines start no higher than a tenth of the
  // film above it (OCR over every film puts them at 0.80 for a 0.87 foot),
  // nor above the span's own top.
  const highest = parseFloat(card.style.getPropertyValue("--cap-top"));
  const footTop = Math.max(Number.isNaN(highest) ? 0 : highest, lowest - FOOT_LINES);
  return footTop * film - crop >= height;
}

/**
 * Where the card's foot falls in the film, to the hundredth: 1 where the
 * whole film shows, less where a short screen crops its foot off. The rail
 * takes its ink from the film just above it (lib/posterInk.ts), which is the
 * picture, not the film's own cream foot, once that is cropped. The title
 * keeps the film's own foot's ink, as the app has it: white over a cropped
 * woodcut's busy picture was unreadable, and the owner asked for it black.
 */
function visibleFoot(column: HTMLElement | null): number {
  const fit = cardFit(column);
  if (!fit) return 1;
  return Math.min(1, Math.round(((fit.crop + fit.height) / fit.film) * 100) / 100);
}

/** The laid-out day card's film height, crop and height, and its words' lowest edge. */
function cardFit(column: HTMLElement | null) {
  const card = column?.querySelector<HTMLElement>(".day-card");
  const lowest = parseFloat(card?.style.getPropertyValue("--cap-bottom") ?? "");
  if (!card || Number.isNaN(lowest)) return null;
  const layer = card.querySelector(".film-layer");
  // "50% -46.67px" below the desk; at desk the card is the film's own 9:16
  // and nothing is cropped.
  const y = layer ? getComputedStyle(layer).objectPosition.split(" ")[1] : undefined;
  const crop = y?.endsWith("px") ? -parseFloat(y) : 0;
  // Fractional sizes: the crop is resolved to the sub-pixel, and a rounded
  // height read the fit wrong by a fraction of a pixel on every film.
  const { width, height } = card.getBoundingClientRect();
  return { card, lowest, film: (width * 16) / 9, crop, height };
}

type TitleInk = "black" | "white";

/*
 * THE TITLE'S INK, LIVE — black over light picture, white over dark, read off
 * the playing film right behind the words four times a second.
 *
 * The film is drawn object-fit: cover, cropped by .day-card's object-position
 * on a short screen, so the title's box is mapped back into the video's own
 * pixels by the same geometry, drawn down to a few pixels and averaged
 * (Rec. 709 luma). Light past 160 turns it black, dark under 140 turns it
 * white, and between the two it keeps what it has, so a frame that sits on
 * the line does not flicker it. The films are served from this origin, so
 * the canvas can be read.
 */
const liveInk = new WeakMap<HTMLElement, TitleInk>();
const SAMPLE_MS = 250;
let sampler: CanvasRenderingContext2D | null | undefined;

function sampleInk(title: HTMLElement): TitleInk | undefined {
  const video = title.parentElement?.querySelector<HTMLVideoElement>(".day-card video[poster]");
  if (!video || video.readyState < 2 || !video.videoWidth) return undefined;
  if (sampler === undefined) {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 4;
    sampler = c.getContext("2d", { willReadFrequently: true });
  }
  if (!sampler) return undefined;
  const box = video.getBoundingClientRect();
  const t = title.getBoundingClientRect();
  const { videoWidth: vw, videoHeight: vh } = video;
  const scale = Math.max(box.width / vw, box.height / vh);
  const [px, py] = getComputedStyle(video).objectPosition.split(" ");
  const offset = (pos: string, room: number) =>
    pos.endsWith("%") ? (room * parseFloat(pos)) / 100 : parseFloat(pos) || 0;
  const ox = offset(px, box.width - vw * scale);
  const oy = offset(py, box.height - vh * scale);
  const sx = (t.left - box.left - ox) / scale;
  const sy = (t.top - box.top - oy) / scale;
  const sw = t.width / scale;
  const sh = t.height / scale;
  if (sw <= 0 || sh <= 0) return undefined;
  try {
    sampler.drawImage(video, sx, sy, sw, sh, 0, 0, 16, 4);
    const d = sampler.getImageData(0, 0, 16, 4).data;
    let luma = 0;
    for (let i = 0; i < d.length; i += 4) luma += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    luma /= d.length / 4;
    const was = liveInk.get(title);
    if (luma > 160) return "black";
    if (luma < 140) return "white";
    return was ?? (luma >= 150 ? "black" : "white");
  } catch {
    return undefined;
  }
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
  const foot = useSyncExternalStore(watchColumn, () => visibleFoot(column), () => 1);

  // The film's own foot, whatever the crop shows (visibleFoot, above).
  const ink = useSyncExternalStore(
    posterInkStore.subscribe,
    () => posterInkStore.read(post?.backgroundImage),
    () => "dark-bottom" as const,
  );
  useEffect(() => {
    if (post) measurePoster(post.backgroundImage);
  }, [post]);
  // The title, held in state from a callback ref, is read against the film
  // behind it while it is on screen (liveInk, above).
  const [title, setTitle] = useState<HTMLHeadingElement | null>(null);
  const watchInk = useCallback(
    (onChange: () => void) => {
      if (!title) return () => {};
      const tick = () => {
        if (document.hidden) return;
        const next = sampleInk(title);
        if (next && next !== liveInk.get(title)) {
          liveInk.set(title, next);
          onChange();
        }
      };
      tick();
      const timer = setInterval(tick, SAMPLE_MS);
      return () => clearInterval(timer);
    },
    [title],
  );
  const live = useSyncExternalStore(watchInk, () => (title ? liveInk.get(title) : undefined), () => undefined);
  // A film's row can set the title's ink by hand; otherwise the picture behind
  // it decides, and the film's foot until that has been read.
  const titleInk = post?.titleInk ?? live ?? (ink === "light-bottom" ? "black" : "white");

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
              inkFoot={foot}
              soundOn={soundOn}
              onAutoplayBlocked={armUnlock}
              onToggleSound={toggleSound}
            />
            {showTitle && (
              <h1
                ref={setTitle}
                className="pointer-events-none absolute bottom-[27.8px] left-[36.8px] z-[50] m-0
                           text-[19px] font-semibold leading-[23px] tracking-[-0.38px]
                           transition-[color,text-shadow] duration-300"
                style={{
                  color: titleInk === "black" ? "#000000" : "#FFFFFF",
                  textShadow: `0 1px 3px ${INK[titleInk === "black" ? "light-bottom" : "dark-bottom"].shadow}`,
                }}
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
