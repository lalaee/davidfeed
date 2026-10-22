/*
 * The Hopescrolling "o" keeps its contrast against whatever the ambience is.
 *
 * The heart-eyes face in the o of Hopescrolling is drawn in the frame's teal,
 * #76EEE8. Behind it is the ambience (FeedAmbience.tsx): the active film's
 * poster blown up, blurred to a wash, saturated 2.75x and dimmed 32% black.
 * Over most films that wash is dark and the teal is bright against it; over
 * the cream ones (the watercolour Psalm 23, the ink-wash Isaiah) it is a pale
 * wash and the teal nearly disappears into it.
 *
 * So the teal follows the wash. The wash is estimated from the poster the
 * ambience is drawn from — its average colour, put through the ambience's own
 * saturation and dim — rather than read off the canvas, which a WebGL buffer
 * does not keep. Then the teal keeps its hue and saturation and moves only in
 * lightness until it holds 3:1 against the wash — WCAG 1.4.11's ratio for a
 * graphical object, which the face is (an icon standing in for a letter).
 *
 * LIGHTER FIRST. Over a mid-toned wash, going dark is what first passes by
 * arithmetic, and it is wrong: a near-black face in a line of white letters
 * reads as a hole in the word. So the teal pales toward white first, which
 * is the direction the words beside it already are, and only darkens over a
 * pale wash where no light colour can hold 3:1 — the cream films, where a
 * deep teal face is the one that reads. It moves as little as it must, and
 * not at all when the brand teal already passes.
 *
 * Measured once per poster and cached, read through useSyncExternalStore like
 * posterInk.ts.
 */

export const HOPE_TEAL = "#76EEE8";

/* The ambience recipe, from FeedAmbience.tsx and globals.css. */
const SATURATION = 2.75;
const DIM = 0.32;
const TARGET = 3;

type RGB = [number, number, number];

const cache = new Map<string, string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance([r, g, b]: RGB) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* The poster's average, as the ambience would show it. */
function wash(avg: RGB): RGB {
  // Pixi's AdjustmentFilter saturation pushes each channel away from the
  // pixel's grey by the factor.
  const grey = 0.2125 * avg[0] + 0.7154 * avg[1] + 0.0721 * avg[2];
  return avg.map((c) => {
    const saturated = Math.min(255, Math.max(0, grey + (c - grey) * SATURATION));
    return saturated * (1 - DIM);
  }) as RGB;
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255].map(Math.round) as RGB;
}
function rgbToHex(rgb: RGB) {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** The teal, paled or deepened as little as it takes to hold 3:1 on `bg`. */
export function hopeColourOn(bg: RGB): string {
  const brand = hexToRgb(HOPE_TEAL);
  if (contrast(brand, bg) >= TARGET) return HOPE_TEAL;
  const [h, s, l] = rgbToHsl(brand);
  for (let up = l + 0.01; up <= 1; up += 0.01) {
    const rgb = hslToRgb(h, s, up);
    if (contrast(rgb, bg) >= TARGET) return rgbToHex(rgb);
  }
  for (let down = l - 0.01; down >= 0; down -= 0.01) {
    const rgb = hslToRgb(h, s, down);
    if (contrast(rgb, bg) >= TARGET) return rgbToHex(rgb);
  }
  // Nothing in this hue holds (a mid-grey wash): white or black, whichever
  // stands out more.
  return contrast([255, 255, 255], bg) >= contrast([0, 0, 0], bg) ? "#FFFFFF" : "#000000";
}

function measure(src: string) {
  if (cache.has(src) || pending.has(src) || typeof window === "undefined") return;
  pending.add(src);
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    pending.delete(src);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      // Drawn down to one pixel: the browser's resampling averages it.
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      cache.set(src, hopeColourOn(wash([r, g, b])));
      listeners.forEach((l) => l());
    } catch {
      // A tainted canvas or a decode failure keeps the brand teal.
    }
  };
  img.onerror = () => pending.delete(src);
  img.src = src;
}

export const hopeColourStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Pure: the cached colour for this poster, or the brand teal until then. */
  read(src: string | undefined) {
    return (src && cache.get(src)) || HOPE_TEAL;
  },
  measure,
};
