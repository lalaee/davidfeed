import { useCallback, useSyncExternalStore } from "react";

/*
 * INK READ LIVE OFF THE FILM — black over light picture, white over dark, for
 * what Home lays over its film: the "Verse of the day" title and the rail's
 * heart and bookmark (VerseOfTheDay.tsx, FeedItem's "day" variant).
 *
 * Four times a second each one's box is mapped back into the playing video's
 * own pixels — the film is drawn object-fit: cover, cropped by .day-card's
 * object-position on a short screen, so by the same geometry — drawn down to a
 * few pixels and averaged (Rec. 709 luma). Light past 160 turns it black, dark
 * under 140 turns it white, and between the two it keeps what it has, so a
 * frame that sits on the line does not flicker it. The films are served from
 * this origin, so the canvas can be read.
 *
 * Until a frame has been read the answer is undefined, and the caller keeps
 * the poster's measure (lib/posterInk.ts).
 */

export type LiveInk = "black" | "white";

const SAMPLE_MS = 250;
const inks = new WeakMap<HTMLElement, LiveInk>();
let sampler: CanvasRenderingContext2D | null | undefined;

function sample(target: HTMLElement): LiveInk | undefined {
  const video = target
    .closest(".day-column")
    ?.querySelector<HTMLVideoElement>(".day-card video[poster]");
  if (!video || video.readyState < 2 || !video.videoWidth) return undefined;
  if (sampler === undefined) {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 4;
    sampler = c.getContext("2d", { willReadFrequently: true });
  }
  if (!sampler) return undefined;
  const box = video.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const { videoWidth: vw, videoHeight: vh } = video;
  const scale = Math.max(box.width / vw, box.height / vh);
  const [px, py] = getComputedStyle(video).objectPosition.split(" ");
  const offset = (pos: string, room: number) =>
    pos.endsWith("%") ? (room * parseFloat(pos)) / 100 : parseFloat(pos) || 0;
  const ox = offset(px, box.width - vw * scale);
  const oy = offset(py, box.height - vh * scale);
  const sw = t.width / scale;
  const sh = t.height / scale;
  if (sw <= 0 || sh <= 0) return undefined;
  try {
    sampler.drawImage(video, (t.left - box.left - ox) / scale, (t.top - box.top - oy) / scale, sw, sh, 0, 0, 16, 4);
    const d = sampler.getImageData(0, 0, 16, 4).data;
    let luma = 0;
    for (let i = 0; i < d.length; i += 4) luma += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    luma /= d.length / 4;
    if (luma > 160) return "black";
    if (luma < 140) return "white";
    return inks.get(target) ?? (luma >= 150 ? "black" : "white");
  } catch {
    return undefined;
  }
}

/** The ink for `target`, read live off Home's film behind it; null reads nothing. */
export function useLiveInk(target: HTMLElement | null): LiveInk | undefined {
  const watch = useCallback(
    (onChange: () => void) => {
      if (!target) return () => {};
      const tick = () => {
        if (document.hidden) return;
        const next = sample(target);
        if (next && next !== inks.get(target)) {
          inks.set(target, next);
          onChange();
        }
      };
      tick();
      const timer = setInterval(tick, SAMPLE_MS);
      return () => clearInterval(timer);
    },
    [target],
  );
  return useSyncExternalStore(watch, () => (target ? inks.get(target) : undefined), () => undefined);
}
