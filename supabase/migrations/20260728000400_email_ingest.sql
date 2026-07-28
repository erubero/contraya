-- Email-in ingestion: each user gets a secret forwarding address
-- (c-<token>@usecontraya.com). The Cloudflare Email Worker validates the
-- token format, extracts PDF attachments, and hands them to the ingest-email
-- edge function, which stores the file and inserts an inbox_items row. The
-- user imports (analyze -> review -> save) or dismisses from the app.
--
-- Security posture:
--  * The token IS the credential (128 bits, unguessable). Sender addresses
--    are spoofable, so the sender is metadata only, never trusted.
--  * Ingestion never calls the model, so spammed attachments cost storage
--    only; the analysis quota is spent in-app, behind the normal gates.
--  * inbox_items rows are inserted only by the service role (the edge
--    function); clients can read and delete their own, nothing else.

-- 1. email_ingest_addresses --------------------------------------------------

create table public.email_ingest_addresses (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token text not null
    constraint email_ingest_token_format check (token ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now(),
  constraint email_ingest_token_uniq unique (token)
);

alter table public.email_ingest_addresses enable row level security;
revoke all on public.email_ingest_addresses from anon;
grant select on public.email_ingest_addresses to authenticated;
grant all on public.email_ingest_addresses to service_role;

create policy "read own ingest address" on public.email_ingest_addresses
  for select to authenticated
  using (user_id = (select auth.uid()));

create index email_ingest_addresses_token_idx on public.email_ingest_addresses (token);

-- Returns the caller's ingest token, minting one on first use. Runs as the
-- definer so the token is generated server-side (clients never pick their
-- own), and only ever writes user_id = auth.uid().
create or replace function public.get_or_create_email_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  t := replace(gen_random_uuid()::text, '-', '');
  insert into public.email_ingest_addresses (user_id, token)
  values ((select auth.uid()), t)
  on conflict (user_id) do nothing;

  select token into t from public.email_ingest_addresses
  where user_id = (select auth.uid());
  return t;
end;
$$;

revoke all on function public.get_or_create_email_token() from public, anon;
grant execute on function public.get_or_create_email_token() to authenticated;

-- 2. inbox_items -------------------------------------------------------------
-- A contract that arrived by email and waits in the app. Importing turns its
-- storage object into a contract document (the row is then deleted, object
-- kept); dismissing deletes both.

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null
    constraint inbox_items_path_len check (length(storage_path) <= 512),
  kind text not null default 'pdf'
    constraint inbox_items_kind_enum check (kind in ('pdf')),
  original_filename text
    constraint inbox_items_filename_len check (original_filename is null or length(original_filename) <= 200),
  from_address text
    constraint inbox_items_from_len check (from_address is null or length(from_address) <= 320),
  subject text
    constraint inbox_items_subject_len check (subject is null or length(subject) <= 500),
  received_at timestamptz not null default now(),
  constraint inbox_items_path_unique unique (storage_path)
);

alter table public.inbox_items enable row level security;
revoke all on public.inbox_items from anon;
-- Clients read and delete their own; only the edge function inserts.
grant select, delete on public.inbox_items to authenticated;
grant all on public.inbox_items to service_role;

create policy "select own inbox" on public.inbox_items
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "delete own inbox" on public.inbox_items
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index inbox_items_user_id_idx on public.inbox_items (user_id);
create index inbox_items_received_at_idx on public.inbox_items (received_at);

-- Backstop cap so a runaway sender can never flood a user's rows; the edge
-- function enforces the tighter daily limit in code.
create or replace function public.enforce_inbox_cap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.inbox_items where user_id = new.user_id) >= 200 then
    raise exception 'inbox limit reached';
  end if;
  return new;
end;
$$;

create trigger inbox_items_cap before insert on public.inbox_items
  for each row execute function public.enforce_inbox_cap();
