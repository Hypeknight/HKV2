# BM1 P2-B1 collection contract

Baseline: production 5f683e994fe5aaa671fa3b2efc7771ec207dac45. Reviewed draft PR #5 / P2-A audit (8761f25; 28 registered signals). The audit remains unchanged in its own draft/worktree.

## Boundaries

- Raw observations append to public.signals. No historical deduplication, rewrite, backfill, invented observations or derived scores.
- auth.uid() identifies an authenticated actor; anonymous_session_id is browser continuity, never a unique person. No supplied actor is accepted by the new collector.
- Entity references come from stored relationships, never address matching. A venue reference does not assert Event↔Venue acceptance, ownership, attendance, public venue visibility or event validity.
- New normalization uses existing canonical event/venue context or external inventory identity. Existing market references or an unambiguous active registry city/state assignment populate market_id. Unknown remains NULL/unresolved; no observed-market creation.
- Inventory provenance, emitting surface, exposure class and acquisition attribution are separate. Acquisition remains unknown; referrers/UTMs are not invented or inferred here.
- Existing legacy signals retain their verification labels. The matrix is a semantic contract, not proof that a label is securely attested. Generic RPC verification/operational-label hardening remains a separate gap.

## Collection and deduplication

Homepage and /events forms emit one search_performed on actual submission. Result rendering, prefetch, reload and back/forward navigation emit none. Each new submission receives a fresh UUID; transport fallback/retry retains it. Database uniqueness handles retries atomically. Direct query links and JS-disabled submissions are not observed searches. The existing market average uses only searchesWithObservedResults7d as its denominator and remains NULL when none has a retrieval observation. This preserves the existing factual metric, without new scores or UI changes. Search result_count is NULL/not_observed: submission does not prove retrieval or zero supply.

Organic homepage rails, /events rails and all-results grid, city results, recommendations and dashboard recommendation cards emit discovery_impression only after >=50% visible for one continuous second in a visible tab. Each document + placement + inventory identity shares a UUID across remounts/back navigation; reload is a new potential exposure. Different rails are separate placements. Unsupported IntersectionObserver, blocked JS, failed transport/storage and unviewed cards are missing/unobserved, never zeros. This is browser-reported viewability, not bot-proof verification.

The new /api/signals/discovery returns failure on collector/database errors; it does not claim storage success when the migration is absent. Search Beacon acceptance confirms queuing only, not persistence. Impressions retry at most once with the same identity. No durable offline queue or session-wide delivery guarantee is claimed.

## Featured is not styling or payment

Existing DiscoveryEventCard.featured only adds a shadow to ranked cards. Those exposures remain organic. Featured purchase/inventory routes exist, but no public paid-placement renderer/placement reference was found in the audited Discovery surfaces. featured_impression is explicitly **not instrumented** and rejected by the new collector until actual delivery exists. Payment, inventory reservation, first-three rank and special_days.is_featured never manufacture Featured exposure. This gap is required before Featured delivery reporting; absence must not be presented as zero paid impressions.

## Canonical definitions

Machine-readable definitions: lib/signals/definitions.ts. All rows store in public.signals; legacy tables/current-state counters are separate and must not be summed as additional raw actions. Event/venue/market normalization applies to future inserts through both collectors. City discovery_search_logs still records legacy page-render retrievals, separately from canonical searches; it must not be counted as additional submitted searches. Legacy replay deduplication remains unresolved except the new submission/exposure lane.

| Signal | Family | Trigger | Actor | Context | Verification semantics | Deduplication | Instrumentation |
|---|---|---|---|---|---|---|---|
| page_view | exposure | Page mount | browser | page | observed | none_legacy | instrumented |
| event_view | exposure | Event detail mount (canonical or external) | browser | event, venue if stored, market | observed | none_legacy | instrumented |
| venue_view | exposure | Venue detail mount | browser | venue, market | observed | none_legacy | instrumented |
| search_performed | intent | Homepage or Events search form submitted | browser | query, requested location, registered market if exact | declared | observation_id per submission | instrumented |
| vibe_selected | intent | Discovery vibe link clicked | browser | vibe/query and optional location | declared | none_legacy | instrumented |
| market_selected | intent | Discovery city/market link clicked | browser | requested city/state and market if exact | declared | none_legacy | instrumented |
| time_intent_selected | intent | Discovery time link clicked | browser | time filter and optional market | declared | none_legacy | instrumented |
| surprise_requested | intent | Surprise requested | server/session | request context and optional market | declared | none_legacy | instrumented |
| surprise_event_presented | exposure | Surprise response selected event (not viewability) | server/session | event or external inventory, market | observed | none_legacy | instrumented |
| recommendation_selected | intent | Recommendation link clicked | browser | event or external inventory, optional market | declared | none_legacy | instrumented |
| event_saved | engagement | Save write succeeds | authenticated user | event, stored venue, market | declared | none_legacy | instrumented |
| event_unsaved | engagement | Unsave write succeeds | authenticated user | event, stored venue, market | declared | none_legacy | instrumented |
| event_rsvp_interested | intent | Interested RSVP write succeeds | authenticated user | event, stored venue, market | declared | none_legacy | instrumented |
| event_rsvp_going | intent | Going RSVP write succeeds (not attendance) | authenticated user | event, stored venue, market | declared | none_legacy | instrumented |
| event_rsvp_not_going | intent | Not-going RSVP write succeeds | authenticated user | event, stored venue, market | declared | none_legacy | instrumented |
| event_shared | engagement | Share UI action attempted; destination delivery unknown | browser | event, stored venue, market | declared | none_legacy | instrumented |
| directions_requested | intent | Directions outbound clicked | browser | venue or event, market | declared | none_legacy | instrumented |
| event_comment_created | engagement | Event comment successfully stored | authenticated user | event, stored venue, market | declared | none_legacy | not_instrumented |
| venue_comment_created | engagement | Venue comment successfully stored | authenticated user | venue, market | declared | none_legacy | instrumented |
| venue_presence_joined | presence | Presence participant join stored | authenticated or guest participant | venue, presence session, optional event, market | contextual | none_legacy | instrumented |
| music_request_created | engagement | Music request stored | presence participant | venue, presence session, market | contextual | none_legacy | instrumented |
| music_request_voted | engagement | Music request vote stored | presence participant | venue, presence session, market | contextual | none_legacy | instrumented |
| patron_pulse_checkin | feedback | Check-in row stored; verification is route-dependent | authenticated or guest participant | event, venue/session when provided, market | declared | none_legacy | instrumented |
| patron_pulse_response | feedback | Pulse response stored; not independently verified attendance | authenticated or guest participant | event, venue/session when provided, market | declared | none_legacy | instrumented |
| coupon_redeemed | commerce | Coupon redemption successfully stored | redemption actor | coupon, venue/event where known, market | verified | none_legacy | not_instrumented |
| ticket_outbound | commerce | Ticket URL clicked; no purchase inferred | browser | event or external inventory, market | declared | none_legacy | instrumented |
| event_source_connected | operations | Authorized source connection stored | authenticated operator | event, stored venue, market, source listing | verified | none_legacy | instrumented |
| event_claim_submitted | operations | Authorized event claim stored | authenticated claimant | event, stored venue, market, claim | declared | none_legacy | instrumented |
| discovery_impression | exposure | Card >=50% visible for 1000ms in visible tab | browser | canonical or external event, stored venue, registered market | observed | document + placement + inventory identity; observation_id on retry | instrumented |
| featured_impression | exposure | Actual Featured placement >=50% visible for 1000ms; requires placement reference | browser | event + verified placement reference + venue/market | observed | placement + document + inventory identity; observation_id | not_instrumented |

## Deployment and remaining gaps

The additive 20261008145246_bm1_discovery_signal_collection.sql must be reviewed/applied before application deployment. It adds a nullable observation_id and partial unique index, a private normalization trigger, and a narrow append-only telemetry RPC. No existing RLS policies, manager/event-transition authority, application permissions or historical records change. Existing generic RPC remains compatible; browser operational/verified label spoofing there is a known P2-A risk, not solved by this passive collector.

Remaining: real Featured placement delivery, legacy action replay/trust hardening, event-comment/coupon emitters, participant/session coherence, broader market aliases without explicit state, acquisition contract, coverage-aware consumers, and meaningful factual aggregations. Do not use raw missing data as zero, equate sessions with people, or infer attendance/ticket sales. No Ticketmaster eligibility, Intelligence UI or P2-B2 work is included.

## Checkpoint validation

- git diff --check: passed.
- npx tsc --noEmit: passed.
- node --test tests/signal-collection.test.cjs tests/venue-authority.test.cjs tests/venue-product-completion.test.cjs tests/venue-command-center.test.cjs: 63 passed (14 signal + 49 existing venue tests).
- python3 tests/signal-collection.test.py: 8 groups passed against a disposable PostgreSQL 17 container; real additive migration, BEGIN/ROLLBACK, legacy RPC/row preservation, actor binding, context normalization, external identity, public eligibility, unknown/ambiguous market, no direct raw writes, private function permissions and concurrent deduplication. Focused schema fixture, not a full Supabase reset or production preflight.
- npm run build: passed using legitimate production public Supabase configuration; 101 pages generated. No service-role key used. Existing locked dependencies installed in this isolated worktree; no package/lockfile modifications.

Deployment review is required. Apply nothing as part of this implementation. Migration precedes application rollout after a separate production review/preflight. New instrumentation changes coverage/observation volume; do not interpret that discontinuity as a behavioral trend. Coverage-aware Intelligence consumers remain future work.
