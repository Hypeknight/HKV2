-- ============================================================================
-- HypeKnight V3.5 - Event Multi-Order Activation
-- ============================================================================
--
-- Application code now explicitly identifies the original event order with:
--
--   order_kind = 'event_initial'
--
-- Migration 0011 also added:
--
--   unique(event_id, order_kind)
--
-- It is therefore safe to remove the legacy one-order-per-event restriction.
--
-- This allows future immutable commercial transactions such as:
--   - Extended Discovery
--   - Featured
--   - future paid event enhancements
--
-- Patron Pulse and Linkd'N remain unavailable for organizer purchase until
-- their product systems are ready.
-- ============================================================================


alter table public.event_orders
  drop constraint if exists event_orders_event_id_key;
