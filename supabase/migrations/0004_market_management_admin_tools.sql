-- HypeKnight Intelligence V2.1
-- Market Management Admin Tools
--
-- ADDITIVE ONLY:
-- - Adds admin-only RPCs used by the Market Registry management screen.
-- - Does not delete or rename existing data.
-- - Existing city/state fields remain the physical location truth.
-- - City-wide metro membership and exceptional record overrides are separate.

-- Create a canonical market plus its primary market area. If records already
-- exist in the primary city, they are immediately attached to the new market.
create or replace function public.create_hypeknight_market(
  p_name text,
  p_primary_city text,
  p_primary_state text,
  p_status text default 'observed'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_previous_market_id uuid;
  v_state text := public.normalize_market_state(p_primary_state);
  v_city_key text := public.normalize_market_city(p_primary_city);
  v_market_key text;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.app_role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  if trim(coalesce(p_name, '')) = '' or trim(coalesce(p_primary_city, '')) = '' or v_state = '' then
    raise exception 'Market name, primary city, and state are required';
  end if;

  if p_status not in ('observed', 'tracked', 'active', 'supported', 'retired') then
    raise exception 'Unsupported market status: %', p_status;
  end if;

  -- Metro suffix avoids collision with automatically observed standalone keys.
  v_market_key := public.market_slug(p_name);
  if v_market_key = '' then
    v_market_key := public.market_slug(p_primary_city) || '-metro';
  end if;

  insert into public.markets (
    market_key, name, primary_city, primary_state, status, source
  ) values (
    v_market_key, trim(p_name), trim(p_primary_city), v_state, p_status, 'manual'
  )
  on conflict (market_key) do update set
    name = excluded.name,
    primary_city = excluded.primary_city,
    primary_state = excluded.primary_state,
    status = excluded.status,
    updated_at = now()
  returning id into v_market_id;

  select market_id into v_previous_market_id
  from public.market_areas
  where normalized_city = v_city_key
    and normalized_state = v_state
  limit 1;

  insert into public.market_areas (
    market_id, city, state, normalized_city, normalized_state,
    area_type, is_primary, priority, assignment_method, confidence
  ) values (
    v_market_id, trim(p_primary_city), v_state, v_city_key, v_state,
    'primary_city', true, 0, 'manual', 1
  )
  on conflict (normalized_city, normalized_state) do update set
    market_id = excluded.market_id,
    city = excluded.city,
    state = excluded.state,
    area_type = 'primary_city',
    is_primary = true,
    priority = 0,
    assignment_method = 'manual',
    confidence = 1,
    is_active = true,
    updated_at = now();

  -- Bring existing rows for this exact municipality into the market without
  -- touching their physical city/state values.
  update public.events set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;
  update public.venues set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;
  update public.external_events set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;
  update public.signals set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;

  if v_previous_market_id is not null and v_previous_market_id <> v_market_id then
    update public.markets m
    set status = 'retired', updated_at = now()
    where m.id = v_previous_market_id
      and m.source = 'automatic'
      and not exists (
        select 1 from public.market_areas ma
        where ma.market_id = m.id and ma.is_active = true
      );
  end if;

  return v_market_id;
end;
$$;

revoke all on function public.create_hypeknight_market(text, text, text, text) from public;
grant execute on function public.create_hypeknight_market(text, text, text, text) to authenticated;



-- Replace the V2 area-link function with the same behavior plus cleanup of an
-- automatic standalone market that becomes empty after its city is moved into
-- a metro. This keeps the registry from accumulating duplicate empty markets.
create or replace function public.link_hypeknight_market_area(
  p_market_key text,
  p_city text,
  p_state text,
  p_area_type text default 'city'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
  v_previous_market_id uuid;
  v_state text := public.normalize_market_state(p_state);
  v_city_key text := public.normalize_market_city(p_city);
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.app_role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  select id into v_market_id from public.markets where market_key = p_market_key;
  if v_market_id is null then
    raise exception 'Unknown market: %', p_market_key;
  end if;

  select market_id into v_previous_market_id
  from public.market_areas
  where normalized_city = v_city_key
    and normalized_state = v_state
  limit 1;

  insert into public.market_areas (
    market_id, city, state, normalized_city, normalized_state,
    area_type, is_primary, priority, assignment_method, confidence
  ) values (
    v_market_id, trim(p_city), v_state, v_city_key, v_state,
    p_area_type, false, 50, 'manual', 1
  )
  on conflict (normalized_city, normalized_state) do update set
    market_id = excluded.market_id,
    city = excluded.city,
    state = excluded.state,
    area_type = excluded.area_type,
    is_primary = false,
    priority = 50,
    assignment_method = 'manual',
    confidence = 1,
    is_active = true,
    updated_at = now();

  update public.events set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;
  update public.venues set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;
  update public.external_events set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;
  update public.signals set market_id = v_market_id
    where public.normalize_market_city(city) = v_city_key
      and public.normalize_market_state(state) = v_state;

  if v_previous_market_id is not null and v_previous_market_id <> v_market_id then
    update public.markets m
    set status = 'retired', updated_at = now()
    where m.id = v_previous_market_id
      and m.source = 'automatic'
      and not exists (
        select 1 from public.market_areas ma
        where ma.market_id = m.id and ma.is_active = true
      );
  end if;

  return v_market_id;
end;
$$;

revoke all on function public.link_hypeknight_market_area(text, text, text, text) from public;
grant execute on function public.link_hypeknight_market_area(text, text, text, text) to authenticated;

-- Exceptional single-record override. Use this only when one venue/event belongs
-- to a different market than the normal city-wide mapping. Changing city/state
-- later will intentionally re-run the normal location trigger.
create or replace function public.override_hypeknight_record_market(
  p_record_type text,
  p_record_id uuid,
  p_market_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.app_role = 'admin'
  ) then
    raise exception 'Admin access required';
  end if;

  select id into v_market_id from public.markets where market_key = p_market_key;
  if v_market_id is null then
    raise exception 'Unknown market: %', p_market_key;
  end if;

  if p_record_type = 'event' then
    update public.events set market_id = v_market_id where id = p_record_id;
    if not found then raise exception 'Event not found'; end if;
  elsif p_record_type = 'venue' then
    update public.venues set market_id = v_market_id where id = p_record_id;
    if not found then raise exception 'Venue not found'; end if;
  else
    raise exception 'Unsupported record type: %', p_record_type;
  end if;

  return v_market_id;
end;
$$;

revoke all on function public.override_hypeknight_record_market(text, uuid, text) from public;
grant execute on function public.override_hypeknight_record_market(text, uuid, text) to authenticated;
