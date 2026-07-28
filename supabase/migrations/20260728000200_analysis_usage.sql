-- Metered analysis quota. A contract analysis is a paid Claude call at
-- roughly 15-30x a receipt scan, so consumption is tracked per user per UTC
-- month and consumed ATOMICALLY before the model is called.
--
-- try_consume_analysis does check + increment in ONE statement: concurrent
-- calls serialize on the (user_id, period) primary key, and a call at the
-- ceiling updates zero rows (returns null) without burning anything. This is
-- the fix for the read-then-write race Warraya shipped and then patched:
-- parallel requests all wrote (initial + 1), pinning the counter near 1 and
-- voiding the monthly cost ceiling.
--
-- refund_analysis gives the slot back on failed analyses, so a bad photo or
-- an upstream error never burns quota — the client's free-tier gate reads
-- this same counter (lifetime sum for the free gate, current period for the
-- premium gate).

create table public.analysis_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null
    constraint analysis_usage_period_format check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  count integer not null default 0
    constraint analysis_usage_count_range check (count between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.analysis_usage enable row level security;
revoke all on public.analysis_usage from anon;
-- Read-only to the client; only the edge function (service role) writes.
grant select on public.analysis_usage to authenticated;
grant all on public.analysis_usage to service_role;

create policy "read own usage" on public.analysis_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.try_consume_analysis(
  p_user_id uuid,
  p_period text,
  p_ceiling integer
) returns boolean
language sql
set search_path = public
as $$
  insert into public.analysis_usage (user_id, period, count, updated_at)
  values (p_user_id, p_period, 1, now())
  on conflict (user_id, period) do update
    set count = analysis_usage.count + 1, updated_at = now()
    where analysis_usage.count < p_ceiling
  returning true;
$$;

create or replace function public.refund_analysis(
  p_user_id uuid,
  p_period text
) returns void
language sql
set search_path = public
as $$
  update public.analysis_usage
     set count = greatest(count - 1, 0), updated_at = now()
   where user_id = p_user_id and period = p_period;
$$;

revoke all on function public.try_consume_analysis(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.refund_analysis(uuid, text) from public, anon, authenticated;
grant execute on function public.try_consume_analysis(uuid, text, integer) to service_role;
grant execute on function public.refund_analysis(uuid, text) to service_role;
