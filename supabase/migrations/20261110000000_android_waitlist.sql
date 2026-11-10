-- The Android list: readers on Android who asked to hear when the app is out
-- (src/components/AppSheet.tsx, the Get app sheet's Android step).
--
-- Anyone with the public anon key may add an address; nobody may read one
-- back through it. The list is read in the dashboard, or with the service
-- role. A second sign-up with the same address fails on the primary key,
-- which the site takes as already joined.
--
-- Apply by hand in the SQL editor, as the earlier migrations were.
create table public.android_waitlist (
  email       text primary key
              check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at  timestamptz not null default now()
);

alter table public.android_waitlist enable row level security;

create policy "Anyone joins the Android list"
  on public.android_waitlist for insert
  to anon, authenticated
  with check (true);
