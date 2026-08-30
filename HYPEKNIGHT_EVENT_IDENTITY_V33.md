# HypeKnight V3.3 — Event Identity + Operational UX

## Purpose
V3.3 prepares HypeKnight for real promoter inventory without requiring fake accounts or seeded events. It adds a provider-neutral event identity matcher and operational guidance around the V3.2 claim flow.

## What changes
- Adds `lib/event-identity/match.ts`, a deterministic identity scorer.
- Adds `GET /api/event-identity/matches` to compare a proposed listing with both native HypeKnight events and imported external inventory.
- Adds a non-blocking identity check to Step 1 of event creation.
- Adds a better zero-event path to external-event claims.
- Does not change Ticketmaster ingestion.
- Does not add a database migration.

## Initial scoring model
The score is intentionally explainable and tunable:
- event-name similarity: up to 45
- city/state match: up to 18
- venue similarity: up to 18
- date/time proximity: up to 19

75+ is a strong candidate, 50–74 is a possible candidate. The UI never automatically prevents creation; real inventory will tell us where thresholds should move.

## Future refinement
Once real Eventbrite/Ticketmaster/HypeKnight overlap exists, capture false-positive/false-negative outcomes and tune weighting. A later version can persist match decisions and automatically propose canonical-event merges after sufficient confidence.
