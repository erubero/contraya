-- Metered chat quota for Ask Contry (per-contract Q&A). Same shape and
-- rationale as analysis_usage: each question is a paid Claude call, consumed
-- ATOMICALLY before the model runs, refunded on failure, fail-closed when the
-- counter is unavailable. Chat is cheaper per call than an analysis thanks to
-- prompt caching, but it is also easier to spam, hence its own counter and
-- ceiling instead of sharing the analysis one.

create table public.chat_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null
    constraint chat_usage_period_format check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  count integer not null default 0
    constraint chat_usage_count_range check (count between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.chat_usage enable row level security;
revoke all on public.chat_usage from anon;
-- Read-only to the client; only the edge function (service role) writes.
grant select on public.chat_usage to authenticated;
grant all on public.chat_usage to service_role;

create policy "read own chat usage" on public.chat_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.try_consume_chat(
  p_user_id uuid,
  p_period text,
  p_ceiling integer
) returns boolean
language sql
set search_path = public
as $$
  insert into public.chat_usage (user_id, period, count, updated_at)
  values (p_user_id, p_period, 1, now())
  on conflict (user_id, period) do update
    set count = chat_usage.count + 1, updated_at = now()
    where chat_usage.count < p_ceiling
  returning true;
$$;

create or replace function public.refund_chat(
  p_user_id uuid,
  p_period text
) returns void
language sql
set search_path = public
as $$
  update public.chat_usage
     set count = greatest(count - 1, 0), updated_at = now()
   where user_id = p_user_id and period = p_period;
$$;

revoke all on function public.try_consume_chat(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.refund_chat(uuid, text) from public, anon, authenticated;
grant execute on function public.try_consume_chat(uuid, text, integer) to service_role;
grant execute on function public.refund_chat(uuid, text) to service_role;
