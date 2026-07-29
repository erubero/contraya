-- Contraya post-deploy verification. READ ONLY: this only selects, it never
-- changes anything, so it is safe to run against production any time.
--
-- Paste the whole file into the Supabase dashboard SQL Editor and Run.
-- Every row should say PASS. Anything that says FAIL is a real problem.
--
-- What it does NOT cover, because SQL cannot see them: whether the five edge
-- functions are deployed, whether the secrets are set, and whether an actual
-- upload round-trips. Those need the dashboard and a real run.

with
-- 1. every table exists, with RLS on -----------------------------------------
expected_tables(name) as (
  values ('contracts'), ('contract_dates'), ('contract_obligations'),
         ('contract_risk_flags'), ('contract_documents'), ('push_tokens'),
         ('contract_date_reminders'), ('analysis_usage'), ('chat_usage'),
         ('email_ingest_addresses'), ('inbox_items')
),
table_check as (
  select
    'table + RLS: ' || e.name as check_name,
    case
      when c.oid is null then 'FAIL - table missing'
      when not c.relrowsecurity then 'FAIL - RLS is OFF'
      else 'PASS'
    end as result,
    coalesce((select count(*)::text from pg_policies p
              where p.schemaname = 'public' and p.tablename = e.name), '0') || ' policies' as detail
  from expected_tables e
  left join pg_class c
    on c.relname = e.name
   and c.relnamespace = 'public'::regnamespace
),

-- 2. anon must have no grants anywhere ---------------------------------------
anon_check as (
  select
    'anon has no table grants' as check_name,
    case when count(*) = 0 then 'PASS' else 'FAIL - anon can reach tables' end as result,
    coalesce(string_agg(distinct table_name, ', '), 'none') as detail
  from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public'
),

-- 3. the quota + token RPCs exist and are service_role only ------------------
expected_fns(name) as (
  values ('try_consume_analysis'), ('refund_analysis'), ('try_consume_chat'),
         ('refund_chat'), ('get_or_create_email_token'), ('register_push_token'),
         ('enforce_contract_cap'), ('enforce_child_cap'), ('enforce_inbox_cap'),
         ('freeze_date_parent')
),
fn_check as (
  select
    'function: ' || e.name as check_name,
    case when p.oid is null then 'FAIL - missing' else 'PASS' end as result,
    coalesce(case when p.prosecdef then 'security definer' else 'security invoker' end, '') as detail
  from expected_fns e
  left join pg_proc p
    on p.proname = e.name
   and p.pronamespace = 'public'::regnamespace
),

-- 4. metered RPCs must NOT be callable by authenticated ----------------------
rpc_grant_check as (
  select
    'quota RPCs are service_role only' as check_name,
    case when count(*) = 0 then 'PASS'
         else 'FAIL - authenticated can call quota RPCs' end as result,
    coalesce(string_agg(routine_name, ', '), 'none exposed') as detail
  from information_schema.role_routine_grants
  where grantee in ('authenticated', 'anon')
    and routine_schema = 'public'
    and routine_name in ('try_consume_analysis','refund_analysis',
                         'try_consume_chat','refund_chat')
),

-- 5. triggers ----------------------------------------------------------------
expected_triggers(name) as (
  values ('contracts_cap'), ('contract_dates_cap'), ('contract_obligations_cap'),
         ('contract_risk_flags_cap'), ('contract_documents_cap'),
         ('inbox_items_cap'), ('contract_dates_freeze_parent')
),
trigger_check as (
  select
    'trigger: ' || e.name as check_name,
    case when t.tgname is null then 'FAIL - missing' else 'PASS' end as result,
    '' as detail
  from expected_triggers e
  left join pg_trigger t on t.tgname = e.name and not t.tgisinternal
),

-- 6. storage buckets: must exist and must be PRIVATE -------------------------
expected_buckets(name, limit_bytes) as (
  values ('documents', 10485760), ('avatars', 2097152)
),
bucket_check as (
  select
    'bucket: ' || e.name as check_name,
    case
      when b.id is null then 'FAIL - bucket missing'
      when b.public then 'FAIL - bucket is PUBLIC, must be private'
      when b.file_size_limit is distinct from e.limit_bytes then 'FAIL - wrong size limit'
      else 'PASS'
    end as result,
    coalesce('private=' || (not b.public)::text ||
             ', limit=' || b.file_size_limit::text, 'n/a') as detail
  from expected_buckets e
  left join storage.buckets b on b.id = e.name
),

-- 7. storage.objects RLS + policy count --------------------------------------
storage_rls as (
  select
    'storage.objects RLS on' as check_name,
    case when c.relrowsecurity then 'PASS' else 'FAIL - storage is wide open' end as result,
    (select count(*)::text from pg_policies
     where schemaname = 'storage' and tablename = 'objects') || ' policies' as detail
  from pg_class c where c.oid = 'storage.objects'::regclass
),

-- 8. migration history -------------------------------------------------------
migration_check as (
  select
    'migrations applied' as check_name,
    case when count(*) >= 7 then 'PASS' else 'FAIL - expected 7' end as result,
    count(*)::text || ' rows' as detail
  from supabase_migrations.schema_migrations
)

select * from table_check
union all select * from anon_check
union all select * from fn_check
union all select * from rpc_grant_check
union all select * from trigger_check
union all select * from bucket_check
union all select * from storage_rls
union all select * from migration_check
order by result desc, check_name;
