-- HypeKnight V3.5
-- Business Model 1.0 lifecycle and discovery foundation.
--
-- Goals:
-- 1. Approved events are public without requiring payment.
-- 2. Base HypeKnight event publication is free.
-- 3. Discovery timing is independent from public-page availability.
-- 4. Included Discovery begins 14 days before the event.
-- 5. Event lifecycle supports pre-discovery, discoverable, live,
--    historical, cancelled, and removed states.
-- 6. Legacy production statuses and columns remain compatible.

begin;

-- ============================================================
-- 1. EVENT STATUS COMPATIBILITY
-- ============================================================

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check
  check (
    status in (
      'draft',
      'building',
      'revision_draft',
      'submitted',
      'approved_unpaid',
      'approved_awaiting_payment',
      'paid_awaiting_approval',
      'revision_submitted',
      'scheduled',
      'active',
      'live',
      'rejected',
      'removal_requested',
      'refund_requested',
      'cancelled',
      'removed',
      'ended',
      'archived',
      'completed',
      'revision_approved_awaiting_payment',
      'revision_paid_awaiting_approval',
      'NPNA'
    )
  );


-- ============================================================
-- 2. FREE BASE LISTING DEFAULTS
-- ============================================================
--
-- Business Model 1.0 makes the base HypeKnight event free.
-- Payment is reserved for optional enhancements such as
-- Extended Discovery, Featured, Patron Pulse, and Linkd'N.
--
-- These are defaults for future rows. Historical event pricing
-- is intentionally preserved.

alter table public.events
  alter column base_price set default 0,
  alter column total_price set default 0,
  alter column payment_required set default false,
  alter column included_promo_days set default 14,
  alter column extra_promo_days set default 0,
  alter column extra_promo_price set default 0;


-- ============================================================
-- 3. DISCOVERY WINDOW FOUNDATION
-- ============================================================
--
-- Public-page availability and Discovery eligibility are
-- separate concepts.
--
-- Every event receives 14 included Discovery days.
-- An existing earlier discovery_start_at is preserved because
-- it may represent legacy paid/extended promotion.
--
-- Without an explicit event end, the lifecycle fallback is
-- 30 minutes after event_start_at.

update public.events
set
  discovery_start_at = case
    when discovery_start_at is null then
      event_start_at - interval '14 days'
    when discovery_start_at >
         event_start_at - interval '14 days' then
      event_start_at - interval '14 days'
    else discovery_start_at
  end,
  discovery_end_at = case
    when end_time_is_explicit = true
         and event_end_at is not null
         and event_end_at > event_start_at
      then event_end_at
    else event_start_at + interval '30 minutes'
  end
where event_start_at is not null;

-- ============================================================
-- 4. BUSINESS MODEL 1.0 EVENT LIFECYCLE
-- ============================================================
--
-- Approval makes the event page public immediately.
-- Payment is not required for publication.
--
-- Lifecycle:
--   scheduled = approved public page / pre-discovery
--   active    = inside Discovery Window before event start
--   live      = event currently happening
--   completed = historical public event
--
-- "ended" remains supported as a legacy compatibility status.
--
-- Removed events remain private. Administratively hidden events
-- are not automatically made public by this migration.

-- ------------------------------------------------------------
-- 4A. Release approved events from legacy payment-gated states
-- ------------------------------------------------------------

update public.events
set
  status = 'scheduled',
  is_public = true,
  updated_at = now()
where status in (
    'approved_unpaid',
    'approved_awaiting_payment',
    'paid_awaiting_approval'
  )
  and is_approved = true
  and removed_at is null
  and coalesce(hidden_by_admin, false) = false;


-- ------------------------------------------------------------
-- 4B. Restore Business Model 1.0 public-page visibility
-- ------------------------------------------------------------
--
-- Approved events remain publicly addressable before Discovery,
-- while live, and after completion/cancellation.
--
-- hidden_by_admin is respected as an administrative hold.

update public.events
set
  is_public = true,
  updated_at = now()
where status in (
    'scheduled',
    'active',
    'live',
    'completed',
    'ended',
    'cancelled',
    'archived'
  )
  and is_approved = true
  and removed_at is null
  and coalesce(hidden_by_admin, false) = false
  and is_public is distinct from true;

update public.events
set
  is_public = false,
  updated_at = now()
where (
    status = 'removed'
    or removed_at is not null
  )
  and is_public is distinct from false;


-- ------------------------------------------------------------
-- 4C. Replace legacy payment/promotion-driven status sync
-- ------------------------------------------------------------

create or replace function public.sync_event_statuses()
returns void
language plpgsql
security definer
as $$
begin
  -- Approved legacy events no longer wait on payment before
  -- receiving their public HypeKnight page.
  update public.events
  set
    status = 'scheduled',
    is_public = true,
    updated_at = now()
  where status in (
      'approved_unpaid',
      'approved_awaiting_payment',
      'paid_awaiting_approval'
    )
    and is_approved = true
    and removed_at is null
    and coalesce(hidden_by_admin, false) = false;

  -- Historical and current approved lifecycle states retain
  -- their public event page unless an administrator has hidden
  -- or removed the event.
  update public.events
  set
    is_public = true,
    updated_at = now()
  where status in (
      'scheduled',
      'active',
      'live',
      'completed',
      'ended',
      'cancelled',
      'archived'
    )
    and is_approved = true
    and removed_at is null
    and coalesce(hidden_by_admin, false) = false
    and is_public is distinct from true;

  -- Removed events are never public.
  update public.events
  set
    is_public = false,
    updated_at = now()
  where (
      status = 'removed'
      or removed_at is not null
    )
    and is_public is distinct from false;

  -- Past events become completed first so an overdue event
  -- cannot briefly move into active/live during the same sync.
  update public.events
  set
    status = 'completed',
    is_public = true,
    updated_at = now()
  where status in ('scheduled', 'active', 'live')
    and is_approved = true
    and removed_at is null
    and coalesce(hidden_by_admin, false) = false
    and event_start_at is not null
    and now() >
      coalesce(
        discovery_end_at,
        case
          when end_time_is_explicit = true
               and event_end_at is not null
               and event_end_at > event_start_at
            then event_end_at
          else event_start_at + interval '30 minutes'
        end
      );

  -- Once the event starts, it becomes live until its effective
  -- end time.
  update public.events
  set
    status = 'live',
    is_public = true,
    updated_at = now()
  where status in ('scheduled', 'active')
    and is_approved = true
    and removed_at is null
    and coalesce(hidden_by_admin, false) = false
    and event_start_at is not null
    and now() >= event_start_at
    and now() <=
      coalesce(
        discovery_end_at,
        case
          when end_time_is_explicit = true
               and event_end_at is not null
               and event_end_at > event_start_at
            then event_end_at
          else event_start_at + interval '30 minutes'
        end
      );

  -- Before event start, entering the Discovery Window changes
  -- the event from public/pre-discovery to discoverable.
  update public.events
  set
    status = 'active',
    is_public = true,
    updated_at = now()
  where status = 'scheduled'
    and is_approved = true
    and removed_at is null
    and coalesce(hidden_by_admin, false) = false
    and event_start_at is not null
    and now() >=
      coalesce(
        discovery_start_at,
        event_start_at - interval '14 days'
      )
    and now() < event_start_at;
end;
$$;


commit;
