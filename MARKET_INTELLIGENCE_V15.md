# HypeKnight Market Intelligence V1.5

## Purpose

Market Intelligence V1.5 turns HypeKnight's existing discovery behavior into an admin-only city/market intelligence layer without deleting or replacing the current analytics, discovery, event, or signal systems.

This release deliberately avoids a public city score. It establishes explainable measurements first so future Demand, Momentum, Opportunity, and Confidence models can be calibrated against real history.

## What changes

### 1. Canonical market identity

New `lib/markets/normalize-market.ts` normalizes known HypeKnight markets into a stable key, city, and state.

Examples:

- `Kansas City` -> `kansas-city-mo`
- `kansas city + MO` -> `kansas-city-mo`
- `Houston + tx` -> `houston-tx`

The helper only infers a missing state for known/unambiguous HypeKnight markets. Unknown cities require a state instead of guessing.

### 2. Market-aware search signals

`app/events/page.tsx` keeps the existing `search_performed` bridge but improves it:

- explicit city searches use `subject_type = market`;
- `subject_id` becomes the canonical market key;
- exact known city aliases typed into the free-text search can resolve to a market;
- arbitrary search text is not guessed into a city;
- signal metadata now includes total, HypeKnight, and external result counts.

Search logging remains best-effort and must never block discovery.

### 3. Market intelligence aggregation

New `lib/intelligence/market-intelligence.ts` calculates admin-only market measurements from:

- the current `signals` stream;
- legacy `discovery_search_logs` as historical evidence only;
- current HypeKnight event inventory;
- current external event inventory;
- event/venue market inheritance for signals that only contain an event or venue ID.

Current measurements include:

- searches in the last 24 hours;
- searches in the last 7 days;
- previous 7-day searches and percentage change;
- unique known/anonymous search participants where identity is available;
- event views, venue views, saves, Going, shares, and directions by market;
- zero-result and low-result searches;
- average returned results per search;
- HypeKnight vs external inventory;
- HypeKnight inventory coverage percentage;
- peak discovery hour;
- evidence confidence: Insufficient / Building / Moderate / Strong.

Legacy June searches are not inserted into `signals` and are not mixed into current trend windows.

### 4. Admin Intelligence V1.5

`/admin/intelligence` retains the V1 event score lab and adds a Market Intelligence section with city demand, trend, engagement, supply, search satisfaction, and confidence.

The old `/admin/analytics` and `/admin/discovery` pages remain unchanged.

## Database changes

None.

V1.5 uses the existing `signals` schema and `subject_type = market` support from migration `0002_signal_intelligence_foundation.sql`.

## Deployment order

1. Apply these code changes on a feature branch.
2. Run `npx tsc --noEmit` in the real HKV2 development environment.
3. Run `npm run build` with the same environment variables used by the app.
4. Test `/events?city=Kansas%20City&state=MO` and at least one other city.
5. Verify new `search_performed` rows in `public.signals` have:
   - `subject_type = market`
   - canonical `subject_id`
   - normalized city/state
   - result-count metadata.
6. Open `/admin/intelligence` and verify the Market Intelligence section.
7. Only after validation, merge/deploy through the normal Render workflow.

## Validation SQL

```sql
select
  signal_type,
  subject_type,
  subject_id,
  city,
  state,
  metadata,
  occurred_at
from public.signals
where signal_type = 'search_performed'
order by occurred_at desc
limit 50;
```

Expected city-search example:

- `signal_type = search_performed`
- `subject_type = market`
- `subject_id = kansas-city-mo`
- `city = Kansas City`
- `state = MO`

## Intentionally not included yet

- No public market score.
- No public city trend labels.
- No historical signal backfill.
- No database migration.
- No deletion of legacy discovery logs.
- No changes to `/admin/analytics`.
- No changes to `/admin/discovery`.
- No prediction or recommendation engine yet.
