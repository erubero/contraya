-- Server-side abuse ceiling on warranties per user. The free-tier limit of 5
-- lives on the client (mobile/src/lib/limits.ts), which knows the RevenueCat
-- entitlement; the server cannot see entitlements, so this only backstops
-- storage/DB cost from a modified client. 200 is far above any legitimate
-- library, so real users (free or premium) never hit it.

create or replace function public.enforce_warranty_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap constant integer := 200;
begin
  -- Cheap: warranties_user_id_idx covers this count.
  if (select count(*) from public.warranties where user_id = new.user_id) >= cap then
    raise exception 'warranty limit reached';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_warranty_cap() from public, anon, authenticated;

create trigger warranties_enforce_cap
  before insert on public.warranties
  for each row execute function public.enforce_warranty_cap();
