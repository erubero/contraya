-- Per-user monthly receipt-scan counter. The extract-receipt edge function
-- writes it with the service role to enforce an abuse ceiling; the client reads
-- its own row to gate the free-tier scan limit. Writing only via service role
-- means a client can never reset or lower its own count.

create table public.scan_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null
    constraint scan_usage_period_fmt check (period ~ '^\d{4}-\d{2}$'),
  count integer not null default 0
    constraint scan_usage_count_nonneg check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.scan_usage enable row level security;
revoke all on public.scan_usage from anon;
grant select on public.scan_usage to authenticated;   -- read own row only (policy below); no write grants
grant all on public.scan_usage to service_role;

create policy "read own scan usage" on public.scan_usage
  for select to authenticated
  using (user_id = (select auth.uid()));
