-- ============================================================================
-- HypeKnight V3.5 - Event Order Kind Foundation
-- ============================================================================
--
-- Phase 1 of multi-order support.
--
-- Existing HypeKnight event commerce assumes exactly one event order per event.
-- Before allowing multiple purchases, application code must learn to identify
-- the initial event order explicitly.
--
-- This migration therefore:
--   1. adds order_kind
--   2. classifies all existing orders as event_initial
--   3. adds a unique key for event_id + order_kind
--   4. intentionally PRESERVES the legacy unique(event_id) constraint
--
-- A later migration will remove unique(event_id) after application code has
-- migrated away from event-only order lookups/upserts.
-- ============================================================================


-- --------------------------------------------------------------------------
-- 1. CLASSIFY EVENT ORDERS
-- --------------------------------------------------------------------------

alter table public.event_orders
  add column if not exists order_kind text not null default 'event_initial';

alter table public.event_orders
  drop constraint if exists event_orders_order_kind_check;

alter table public.event_orders
  add constraint event_orders_order_kind_check
  check (
    order_kind in (
      'event_initial',
      'extended_discovery',
      'featured',
      'patron_pulse',
      'linkdn',
      'other'
    )
  );


-- --------------------------------------------------------------------------
-- 2. EXPLICITLY CLASSIFY EXISTING ORDERS
-- --------------------------------------------------------------------------

update public.event_orders
set order_kind = 'event_initial'
where order_kind is null
   or order_kind = '';


-- --------------------------------------------------------------------------
-- 3. PREPARE APPLICATION FOR MULTIPLE ORDERS
-- --------------------------------------------------------------------------
--
-- The legacy unique(event_id) constraint remains in place during this phase.
-- This composite unique index allows upgraded application code to use:
--
--   on conflict (event_id, order_kind)
--
-- before multi-order support is activated.
--

create unique index if not exists
  event_orders_event_kind_unique_idx
on public.event_orders(event_id, order_kind);


-- --------------------------------------------------------------------------
-- 4. ORDER HISTORY LOOKUP INDEX
-- --------------------------------------------------------------------------

create index if not exists
  event_orders_event_history_idx
on public.event_orders(event_id, created_at desc);
