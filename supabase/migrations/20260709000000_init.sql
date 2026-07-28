-- Warraya initial schema: warranties and the receipts bucket.
-- Expiry reminders are local notifications scheduled on-device by the iOS
-- app, so there is no push or reminder state on the server.
--
-- Security posture:
--  * RLS on every table; policies scoped `to authenticated` and keyed on
--    (select auth.uid()) so Postgres caches the uid per statement.
--  * Direct grants revoked from `anon`, so RLS is the second line of
--    defense rather than the only one.
--  * CHECK constraints bound every user-supplied value (lengths, ranges,
--    date sanity) so a compromised or buggy client can't write junk.
--  * The receipts bucket is private, capped at 10MB per object, restricted
--    to image/PDF MIME types, and every object path must start with the
--    owner's user id.

-- 1. warranties -------------------------------------------------------------

create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_name text not null
    constraint warranties_product_name_len check (length(btrim(product_name)) between 1 and 200),
  brand text
    constraint warranties_brand_len check (brand is null or length(brand) <= 200),
  category text
    constraint warranties_category_enum check (category in (
      'electronics', 'appliances', 'furniture', 'automotive',
      'clothing', 'tools', 'sports', 'jewelry', 'other'
    )),
  purchase_date date not null
    constraint warranties_purchase_date_sane check (purchase_date between date '1900-01-01' and date '2200-12-31'),
  warranty_end_date date not null
    constraint warranties_end_date_sane check (warranty_end_date between date '1900-01-01' and date '2200-12-31'),
  warranty_duration_months integer
    constraint warranties_duration_range check (warranty_duration_months is null or warranty_duration_months between 1 and 1200),
  purchase_price numeric(12, 2)
    constraint warranties_price_range check (purchase_price is null or purchase_price >= 0),
  store text
    constraint warranties_store_len check (store is null or length(store) <= 200),
  serial_number text
    constraint warranties_serial_len check (serial_number is null or length(serial_number) <= 200),
  receipt_path text
    constraint warranties_receipt_path_len check (receipt_path is null or length(receipt_path) <= 512),
  notes text
    constraint warranties_notes_len check (notes is null or length(notes) <= 2000),
  warranty_type text not null default 'manufacturer'
    constraint warranties_type_enum check (warranty_type in ('manufacturer', 'extended', 'store', 'other')),
  created_at timestamptz not null default now(),
  constraint warranties_dates_ordered check (warranty_end_date >= purchase_date)
);

alter table public.warranties enable row level security;
revoke all on public.warranties from anon;

create policy "select own warranties" on public.warranties
  for select to authenticated
  using (user_id = (select auth.uid()));

-- receipt_path must live under the caller's own storage folder, so a row can
-- never point at another user's receipt object.
create policy "insert own warranties" on public.warranties
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (receipt_path is null or receipt_path like (select auth.uid())::text || '/%')
  );

create policy "update own warranties" on public.warranties
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (receipt_path is null or receipt_path like (select auth.uid())::text || '/%')
  );

create policy "delete own warranties" on public.warranties
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index warranties_user_id_idx on public.warranties (user_id);
create index warranties_end_date_idx on public.warranties (warranty_end_date);

-- 2. receipts bucket (private) -----------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/*', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object paths are {user_id}/{uuid}.{ext}; the first folder segment must match
-- the caller's uid.
create policy "read own receipts" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "upload own receipts" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own receipts" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
