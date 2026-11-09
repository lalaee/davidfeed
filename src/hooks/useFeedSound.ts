"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
 * Whether the films are heard: one preference for a whole page of them.
 *
 * Lifted out of Feed so Home's verse of the day and the saved feed share it
 * rather than each carrying a copy. Everything in it was learned on the feed;
 * the reasons are kept here with the code.
 */

/** Remembers only an explicit choice, so a deliberate mute survives a reload. */
const SOUND_PREF = "davidfeed:sound";

/** The verdict never changes after load, so there is nothing to subscribe to. */
const subscribeNever = () => () => {};

/**
 * Whether this browser will let the page open with sound. Must return a stable
 * primitive — useSyncExternalStore re-reads it on every render.
 */
function readAudioVerdict(): "allowed" | "blocked" | "chosen-silent" {
  try {
    if (localStorage.getItem(SOUND_PREF) === "off") return "chosen-silent";
  } catch {}
  const getPolicy = (
    navigator as Navigator & { getAutoplayPolicy?: (t: string) => string }
  ).getAutoplayPolicy;
  // No policy API (Safari, older Chrome): stay optimistic and let the rejected
  // play() below report back, which is the behaviour that shipped before.
  if (!getPolicy) return "allowed";
  return getPolicy.call(navigator, "mediaelement") === "allowed" ? "allowed" : "blocked";
}

const remember = (on: boolean) => {
  try { localStorage.setItem(SOUND_PREF, on ? "on" : "off"); } catch {}
};

/**
 * @param scrollerRef  The page's scroller, if it has one: a scroll counts as
 *                     the gesture that unlocks sound after a refusal.
 */
export function useFeedSound(scrollerRef?: React.RefObject<HTMLElement | null>) {
  // Sound starts ON so the page opens with narration where the browser permits
  // it — Chrome grants autoplay-with-sound on sites the viewer has engaged with
  // before. Where it is refused, FeedItem falls back to muted and reports back
  // through onAutoplayBlocked, and the first interaction of any kind turns it
  // on for the rest of the session.
  //
  // DERIVED, not synced. The obvious shape — read the autoplay policy in a
  // mount effect and setState — is a cascading render, and the browser value
  // is knowable before first paint anyway. useSyncExternalStore takes a server
  // snapshot and a client snapshot and reconciles them without a hydration
  // mismatch. It is also what makes Chrome's self-healing observable: its
  // Media Engagement Index accrues across visits that play sound for 7s+, and
  // once it clears the threshold getAutoplayPolicy returns "allowed".
  const audioVerdict = useSyncExternalStore(
    subscribeNever,
    readAudioVerdict,
    () => "allowed" as const, // server: assume the best, reconcile on the client
  );

  // null until the viewer expresses a preference; their choice always wins.
  const [userChoice, setUserChoice] = useState<boolean | null>(null);
  // A play() that was actually rejected, for browsers with no policy API.
  const [refused, setRefused] = useState(false);

  const soundOn = userChoice ?? (audioVerdict === "allowed" && !refused);

  const enableSound = useCallback(() => {
    setUserChoice(true);
    remember(true);
  }, []);
  // A tap on a film: the iOS mute. Flips the sound and remembers it.
  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setUserChoice(next);
    remember(next);
  }, [soundOn]);

  // "Blessing" — the technique AMP Stories uses, and the reason sound kept
  // dropping out on iOS when swiping to a new card.
  //
  // Autoplay permission is granted PER MEDIA ELEMENT, not per document. Only
  // the element that was playing during the user's gesture becomes allowed to
  // make sound; every other card's <audio> is still unblessed, so unmuting it
  // later counts as "gaining audio without a gesture" — and WebKit's documented
  // response to that is to pause playback.
  //
  // The fix is to unmute-then-immediately-remute EVERY media element on the
  // first gesture. That is audibly a no-op but marks them all as user-initiated
  // for the rest of the session. It must run synchronously inside the gesture —
  // transient activation only lasts ~5s and does not survive an await.
  const blessedRef = useRef(false);
  useEffect(() => {
    const bless = () => {
      if (blessedRef.current) return;
      blessedRef.current = true;

      document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((el) => {
        const wasMuted = el.muted;
        el.muted = false;
        if (wasMuted) el.muted = true;
      });

      // Without this the hardware ring/silent switch mutes the whole page,
      // which the native apps do not do. Safari 16.4+ only; harmless elsewhere.
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback";
    };

    // Capture phase, so this runs before the card's own tap handler.
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", bless, opts);
    window.addEventListener("touchstart", bless, opts);
    window.addEventListener("keydown", bless, opts);
    return () => {
      window.removeEventListener("pointerdown", bless, opts);
      window.removeEventListener("touchstart", bless, opts);
      window.removeEventListener("keydown", bless, opts);
    };
  }, []);

  // Autoplay-with-sound was refused, so the card fell back to muted. Arm a
  // one-shot unlock on the first gesture.
  //
  // Deliberately NOT pointerdown/click: the card has its own tap handler, and
  // a window-level pointerdown fires first and turns sound on, then the card's
  // click toggles it straight back off — which read as "click once, get a mute
  // icon; click again to actually hear it". Listening only to gestures the
  // card does not handle keeps a single tap doing a single thing.
  const armedRef = useRef(false);
  const armUnlock = useCallback(() => {
    setRefused(true);
    if (armedRef.current) return;
    armedRef.current = true;
    const unlock = () => {
      armedRef.current = false;
      setUserChoice(true);
    };
    const opts = { once: true, passive: true } as const;
    scrollerRef?.current?.addEventListener("scroll", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("wheel", unlock, opts);
  }, [scrollerRef]);

  return { soundOn, enableSound, toggleSound, armUnlock };
}
