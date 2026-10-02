-- BM1 shared Presence credentials
--
-- A credential proves that a participant reached an authorized Presence
-- entry point. The raw credential is never persisted; only its SHA-256
-- hash is stored.
--
-- Credentials are context-specific and may later support static QR,
-- rotating QR, venue signage, staff verification, hardware, and other
-- Presence methods without coupling the credential to Patron Pulse.

create table if not exists public.presence_credentials (
  id uuid primary key default gen_random_uuid(),

  context_type text not null
    check (context_type in ('event', 'venue', 'field')),

  event_id uuid references public.events(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,

  credential_type text not null
    check (
      credential_type in (
        'static_qr',
        'dynamic_qr'
      )
    ),

  token_hash text not null unique,

  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),

  valid_from timestamptz,
  expires_at timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  constraint presence_credentials_context_check
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
    ),

  constraint presence_credentials_validity_check
    check (
      expires_at is null
      or valid_from is null
      or expires_at > valid_from
    )
);

create index if not exists presence_credentials_event_idx
  on public.presence_credentials(event_id)
  where event_id is not null;

create index if not exists presence_credentials_venue_idx
  on public.presence_credentials(venue_id)
  where venue_id is not null;

create index if not exists presence_credentials_active_idx
  on public.presence_credentials(status, context_type);

alter table public.presence_credentials enable row level security;

-- Credential validation is server-side through the service-role client.
-- No direct public read policy is intentionally created.

comment on table public.presence_credentials is
  'BM1 shared Presence entry credentials. Stores only hashes of raw QR/check-in credentials.';

comment on column public.presence_credentials.token_hash is
  'SHA-256 hash of the opaque credential. Raw credential must not be persisted.';
