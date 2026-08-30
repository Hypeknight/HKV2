-- ============================================================================
-- HypeKnight Intelligence Foundation - Signal Stream V1
-- ============================================================================
-- PURPOSE
-- Adds an append-only historical signal stream WITHOUT replacing any current
-- operational table. event_saves, event_rsvps, Patron Pulse, presence, etc.
-- continue to run the product. public.signals records what happened over time.
--
-- IMPORTANT DEPLOYMENT NOTE
-- Apply this migration in Supabase BEFORE deploying application code that calls
-- record_hypeknight_signal(). Existing production behavior is otherwise left
-- unchanged.
-- ============================================================================

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null,

  -- Authenticated actor is always resolved by the database function. Clients
  -- are not allowed to provide another user's id.
  actor_id uuid null references auth.users(id) on delete set null,
  anonymous_session_id text null,

  subject_type text not null,
  subject_id text null,

  -- Optional canonical foreign keys make event/venue intelligence queries fast.
  event_id uuid null references public.events(id) on delete cascade,
  venue_id uuid null references public.venues(id) on delete cascade,

  city text null,
  state text null,
  source text null,
  surface text null,
  session_id text null,

  -- Numeric value is available for signals that naturally contain a scalar.
  value numeric null,

  -- Confidence describes evidence quality, not whether a user "liked" something.
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  verification_level text not null default 'observed' check (
    verification_level in (
      'observed',
      'declared',
      'contextual',
      'presence_supported',
      'verified'
    )
  ),

  -- Context only. Do not store secrets or unnecessary raw PII here.
  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists signals_event_time_idx
  on public.signals (event_id, occurred_at desc)
  where event_id is not null;

create index if not exists signals_venue_time_idx
  on public.signals (venue_id, occurred_at desc)
  where venue_id is not null;

create index if not exists signals_type_time_idx
  on public.signals (signal_type, occurred_at desc);

create index if not exists signals_actor_time_idx
  on public.signals (actor_id, occurred_at desc)
  where actor_id is not null;

create index if not exists signals_anonymous_session_idx
  on public.signals (anonymous_session_id, occurred_at desc)
  where anonymous_session_id is not null;

alter table public.signals enable row level security;

-- No direct INSERT policy is intentionally created. Writes happen only through
-- the validated SECURITY DEFINER function below. This makes actor spoofing much
-- harder than allowing arbitrary client inserts into public.signals.

-- Admins may inspect raw signals. Public/operator-facing dashboards should use
-- aggregate intelligence later rather than exposing individual user histories.
drop policy if exists "Admins can read signals" on public.signals;
create policy "Admins can read signals"
on public.signals
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
);

-- Central allowlisted write function used by Next.js server/API bridges.
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
begin
  if p_signal_type not in (
    'page_view',
    'event_view',
    'venue_view',
    'search_performed',
    'vibe_selected',
    'market_selected',
    'time_intent_selected',
    'surprise_requested',
    'surprise_event_presented',
    'recommendation_selected',
    'event_saved',
    'event_unsaved',
    'event_rsvp_interested',
    'event_rsvp_going',
    'event_rsvp_not_going',
    'event_shared',
    'directions_requested',
    'event_comment_created',
    'venue_comment_created',
    'venue_presence_joined',
    'music_request_created',
    'music_request_voted',
    'patron_pulse_checkin',
    'patron_pulse_response',
    'coupon_redeemed'
  ) then
    raise exception 'Unsupported signal type: %', p_signal_type;
  end if;

  if p_subject_type not in ('page', 'event', 'venue', 'market', 'search', 'pulse', 'coupon') then
    raise exception 'Unsupported subject type: %', p_subject_type;
  end if;

  if p_verification_level not in ('observed', 'declared', 'contextual', 'presence_supported', 'verified') then
    raise exception 'Unsupported verification level: %', p_verification_level;
  end if;

  insert into public.signals (
    signal_type,
    actor_id,
    anonymous_session_id,
    subject_type,
    subject_id,
    event_id,
    venue_id,
    city,
    state,
    source,
    surface,
    session_id,
    value,
    confidence,
    verification_level,
    metadata
  ) values (
    p_signal_type,
    auth.uid(),
    nullif(left(p_anonymous_session_id, 128), ''),
    p_subject_type,
    nullif(left(p_subject_id, 256), ''),
    p_event_id,
    p_venue_id,
    nullif(left(p_city, 120), ''),
    nullif(left(p_state, 40), ''),
    nullif(left(p_source, 80), ''),
    nullif(left(p_surface, 120), ''),
    nullif(left(p_session_id, 128), ''),
    p_value,
    greatest(0, least(coalesce(p_confidence, 1), 1)),
    p_verification_level,
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

-- Aggregate view for admin/intelligence development. It intentionally contains
-- no actor_id/user-level detail.
create or replace view public.event_signal_summary_v1 as
select
  event_id,
  signal_type,
  count(*)::bigint as signal_count,
  count(distinct coalesce(actor_id::text, anonymous_session_id))::bigint as unique_actor_count,
  max(occurred_at) as last_signal_at
from public.signals
where event_id is not null
group by event_id, signal_type;
