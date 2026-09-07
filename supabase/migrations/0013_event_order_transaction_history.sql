-- ============================================================================
-- HypeKnight V3.5 - Event Order Transaction History
-- ============================================================================
--
-- Migration 0011 temporarily enforced:
--
--   unique(event_id, order_kind)
--
-- while application code transitioned away from assuming one order per event.
--
-- The application no longer depends on that composite uniqueness.
--
-- Business Model 1.0 requires enhancement purchases to remain independent
-- commercial transactions so organizers retain separate receipts for:
--
--   - Extended Discovery purchases and upgrades
--   - Featured purchases
--   - future event enhancements
--
-- Only the original event_initial order remains unique per event.
-- ============================================================================


-- --------------------------------------------------------------------------
-- 1. REMOVE TEMPORARY ONE-ORDER-PER-KIND RULE
-- --------------------------------------------------------------------------

drop index if exists public.event_orders_event_kind_unique_idx;


-- --------------------------------------------------------------------------
-- 2. PRESERVE ONE INITIAL ORDER PER EVENT
-- --------------------------------------------------------------------------

create unique index if not exists
  event_orders_one_initial_per_event_idx
on public.event_orders(event_id)
where order_kind = 'event_initial';


-- --------------------------------------------------------------------------
-- 3. SUPPORT EVENT ORDER HISTORY QUERIES
-- --------------------------------------------------------------------------
--
-- The general history index created in 0011 remains:
--
--   event_orders_event_history_idx(event_id, created_at desc)
--
-- Enhancement order kinds may now appear multiple times for the same event.
-- --------------------------------------------------------------------------
