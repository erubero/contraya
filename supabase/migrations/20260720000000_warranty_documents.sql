-- Multiple documents (receipt photos, warranty-card photos, PDF manuals) per
-- warranty. Replaces the single warranties.receipt_path as the source of
-- truth. That column is KEPT for now: the retired-but-live web dashboard
-- still writes it, and the mobile client renders it as a fallback document.
-- Drop it in a later migration once the web dashboard is retired.
--
-- Storage is unchanged: documents live in the existing private `receipts`
-- bucket under `${auth.uid()}/...`, so the per-user folder policies from the
-- init migration cover them (bucket already allows image/* + application/pdf,
-- 10 MB cap).

create table public.warranty_documents (
  id uuid primary key default gen_random_uuid(),
  warranty_id uuid not null references public.warranties (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null
    constraint warranty_documents_path_len check (length(storage_path) <= 512),
  kind text not null
    constraint warranty_documents_kind_enum check (kind in ('image', 'pdf')),
  label text
    constraint warranty_documents_label_len check (label is null or length(label) <= 200),
  created_at timestamptz not null default now(),
  constraint warranty_documents_path_unique unique (storage_path)
);

alter table public.warranty_documents enable row level security;
revoke all on public.warranty_documents from anon;
-- Immutable like receipts: no update grant.
grant select, insert, delete on public.warranty_documents to authenticated;
grant all on public.warranty_documents to service_role;

create policy "select own documents" on public.warranty_documents
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The path must live in the caller's own storage folder, and the warranty
-- must be the caller's own row.
create policy "insert own documents" on public.warranty_documents
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and storage_path like (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.warranties w
      where w.id = warranty_id and w.user_id = (select auth.uid())
    )
  );

create policy "delete own documents" on public.warranty_documents
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index warranty_documents_warranty_id_idx on public.warranty_documents (warranty_id);
create index warranty_documents_user_id_idx on public.warranty_documents (user_id);

-- Backfill: every existing receipt becomes its warranty's first document.
-- Runs as the migration role (RLS bypassed); idempotent via the unique path.
insert into public.warranty_documents (warranty_id, user_id, storage_path, kind, created_at)
select id, user_id, receipt_path,
       case when receipt_path ilike '%.pdf' then 'pdf' else 'image' end,
       created_at
from public.warranties
where receipt_path is not null
on conflict (storage_path) do nothing;
