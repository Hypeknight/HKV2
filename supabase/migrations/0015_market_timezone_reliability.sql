-- ============================================================================
-- HypeKnight V3.5 - Market Timezone Reliability
-- ============================================================================
--
-- Featured inventory is sold against a market-local calendar date.
--
-- A market may continue to exist with timezone = null because HypeKnight
-- automatically observes unknown geography and must not guess geographic facts.
--
-- Commercial systems such as Featured must require a configured timezone
-- before selling date-specific inventory.
-- ============================================================================


-- --------------------------------------------------------------------------
-- 1. BACKFILL KNOWN CURRENT MARKETS
-- --------------------------------------------------------------------------
--
-- Use IANA timezone identifiers so PostgreSQL can correctly handle daylight
-- saving transitions and local calendar boundaries.
--

update public.markets
set timezone = case market_key

  when 'atlanta-metro'
    then 'America/New_York'

  when 'austin-metro'
    then 'America/Chicago'

  when 'chicago-metro'
    then 'America/Chicago'

  when 'columbia-mo'
    then 'America/Chicago'

  when 'dallas-tx'
    then 'America/Chicago'

  when 'denver-co'
    then 'America/Denver'

  when 'hazelwood-mo'
    then 'America/Chicago'

  when 'houston-metro'
    then 'America/Chicago'

  when 'kansas-city-metro'
    then 'America/Chicago'

  when 'las-vegas-metro'
    then 'America/Los_Angeles'

  when 'lawrence-ks'
    then 'America/Chicago'

  when 'miami-fl'
    then 'America/New_York'

  when 'nashville-tn'
    then 'America/Chicago'

  when 'new-york-metro'
    then 'America/New_York'

  when 'oklahoma-city-ok'
    then 'America/Chicago'

  when 'orlando-fl'
    then 'America/New_York'

  when 'philadelphia-pa'
    then 'America/New_York'

  when 'phoenix-az'
    then 'America/Phoenix'

  when 'seattle-wa'
    then 'America/Los_Angeles'

  when 'st-charles-mo'
    then 'America/Chicago'

  when 'st-louis-metro'
    then 'America/Chicago'

  when 'tampa-fl'
    then 'America/New_York'

  else timezone
end,
updated_at = now()
where market_key in (
  'atlanta-metro',
  'austin-metro',
  'chicago-metro',
  'columbia-mo',
  'dallas-tx',
  'denver-co',
  'hazelwood-mo',
  'houston-metro',
  'kansas-city-metro',
  'las-vegas-metro',
  'lawrence-ks',
  'miami-fl',
  'nashville-tn',
  'new-york-metro',
  'oklahoma-city-ok',
  'orlando-fl',
  'philadelphia-pa',
  'phoenix-az',
  'seattle-wa',
  'st-charles-mo',
  'st-louis-metro',
  'tampa-fl'
);


-- --------------------------------------------------------------------------
-- 2. ADMIN-CONTROLLED TIMEZONE UPDATE
-- --------------------------------------------------------------------------
--
-- Newly observed markets remain timezone-null until reviewed.
--
-- The admin may assign or clear a timezone. A supplied timezone must exist in
-- PostgreSQL's timezone registry.
--

create or replace function public.set_hypeknight_market_timezone(
  p_market_key text,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_timezone text := nullif(trim(coalesce(p_timezone, '')), '');
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  select id
    into v_market_id
  from public.markets
  where market_key = p_market_key;

  if v_market_id is null then
    raise exception 'Unknown market: %', p_market_key;
  end if;

  if v_timezone is not null
     and not exists (
       select 1
       from pg_catalog.pg_timezone_names()
       where name = v_timezone
     ) then
    raise exception 'Unsupported IANA timezone: %', v_timezone;
  end if;

  update public.markets
  set
    timezone = v_timezone,
    updated_at = now()
  where id = v_market_id;

  return v_market_id;
end;
$$;


revoke all on function
  public.set_hypeknight_market_timezone(text, text)
from public;

grant execute on function
  public.set_hypeknight_market_timezone(text, text)
to authenticated;
