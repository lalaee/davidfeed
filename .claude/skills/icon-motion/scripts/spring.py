#!/usr/bin/env python3
"""
Generate the CSS keyframes for an iOS-style spring bounce.

The spring's POSITIONS are sampled into dense keyframes, so the timing between
them must be `linear`. Do not be tempted to emit a spring as an easing function
instead: an easing describes one journey, and a multi-keyframe animation
re-applies it between every pair, which makes the icon re-accelerate into rest
and land hard.

  ./spring.py --zeta 0.26 --name icon-pop
  ./spring.py --zeta 0.26 --name icon-pop --write     # patch globals.css

dampingFraction (--zeta) is the only dial worth turning. Lower is bouncier.
Apple's presets for reference: 1.0 .smooth, 0.85 .snappy, 0.7 .bouncy.
"""
import argparse
import math
import pathlib
import re
import sys


def sample(x0, v0, response, zeta, dur, n):
    """Damped spring from x0 toward 1, with initial velocity v0."""
    w = 2 * math.pi / response
    wd = w * math.sqrt(1 - zeta * zeta)
    out = []
    for i in range(n + 1):
        t = dur * i / n
        x = 1 + math.exp(-zeta * w * t) * (
            (x0 - 1) * math.cos(wd * t)
            + ((v0 + zeta * w * (x0 - 1)) / wd) * math.sin(wd * t)
        )
        out.append((i / n, x))
    out[-1] = (1.0, 1.0)          # land exactly on rest, never 0.999
    return out


def turning_points(values):
    return [
        (i, round(values[i - 1], 3))
        for i in range(2, len(values))
        if (values[i] - values[i - 1]) * (values[i - 1] - values[i - 2]) < 0
    ]


def settle_ms(zeta, response):
    """Time to within 1% — the animation must be at least this long."""
    return 4.6 / (zeta * (2 * math.pi / response)) * 1000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zeta", type=float, default=0.26, help="dampingFraction; lower is bouncier")
    ap.add_argument("--response", type=float, default=0.40, help="spring period, seconds")
    ap.add_argument("--velocity", type=float, default=8.5, help="release energy; sets overshoot height")
    ap.add_argument("--from-scale", type=float, default=0.94, help="the pressed scale")
    ap.add_argument("--duration", type=float, default=None, help="defaults to the settling time")
    ap.add_argument("--samples", type=int, default=72)
    ap.add_argument("--name", default="icon-pop")
    ap.add_argument("--write", action="store_true", help="patch globals.css in place")
    a = ap.parse_args()

    settle = settle_ms(a.zeta, a.response) / 1000
    dur = a.duration or round(settle, 2)
    if dur > 1.15:
        print(f"warning: {dur:.2f}s exceeds the ~1.1s a single gesture is allowed.\n"
              f"         Raise --zeta rather than truncating it.", file=sys.stderr)

    pts = sample(a.from_scale, a.velocity, a.response, a.zeta, dur, a.samples)
    xs = [x for _, x in pts]
    turns = turning_points(xs)

    print(f"  dampingFraction {a.zeta}   response {a.response}s   release {a.velocity}", file=sys.stderr)
    print(f"  duration {dur:.2f}s (settles at {settle:.2f}s)", file=sys.stderr)
    print(f"  {a.from_scale} -> {max(xs):.3f} -> {min(xs):.3f} -> 1.0", file=sys.stderr)
    print(f"  {len(turns)} turning points: {[v for _, v in turns][:6]}", file=sys.stderr)
    print(f"  CLEAR THE ANIMATION CLASS NO EARLIER THAN {int(dur * 1000) + 50}ms\n", file=sys.stderr)

    body = "\n".join(
        f"  {p * 100:.4g}% {{\n    transform: scale({x:.4f});\n  }}" for p, x in pts
    )
    block = f"@keyframes {a.name} {{\n{body}\n}}"
    rule = (f".animate-{a.name.replace('icon-', '')} {{\n"
            f"  animation: {a.name} {dur}s linear forwards;\n}}")

    if not a.write:
        print(block)
        print()
        print(rule)
        return 0

    css = pathlib.Path(__file__).resolve().parents[4] / "src/app/globals.css"
    s = css.read_text()
    start = s.index(f"@keyframes {a.name} {{")
    end = s.index("\n}", s.index("100% {", start)) + 2
    s = s[:start] + block + s[end:]
    s = re.sub(rf"animation: {a.name} [\d.]+s linear forwards;",
               f"animation: {a.name} {dur}s linear forwards;", s, count=1)
    css.write_text(s)
    print(f"patched {css}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
