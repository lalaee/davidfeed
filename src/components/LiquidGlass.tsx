"use client";

/*
  iOS 26-style Liquid Glass — React port of the Svelte port of
  github.com/nikdelvin/liquid-glass (MIT). The pane is a backdrop-filter chain:

    blur(b/2) → url(displacementFilter) → blur(b) → brightness → saturate

  The SVG displacement map encodes per-pixel x/y offsets (R/G channels) with
  three feDisplacementMap passes — one per RGB channel at slightly different
  scales — to produce real chromatic aberration at the rim. A blurred neutral
  rectangle covers the centre so refraction only happens at the edges.

  WebKit (Safari + every iOS browser) parses `backdrop-filter: url(...)` as
  valid but silently fails to render it, and there is no programmatic feature
  detection that works. We UA-sniff and fall back to a heavier blur + saturate.
*/

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  radius?: number;
  depth?: number;
  strength?: number;
  chromaticAberration?: number;
  blur?: number;
  brightness?: number;
  saturate?: number;
  className?: string;
  children?: ReactNode;
};

function getDisplacementMap(w: number, h: number, r: number, d: number): string {
  const svg = `<svg height="${h}" width="${w}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <style>.mix { mix-blend-mode: screen; }</style>
    <defs>
      <linearGradient id="Y" x1="0" x2="0" y1="${Math.ceil((r / h) * 15)}%" y2="${Math.floor(100 - (r / h) * 15)}%">
        <stop offset="0%" stop-color="#0F0"/><stop offset="100%" stop-color="#000"/>
      </linearGradient>
      <linearGradient id="X" x1="${Math.ceil((r / w) * 15)}%" x2="${Math.floor(100 - (r / w) * 15)}%" y1="0" y2="0">
        <stop offset="0%" stop-color="#F00"/><stop offset="100%" stop-color="#000"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" height="${h}" width="${w}" fill="#808080"/>
    <g filter="blur(2px)">
      <rect x="0" y="0" height="${h}" width="${w}" fill="#000080"/>
      <rect x="0" y="0" height="${h}" width="${w}" fill="url(#Y)" class="mix"/>
      <rect x="0" y="0" height="${h}" width="${w}" fill="url(#X)" class="mix"/>
      <rect x="${d}" y="${d}" height="${h - 2 * d}" width="${w - 2 * d}" fill="#808080" rx="${r}" ry="${r}" filter="blur(${d}px)"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getDisplacementFilter(
  w: number,
  h: number,
  r: number,
  d: number,
  s: number,
  ca: number,
): string {
  const mapUrl = getDisplacementMap(w, h, r, d);
  const svg = `<svg height="${h}" width="${w}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="displace" color-interpolation-filters="sRGB">
        <feImage x="0" y="0" height="${h}" width="${w}" href="${mapUrl}" result="map"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${s + ca * 2}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${s + ca}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${s}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
        <feBlend in="r" in2="g" mode="screen" result="rg"/>
        <feBlend in="rg" in2="b" mode="screen"/>
      </filter>
    </defs>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}#displace`;
}

function detectSupportsBackdropUrl(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/.test(ua);
  return !(isIOS || isSafari);
}

export default function LiquidGlass({
  radius = 100,
  depth = 10,
  strength = 60,
  chromaticAberration = 4,
  blur = 4,
  brightness = 1.1,
  saturate = 1.5,
  className = "",
  children,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [mx, setMx] = useState(50);
  const [my, setMy] = useState(50);

  useEffect(() => {
    const supportsBackdropUrl = detectSupportsBackdropUrl();
    const wrapper = wrapperRef.current;
    const pane = paneRef.current;
    if (!wrapper || !pane) return;

    const update = () => {
      // Use offsetWidth/offsetHeight (layout dimensions) instead of getBoundingClientRect,
      // which would return POST-TRANSFORM size. If any ancestor applies a CSS transform
      // (e.g. our scroll-driven scale on .app-header-morph), getBoundingClientRect reports
      // the scaled rect — JS sizes the pane to that scaled value, then the pane scales AGAIN
      // at render and ends up smaller than the wrapper's content box.
      const w = Math.max(1, wrapper.offsetWidth);
      const h = Math.max(1, wrapper.offsetHeight);
      const r = Math.min(radius, Math.min(w, h) / 2);
      pane.style.width = `${w}px`;
      pane.style.height = `${h}px`;

      let bf: string;
      if (supportsBackdropUrl) {
        const filterUrl = getDisplacementFilter(w, h, r, depth, strength, chromaticAberration);
        bf = `blur(${blur / 2}px) url('${filterUrl}') blur(${blur}px) brightness(${brightness}) saturate(${saturate})`;
      } else {
        // WebKit fallback — heavier blur + saturation, no refraction.
        const safeBlur = Math.max(blur * 4, 16);
        bf = `blur(${safeBlur}px) brightness(${brightness}) saturate(${saturate * 1.4})`;
      }
      pane.style.backdropFilter = bf;
      (pane.style as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter = bf;
    };

    const schedule = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    schedule();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(wrapper);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro?.disconnect();
    };
  }, [radius, depth, strength, chromaticAberration, blur, brightness, saturate]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    setMx(((e.clientX - rect.left) / rect.width) * 100);
    setMy(((e.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <div
      ref={wrapperRef}
      className={`lg-wrap ${className}`}
      style={
        {
          "--lg-radius": `${radius}px`,
          "--lg-mx": `${mx}%`,
          "--lg-my": `${my}%`,
        } as React.CSSProperties
      }
      onMouseMove={handleMouseMove}
      role="presentation"
    >
      <div ref={paneRef} className="lg-pane" aria-hidden="true" />
      {children}
    </div>
  );
}
