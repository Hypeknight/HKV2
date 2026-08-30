-- ============================================================================
-- HypeKnight V3.2 - Event Source + Claim Foundation
-- ============================================================================
-- Bridge-safe migration: existing public.events remains canonical for native
-- HypeKnight listings and public.external_events remains the imported inventory
-- table. event_sources can connect either/both while claims are reviewed.
-- ============================================================================

create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events(id) on delete cascade,
  external_event_id uuid null references public.external_events(id) on delete cascade,
  provider text not null check (provider in (
    'hypeknight','ticketmaster','eventbrite','axs','dice','universe','venue','promoter','other'
  )),
  provider_event_id text null,
  provider_url text not null,
  source_type text not null default 'connected' check (source_type in (
    'native','imported','connected','claimed','manual'
  )),
  relationship_status text not null default 'connected' check (relationship_status in (
    'connected','pending','verified','rejected','retired'
  )),
  is_primary_ticket_source boolean not null default false,
  is_verified boolean not null default false,
  connected_by uuid null references auth.users(id) on delete set null,
  verified_by uuid null references auth.users(id) on delete set null,
  verified_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_sources_target_check check (
    event_id is not null or external_event_id is not null
  )
);

create unique index if not exists event_sources_event_provider_url_uidx
  on public.event_sources (event_id, provider, provider_url)
  where event_id is not null and relationship_status <> 'retired';

create unique index if not exists event_sources_external_provider_url_uidx
  on public.event_sources (external_event_id, provider, provider_url)
  where external_event_id is not null and relationship_status <> 'retired';

create index if not exists event_sources_event_idx on public.event_sources (event_id);
create index if not exists event_sources_external_idx on public.event_sources (external_event_id);
create index if not exists event_sources_provider_id_idx on public.event_sources (provider, provider_event_id)
  where provider_event_id is not null;

create table if not exists public.event_claims (
  id uuid primary key default gen_random_uuid(),
  claimant_user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid null references public.events(id) on delete cascade,
  external_event_id uuid null references public.external_events(id) on delete cascade,
  claim_role text not null default 'promoter' check (claim_role in ('promoter','venue','organizer','owner','other')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  source_provider text null,
  source_url text null,
  evidence_note text null,
  reviewer_note text null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_claims_target_check check (
    event_id is not null or external_event_id is not null
  )
);

create index if not exists event_claims_claimant_idx on public.event_claims (claimant_user_id, created_at desc);
create index if not exists event_claims_status_idx on public.event_claims (status, created_at asc);
create index if not exists event_claims_external_idx on public.event_claims (external_event_id)
  where external_event_id is not null;

-- Register existing imported inventory as source identities without converting it
-- into native HypeKnight events. A later verified claim can attach event_id to the
-- same source record, closing the identity loop without duplicate discovery rows.
insert into public.event_sources (
  external_event_id, provider, provider_event_id, provider_url, source_type,
  relationship_status, is_verified, metadata
)
select
  ee.id,
  case
    when lower(coalesce(ee.source_code, '')) in ('ticketmaster','eventbrite','axs','dice','universe')
      then lower(ee.source_code)
    else 'other'
  end,
  ee.source_event_id,
  ee.source_url,
  'imported',
  'connected',
  false,
  jsonb_build_object('registered_by_migration', '0005')
from public.external_events ee
where ee.source_url is not null
on conflict do nothing;

alter table public.event_sources enable row level security;
alter table public.event_claims enable row level security;

drop policy if exists "Public can read active event sources" on public.event_sources;
create policy "Public can read active event sources"
on public.event_sources for select
to anon, authenticated
using (relationship_status in ('connected','verified'));

-- Source mutations intentionally have no authenticated INSERT/UPDATE policy.
-- Owner-facing writes go through verified server actions using the service role
-- after checking event ownership, preventing clients from self-marking a source
-- as verified or changing verification metadata.

drop policy if exists "Users can read their claims" on public.event_claims;
create policy "Users can read their claims"
on public.event_claims for select
to authenticated
using (
  claimant_user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.app_role = 'admin'
  )
);

drop policy if exists "Users can submit claims" on public.event_claims;
create policy "Users can submit claims"
on public.event_claims for insert
to authenticated
with check (claimant_user_id = auth.uid() and status = 'pending');

-- Extend the signal allowlist with source-network outcomes. The function body is
-- intentionally replaced in full so current V1 callers retain identical behavior.
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
    'page_view','event_view','venue_view','search_performed','vibe_selected',
    'market_selected','time_intent_selected','surprise_requested',
    'surprise_event_presented','recommendation_selected','event_saved',
    'event_unsaved','event_rsvp_interested','event_rsvp_going',
    'event_rsvp_not_going','event_shared','directions_requested',
    'event_comment_created','venue_comment_created','venue_presence_joined',
    'music_request_created','music_request_voted','patron_pulse_checkin',
    'patron_pulse_response','coupon_redeemed','ticket_outbound',
    'event_source_connected','event_claim_submitted'
  ) then
    raise exception 'Unsupported signal type: %', p_signal_type;
  end if;

  if p_subject_type not in ('page','event','venue','market','search','pulse','coupon') then
    raise exception 'Unsupported subject type: %', p_subject_type;
  end if;

  if p_verification_level not in ('observed','declared','contextual','presence_supported','verified') then
    raise exception 'Unsupported verification level: %', p_verification_level;
  end if;

  insert into public.signals (
    signal_type, actor_id, anonymous_session_id, subject_type, subject_id,
    event_id, venue_id, city, state, source, surface, session_id, value,
    confidence, verification_level, metadata
  ) values (
    p_signal_type, auth.uid(), nullif(left(p_anonymous_session_id, 128), ''),
    p_subject_type, nullif(left(p_subject_id, 256), ''), p_event_id, p_venue_id,
    nullif(left(p_city, 120), ''), nullif(left(p_state, 40), ''),
    nullif(left(p_source, 80), ''), nullif(left(p_surface, 120), ''),
    nullif(left(p_session_id, 128), ''), p_value,
    greatest(0, least(coalesce(p_confidence, 1), 1)), p_verification_level,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_signal_id;

  return v_signal_id;
end;
$$;
