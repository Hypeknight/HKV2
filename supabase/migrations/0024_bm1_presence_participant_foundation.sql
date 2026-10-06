-- HypeKnight Business Model 1.0
-- Shared Presence + Patron Pulse participant foundation.
--
-- This migration is intentionally additive.
-- Existing authenticated Patron Pulse and Venue Presence records remain valid
-- while application behavior migrates to participant-based presence.

-- ============================================================
-- 1. Shared participant identity
-- ============================================================

create table if not exists public.presence_participants (
  id uuid primary key default gen_random_uuid(),

  -- Identity is optional. Presence is the participation authority.
  user_id uuid references auth.users(id) on delete set null,
  email text,

  -- Stable opaque identity for a guest/device participation context.
  participant_token uuid not null default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  constraint presence_participants_participant_token_key
    unique (participant_token)
);

create index if not exists presence_participants_user_id_idx
  on public.presence_participants(user_id)
  where user_id is not null;

create index if not exists presence_participants_email_idx
  on public.presence_participants(lower(email))
  where email is not null;


-- ============================================================
-- 2. Shared presence evidence
-- ============================================================

create table if not exists public.presence_verifications (
  id uuid primary key default gen_random_uuid(),

  participant_id uuid not null
    references public.presence_participants(id) on delete cascade,

  -- Venue, event, and future field/campaign contexts can share the engine.
  context_type text not null,
  event_id uuid references public.events(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,

  method text not null,

  verification_level text not null default 'presence_supported',
  confidence numeric not null default 1,

  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,

  evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  constraint presence_verifications_context_type_check
    check (context_type in ('event', 'venue', 'field')),

  constraint presence_verifications_method_check
    check (
      method in (
        'static_qr',
        'dynamic_qr',
        'geofence',
        'staff',
        'admin',
        'hardware',
        'linkdn',
        'legacy'
      )
    ),

  constraint presence_verifications_level_check
    check (
      verification_level in (
        'declared',
        'contextual',
        'presence_supported',
        'verified'
      )
    ),

  constraint presence_verifications_confidence_check
    check (confidence >= 0 and confidence <= 1),

  constraint presence_verifications_context_check
    check (
      (
        context_type = 'event'
        and event_id is not null
        and venue_id is null
      )
      or
      (
        context_type = 'venue'
        and venue_id is not null
        and event_id is null
      )
      or
      (
        context_type = 'field'
        and event_id is null
        and venue_id is null
      )
    )
);

create index if not exists presence_verifications_participant_idx
  on public.presence_verifications(participant_id, verified_at desc);

create index if not exists presence_verifications_event_idx
  on public.presence_verifications(event_id, verified_at desc)
  where event_id is not null;

create index if not exists presence_verifications_venue_idx
  on public.presence_verifications(venue_id, verified_at desc)
  where venue_id is not null;


-- ============================================================
-- 3. Evolve Patron Pulse records toward participant ownership
-- ============================================================

alter table public.patron_pulse_checkins
  add column if not exists participant_id uuid
    references public.presence_participants(id) on delete set null;

alter table public.patron_pulse_checkins
  add column if not exists presence_verification_id uuid
    references public.presence_verifications(id) on delete set null;

alter table public.patron_pulse_responses
  add column if not exists participant_id uuid
    references public.presence_participants(id) on delete set null;

alter table public.patron_pulse_responses
  add column if not exists presence_verification_id uuid
    references public.presence_verifications(id) on delete set null;

create index if not exists patron_pulse_checkins_participant_idx
  on public.patron_pulse_checkins(participant_id)
  where participant_id is not null;

create index if not exists patron_pulse_responses_participant_idx
  on public.patron_pulse_responses(participant_id)
  where participant_id is not null;


-- ============================================================
-- 4. Evolve Venue Presence toward the shared participant model
-- ============================================================

alter table public.venue_presence_checkins
  add column if not exists participant_id uuid
    references public.presence_participants(id) on delete set null;

alter table public.venue_presence_checkins
  add column if not exists presence_verification_id uuid
    references public.presence_verifications(id) on delete set null;

create index if not exists venue_presence_checkins_participant_idx
  on public.venue_presence_checkins(participant_id)
  where participant_id is not null;


-- ==========================================================
-- 5. Patron Pulse lifecycle doctrine
-- ==========================================================

-- BM1 deliberately does not add another lifecycle/configuration switch here.
--
-- Event lifecycle is authoritative:
--   pre-live  -> Patron Pulse may be visible but participation is unavailable
--   live      -> verified-presence participants may participate
--   completed -> new participation is closed
--
-- Existing event_patron_pulse_settings are retained for compatibility while
-- application behavior is migrated away from legacy entitlement/session gates.
-- Presence, rather than account identity, is the participation authority.

-- ============================================================
-- 6. RLS foundation
-- ============================================================

alter table public.presence_participants enable row level security;
alter table public.presence_verifications enable row level security;

-- No broad direct client table access is granted here.
-- Participant creation/verification will be exposed through narrowly scoped
-- server/RPC operations in the application migration checkpoint.

revoke all on table public.presence_participants from anon, authenticated;
revoke all on table public.presence_verifications from anon, authenticated;

grant all on table public.presence_participants to service_role;
grant all on table public.presence_verifications to service_role;


-- ============================================================
-- 7. Documentation
-- ============================================================

comment on table public.presence_participants is
  'BM1 participant identity. A participant may be an authenticated user or an anonymous verified guest. Identity is separate from presence.';

comment on table public.presence_verifications is
  'BM1 evidence that a participant was present in an event, venue, or future field context. Presence verification is separate from account identity.';

comment on column public.patron_pulse_responses.participant_id is
  'BM1 participation owner. During migration legacy responses may continue to use user_id until participant backfill is complete.';

comment on column public.patron_pulse_checkins.participant_id is
  'BM1 participant identity associated with this Patron Pulse event check-in.';
