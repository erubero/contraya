-- One transaction for a saved contract, instead of four round trips that can
-- stop halfway (audit finding 6).
--
-- The client inserted the contract, then its dates, then its obligations, then
-- its risk flags, rethrowing on the first child failure. The comment there said
-- the user "can retry the save", and they can, but the parent row was already
-- committed: the retry inserted a SECOND contract and left the first one in the
-- list with no dates on it. On the review screen, which a free user reaches by
-- spending one of two lifetime analyses, that is the worst place to duplicate.
--
-- Payloads arrive as jsonb and go through jsonb_populate_record purely for the
-- type coercion it gives for free: date strings to date, numeric strings to
-- numeric(12,2), a JSON array of ints to integer[].
--
-- The column lists are written out rather than using `.*`, and that is
-- load-bearing. jsonb_populate_record fills every column it cannot find in the
-- payload with NULL, and an explicit NULL in an INSERT overrides the column
-- default rather than falling back to it. `select (populate(...)).*` would
-- therefore write user_id = NULL and hit the not-null constraint instead of
-- defaulting to auth.uid(). Naming the columns keeps id, user_id, created_at,
-- contract_id and completed_at out of the statement entirely, which is the
-- only way they get their defaults. Adding a column to any of these tables
-- means adding it here too; that is the cost of the guarantee.
--
-- SECURITY INVOKER, stated rather than assumed. The whole point is that RLS
-- still runs: the caller may only write rows they own. A definer function here
-- would quietly become a way to write into anyone else's account.

create or replace function public.create_contract_bundle(
  p_contract jsonb,
  p_dates jsonb default '[]'::jsonb,
  p_obligations jsonb default '[]'::jsonb,
  p_risk_flags jsonb default '[]'::jsonb
)
-- Returns the id, not the row. The caller refetches through getBundle anyway,
-- which is the read that has to be right, and a scalar keeps PostgREST's
-- composite-serialisation behaviour out of the contract entirely.
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_contract public.contracts;
begin
  insert into public.contracts (
    title, contract_type, party_you, party_other, summary, payment_terms,
    effective_date, end_date, status, notes, total_value, party_other_contact
  )
  select
    c.title, c.contract_type, c.party_you, c.party_other, c.summary, c.payment_terms,
    c.effective_date, c.end_date, c.status, c.notes, c.total_value, c.party_other_contact
  from jsonb_populate_record(null::public.contracts, p_contract) as c
  returning * into v_contract;

  -- contract_id comes from the row just inserted, never from the payload. A
  -- caller must not be able to hang children off a different contract, and RLS
  -- would not catch it when the contract they name is also theirs.
  insert into public.contract_dates (
    contract_id, label, date_type, due_date, recurrence, reminder_windows
  )
  select
    v_contract.id, d.label, d.date_type, d.due_date, d.recurrence, d.reminder_windows
  from jsonb_array_elements(coalesce(p_dates, '[]'::jsonb)) as item,
       lateral jsonb_populate_record(null::public.contract_dates, item.value) as d;

  insert into public.contract_obligations (contract_id, who, description, due_note)
  select v_contract.id, o.who, o.description, o.due_note
  from jsonb_array_elements(coalesce(p_obligations, '[]'::jsonb)) as item,
       lateral jsonb_populate_record(null::public.contract_obligations, item.value) as o;

  insert into public.contract_risk_flags (contract_id, severity, title, quote, why_it_matters)
  select v_contract.id, r.severity, r.title, r.quote, r.why_it_matters
  from jsonb_array_elements(coalesce(p_risk_flags, '[]'::jsonb)) as item,
       lateral jsonb_populate_record(null::public.contract_risk_flags, item.value) as r;

  -- No exception handler. A plpgsql function is already one transaction, so any
  -- raise rolls the whole thing back, parent included, and the client sees the
  -- real Postgres error rather than one this function invented.
  return v_contract.id;
end;
$$;

-- Restated rather than assumed, and idempotent, for the same reason as the
-- grants in 20260731000000. anon must never reach this.
revoke all on function public.create_contract_bundle(jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.create_contract_bundle(jsonb, jsonb, jsonb, jsonb) from anon;
grant execute on function public.create_contract_bundle(jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.create_contract_bundle(jsonb, jsonb, jsonb, jsonb) to service_role;
