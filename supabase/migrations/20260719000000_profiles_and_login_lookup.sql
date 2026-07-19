-- Capture: profiles table + username/mobile login lookup.
-- Apply by pasting into the Supabase SQL editor (Dashboard → SQL Editor → Run),
-- or with the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  email text not null,
  phone text unique,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user. username/phone are alternate login identifiers resolved to the account email.';

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

-- Copies username/phone from sign-up metadata into profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, phone)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Resolves a username or mobile number to the account email so people can
-- log in with any of the three identifiers. SECURITY DEFINER lets the anon
-- key call it without read access to profiles. Trade-off: anyone who knows
-- a username/phone can learn the email behind it — fine for this project,
-- worth revisiting before a real launch.
create or replace function public.get_email_for_login(identifier text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email
  from public.profiles
  where username = lower(identifier)
     or (phone is not null
         and phone = regexp_replace(identifier, '[^0-9+]', '', 'g'))
  limit 1;
$$;

grant execute on function public.get_email_for_login(text) to anon, authenticated;
