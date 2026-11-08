-- The films, and which one is the verse of the day.
--
-- The iOS app used to carry its whole feed in the bundle (shorts.json and the
-- media beside it), so adding or removing a film meant a new build and a new
-- App Review. Now it carries none: it reads this list when it comes to the
-- front, keeps a copy, and downloads the films it is about to show from the
-- public `films` bucket. A row is a film; unpublishing it takes it off every
-- phone at their next launch.
--
-- Columns mirror `Post` (ios/DavidFeed/DavidFeed/Models/Post.swift and
-- src/data/posts.ts); the app selects them under the camelCase names it
-- decodes. Media columns hold a file name. Only the part after the last "/"
-- counts: the app downloads storage/v1/object/public/films/<name>. The first
-- nine keep the web paths shorts.json gave them; their files are in
-- ios/DavidFeed/films, uploaded with `tools/films.py upload`.
--
-- Apply by hand in the SQL editor, as the earlier migrations were.
create table public.films (
  id                int primary key,
  title             text not null,
  background_image  text not null,
  poster_video_src  text,
  video_src         text,
  audio_src         text,
  -- The film with its Dafod ending, for the share sheet. Null: the app asks
  -- dafod.app/assets/share/<id>.mp4, as it always has.
  share_src         text,
  subtitles         jsonb,
  effect            text,
  start_at          double precision,
  aspect            double precision,
  translation       text,
  captions          jsonb,
  -- The feed's order, and the order the fallback rotation deals from.
  position          int not null default 0,
  published         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- The verse of the day, by date: the same film on every phone. A day with no
-- row (or whose film is unpublished) falls back to the app's own rotation over
-- the published films, so a gap in the schedule never leaves Home empty.
create table public.film_days (
  day      date primary key,
  film_id  int not null references public.films (id) on delete cascade
);

-- Readable by anyone with the public anon key, signed in or not; only the
-- service role (tools/films.py, the dashboard) writes.
alter table public.films enable row level security;
alter table public.film_days enable row level security;

create policy "Anyone sees the published films"
  on public.films for select
  to anon, authenticated
  using (published);

create policy "Anyone sees the schedule"
  on public.film_days for select
  to anon, authenticated
  using (true);

-- Public, so the app downloads with a plain GET. 50MB a file: the app's HEVC
-- encodes run 4-32MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('films', 'films', true, 52428800, array['video/mp4', 'image/jpeg', 'image/png', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;

-- The nine the app shipped with (ios/DavidFeed/films/shorts.json), in its order.
insert into public.films (id, title, background_image, poster_video_src, aspect, translation, captions, position) values
  (2301, 'Psalm 23', '/assets/verses/psalm-23-paper-cut-lightbox.jpg', '/assets/verses/psalm-23-paper-cut-lightbox.mp4', 1.7778, 'NIV', '[0.09, 0.88]'::jsonb, 1),
  (2302, 'Psalm 23', '/assets/verses/psalm-23-watercolor.jpg', '/assets/verses/psalm-23-watercolor.mp4', 1.7778, 'NIV', '[0.13, 0.89]'::jsonb, 2),
  (2303, 'Psalm 23', '/assets/verses/psalm-23-woodcut.jpg', '/assets/verses/psalm-23-woodcut.mp4', 1.7778, 'NIV', '[0.07, 0.88]'::jsonb, 3),
  (301, 'Psalm 3', '/assets/verses/psalm-3-shadow-puppet.jpg', '/assets/verses/psalm-3-shadow-puppet.mp4', 1.7778, 'NIV', '[0.05, 0.23]'::jsonb, 4),
  (302, 'Psalm 3', '/assets/verses/psalm-3-stained-glass.jpg', '/assets/verses/psalm-3-stained-glass.mp4', 1.7778, 'NIV', '[0.75, 0.96]'::jsonb, 5),
  (303, 'Psalm 3', '/assets/verses/psalm-3-woodcut.jpg', '/assets/verses/psalm-3-woodcut.mp4', 1.7778, 'NIV', '[0.105, 0.95]'::jsonb, 6),
  (4501, 'Psalm 45:2-8', '/assets/verses/psalm-45-art-deco.jpg', '/assets/verses/psalm-45-art-deco.mp4', 1.7778, 'NIV', '[0.84, 0.95]'::jsonb, 7),
  (4503, 'Psalm 45:2-8', '/assets/verses/psalm-45-engraving.jpg', '/assets/verses/psalm-45-engraving.mp4', 1.7778, 'NIV', '[0.87, 0.94]'::jsonb, 8),
  (41001, 'Isaiah 41:10-13', '/assets/verses/isaiah-41-10-13-ink-wash.jpg', '/assets/verses/isaiah-41-10-13-ink-wash.mp4', 1.7778, 'NIV', '[0.2, 0.89]'::jsonb, 9);

-- A year of days from 8 November 2026, dealt one passage at a time -- the
-- order the app's rotation already gives, so today's film doesn't change when
-- this goes live. Extend or rearrange with tools/films.py schedule.
insert into public.film_days (day, film_id)
select date '2026-11-08' + n,
       (array[2301, 301, 4501, 41001, 2302, 302, 4503, 2303, 303])[n % 9 + 1]
from generate_series(0, 364) as n;
