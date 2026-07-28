-- Server-side reminder delivery: native push tokens per user, plus a dedup
-- ledger so each (warranty, window, channel) reminder is sent at most once.
-- The daily cron (send-expiry-reminders) reads these with the service role.
--
-- Security posture mirrors the initial schema: RLS on every table, anon grants
-- revoked, authenticated granted explicitly (default privileges are unreliable
-- under db push), and the dedup ledger is service-role only.

-- 1. push_tokens ------------------------------------------------------------
-- One row per device push token, owned by the currently signed-in user. The
-- token is globally unique: if a device changes hands between accounts, the
-- token is reassigned to the latest user so reminders never reach the wrong
-- person. Reassignment needs a cross-user write, so it goes through the
-- security-definer function below rather than a plain client upsert.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token text not null
    constraint push_tokens_token_len check (length(token) between 1 and 512),
  platform text not null default 'ios'
    constraint push_tokens_platform_enum check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  constraint push_tokens_token_uniq unique (token)
);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon;
grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;

create policy "read own push tokens" on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "delete own push tokens" on public.push_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index push_tokens_user_id_idx on public.push_tokens (user_id);

-- Registers (or reassigns) a device token to the calling user. Runs as the
-- definer so it can drop a stale mapping the caller does not own, but it only
-- ever writes user_id = auth.uid(), so a caller can never claim another user.
create or replace function public.register_push_token(p_token text, p_platform text default 'ios')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_token is null or length(p_token) < 1 or length(p_token) > 512 then
    raise exception 'invalid token';
  end if;
  if p_platform is null or p_platform not in ('ios', 'android') then
    p_platform := 'ios';
  end if;

  insert into public.push_tokens (user_id, token, platform, updated_at)
  values ((select auth.uid()), p_token, p_platform, now())
  on conflict (token)
  do update set user_id = (select auth.uid()), platform = excluded.platform, updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- 2. warranty_reminders (dedup ledger; service role only) -------------------
-- A row means "this warranty's N-day reminder was already sent on this
-- channel." The cron upserts with ignoreDuplicates to claim a slot atomically.

create table public.warranty_reminders (
  warranty_id uuid not null references public.warranties (id) on delete cascade,
  reminder_window integer not null
    constraint warranty_reminders_window_enum check (reminder_window in (7, 30)),
  channel text not null
    constraint warranty_reminders_channel_enum check (channel in ('push', 'email')),
  sent_at timestamptz not null default now(),
  primary key (warranty_id, reminder_window, channel)
);

alter table public.warranty_reminders enable row level security;
revoke all on public.warranty_reminders from anon, authenticated;
grant all on public.warranty_reminders to service_role;
-- No policies for anon or authenticated on purpose: only the cron touches this.
