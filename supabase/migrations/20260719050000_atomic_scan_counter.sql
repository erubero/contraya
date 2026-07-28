-- Atomic scan-quota consume/refund for the extract-receipt edge function.
--
-- The old flow read the count, called Anthropic, then upserted count+1 from
-- the value it read. Parallel requests all wrote (initial + 1), pinning the
-- counter near 1 and voiding the monthly cost ceiling. try_consume_scan does
-- check + increment in ONE statement: concurrent calls serialize on the
-- (user_id, period) primary key, and a call at the ceiling updates zero rows
-- (returns null) without burning anything.
--
-- refund_scan lets failed extractions give the slot back, preserving the
-- existing semantic that bad photos never burn quota — the client's free-tier
-- gate reads this same counter.
--
-- Service-role only: these are called by the edge function, never by clients.

create or replace function public.try_consume_scan(
  p_user_id uuid,
  p_period text,
  p_ceiling integer
) returns boolean
language sql
set search_path = public
as $$
  insert into public.scan_usage (user_id, period, count, updated_at)
  values (p_user_id, p_period, 1, now())
  on conflict (user_id, period) do update
    set count = scan_usage.count + 1, updated_at = now()
    where scan_usage.count < p_ceiling
  returning true;
$$;

create or replace function public.refund_scan(
  p_user_id uuid,
  p_period text
) returns void
language sql
set search_path = public
as $$
  update public.scan_usage
     set count = greatest(count - 1, 0), updated_at = now()
   where user_id = p_user_id and period = p_period;
$$;

revoke all on function public.try_consume_scan(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.refund_scan(uuid, text) from public, anon, authenticated;
grant execute on function public.try_consume_scan(uuid, text, integer) to service_role;
grant execute on function public.refund_scan(uuid, text) to service_role;
