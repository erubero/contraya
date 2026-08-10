-- Let a user say a date has been handled, so a recurring one can ever be cleared.
--
-- Until now contract_dates carried no per-row user state, and the Tasks screen
-- derived everything at read time from lastMissedOccurrence(). That is fine for
-- a one-off date, which stops being missed once its day is far enough behind.
-- It is broken for a recurring one: a monthly rent row ALWAYS has an occurrence
-- before today, so it is permanently past due, the task-bell badge never
-- clears, and paying the rent changes nothing because there is nothing to
-- change. The app had no way to record the one fact that matters.
--
-- A single date column rather than a completions table. The semantics are
-- "every occurrence on or before this day is handled", which is what paying a
-- bill actually means: settling August says nothing is outstanding from July.
-- It also keeps the existing one-task-per-row model intact, so a user three
-- months behind clears three tasks one at a time as each surfaces, instead of
-- being handed a backlog. A per-occurrence table would allow marking August
-- done while July stays open, which is a distinction no bill makes and a lot
-- of rows to carry for it.
--
-- Deliberately not settable by create_contract_bundle: a contract being saved
-- for the first time has nothing completed, so the RPC's explicit column list
-- correctly omits this.

alter table public.contract_dates
  add column if not exists last_completed_occurrence date;

-- Nullable, and null is the norm: it means nothing has been marked handled.
-- The floor is due_date because due_date IS the first occurrence, so no
-- occurrence of any row can fall before it. Postgres has no
-- `add constraint if not exists`, hence the drop-then-add.
alter table public.contract_dates
  drop constraint if exists contract_dates_completed_after_due;
alter table public.contract_dates
  add constraint contract_dates_completed_after_due
  check (last_completed_occurrence is null or last_completed_occurrence >= due_date);

-- Restated rather than assumed. Table-level grants do cover columns added
-- later, but this repo has been bitten by privileges that did not survive
-- `db push` (see the GRANT migration note in CLAUDE.md), and re-granting is
-- idempotent. Unchanged from init.sql: contract_dates already carries a
-- table-wide update grant, which is why the freeze_date_parent trigger exists
-- to keep contract_id and user_id immutable. This column is an ordinary date
-- field and that trigger already covers the hole a full update grant opens.
revoke all on public.contract_dates from anon;
grant select, insert, update, delete on public.contract_dates to authenticated;
grant all on public.contract_dates to service_role;

-- No new RLS policy. "update own dates" already scopes updates to the caller's
-- own rows and re-proves the parent contract in its with check.
