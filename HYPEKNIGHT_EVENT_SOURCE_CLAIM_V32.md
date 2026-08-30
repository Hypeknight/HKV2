# HypeKnight V3.2 — Event Source + Claim Foundation

## Purpose

V3.2 turns external ticketing into a connected source network instead of a separate event silo. HypeKnight remains the discovery, intent, experience, and intelligence layer while providers such as Ticketmaster and Eventbrite can remain the checkout/registration layer.

## Architecture

- `events` remains the canonical native HypeKnight event table.
- `external_events` remains the current imported inventory bridge so existing Ticketmaster discovery does not break.
- `event_sources` records provider identity and can link a native event, an external event, or both.
- `event_claims` records promoter/venue/organizer ownership claims for admin verification.
- Existing Ticketmaster imports are registered as source identities during migration 0005 without being converted or duplicated.

## User flows

### Connect an existing HypeKnight event

Owners open `/dashboard/events/[id]/sources`, paste an Eventbrite, Ticketmaster, or other official URL, and optionally make it the primary ticket source. Provider detection is automatic for common providers.

### Claim imported inventory

External event pages expose `Claim / Connect This Event`. Authenticated users identify their role, optionally select an existing HypeKnight event they manage, and submit verification evidence. The request enters the admin review queue.

### Admin review

`/admin/event-claims` allows administrators to approve or reject claims. Approving a claim that links an external event to an existing HypeKnight event attaches the imported source identity to the canonical event and marks the connection verified.

### Public event source CTA

Canonical event pages show connected ticket/registration sources. Outbound clicks emit `ticket_outbound` signals. Existing external event official-source links now emit the same signal.

## Signals added

- `ticket_outbound`
- `event_source_connected`
- `event_claim_submitted`

These extend the existing allowlisted `record_hypeknight_signal` RPC.

## Eventbrite strategy

V3.2 intentionally starts with URL connection + claims. Eventbrite organizer OAuth/import is a later phase built on the same `event_sources` model. This avoids pretending Eventbrite has the same public discovery model as Ticketmaster.

## Deployment order

1. Apply `supabase/migrations/0005_event_source_claim_foundation.sql`.
2. Deploy application code.
3. Verify `/admin/event-claims` and one owner `/dashboard/events/[id]/sources` page.
4. Test an outbound ticket click and confirm `ticket_outbound` appears in `signals`.
5. Test one external event claim through approval.

## No destructive conversion

This release does not delete `external_events`, alter the current Ticketmaster importer, or bulk-create native HypeKnight events. That consolidation can happen later after identity matching and claim evidence are mature.
