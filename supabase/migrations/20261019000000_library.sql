-- A reader's Library: what they saved and what they highlighted.
--
-- One row per reader, holding the same three maps the browser keeps in
-- localStorage (src/lib/stores.ts), so the client can write a store straight
-- through without translating it:
--
--   saved_posts   { "<post id>": true }                     feed bookmarks
--   saved_verses  { "<chapter>": { "<verse>": true } }      Bible saves
--   highlights    { "<chapter>": { "<verse>": "<colour>" } } Bible highlights
--
-- A whole row rather than a row per save because the Library is small (tens of
-- entries, not thousands) and is always read whole; one upsert per change is
-- simpler than reconciling individual rows, and last write wins is the right
-- rule for one person's own bookmarks.
create table public.library (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  saved_posts  jsonb not null default '{}'::jsonb,
  saved_verses jsonb not null default '{}'::jsonb,
  highlights   jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- Nobody reads or writes anyone else's Library. The browser holds only the
-- public anon key, so these policies are the whole of the access control.
alter table public.library enable row level security;

create policy "Readers see their own library"
  on public.library for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Readers create their own library"
  on public.library for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Readers change their own library"
  on public.library for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.touch_library()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger library_touch
  before update on public.library
  for each row execute function public.touch_library();
