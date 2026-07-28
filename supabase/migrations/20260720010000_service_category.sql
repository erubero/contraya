-- Add "service" as a category so users can log a warranty on a SERVICE
-- performed (e.g. an AC repair with a 30-day labor warranty), not only on a
-- product they bought. Reuses every existing warranties column: the client
-- relabels "Product Name" -> "What was serviced" and "Store" -> "Service
-- Provider" when category = 'service'; no new column needed.

alter table public.warranties
  drop constraint warranties_category_enum;

alter table public.warranties
  add constraint warranties_category_enum check (category in (
    'electronics', 'appliances', 'furniture', 'automotive',
    'clothing', 'tools', 'sports', 'jewelry', 'service', 'other'
  ));
