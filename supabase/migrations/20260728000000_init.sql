-- Contraya initial schema: contracts, their child rows (dates, obligations,
-- risk flags, documents), and the private documents bucket.
--
-- Security posture (carried over from Warraya, where it survived an audit):
--  * RLS on every table; policies scoped `to authenticated` and keyed on
--    (select auth.uid()) so Postgres caches the uid per statement.
--  * Direct grants revoked from `anon` and granted explicitly to
--    `authenticated` (default privileges are unreliable under db push), so
--    RLS is the second line of defense rather than the only one.
--  * CHECK constraints bound every user-supplied value (lengths, ranges,
--    date sanity) so a compromised or buggy client can't write junk.
--  * Per-user and per-contract row caps as cost/abuse backstops.
--  * The documents bucket is private, capped at 10MB per object, restricted
--    to image/PDF MIME types, and every object path must start with the
--    owner's user id.

-- 1. contracts ---------------------------------------------------------------

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null
    constraint contracts_title_len check (length(btrim(title)) between 1 and 200),
  contract_type text not null default 'other'
    constraint contracts_type_enum check (contract_type in (
      'lease', 'freelance', 'vendor', 'phone_internet', 'subscription',
      'wedding_event', 'insurance', 'employment', 'other'
    )),
  party_you text
    constraint contracts_party_you_len check (party_you is null or length(party_you) <= 200),
  party_other text
    constraint contracts_party_other_len check (party_other is null or length(party_other) <= 200),
  summary text
    constraint contracts_summary_len check (summary is null or length(summary) <= 8000),
  payment_terms text
    constraint contracts_payment_terms_len check (payment_terms is null or length(payment_terms) <= 2000),
  effective_date date
    constraint contracts_effective_date_sane check (effective_date is null or effective_date between date '1900-01-01' and date '2200-12-31'),
  end_date date
    constraint contracts_end_date_sane check (end_date is null or end_date between date '1900-01-01' and date '2200-12-31'),
  status text not null default 'active'
    constraint contracts_status_enum check (status in ('active', 'ended', 'archived')),
  notes text
    constraint contracts_notes_len check (notes is null or length(notes) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.contracts enable row level security;
revoke all on public.contracts from anon;
grant select, insert, update, delete on public.contracts to authenticated;
grant all on public.contracts to service_role;

create policy "select own contracts" on public.contracts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "insert own contracts" on public.contracts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own contracts" on public.contracts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own contracts" on public.contracts
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index contracts_user_id_idx on public.contracts (user_id);

-- Per-user ceiling: storage is effectively free, so this is an abuse backstop,
-- not a product limit (the app never shows it).
create or replace function public.enforce_contract_cap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.contracts where user_id = new.user_id) >= 200 then
    raise exception 'contract limit reached';
  end if;
  return new;
end;
$$;

create trigger contracts_cap before insert on public.contracts
  for each row execute function public.enforce_contract_cap();

-- 2. contract_dates ----------------------------------------------------------
-- The reminder-able rows: each date a contract makes someone care about.
-- reminder_windows holds the days-before offsets (validated here; both the
-- on-device planner and the daily cron read this column, so there is exactly
-- one source of truth for windows).

create table public.contract_dates (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null
    constraint contract_dates_label_len check (length(btrim(label)) between 1 and 200),
  date_type text not null default 'custom'
    constraint contract_dates_type_enum check (date_type in (
      'payment', 'renewal', 'termination_notice', 'expiry', 'start', 'custom'
    )),
  due_date date not null
    constraint contract_dates_due_sane check (due_date between date '1900-01-01' and date '2200-12-31'),
  recurrence text not null default 'none'
    constraint contract_dates_recurrence_enum check (recurrence in ('none', 'monthly', 'yearly')),
  reminder_windows integer[] not null default '{30,7}'
    constraint contract_dates_windows_bounds check (
      array_length(reminder_windows, 1) between 1 and 4
      and reminder_windows <@ array[1, 3, 7, 14, 30, 60, 90]
    ),
  created_at timestamptz not null default now()
);

alter table public.contract_dates enable row level security;
revoke all on public.contract_dates from anon;
grant select, insert, update, delete on public.contract_dates to authenticated;
grant all on public.contract_dates to service_role;

create policy "select own dates" on public.contract_dates
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The parent contract must be the caller's own row.
create policy "insert own dates" on public.contract_dates
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
  );

-- with check re-proves the parent like INSERT does; without it a user can
-- re-parent an owned row onto another user's contract_id.
create policy "update own dates" on public.contract_dates
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
  );

create policy "delete own dates" on public.contract_dates
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index contract_dates_contract_id_idx on public.contract_dates (contract_id);
create index contract_dates_user_id_idx on public.contract_dates (user_id);
create index contract_dates_due_date_idx on public.contract_dates (due_date);

-- 3. contract_obligations ----------------------------------------------------

create table public.contract_obligations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  who text not null default 'You'
    constraint contract_obligations_who_len check (length(btrim(who)) between 1 and 200),
  description text not null
    constraint contract_obligations_desc_len check (length(btrim(description)) between 1 and 1000),
  due_note text
    constraint contract_obligations_due_note_len check (due_note is null or length(due_note) <= 200),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.contract_obligations enable row level security;
revoke all on public.contract_obligations from anon;
-- The checklist only ever toggles completed_at; a column-level grant keeps
-- the text immutable from the client.
grant select, insert, delete on public.contract_obligations to authenticated;
grant update (completed_at) on public.contract_obligations to authenticated;
grant all on public.contract_obligations to service_role;

create policy "select own obligations" on public.contract_obligations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "insert own obligations" on public.contract_obligations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
  );

-- with check re-proves parent ownership, matching the INSERT policy. The
-- grant is column-scoped to completed_at so contract_id can't move today, but
-- keeping the policies identical means widening the grant later can't silently
-- open a cross-user re-parenting hole.
create policy "update own obligations" on public.contract_obligations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
  );

create policy "delete own obligations" on public.contract_obligations
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index contract_obligations_contract_id_idx on public.contract_obligations (contract_id);
create index contract_obligations_user_id_idx on public.contract_obligations (user_id);

-- 4. contract_risk_flags -----------------------------------------------------

create table public.contract_risk_flags (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  severity text not null default 'low'
    constraint contract_risk_flags_severity_enum check (severity in ('high', 'medium', 'low')),
  title text not null
    constraint contract_risk_flags_title_len check (length(btrim(title)) between 1 and 200),
  quote text
    constraint contract_risk_flags_quote_len check (quote is null or length(quote) <= 1000),
  why_it_matters text not null
    constraint contract_risk_flags_why_len check (length(btrim(why_it_matters)) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.contract_risk_flags enable row level security;
revoke all on public.contract_risk_flags from anon;
-- Immutable once written: no update grant.
grant select, insert, delete on public.contract_risk_flags to authenticated;
grant all on public.contract_risk_flags to service_role;

create policy "select own risk flags" on public.contract_risk_flags
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "insert own risk flags" on public.contract_risk_flags
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
  );

create policy "delete own risk flags" on public.contract_risk_flags
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index contract_risk_flags_contract_id_idx on public.contract_risk_flags (contract_id);
create index contract_risk_flags_user_id_idx on public.contract_risk_flags (user_id);

-- 5. per-contract child caps -------------------------------------------------
-- The client truncates analysis output well below these; the trigger stops a
-- buggy or hostile client from flooding child rows.

create or replace function public.enforce_child_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  execute format('select count(*) from public.%I where contract_id = $1', tg_table_name)
    into n using new.contract_id;
  if n >= 100 then
    raise exception 'row limit reached for this contract';
  end if;
  return new;
end;
$$;

create trigger contract_dates_cap before insert on public.contract_dates
  for each row execute function public.enforce_child_cap();
create trigger contract_obligations_cap before insert on public.contract_obligations
  for each row execute function public.enforce_child_cap();
create trigger contract_risk_flags_cap before insert on public.contract_risk_flags
  for each row execute function public.enforce_child_cap();

-- The per-contract cap trigger is BEFORE INSERT only. contract_dates is the one
-- child table with a full UPDATE grant, so without this a client could keep
-- re-parenting an owned row onto a different owned contract (INSERT-cap never
-- re-fires) and grow date rows without bound, which would also swell the
-- all-users scan in send-date-reminders. contract_id and user_id are never
-- edited (only the date fields are), so freeze them: this closes the cap
-- bypass and the intra-user re-parenting the RLS with-check does not cover.
create or replace function public.freeze_date_parent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.contract_id is distinct from old.contract_id
     or new.user_id is distinct from old.user_id then
    raise exception 'contract_id and user_id are immutable';
  end if;
  return new;
end;
$$;

create trigger contract_dates_freeze_parent before update on public.contract_dates
  for each row execute function public.freeze_date_parent();

-- 6. contract_documents ------------------------------------------------------
-- The contract file itself (PDF or page photos, page_number ordering) plus
-- anything else the user attaches. Immutable like Warraya's documents.

create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null
    constraint contract_documents_path_len check (length(storage_path) <= 512),
  kind text not null
    constraint contract_documents_kind_enum check (kind in ('image', 'pdf')),
  label text
    constraint contract_documents_label_len check (label is null or length(label) <= 200),
  page_number integer
    constraint contract_documents_page_range check (page_number is null or page_number between 1 and 200),
  created_at timestamptz not null default now(),
  constraint contract_documents_path_unique unique (storage_path)
);

alter table public.contract_documents enable row level security;
revoke all on public.contract_documents from anon;
-- Immutable: no update grant.
grant select, insert, delete on public.contract_documents to authenticated;
grant all on public.contract_documents to service_role;

create policy "select own documents" on public.contract_documents
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The path must live in the caller's own storage folder, and the contract
-- must be the caller's own row.
create policy "insert own documents" on public.contract_documents
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and storage_path like (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.contracts c
      where c.id = contract_id and c.user_id = (select auth.uid())
    )
  );

create policy "delete own documents" on public.contract_documents
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index contract_documents_contract_id_idx on public.contract_documents (contract_id);
create index contract_documents_user_id_idx on public.contract_documents (user_id);

create trigger contract_documents_cap before insert on public.contract_documents
  for each row execute function public.enforce_child_cap();

-- 7. documents bucket (private) ----------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['image/*', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- RLS on storage.objects is on by default on managed Supabase, but the whole
-- privacy of these private buckets rests on it, so assert it explicitly rather
-- than assume the platform default (idempotent).
alter table storage.objects enable row level security;

-- Object paths are {user_id}/{uuid}.{ext}; the first folder segment must match
-- the caller's uid.
create policy "read own documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "upload own documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
