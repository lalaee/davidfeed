#!/usr/bin/env python3
"""
Build the Bible reader's text from public-domain sources.

Writes public/bible/<translation>/<book-slug>/<chapter>.json — one small file
per chapter, so the reader downloads the chapter it is showing and nothing
else. A per-BOOK layout was the alternative and is wrong for this app: Psalms
is ~400KB per translation, which is a lot to spend on reading one psalm.

    python3 scripts/build-bible.py            # build
    python3 scripts/build-bible.py --check    # validate what is already there

THE TEXTS AND WHY THESE EDITIONS
--------------------------------
All three are public domain, which is the whole point — the app previously
carried NIV and NKJV, both copyrighted and both transcribed from memory rather
than from a licensed source. They are gone.

  KJV   King James Version (1769), from eBible.org via seven1m/open-bibles.
        OSIS XML. Its header states "This work is in the Public Domain."

        NOT the getbible.net KJV, which is the obvious source and is wrong for
        us: that module declares distribution_license "GPL". The 1769 TEXT is
        public domain either way, but the GPL there attaches to that packaged
        edition, and shipping a GPL data file inside this app is a licence
        problem we do not need to have. The eBible edition asserts public
        domain outright, so it is the one that ships.

  ASV   American Standard Version (1901), getbible.net. "Public Domain".
  WEB   World English Bible, getbible.net. "Public Domain".

Sources are cached under .bible-cache/ (gitignored) so a rebuild is offline and
the upstreams are hit once, not 3,567 times — every one of these is a single
whole-Bible download.

WHAT IS DROPPED
---------------
The KJV OSIS carries the Apocrypha; only the 66 books the app lists survive.
Psalm superscriptions ("To the chief Musician...") are <title> in OSIS and are
not verses, so they are not emitted — the three translations then agree on what
verse n is, which is what the compare card depends on.
"""

from __future__ import annotations

import html
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".bible-cache"
OUT = ROOT / "public" / "bible"

# The 66 books in order, with the chapter count each must have. Verified to
# match both getbible's own book list and the list BooksSheet renders.
CANON: list[tuple[str, int]] = [
    ("Genesis", 50), ("Exodus", 40), ("Leviticus", 27), ("Numbers", 36),
    ("Deuteronomy", 34), ("Joshua", 24), ("Judges", 21), ("Ruth", 4),
    ("1 Samuel", 31), ("2 Samuel", 24), ("1 Kings", 22), ("2 Kings", 25),
    ("1 Chronicles", 29), ("2 Chronicles", 36), ("Ezra", 10), ("Nehemiah", 13),
    ("Esther", 10), ("Job", 42), ("Psalms", 150), ("Proverbs", 31),
    ("Ecclesiastes", 12), ("Song of Songs", 8), ("Isaiah", 66), ("Jeremiah", 52),
    ("Lamentations", 5), ("Ezekiel", 48), ("Daniel", 12), ("Hosea", 14),
    ("Joel", 3), ("Amos", 9), ("Obadiah", 1), ("Jonah", 4), ("Micah", 7),
    ("Nahum", 3), ("Habakkuk", 3), ("Zephaniah", 3), ("Haggai", 2),
    ("Zechariah", 14), ("Malachi", 4),
    ("Matthew", 28), ("Mark", 16), ("Luke", 24), ("John", 21), ("Acts", 28),
    ("Romans", 16), ("1 Corinthians", 16), ("2 Corinthians", 13),
    ("Galatians", 6), ("Ephesians", 6), ("Philippians", 4), ("Colossians", 4),
    ("1 Thessalonians", 5), ("2 Thessalonians", 3), ("1 Timothy", 6),
    ("2 Timothy", 4), ("Titus", 3), ("Philemon", 1), ("Hebrews", 13),
    ("James", 5), ("1 Peter", 5), ("2 Peter", 3), ("1 John", 5), ("2 John", 1),
    ("3 John", 1), ("Jude", 1), ("Revelation", 22),
]

# OSIS ids for those 66, in the same order. The KJV file also contains the
# Apocrypha; anything not named here is skipped.
OSIS_IDS = [
    "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam",
    "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job",
    "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos",
    "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag",
    "Zech", "Mal", "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor",
    "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim",
    "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John",
    "Jude", "Rev",
]

SOURCES = {
    "kjv": ("https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml",
            "eng-kjv.osis.xml"),
    "asv": ("https://api.getbible.net/v2/asv.json", "asv.json"),
    "web": ("https://api.getbible.net/v2/web.json", "web.json"),
}


def slug(name: str) -> str:
    """"1 Samuel" -> "1-samuel". Must match bookSlug() in src/data/bible.ts."""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def clean(text: str) -> str:
    """One space between words, none at the ends.

    The sources disagree about whitespace and all three are untidy: ASV and WEB
    pad verses with leading and trailing spaces, and the KJV's poetry carries
    real newlines mid-verse from its <l> lines. None of that survives.
    """
    return re.sub(r"\s+", " ", text).strip()


def fetch(url: str, name: str) -> bytes:
    CACHE.mkdir(exist_ok=True)
    path = CACHE / name
    if path.exists():
        return path.read_bytes()
    print(f"  downloading {url}")
    with urllib.request.urlopen(url, timeout=300) as r:
        data = r.read()
    path.write_bytes(data)
    return data


def parse_getbible(raw: bytes) -> dict[int, dict[int, list[str]]]:
    doc = json.loads(raw)
    out: dict[int, dict[int, list[str]]] = {}
    for book in doc["books"]:
        chapters = {}
        for ch in book["chapters"]:
            verses = [clean(v["text"]) for v in ch["verses"]]
            chapters[int(ch["chapter"])] = verses
        out[int(book["nr"])] = chapters
    return out


# <verse osisID="Ps.46.1" sID="..." /> text <verse eID="..." />
VERSE_START = re.compile(r'<verse osisID="([^"]+)" sID="[^"]*"[^>]*/>')
TAG = re.compile(r"<[^>]+>")


def parse_osis(raw: bytes) -> dict[int, dict[int, list[str]]]:
    """Milestone-form OSIS: verses are empty markers, not containers.

    The text of a verse is everything between its start marker and the next
    marker of any kind, with the inline tags removed — <transChange> (the KJV's
    supplied words, which every plain-text KJV keeps), <l>, <lg>, <p>, <q>.
    <title> is left out with them, which is what drops the psalm
    superscriptions.
    """
    text = raw.decode("utf-8")
    index = {osis: i + 1 for i, osis in enumerate(OSIS_IDS)}
    out: dict[int, dict[int, list[str]]] = {}

    marks = list(VERSE_START.finditer(text))
    for i, m in enumerate(marks):
        osis_id = m.group(1)
        parts = osis_id.split(".")
        if len(parts) != 3:
            continue
        book, ch, vs = parts
        nr = index.get(book)
        if nr is None:      # Apocrypha, or a book this app does not list
            continue
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        body = clean(html.unescape(TAG.sub(" ", text[m.end():end])))
        if not body:
            continue
        chapter = out.setdefault(nr, {}).setdefault(int(ch), [])
        # osisID can repeat for a verse split across paragraphs; join rather
        # than emitting the same verse number twice.
        n = int(vs)
        while len(chapter) < n - 1:
            chapter.append("")
        if len(chapter) == n - 1:
            chapter.append(body)
        else:
            chapter[n - 1] = clean(chapter[n - 1] + " " + body)
    return out


PARSERS = {"kjv": parse_osis, "asv": parse_getbible, "web": parse_getbible}


def validate(tid: str, data: dict[int, dict[int, list[str]]]) -> list[str]:
    problems = []
    if len(data) != 66:
        problems.append(f"{tid}: {len(data)} books, expected 66")
    for i, (name, chapters) in enumerate(CANON, start=1):
        got = data.get(i)
        if got is None:
            problems.append(f"{tid}: {name} missing")
            continue
        if len(got) != chapters:
            problems.append(f"{tid}: {name} has {len(got)} chapters, expected {chapters}")
        for c in range(1, chapters + 1):
            verses = got.get(c)
            if not verses:
                problems.append(f"{tid}: {name} {c} empty")
            elif any(not v for v in verses):
                blanks = [n + 1 for n, v in enumerate(verses) if not v]
                problems.append(f"{tid}: {name} {c} blank verses {blanks[:5]}")
    return problems


def main() -> int:
    check_only = "--check" in sys.argv
    parsed: dict[str, dict[int, dict[int, list[str]]]] = {}
    problems: list[str] = []

    for tid, (url, name) in SOURCES.items():
        print(f"{tid}:")
        data = PARSERS[tid](fetch(url, name))
        parsed[tid] = data
        p = validate(tid, data)
        problems += p
        verses = sum(len(v) for ch in data.values() for v in ch.values())
        print(f"  {len(data)} books, {sum(len(c) for c in data.values())} chapters, {verses} verses")
        print(f"  {'OK' if not p else str(len(p)) + ' PROBLEMS'}")

    if problems:
        print("\nproblems:")
        for p in problems[:40]:
            print("  " + p)
        if len(problems) > 40:
            print(f"  ... and {len(problems) - 40} more")
        return 1

    if check_only:
        print("\n--check: nothing written")
        return 0

    files = 0
    bytes_out = 0
    for tid, data in parsed.items():
        for i, (name, _) in enumerate(CANON, start=1):
            book_dir = OUT / tid / slug(name)
            book_dir.mkdir(parents=True, exist_ok=True)
            for c, verses in sorted(data[i].items()):
                # Compact on purpose: this is 3,567 files served to phones.
                blob = json.dumps({"b": name, "c": c, "v": verses},
                                  ensure_ascii=False, separators=(",", ":"))
                (book_dir / f"{c}.json").write_text(blob, encoding="utf-8")
                files += 1
                bytes_out += len(blob.encode("utf-8"))
    print(f"\nwrote {files} files, {bytes_out / 1e6:.1f} MB to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
