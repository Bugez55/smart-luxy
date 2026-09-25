-- WAZYO — READ-ONLY production compatibility preflight v2
-- IMPORTANT: this script must not modify data, schema, functions, policies or storage.
-- It only inspects PostgreSQL catalogs and table metadata.
-- Run this in Supabase SQL Editor before applying security_patch.sql.

with expected_tables(schema_name, table_name, install_behavior) as (
  values
    ('public','orders','required'),
    ('public','products','required'),
    ('public','promos','required'),
    ('public','reviews','required'),
    ('public','settings','required'),
    ('public','shipping_rates','required'),
    ('public','admin_users','required'),
    ('public','shipping_dispatches','patch_creates_if_absent'),
    ('private','order_rate_limits','patch_creates_if_absent'),
    ('private','review_rate_limits','patch_creates_if_absent')
),

table_checks as (
  select
    'table' as check_type,
    e.schema_name || '.' || e.table_name as check_name,
    case
      when c.table_name is not null then 'PASS'
      when e.install_behavior = 'patch_creates_if_absent' then 'WARN'
      else 'FAIL'
    end as status,
    case
      when c.table_name is not null then 'table exists'
      when e.install_behavior = 'patch_creates_if_absent'
        then 'absent; security_patch.sql will create it'
      else 'missing required existing table'
    end as detail
  from expected_tables e
  left join information_schema.tables c
    on c.table_schema = e.schema_name
   and c.table_name = e.table_name
   and c.table_type = 'BASE TABLE'
),

expected_columns(schema_name, table_name, column_name, patch_adds) as (
  values
    ('public','orders','id',false),
    ('public','orders','nom_client',false),
    ('public','orders','telephone',false),
    ('public','orders','wilaya',false),
    ('public','orders','commune',false),
    ('public','orders','adresse',false),
    ('public','orders','note',false),
    ('public','orders','items',false),
    ('public','orders','sous_total',false),
    ('public','orders','promo_code',false),
    ('public','orders','promo_reduction',false),
    ('public','orders','total',false),
    ('public','orders','statut',false),
    ('public','orders','mode_livraison',false),
    ('public','orders','mode_paiement',false),
    ('public','orders','frais_livraison',false),
    ('public','orders','fbc',false),
    ('public','orders','fbp',false),
    ('public','orders','request_fingerprint',true),
    ('public','orders','tracking_code',false),
    ('public','orders','livraison_company',false),
    ('public','orders','purchase_event_sent_at',false),
    ('public','orders','created_at',false),

    ('public','products','id',false),
    ('public','products','nom',false),
    ('public','products','prix',false),
    ('public','products','categorie',false),
    ('public','products','img',false),
    ('public','products','is_active',false),
    ('public','products','stock',false),
    ('public','products','ventes',false),
    ('public','products','nb_commandes',false),

    ('public','promos','id',false),
    ('public','promos','code',false),
    ('public','promos','reduction',false),
    ('public','promos','max_uses',false),
    ('public','promos','uses',false),
    ('public','promos','actif',false),

    ('public','reviews','id',false),
    ('public','reviews','product_id',false),
    ('public','reviews','nom',false),
    ('public','reviews','note',false),
    ('public','reviews','commentaire',false),
    ('public','reviews','photo',false),
    ('public','reviews','created_at',false),

    ('public','settings','key',false),
    ('public','settings','value',false),

    ('public','shipping_rates','wilaya',false),
    ('public','shipping_rates','bureau',false),
    ('public','shipping_rates','domicile',false),

    ('public','admin_users','user_id',false),

    ('public','shipping_dispatches','id',true),
    ('public','shipping_dispatches','provider',true),
    ('public','shipping_dispatches','order_id',true),
    ('public','shipping_dispatches','status',true),
    ('public','shipping_dispatches','attempts',true),
    ('public','shipping_dispatches','tracking_code',true),
    ('public','shipping_dispatches','label_url',true),
    ('public','shipping_dispatches','last_error',true),
    ('public','shipping_dispatches','created_at',true),
    ('public','shipping_dispatches','updated_at',true),

    ('private','order_rate_limits','key_hash',true),
    ('private','order_rate_limits','request_at',true),
    ('private','review_rate_limits','key_hash',true),
    ('private','review_rate_limits','scope',true),
    ('private','review_rate_limits','product_id',true),
    ('private','review_rate_limits','request_at',true)
),

column_checks as (
  select
    'column' as check_type,
    e.schema_name || '.' || e.table_name || '.' || e.column_name as check_name,
    case
      when c.column_name is not null then 'PASS'
      when t.table_name is null and e.patch_adds then 'WARN'
      when e.patch_adds then 'FAIL'
      when e.schema_name = 'private' and t.table_name is null then 'WARN'
      else 'FAIL'
    end as status,
    case
      when c.column_name is not null then 'column exists'
      when t.table_name is null and e.patch_adds then 'table absent; patch will create it'
      when e.patch_adds then 'table exists but patch uses CREATE IF NOT EXISTS; missing column would not be added automatically'
      when e.schema_name = 'private' and t.table_name is null then 'private table absent; patch will create it'
      else 'missing required column'
    end as detail
  from expected_columns e
  left join information_schema.tables t
    on t.table_schema = e.schema_name
   and t.table_name = e.table_name
   and t.table_type = 'BASE TABLE'
  left join information_schema.columns c
    on c.table_schema = e.schema_name
   and c.table_name = e.table_name
   and c.column_name = e.column_name
),

function_checks as (
  select
    'function' as check_type,
    'public.is_admin()' as check_name,
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'is_admin'
        and p.pronargs = 0
    ) then 'PASS' else 'FAIL' end as status,
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'is_admin'
        and p.pronargs = 0
    ) then 'function exists' else 'required by the admin shipping policy' end as detail

  union all
  select
    'function',
    'public.create_order(...)',
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'create_order'
        and p.pronargs = 13
        and oidvectortypes(p.proargtypes) = 'text text text text text text jsonb text numeric text text text text'
        and pg_get_function_result(p.oid) = 'jsonb'
    ) then 'PASS' else 'FAIL' end,
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'create_order'
        and p.pronargs = 13
        and oidvectortypes(p.proargtypes) = 'text text text text text text jsonb text numeric text text text text'
        and pg_get_function_result(p.oid) = 'jsonb'
    ) then '13-argument JSONB RPC signature found' else 'expected 13-argument signature missing or result type differs' end

  union all
  select
    'function',
    'public.get_order_tracking(text)',
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'get_order_tracking'
        and p.pronargs = 1
        and oidvectortypes(p.proargtypes) = 'text'
    ) then 'PASS' else 'WARN' end,
    'current frontend tracking contract should remain available'
),

extension_check as (
  select
    'extension' as check_type,
    'pgcrypto' as check_name,
    case when exists (select 1 from pg_extension where extname = 'pgcrypto')
      then 'PASS' else 'WARN' end as status,
    case when exists (select 1 from pg_extension where extname = 'pgcrypto')
      then 'extension installed' else 'absent; security_patch.sql will create it' end as detail
),

private_schema_check as (
  select
    'schema' as check_type,
    'private' as check_name,
    case when exists (select 1 from pg_namespace where nspname = 'private')
      then 'PASS' else 'WARN' end as status,
    case when exists (select 1 from pg_namespace where nspname = 'private')
      then 'schema exists' else 'absent; security_patch.sql will create it' end as detail
),

shipping_security_checks as (
  select
    'rls' as check_type,
    'public.shipping_dispatches RLS' as check_name,
    case
      when not exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'shipping_dispatches'
      ) then 'WARN'
      when exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'shipping_dispatches' and c.relrowsecurity
      ) then 'PASS'
      else 'FAIL'
    end,
    case
      when not exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'shipping_dispatches'
      ) then 'table absent; patch will create it with RLS'
      when exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'shipping_dispatches' and c.relrowsecurity
      ) then 'RLS enabled'
      else 'RLS disabled on existing table'
    end

  union all
  select
    'policy',
    'public.shipping_dispatches.admin manage shipping dispatches',
    case
      when not exists (select 1 from information_schema.tables where table_schema='public' and table_name='shipping_dispatches') then 'WARN'
      when exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='shipping_dispatches' and policyname='admin manage shipping dispatches'
      ) then 'PASS'
      else 'FAIL'
    end,
    case
      when not exists (select 1 from information_schema.tables where table_schema='public' and table_name='shipping_dispatches') then 'table absent; patch will create the policy'
      when exists (
        select 1 from pg_policies
        where schemaname='public' and tablename='shipping_dispatches' and policyname='admin manage shipping dispatches'
      ) then 'policy exists'
      else 'missing policy on existing table'
    end
),

shipping_constraints as (
  select
    'constraint' as check_type,
    'shipping_dispatches UNIQUE(provider,order_id)' as check_name,
    case
      when not exists (select 1 from information_schema.tables where table_schema='public' and table_name='shipping_dispatches') then 'WARN'
      when exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname='public' and t.relname='shipping_dispatches'
          and c.contype='u'
          and (
            select string_agg(a.attname, ',' order by x.ord)
            from unnest(c.conkey) with ordinality x(attnum,ord)
            join pg_attribute a on a.attrelid=t.oid and a.attnum=x.attnum
          ) = 'provider,order_id'
      ) then 'PASS'
      else 'FAIL'
    end,
    case
      when not exists (select 1 from information_schema.tables where table_schema='public' and table_name='shipping_dispatches') then 'table absent; patch will create required uniqueness'
      when exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname='public' and t.relname='shipping_dispatches'
          and c.contype='u'
          and (
            select string_agg(a.attname, ',' order by x.ord)
            from unnest(c.conkey) with ordinality x(attnum,ord)
            join pg_attribute a on a.attrelid=t.oid and a.attnum=x.attnum
          ) = 'provider,order_id'
      ) then 'unique constraint exists; first-writer-wins idempotence is enforceable'
      else 'existing table lacks required uniqueness; current CREATE IF NOT EXISTS will not add it'
    end

  union all
  select
    'constraint',
    'shipping_dispatches UNIQUE(provider,tracking_code)',
    case
      when not exists (select 1 from information_schema.tables where table_schema='public' and table_name='shipping_dispatches') then 'WARN'
      when exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname='public' and t.relname='shipping_dispatches'
          and c.contype='u'
          and (
            select string_agg(a.attname, ',' order by x.ord)
            from unnest(c.conkey) with ordinality x(attnum,ord)
            join pg_attribute a on a.attrelid=t.oid and a.attnum=x.attnum
          ) = 'provider,tracking_code'
      ) then 'PASS'
      else 'WARN'
    end,
    case
      when not exists (select 1 from information_schema.tables where table_schema='public' and table_name='shipping_dispatches') then 'table absent; patch will create required uniqueness'
      when exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname='public' and t.relname='shipping_dispatches'
          and c.contype='u'
          and (
            select string_agg(a.attname, ',' order by x.ord)
            from unnest(c.conkey) with ordinality x(attnum,ord)
            join pg_attribute a on a.attrelid=t.oid and a.attnum=x.attnum
          ) = 'provider,tracking_code'
      ) then 'unique constraint exists'
      else 'recommended; not required for order-level idempotence'
    end
),

review_checks as (
  select
    'function' as check_type,
    'public.guard_public_review_insert()' as check_name,
    case when exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='guard_public_review_insert' and p.pronargs=0
    ) then 'PASS' else 'WARN' end as status,
    case when exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='guard_public_review_insert' and p.pronargs=0
    ) then 'anti-spam guard already exists' else 'absent; security_patch.sql creates it' end as detail

  union all
  select
    'trigger',
    'public.reviews.trg_guard_public_review_insert',
    case when exists (
      select 1 from pg_trigger tg
      join pg_class t on t.oid=tg.tgrelid
      join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname='reviews'
        and not tg.tgisinternal
        and tg.tgname='trg_guard_public_review_insert'
    ) then 'PASS' else 'WARN' end,
    case when exists (
      select 1 from pg_trigger tg
      join pg_class t on t.oid=tg.tgrelid
      join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname='reviews'
        and not tg.tgisinternal
        and tg.tgname='trg_guard_public_review_insert'
    ) then 'anti-spam trigger exists' else 'absent; security_patch.sql creates it' end
),

order_hardening_check as (
  select
    'function-source' as check_type,
    'public.create_order idempotence/rate-limit logic' as check_name,
    case when exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='create_order'
        and pg_get_functiondef(p.oid) ilike '%request_fingerprint%'
        and pg_get_functiondef(p.oid) ilike '%pg_advisory_xact_lock%'
        and pg_get_functiondef(p.oid) ilike '%order_rate_limits%'
    ) then 'PASS' else 'WARN' end as status,
    case when exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='create_order'
        and pg_get_functiondef(p.oid) ilike '%request_fingerprint%'
        and pg_get_functiondef(p.oid) ilike '%pg_advisory_xact_lock%'
        and pg_get_functiondef(p.oid) ilike '%order_rate_limits%'
    ) then 'current function already contains hardening primitives' else 'current function may be legacy; patch will replace it' end as detail
),

all_checks as (
  select * from table_checks
  union all select * from column_checks
  union all select * from function_checks
  union all select * from extension_check
  union all select * from private_schema_check
  union all select * from shipping_security_checks
  union all select * from shipping_constraints
  union all select * from review_checks
  union all select * from order_hardening_check
)
select check_type, check_name, status, detail
from all_checks
order by case status when 'FAIL' then 1 when 'WARN' then 2 else 3 end,
         check_type,
         check_name;
