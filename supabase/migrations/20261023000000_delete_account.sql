-- Lets a signed-in reader delete their own account from the iOS app.
--
-- App Store guideline 5.1.1(v): an app that creates accounts must let people
-- delete them from inside the app. The app holds only the anon key, so the
-- deletion runs here, as the database owner, and only ever on the caller's own
-- id (auth.uid()); deleting from auth.users removes their Library with it
-- (public.library.user_id references auth.users on delete cascade).
--
-- Apply by hand in the SQL editor, as 20261019000000_library.sql was. Until it
-- is, the app's Delete account says it couldn't and offers the email request.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
