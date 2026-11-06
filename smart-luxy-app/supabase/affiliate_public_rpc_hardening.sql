-- WAZYO — Affiliate public RPC hardening
-- Apply only when the optional affiliate module is already installed.
-- Public responses keep the fields used by the storefront, not internal commission rates.

begin;

create or replace function public.get_affiliate_link(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_link record;
begin
  select
    al.id,
    al.code,
    al.product_id,
    al.discount_percent,
    i.name as influencer_name,
    p.nom as product_name
  into v_link
  from public.affiliate_links al
  join public.influencers i on i.id = al.influencer_id
  join public.products p on p.id = al.product_id
  where al.code = upper(btrim(coalesce(p_code, '')))
    and al.active = true
    and i.active = true
    and p.is_active = true
    and (al.starts_at is null or al.starts_at <= now())
    and (al.ends_at is null or al.ends_at >= now())
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_link.id,
    'code', v_link.code,
    'product_id', v_link.product_id,
    'discount_percent', v_link.discount_percent,
    'influencer_name', v_link.influencer_name,
    'product_name', v_link.product_name
  );
end;
$function$;

create or replace function public.track_affiliate_click(
  p_code text,
  p_visitor_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_link record;
begin
  if length(btrim(coalesce(p_visitor_key, ''))) < 16
     or length(btrim(p_visitor_key)) > 128 then
    return null;
  end if;

  select
    al.id,
    al.code,
    al.product_id,
    al.discount_percent,
    i.name as influencer_name,
    p.nom as product_name
  into v_link
  from public.affiliate_links al
  join public.influencers i on i.id = al.influencer_id
  join public.products p on p.id = al.product_id
  where al.code = upper(btrim(coalesce(p_code, '')))
    and al.active = true
    and i.active = true
    and p.is_active = true
    and (al.starts_at is null or al.starts_at <= now())
    and (al.ends_at is null or al.ends_at >= now())
  limit 1;

  if not found then
    return null;
  end if;

  insert into public.affiliate_clicks(link_id, visitor_key, click_day)
  values (v_link.id, btrim(p_visitor_key), current_date)
  on conflict (link_id, visitor_key, click_day) do nothing;

  return jsonb_build_object(
    'id', v_link.id,
    'code', v_link.code,
    'product_id', v_link.product_id,
    'discount_percent', v_link.discount_percent,
    'influencer_name', v_link.influencer_name,
    'product_name', v_link.product_name
  );
end;
$function$;

revoke all on function public.get_affiliate_link(text) from public;
grant execute on function public.get_affiliate_link(text)
  to anon, authenticated, service_role;

revoke all on function public.track_affiliate_click(text, text) from public;
grant execute on function public.track_affiliate_click(text, text)
  to anon, authenticated, service_role;

commit;
