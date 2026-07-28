-- Guarantee the `authenticated` role can reach the warranties table.
--
-- The initial migration relies on Supabase's default privileges to grant the
-- authenticated role and then revokes anon. When a table is created through
-- `supabase db push`, those default privileges do not always land, which would
-- leave signed-in users hitting `42501 permission denied` even though RLS is
-- correct. These grants make the table reachable regardless; RLS still decides
-- which rows each user may read or write. Idempotent: a no-op if already granted.

grant select, insert, update, delete on public.warranties to authenticated;
grant all on public.warranties to service_role;
