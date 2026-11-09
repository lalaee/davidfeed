#!/usr/bin/env python3
"""Put films on the app, take them off, and set the verse of the day, with no build.

The app reads the list from Supabase (supabase/migrations/20261108000000_films.sql)
each time it comes to the front, and downloads a film it doesn't carry from the
public `films` bucket. This is the other end: it encodes a film the way
import-bible-films.sh does, uploads it with its poster, and writes its row.

Needs the project's service-role (secret) key in the environment -- it can
write anything, so it never goes in the app, the repo, or a shell history:

    export SUPABASE_SERVICE_ROLE_KEY=...      # Project Settings -> API keys

  ./tools/films.py list
  ./tools/films.py add FILM.mp4 --id 9101 --title "Psalm 91:1-4" [--captions 0.1,0.9]
                       [--translation NIV] [--share SHARE.mp4] [--on 2026-12-01]
  ./tools/films.py remove 9101            # off every phone at its next launch
  ./tools/films.py restore 9101
  ./tools/films.py day 2026-12-25 9101    # that date's verse of the day
  ./tools/films.py schedule --from 2026-11-08 --days 365
  ./tools/films.py upload ios/DavidFeed/films/*.mp4 ios/DavidFeed/films/*.jpg

`upload` puts files in the bucket as they are, under their own names: the
nine films the app used to carry (ios/DavidFeed/films), whose rows the
migration already wrote, go up this way.

`add` re-encodes to HEVC (<=1080 wide, capped at 3 Mbps, AAC 96k) and cuts a
poster 10% in; pass --no-encode for a file that is already the app's encode.
`schedule` deals the published films one passage at a time, as the app's own
fallback does, and overwrites the days it covers (days it doesn't cover keep
whatever they had, including dates set with `day`).
"""
import argparse, datetime, json, mimetypes, os, pathlib, subprocess, sys, tempfile
import urllib.error, urllib.request

URL = "https://ulmptivzgvcpbygpkkfv.supabase.co"
BUCKET = "films"


def key():
    k = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not k:
        sys.exit("Set SUPABASE_SERVICE_ROLE_KEY (Supabase -> Project Settings -> API keys).")
    return k


def request(method, path, body=None, headers=None, data=None):
    k = key()
    # Both headers, for either kind of key: Storage refuses a request with no
    # Authorization even when apikey carries an sb_secret_ key.
    h = {"apikey": k, "Authorization": f"Bearer {k}"}
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    h.update(headers or {})
    req = urllib.request.Request(URL + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            return json.loads(text) if text.strip() else None
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path}: {e.code} {e.read().decode()[:400]}")


def films(published_only=True):
    q = "/rest/v1/films?select=id,title,poster_video_src,published,position&order=position,id"
    rows = request("GET", q)
    return [r for r in rows if r["published"]] if published_only else rows


def upload(path: pathlib.Path):
    kind = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    print(f"   uploading {path.name} ({path.stat().st_size / 1e6:.1f} MB)")
    request("POST", f"/storage/v1/object/{BUCKET}/{path.name}", data=path.read_bytes(),
            headers={"Content-Type": kind, "x-upsert": "true", "Cache-Control": "max-age=31536000"})


def probe(path, entries):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", entries,
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True).stdout
    return [x for x in out.strip().split(",") if x]


def encode(src: pathlib.Path, out: pathlib.Path):
    # The same settings as import-bible-films.sh, so a film added here looks
    # and weighs like the nine the app shipped with.
    threads = str(max(2, os.cpu_count() // 2))
    print(f"   encoding {src.name} -> HEVC")
    subprocess.run(["nice", "-n", "10", "ffmpeg", "-y", "-v", "error", "-threads", threads, "-i", str(src),
                    "-vf", "scale='min(1080,iw)':-2", "-c:v", "libx265", "-preset", "medium", "-crf", "28",
                    "-x265-params", "vbv-maxrate=3000:vbv-bufsize=6000:log-level=error", "-tag:v", "hvc1",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart",
                    str(out)], check=True)


def cmd_add(a):
    src = pathlib.Path(a.film).expanduser()
    if not src.exists():
        sys.exit(f"{src} not found")
    stem = src.stem
    with tempfile.TemporaryDirectory() as tmp:
        tmp = pathlib.Path(tmp)
        film = src if a.no_encode else tmp / f"{stem}.mp4"
        if not a.no_encode:
            encode(src, film)
        poster = tmp / f"{stem}.jpg"
        duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                         "csv=p=0", str(film)], capture_output=True, text=True).stdout)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(duration * 0.1), "-i", str(film),
                        "-frames:v", "1", "-q:v", "3", str(poster)], check=True)
        w, h = (int(x) for x in probe(film, "stream=width,height")[:2])
        upload(film)
        upload(poster)
        share = None
        if a.share:
            s = pathlib.Path(a.share).expanduser()
            share = f"{stem}-dafod.mp4"
            named = tmp / share
            named.write_bytes(s.read_bytes())
            upload(named)
    position = a.position
    if position is None:
        position = max([r["position"] for r in films(False)] or [0]) + 1
    row = {"id": a.id, "title": a.title, "background_image": f"{stem}.jpg", "poster_video_src": f"{stem}.mp4",
           "aspect": round(h / w, 4), "translation": a.translation, "position": position, "published": True,
           "captions": [float(x) for x in a.captions.split(",")] if a.captions else None, "share_src": share,
           "title_ink": a.title_ink}
    request("POST", "/rest/v1/films", body=row, headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
    print(f"   {a.id}  {a.title}  {w}x{h}  position {position}")
    if a.on:
        set_day(a.on, a.id)
    print("Published. Phones pick it up the next time the app comes to the front.")


def set_day(day, film_id):
    datetime.date.fromisoformat(day)
    request("POST", "/rest/v1/film_days", body={"day": day, "film_id": film_id},
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
    print(f"   {day}: {film_id}")


def cmd_publish(a, on):
    request("PATCH", f"/rest/v1/films?id=eq.{a.id}", body={"published": on}, headers={"Prefer": "return=minimal"})
    print(f"{a.id} restored." if on else
          f"{a.id} taken off the app. Days scheduled for it fall back to the rotation.")


def rotation(rows):
    """VerseOfTheDayView.rotation: one film per passage per round."""
    passages, groups = [], {}
    for r in rows:
        p = r["title"].split(":", 1)[0]
        if p not in groups:
            passages.append(p)
        groups.setdefault(p, []).append(r)
    out, n = [], 0
    while len(out) < len(rows):
        out += [groups[p][n] for p in passages if n < len(groups[p])]
        n += 1
    return out


def cmd_schedule(a):
    order = rotation(films())
    if not order:
        sys.exit("No published films.")
    start = datetime.date.fromisoformat(a.start)
    rows = [{"day": (start + datetime.timedelta(days=i)).isoformat(), "film_id": order[i % len(order)]["id"]}
            for i in range(a.days)]
    request("POST", "/rest/v1/film_days", body=rows, headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
    print(f"{a.days} days from {start}: " + ", ".join(str(r["id"]) for r in order) + ", ...")


def cmd_upload(a):
    for f in a.files:
        upload(pathlib.Path(f).expanduser())
    print(f"{len(a.files)} files in the bucket.")


def cmd_list(_):
    rows = films(False)
    for r in rows:
        print(f"  {r['id']:>6}  {'' if r['published'] else '(off) '}{r['title']:18} {r['poster_video_src']}")
    today = datetime.date.today()
    days = request("GET", f"/rest/v1/film_days?select=day,film_id&day=gte.{today}&order=day&limit=14")
    names = {r["id"]: r["title"] for r in rows}
    print("next two weeks:")
    for d in days:
        print(f"  {d['day']}  {d['film_id']:>6}  {names.get(d['film_id'], '?')}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list")
    add = sub.add_parser("add")
    add.add_argument("film")
    add.add_argument("--id", type=int, required=True, help="unique; saves key off it (films.ts's scheme)")
    add.add_argument("--title", required=True, help='the reference, e.g. "Psalm 91:1-4"')
    add.add_argument("--translation", default="NIV")
    add.add_argument("--captions", help="highest,lowest of the burned-in words, as fractions of the height")
    add.add_argument("--share", help="the film with its Dafod ending, for the share sheet")
    add.add_argument("--position", type=int)
    add.add_argument("--title-ink", choices=["black", "white"],
                     help="the Home title's colour over this film, where the automatic one is wrong")
    add.add_argument("--on", help="also make it the verse of the day on this date (YYYY-MM-DD)")
    add.add_argument("--no-encode", action="store_true")
    for name in ("remove", "restore"):
        sub.add_parser(name).add_argument("id", type=int)
    day = sub.add_parser("day")
    day.add_argument("date")
    day.add_argument("id", type=int)
    sub.add_parser("upload").add_argument("files", nargs="+")
    sch = sub.add_parser("schedule")
    sch.add_argument("--from", dest="start", default=datetime.date.today().isoformat())
    sch.add_argument("--days", type=int, default=365)
    a = p.parse_args()
    {"list": cmd_list, "add": cmd_add, "remove": lambda a: cmd_publish(a, False),
     "restore": lambda a: cmd_publish(a, True), "day": lambda a: set_day(a.date, a.id),
     "schedule": cmd_schedule, "upload": cmd_upload}[a.cmd](a)


if __name__ == "__main__":
    main()
