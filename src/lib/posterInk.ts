/*
 * WHAT INK A CARD'S LABEL TAKES — ported from the iOS feed (Artwork.swift,
 * `isLightAtBottom`, and FeedCardView's `chrome`).
 *
 * The films end on their own caption bands, and some of those bands are cream.
 * A dark scrim over cream read as a grey bar, so iOS took the scrim off and
 * gave the label and the rail a colour the film's bottom can carry instead:
 * dark ink on a film whose bottom is light, white on one that is dark, each
 * with a short soft shadow in the opposite tone. The web does the same, by the
 * same measure — the bottom TENTH of the poster scaled to a single pixel, light
 * when its Rec. 709 luma clears 150.
 *
 * Measured once per poster and shared through useSyncExternalStore, so every
 * card using the same image waits on one decode and nothing sets state from an
 * effect. Until a poster has been measured the answer is "dark", which is the
 * white ink every card had before — the label never starts out invisible.
 *
 * Home's "Verse of the day" title, at the film's foot, takes the same call,
 * read at the foot the card shows: a short browser crops the film's own foot
 * off, and the tenth above the card's edge is what the title sits on.
 */

type Ink = "light-bottom" | "dark-bottom";

const cache = new Map<string, Ink>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

/** The cache's key for a poster read with its band ending at `foot` (a fraction of its height). */
const keyOf = (src: string, foot: number) => (foot >= 1 ? src : `${src}#${foot}`);

export function measurePoster(src: string, foot = 1) {
  const key = keyOf(src, foot);
  if (cache.has(key) || pending.has(key) || typeof window === "undefined") return;
  pending.add(key);
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    pending.delete(key);
    let ink: Ink = "dark-bottom";
    try {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      const g = c.getContext("2d", { willReadFrequently: true });
      if (g) {
        const h = img.naturalHeight * Math.min(1, foot);
        const band = Math.max(1, Math.round(img.naturalHeight / 10));
        g.imageSmoothingQuality = "medium";
        g.drawImage(img, 0, Math.max(0, h - band), img.naturalWidth, band, 0, 0, 1, 1);
        const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
        if (0.2126 * r + 0.7152 * gr + 0.0722 * b > 150) ink = "light-bottom";
      }
    } catch {
      /* a tainted canvas or no 2D context: keep the white ink */
    }
    cache.set(key, ink);
    listeners.forEach((l) => l());
  };
  img.onerror = () => pending.delete(key);
  img.src = src;
}

export const posterInkStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  /** Pure: what is known so far. measurePoster() is what asks. */
  read(src: string | undefined, foot = 1): Ink {
    return (src && cache.get(keyOf(src, foot))) || "dark-bottom";
  },
};

/** The iOS values, verbatim: ink and its shadow, for each kind of film bottom. */
export const INK = {
  "light-bottom": { ink: "rgba(0, 0, 0, 0.82)", shadow: "rgba(255, 255, 255, 0.25)" },
  "dark-bottom": { ink: "#FFFFFF", shadow: "rgba(0, 0, 0, 0.35)" },
} as const;
