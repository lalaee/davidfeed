-- The colour of the "Verse of the day" title over a film, where the automatic
-- choice (black over a light foot, white over a dark one, read off the poster)
-- is wrong for it. Null keeps the automatic choice.
alter table public.films
  add column if not exists title_ink text check (title_ink in ('black', 'white'));

-- Psalm 7:1-2: its grey ground reads as light, but the title is wanted white.
-- A no-op until the film's row exists; films.py add --title-ink sets it then.
update public.films set title_ink = 'white' where id = 701;
