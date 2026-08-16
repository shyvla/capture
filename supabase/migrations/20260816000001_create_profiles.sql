-- Clean up orphaned objects left by the abandoned July 2026 schema
-- (migration 20260719000000, since reverted; auth.users is empty so no user data exists).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.get_email_for_login(text);
drop function if exists public.is_username_available(text);
drop table if exists public.profiles cascade;

-- Profiles table: public account data mirrored from auth.users.
-- Usernames: letters, numbers, underscores only. Display names: letters and numbers only.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null check (display_name ~ '^[A-Za-z0-9]{1,30}$'),
  email text not null unique,
  phone text unique check (phone ~ '^\+?[0-9]{7,15}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Auto-create a profile row when a user signs up.
-- Metadata (username, display_name, phone_number) is passed via auth.signUp options.data.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      regexp_replace(new.raw_user_meta_data ->> 'username', '[^A-Za-z0-9]', '', 'g')
    ),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone_number', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Resolve a login identifier (username or phone number) to the account email,
-- so the app can sign in via Supabase Auth's email+password flow.
create function public.get_email_for_login(identifier text)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select email from public.profiles
  where lower(username) = lower(identifier)
     or phone = identifier
  limit 1;
$$;

-- Pre-flight availability checks used by the signup form.
create function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(candidate)
  );
$$;
