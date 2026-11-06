-- WAZYO — Read-only functional compatibility check
-- Run in Supabase SQL Editor AFTER security_patch.sql and functional_fixes_2026.sql.
-- This script only inspects PostgreSQL catalogs. It does not change anything.

with expected_functions(function_name, source_note) as (
  values
    ('get_public_shipping_rates', 'Added by functional_fixes_2026.sql'),
    ('consume_meta_capi_lead_rate_limit', 'Added by functional_fixes_2026.sql'),
    ('reconcile_yalidine_order', 'Added by functional_fixes_2026.sql'),
    ('get_order_tracking', 'Expected from schema and functional_fixes_2026.sql'),
    ('create_order_with_models', 'Not defined in versioned SQL; may be installed manually'),
    ('create_order_with_colors', 'Not defined in versioned SQL; may be installed manually'),
    ('create_order_with_affiliate', 'Not defined in versioned SQL; may be installed manually'),
    ('create_order_with_colors_affiliate', 'Not defined in versioned SQL; may be installed manually'),
    ('track_affiliate_click', 'Not defined in versioned SQL; may be installed manually'),
    ('get_affiliate_link', 'Not defined in versioned SQL; may be installed manually'),
    ('get_affiliate_financial_dashboard', 'Not defined in versioned SQL; may be installed manually'),
    ('create_affiliate_link_admin', 'Not defined in versioned SQL; may be installed manually')
),
function_checks as (
  select
    'function'::text as check_type,
    'public.' || e.function_name as check_name,
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = e.function_name
    ) then 'PASS' else 'WARN' end as status,
    case when exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = e.function_name
    ) then 'function exists' else e.source_note end as detail
  from expected_functions e
),
expected_tables(table_name, source_note) as (
  values
    ('influencers', 'Affiliate table not defined in versioned SQL; verify production migration'),
    ('affiliate_links', 'Affiliate table not defined in versioned SQL; verify production migration'),
    ('affiliate_order_attributions', 'Affiliate table not defined in versioned SQL; verify production migration')
),
table_checks as (
  select
    'table'::text as check_type,
    'public.' || e.table_name as check_name,
    case when to_regclass('public.' || e.table_name) is not null then 'PASS' else 'WARN' end as status,
    case when to_regclass('public.' || e.table_name) is not null then 'table exists' else e.source_note end as detail
  from expected_tables e
),
expected_columns(table_name, column_name, source_note) as (
  values
    ('products', 'colors', 'Variant column not defined in versioned schema; verify production migration'),
    ('products', 'models', 'Variant column not defined in versioned schema; verify production migration'),
    ('products', 'show_colors', 'Variant column not defined in versioned schema; verify production migration'),
    ('products', 'show_models', 'Variant column not defined in versioned schema; verify production migration'),
    ('orders', 'purchase_event_claimed_at', 'Added by functional_fixes_2026.sql'),
    ('orders', 'telegram_notification_claimed_at', 'Added by functional_fixes_2026.sql'),
    ('orders', 'telegram_notified_at', 'Added by functional_fixes_2026.sql')
),
column_checks as (
  select
    'column'::text as check_type,
    'public.' || e.table_name || '.' || e.column_name as check_name,
    case when c.column_name is not null then 'PASS' else 'WARN' end as status,
    case when c.column_name is not null then 'column exists' else e.source_note end as detail
  from expected_columns e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = e.table_name
   and c.column_name = e.column_name
)
select check_type, check_name, status, detail
from (
  select * from function_checks
  union all select * from table_checks
  union all select * from column_checks
) checks
order by
  case status when 'WARN' then 0 else 1 end,
  check_type,
  check_name;
