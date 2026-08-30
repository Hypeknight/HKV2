-- HypeKnight Intelligence V2
-- Market Registry, Metro Mapping & Baseline Foundation
--
-- ADDITIVE ONLY:
-- - No existing tables or columns are removed.
-- - Existing city/state fields remain the physical truth for events/venues.
-- - market_id adds a separate metro/intelligence identity.
-- - Unknown city/state pairs become their own OBSERVED market instead of being
--   guessed into an existing metro.

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  market_key text not null unique,
  name text not null,
  primary_city text not null,
  primary_state text not null,
  country_code text not null default 'US',
  timezone text null,
  status text not null default 'observed' check (
    status in ('observed', 'tracked', 'active', 'supported', 'retired')
  ),
  source text not null default 'system',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_areas (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  city text not null,
  state text not null,
  normalized_city text not null,
  normalized_state text not null,
  area_type text not null default 'city' check (
    area_type in ('primary_city', 'city', 'suburb', 'district', 'unincorporated', 'other')
  ),
  is_primary boolean not null default false,
  priority integer not null default 100,
  assignment_method text not null default 'manual' check (
    assignment_method in ('seed', 'exact', 'automatic', 'manual', 'coordinate', 'import')
  ),
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_city, normalized_state)
);

create index if not exists market_areas_market_idx
  on public.market_areas (market_id, priority, normalized_city);

create index if not exists markets_status_idx
  on public.markets (status, market_key);

-- Physical records keep their own city/state, while market_id lets discovery and
-- intelligence understand that multiple municipalities belong to one metro.
alter table public.events
  add column if not exists market_id uuid null references public.markets(id) on delete set null;

alter table public.venues
  add column if not exists market_id uuid null references public.markets(id) on delete set null;

alter table public.external_events
  add column if not exists market_id uuid null references public.markets(id) on delete set null;

alter table public.signals
  add column if not exists market_id uuid null references public.markets(id) on delete set null;

create index if not exists events_market_idx on public.events (market_id);
create index if not exists venues_market_idx on public.venues (market_id);
create index if not exists external_events_market_idx on public.external_events (market_id);
create index if not exists signals_market_time_idx on public.signals (market_id, occurred_at desc)
  where market_id is not null;

-- Small deterministic normalizer used only for exact registry matching. It does
-- not try to geocode, infer counties, or make fuzzy geographic guesses.
create or replace function public.normalize_market_city(p_value text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(lower(coalesce(p_value, '')), '[.''’]', '', 'g'),
      '[^a-z0-9]+', ' ', 'g'
    )
  );
$$;

create or replace function public.normalize_market_state(p_value text)
returns text
language sql
immutable
as $$
  select case lower(trim(coalesce(p_value, '')))
    when 'alabama' then 'AL' when 'alaska' then 'AK' when 'arizona' then 'AZ'
    when 'arkansas' then 'AR' when 'california' then 'CA' when 'colorado' then 'CO'
    when 'connecticut' then 'CT' when 'delaware' then 'DE' when 'florida' then 'FL'
    when 'georgia' then 'GA' when 'hawaii' then 'HI' when 'idaho' then 'ID'
    when 'illinois' then 'IL' when 'indiana' then 'IN' when 'iowa' then 'IA'
    when 'kansas' then 'KS' when 'kentucky' then 'KY' when 'louisiana' then 'LA'
    when 'maine' then 'ME' when 'maryland' then 'MD' when 'massachusetts' then 'MA'
    when 'michigan' then 'MI' when 'minnesota' then 'MN' when 'mississippi' then 'MS'
    when 'missouri' then 'MO' when 'montana' then 'MT' when 'nebraska' then 'NE'
    when 'nevada' then 'NV' when 'new hampshire' then 'NH' when 'new jersey' then 'NJ'
    when 'new mexico' then 'NM' when 'new york' then 'NY' when 'north carolina' then 'NC'
    when 'north dakota' then 'ND' when 'ohio' then 'OH' when 'oklahoma' then 'OK'
    when 'oregon' then 'OR' when 'pennsylvania' then 'PA' when 'rhode island' then 'RI'
    when 'south carolina' then 'SC' when 'south dakota' then 'SD' when 'tennessee' then 'TN'
    when 'texas' then 'TX' when 'utah' then 'UT' when 'vermont' then 'VT'
    when 'virginia' then 'VA' when 'washington' then 'WA' when 'west virginia' then 'WV'
    when 'wisconsin' then 'WI' when 'wyoming' then 'WY' when 'district of columbia' then 'DC'
    else upper(trim(coalesce(p_value, '')))
  end;
$$;

create or replace function public.market_slug(p_value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Observe or resolve a city/state into the registry.
--
-- RULE:
-- 1) Exact linked area -> return its metro.
-- 2) Unknown city/state -> create a standalone OBSERVED market.
-- 3) Never guess that an unknown suburb belongs to a nearby metro.
create or replace function public.observe_hypeknight_market(
  p_city text,
  p_state text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city text := trim(coalesce(p_city, ''));
  v_state text := public.normalize_market_state(p_state);
  v_normalized_city text := public.normalize_market_city(p_city);
  v_market_id uuid;
  v_market_key text;
begin
  if v_city = '' or v_state = '' then
    return null;
  end if;

  select ma.market_id
    into v_market_id
  from public.market_areas ma
  where ma.normalized_city = v_normalized_city
    and ma.normalized_state = v_state
    and ma.is_active = true
  limit 1;

  if v_market_id is not null then
    update public.markets
      set last_seen_at = now(), updated_at = now()
    where id = v_market_id;
    return v_market_id;
  end if;

  v_market_key := public.market_slug(v_city) || '-' || lower(v_state);

  insert into public.markets (
    market_key,
    name,
    primary_city,
    primary_state,
    status,
    source
  ) values (
    v_market_key,
    v_city || ', ' || v_state,
    v_city,
    v_state,
    'observed',
    'automatic'
  )
  on conflict (market_key) do update
    set last_seen_at = now(), updated_at = now()
  returning id into v_market_id;

  insert into public.market_areas (
    market_id,
    city,
    state,
    normalized_city,
    normalized_state,
    area_type,
    is_primary,
    priority,
    assignment_method,
    confidence
  ) values (
    v_market_id,
    v_city,
    v_state,
    v_normalized_city,
    v_state,
    'primary_city',
    true,
    0,
    'automatic',
    1
  )
  on conflict (normalized_city, normalized_state) do nothing;

  return v_market_id;
end;
$$;

revoke all on function public.observe_hypeknight_market(text, text) from public;
-- No direct anon/authenticated grant. Public callers reach this logic only through
-- controlled signal/event/venue writes, which limits registry spam.

-- Seed stable primary launch markets before backfilling current records.
insert into public.markets (market_key, name, primary_city, primary_state, status, source)
values
  ('kansas-city-metro', 'Kansas City Metro', 'Kansas City', 'MO', 'active', 'seed'),
  ('st-louis-metro', 'St. Louis Metro', 'St. Louis', 'MO', 'tracked', 'seed'),
  ('chicago-metro', 'Chicago Metro', 'Chicago', 'IL', 'tracked', 'seed'),
  ('new-york-metro', 'New York Metro', 'New York', 'NY', 'tracked', 'seed'),
  ('atlanta-metro', 'Atlanta Metro', 'Atlanta', 'GA', 'tracked', 'seed'),
  ('houston-metro', 'Houston Metro', 'Houston', 'TX', 'tracked', 'seed'),
  ('austin-metro', 'Austin Metro', 'Austin', 'TX', 'tracked', 'seed'),
  ('las-vegas-metro', 'Las Vegas Metro', 'Las Vegas', 'NV', 'tracked', 'seed')
on conflict (market_key) do update set
  name = excluded.name,
  primary_city = excluded.primary_city,
  primary_state = excluded.primary_state,
  updated_at = now();

-- Primary cities for seeded markets.
insert into public.market_areas (
  market_id, city, state, normalized_city, normalized_state,
  area_type, is_primary, priority, assignment_method, confidence
)
select m.id, m.primary_city, m.primary_state,
       public.normalize_market_city(m.primary_city), public.normalize_market_state(m.primary_state),
       'primary_city', true, 0, 'seed', 1
from public.markets m
where m.source = 'seed'
on conflict (normalized_city, normalized_state) do update set
  market_id = excluded.market_id,
  city = excluded.city,
  state = excluded.state,
  area_type = excluded.area_type,
  is_primary = excluded.is_primary,
  priority = excluded.priority,
  assignment_method = excluded.assignment_method,
  confidence = excluded.confidence,
  updated_at = now();

-- Kansas City Metro V2 seed. This is intentionally a controlled exact mapping,
-- not a radius guess. More areas can be linked later without changing event data.
with kc as (
  select id from public.markets where market_key = 'kansas-city-metro'
), areas(city, state, area_type, priority) as (
  values
    ('Kansas City', 'MO', 'primary_city', 0),
    ('Kansas City', 'KS', 'city', 10),
    ('North Kansas City', 'MO', 'city', 10),
    ('Overland Park', 'KS', 'suburb', 20),
    ('Raytown', 'MO', 'suburb', 20),
    ('Independence', 'MO', 'suburb', 20),
    ('Lee''s Summit', 'MO', 'suburb', 20),
    ('Gladstone', 'MO', 'suburb', 20),
    ('Liberty', 'MO', 'suburb', 20),
    ('Shawnee', 'KS', 'suburb', 20),
    ('Lenexa', 'KS', 'suburb', 20),
    ('Olathe', 'KS', 'suburb', 20),
    ('Prairie Village', 'KS', 'suburb', 20),
    ('Mission', 'KS', 'suburb', 20)
)
insert into public.market_areas (
  market_id, city, state, normalized_city, normalized_state,
  area_type, is_primary, priority, assignment_method, confidence
)
select kc.id, a.city, a.state,
       public.normalize_market_city(a.city), public.normalize_market_state(a.state),
       a.area_type, (a.area_type = 'primary_city'), a.priority, 'seed', 1
from kc cross join areas a
on conflict (normalized_city, normalized_state) do update set
  market_id = excluded.market_id,
  city = excluded.city,
  state = excluded.state,
  area_type = excluded.area_type,
  is_primary = excluded.is_primary,
  priority = excluded.priority,
  assignment_method = excluded.assignment_method,
  confidence = excluded.confidence,
  updated_at = now();

-- Admin-only bridge for later corrections/metro expansion. It reassigns an
-- exact city/state area without changing any event/venue physical city fields.
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

  return v_market_id;
end;
$$;

revoke all on function public.link_hypeknight_market_area(text, text, text, text) from public;
grant execute on function public.link_hypeknight_market_area(text, text, text, text) to authenticated;

-- Trigger helper: any newly-created/edited venue or event with a city/state is
-- automatically linked to a market. Unknown places create an observed market.
create or replace function public.assign_market_from_city_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.city is not null and new.state is not null then
    new.market_id := public.observe_hypeknight_market(new.city, new.state);
  end if;
  return new;
end;
$$;

drop trigger if exists events_assign_market on public.events;
create trigger events_assign_market
before insert or update of city, state on public.events
for each row execute function public.assign_market_from_city_state();

drop trigger if exists venues_assign_market on public.venues;
create trigger venues_assign_market
before insert or update of city, state on public.venues
for each row execute function public.assign_market_from_city_state();

drop trigger if exists external_events_assign_market on public.external_events;
create trigger external_events_assign_market
before insert or update of city, state on public.external_events
for each row execute function public.assign_market_from_city_state();

-- Backfill current physical records through the exact registry. This preserves
-- each row's city/state and only adds the metro relationship.
update public.events
set market_id = public.observe_hypeknight_market(city, state)
where city is not null and state is not null;

update public.venues
set market_id = public.observe_hypeknight_market(city, state)
where city is not null and state is not null;

update public.external_events
set market_id = public.observe_hypeknight_market(city, state)
where city is not null and state is not null;

update public.signals
set market_id = public.observe_hypeknight_market(city, state)
where market_id is null and city is not null and state is not null;

-- Recreate the existing signal RPC with the same application-facing signature.
-- V2 only adds automatic market resolution behind the interface.
create or replace function public.record_hypeknight_signal(
  p_signal_type text,
  p_subject_type text,
  p_subject_id text default null,
  p_event_id uuid default null,
  p_venue_id uuid default null,
  p_city text default null,
  p_state text default null,
  p_source text default null,
  p_surface text default null,
  p_session_id text default null,
  p_anonymous_session_id text default null,
  p_value numeric default null,
  p_confidence numeric default 1,
  p_verification_level text default 'observed',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal_id uuid;
  v_market_id uuid;
begin
  if p_signal_type not in (
    'page_view','event_view','venue_view','search_performed','vibe_selected',
    'market_selected','time_intent_selected','surprise_requested',
    'surprise_event_presented','recommendation_selected','event_saved',
    'event_unsaved','event_rsvp_interested','event_rsvp_going',
    'event_rsvp_not_going','event_shared','directions_requested',
    'event_comment_created','venue_comment_created','venue_presence_joined',
    'music_request_created','music_request_voted','patron_pulse_checkin',
    'patron_pulse_response','coupon_redeemed'
  ) then
    raise exception 'Unsupported signal type: %', p_signal_type;
  end if;

  if p_subject_type not in ('page', 'event', 'venue', 'market', 'search', 'pulse', 'coupon') then
    raise exception 'Unsupported subject type: %', p_subject_type;
  end if;

  if p_verification_level not in ('observed', 'declared', 'contextual', 'presence_supported', 'verified') then
    raise exception 'Unsupported verification level: %', p_verification_level;
  end if;

  -- Prefer the physical city/state supplied by the action. If absent, inherit
  -- a market from its event/venue relationship.
  if nullif(trim(coalesce(p_city, '')), '') is not null
     and nullif(trim(coalesce(p_state, '')), '') is not null then
    v_market_id := public.observe_hypeknight_market(p_city, p_state);
  elsif p_event_id is not null then
    select market_id into v_market_id from public.events where id = p_event_id;
  elsif p_venue_id is not null then
    select market_id into v_market_id from public.venues where id = p_venue_id;
  end if;

  insert into public.signals (
    signal_type, actor_id, anonymous_session_id, subject_type, subject_id,
    event_id, venue_id, market_id, city, state, source, surface, session_id,
    value, confidence, verification_level, metadata
  ) values (
    p_signal_type, auth.uid(), nullif(left(p_anonymous_session_id, 128), ''),
    p_subject_type, nullif(left(p_subject_id, 256), ''), p_event_id, p_venue_id,
    v_market_id, nullif(left(p_city, 120), ''), nullif(left(p_state, 40), ''),
    nullif(left(p_source, 80), ''), nullif(left(p_surface, 120), ''),
    nullif(left(p_session_id, 128), ''), p_value,
    greatest(0, least(coalesce(p_confidence, 1), 1)), p_verification_level,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_signal_id;

  return v_signal_id;
end;
$$;

revoke all on function public.record_hypeknight_signal(
  text, text, text, uuid, uuid, text, text, text, text, text, text, numeric, numeric, text, jsonb
) from public;

grant execute on function public.record_hypeknight_signal(
  text, text, text, uuid, uuid, text, text, text, text, text, text, numeric, numeric, text, jsonb
) to anon, authenticated;

-- Baseline storage is intentionally generic. V2 can persist explainable metric
-- snapshots without committing to a premature public Hype Score.
create table if not exists public.market_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  metric_key text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  metric_value numeric not null,
  evidence_count integer not null default 0,
  unique_actor_count integer not null default 0,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (market_id, metric_key, window_start, window_end)
);

create index if not exists market_metric_snapshots_lookup_idx
  on public.market_metric_snapshots (market_id, metric_key, window_end desc);

-- Daily aggregate view gives V2 a stable, privacy-preserving input for future
-- baselines while raw signals remain append-only evidence.
create or replace view public.market_daily_metrics_v1 as
select
  market_id,
  date_trunc('day', occurred_at) as metric_day,
  count(*)::bigint as observations,
  count(*) filter (where signal_type = 'search_performed')::bigint as searches,
  count(*) filter (where signal_type = 'event_view')::bigint as event_views,
  count(*) filter (where signal_type = 'venue_view')::bigint as venue_views,
  count(*) filter (where signal_type = 'event_saved')::bigint as saves,
  count(*) filter (where signal_type = 'event_rsvp_going')::bigint as going,
  count(*) filter (where signal_type = 'directions_requested')::bigint as directions,
  count(distinct coalesce(actor_id::text, anonymous_session_id))::bigint as unique_participants
from public.signals
where market_id is not null
group by market_id, date_trunc('day', occurred_at);

alter table public.markets enable row level security;
alter table public.market_areas enable row level security;
alter table public.market_metric_snapshots enable row level security;

-- Market names/area membership are public discovery geography, not private data.
drop policy if exists "markets readable" on public.markets;
create policy "markets readable" on public.markets
for select to anon, authenticated using (true);

drop policy if exists "market areas readable" on public.market_areas;
create policy "market areas readable" on public.market_areas
for select to anon, authenticated using (is_active = true);

-- Snapshot detail is admin-only for now.
drop policy if exists "admins read market snapshots" on public.market_metric_snapshots;
create policy "admins read market snapshots" on public.market_metric_snapshots
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.app_role = 'admin'
  )
);
