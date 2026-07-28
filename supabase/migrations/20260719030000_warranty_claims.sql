-- Records when a warranty claim was filed. Powers the "Saved" tally and keeps
-- claimed items out of the active-coverage total. The existing update RLS policy
-- on warranties (init migration) already lets an owner set this, so no new
-- policy is needed.

alter table public.warranties
  add column claimed_at timestamptz;
