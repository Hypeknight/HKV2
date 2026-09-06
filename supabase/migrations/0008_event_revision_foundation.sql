-- HypeKnight V3.5
-- Event Revision Foundation
--
-- Business Model 1.0 principle:
-- An approved/public event remains canonical and public while proposed
-- organizer changes are drafted and moderated separately.
--
-- public.events = last approved/current public event
-- public.event_revisions = proposed organizer changes

begin;


-- ============================================================
-- 1. EVENT REVISIONS
-- ============================================================

create table if not exists public.event_revisions (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id)
    on delete cascade,

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'submitted',
        'approved',
        'rejected',
        'superseded',
        'cancelled'
      )
    ),

  -- Lifecycle state of the canonical event when revision began.
  -- This is informational/audit context. The event itself remains
  -- in its real public lifecycle state while revision is pending.
  base_event_status text not null,

  -- Timestamp/version marker used later to detect whether the
  -- canonical event changed while this revision was pending.
  base_event_updated_at timestamptz null,

  -- Snapshot of the editable canonical fields when revision began.
  -- This provides a durable before-state for moderation and audit.
  base_data jsonb not null default '{}'::jsonb,

  -- Organizer-proposed field values.
  -- Application code will whitelist which keys may be copied back
  -- into public.events on revision approval.
  proposed_data jsonb not null default '{}'::jsonb,

  revision_reason text null,

  submitted_at timestamptz null,

  reviewed_at timestamptz null,

  reviewed_by uuid null
    references auth.users(id)
    on delete set null,

  admin_note text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. REVISION INDEXES / OPEN-REVISION GUARD
-- ============================================================

create index if not exists event_revisions_event_idx
  on public.event_revisions(event_id, created_at desc);

create index if not exists event_revisions_creator_idx
  on public.event_revisions(created_by, created_at desc);

create index if not exists event_revisions_status_idx
  on public.event_revisions(status, submitted_at asc);

-- Only one actionable revision may exist for an event at once.
-- A rejected revision remains actionable because the organizer may
-- revise it and resubmit instead of creating another revision.
create unique index if not exists event_revisions_one_open_per_event_uidx
  on public.event_revisions(event_id)
  where status in ('draft', 'submitted', 'rejected');


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table public.event_revisions enable row level security;


-- Owners may read revisions for events they own.
-- Admins may read every revision.
drop policy if exists event_revisions_read on public.event_revisions;

create policy event_revisions_read
on public.event_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
);


-- Event owners may begin their own draft revision.
drop policy if exists event_revisions_insert on public.event_revisions;

create policy event_revisions_insert
on public.event_revisions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and status = 'draft'
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
);


-- Event owners may edit their own actionable revision.
-- Server actions remain responsible for allowed status transitions
-- and for whitelisting proposed_data fields.
drop policy if exists event_revisions_owner_update on public.event_revisions;

create policy event_revisions_owner_update
on public.event_revisions
for update
to authenticated
using (
  created_by = auth.uid()
  and status in ('draft', 'rejected')
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and status in ('draft', 'submitted')
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.owner_id = auth.uid()
  )
);


-- Admin review writes are permitted for authenticated administrators.
drop policy if exists event_revisions_admin_update on public.event_revisions;

create policy event_revisions_admin_update
on public.event_revisions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role = 'admin'
  )
);


commit;
