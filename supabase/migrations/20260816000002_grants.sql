-- The project's database is missing the usual default privileges for the
-- Supabase API roles, so grant them explicitly (RLS still applies to
-- anon/authenticated; service_role bypasses RLS by design).
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.profiles
  to authenticated, service_role;

grant execute on function public.get_email_for_login(text)
  to anon, authenticated, service_role;
grant execute on function public.is_username_available(text)
  to anon, authenticated, service_role;

-- Future tables/functions created by this migration role get the same grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
