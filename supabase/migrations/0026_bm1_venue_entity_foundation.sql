-- HypeKnight Business Model 1.0
-- Venue entity foundation.
--
-- Governing doctrine:
-- A physical location is not a venue identity.
-- A shared address establishes a location relationship, not that two venues
-- are the same business.
--
-- This migration is intentionally additive. Legacy venue ownership,
-- subscriptions, commerce, and presence objects remain available while
-- application authority is migrated to the BM1 model.

create table if not exists public.venue_locations (
  id uuid primary key default gen_random_uuid(),

  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country_code text not null default 'US',

  normalized_address text,
  latitude double precision,
  longitude double precision,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists venue_locations_normalized_address_idx
  on public.venue_locations (lower(normalized_address))
  where normalized_address is not null;


alter table public.venues
  add column if not exists location_id uuid
    references public.venue_locations(id) on delete set null,

  add column if not exists entity_state text not null default 'active',

  add column if not exists claim_state text not null default 'unclaimed',

  add column if not exists verification_state text not null default 'unverified',

  add column if not exists opened_at timestamptz,

  add column if not exists closed_at timestamptz;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'venues_entity_state_check'
      and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_entity_state_check
      check (
        entity_state in (
          'active',
          'temporarily_closed',
          'closed',
          'unknown'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'venues_claim_state_check'
      and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_claim_state_check
      check (
        claim_state in (
          'unclaimed',
          'claim_pending',
          'claimed',
          'disputed'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'venues_verification_state_check'
      and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues
      add constraint venues_verification_state_check
      check (
        verification_state in (
          'unverified',
          'high_confidence',
          'verified',
          'disputed',
          'stale'
        )
      );
  end if;
end
$$;


create index if not exists venues_location_id_idx
  on public.venues(location_id);

create index if not exists venues_claim_state_idx
  on public.venues(claim_state);

create index if not exists venues_entity_state_idx
  on public.venues(entity_state);


create table if not exists public.venue_claims (
  id uuid primary key default gen_random_uuid(),

  venue_id uuid not null
    references public.venues(id) on delete cascade,

  claimant_user_id uuid not null
    references auth.users(id) on delete cascade,

  status text not null default 'pending',

  verification_method text,
  evidence jsonb not null default '{}'::jsonb,

  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,

  admin_note text,

  constraint venue_claims_status_check
    check (
      status in (
        'pending',
        'approved',
        'rejected',
        'withdrawn'
      )
    )
);

create index if not exists venue_claims_venue_idx
  on public.venue_claims(venue_id, submitted_at desc);

create index if not exists venue_claims_claimant_idx
  on public.venue_claims(claimant_user_id, submitted_at desc);


create table if not exists public.venue_managers (
  id uuid primary key default gen_random_uuid(),

  venue_id uuid not null
    references public.venues(id) on delete cascade,

  user_id uuid not null
    references auth.users(id) on delete cascade,

  role text not null default 'manager',

  permissions jsonb not null default '{}'::jsonb,

  status text not null default 'active',

  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint venue_managers_role_check
    check (
      role in (
        'owner',
        'manager',
        'staff'
      )
    ),

  constraint venue_managers_status_check
    check (
      status in (
        'invited',
        'active',
        'suspended',
        'removed'
      )
    ),

  unique (venue_id, user_id)
);

create index if not exists venue_managers_user_idx
  on public.venue_managers(user_id, status);

create index if not exists venue_managers_venue_idx
  on public.venue_managers(venue_id, status);


create table if not exists public.venue_corrections (
  id uuid primary key default gen_random_uuid(),

  venue_id uuid not null
    references public.venues(id) on delete cascade,

  submitted_by uuid references auth.users(id) on delete set null,

  field_name text,
  proposed_value jsonb,
  reason text,

  status text not null default 'pending',

  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,

  constraint venue_corrections_status_check
    check (
      status in (
        'pending',
        'accepted',
        'rejected'
      )
    )
);

create index if not exists venue_corrections_venue_idx
  on public.venue_corrections(venue_id, created_at desc);


alter table public.venue_locations enable row level security;
alter table public.venue_claims enable row level security;
alter table public.venue_managers enable row level security;
alter table public.venue_corrections enable row level security;

-- No broad direct client write authority is introduced in this foundation.
-- Application/server actions and explicit later policies will define the
-- permitted BM1 workflows.

revoke all on table public.venue_locations from anon, authenticated;
revoke all on table public.venue_claims from anon, authenticated;
revoke all on table public.venue_managers from anon, authenticated;
revoke all on table public.venue_corrections from anon, authenticated;

grant all on table public.venue_locations to service_role;
grant all on table public.venue_claims to service_role;
grant all on table public.venue_managers to service_role;
grant all on table public.venue_corrections to service_role;


comment on table public.venue_locations is
  'BM1 physical location identity. A location may host multiple venue identities over time.';

comment on column public.venues.location_id is
  'Physical location relationship only. It does not define venue identity.';

comment on column public.venues.claim_state is
  'Venue claim state, independent of lifecycle, verification, visibility, and payment.';

comment on column public.venues.verification_state is
  'Confidence/verification state for the canonical venue entity.';

comment on table public.venue_claims is
  'Requests by users to establish authorized management of an existing venue entity.';

comment on table public.venue_managers is
  'Venue-specific management authority. Replaces global venue-owner identity as the target authority model.';

comment on table public.venue_corrections is
  'Suggested factual corrections that do not require claiming the venue.';
