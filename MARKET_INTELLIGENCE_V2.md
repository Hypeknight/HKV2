# HypeKnight Intelligence V2 — Market Registry, Metro Mapping & Baseline Foundation

V2 changes HypeKnight geography from a city-only analytics concept into a metro-aware registry while preserving every event and venue's true city/state.

## Core rule

A **Market** is the entertainment/economic region HypeKnight measures. A **Market Area** is a real municipality or area linked to that market.

Example:

- Market: Kansas City Metro
- Primary city: Kansas City, MO
- Linked areas: Kansas City, KS; North Kansas City, MO; Overland Park, KS; Raytown, MO; Independence, MO; Lee's Summit, MO; Gladstone, MO; Liberty, MO; Shawnee, KS; Lenexa, KS; Olathe, KS; Prairie Village, KS; Mission, KS.

An event in Overland Park continues to display `Overland Park, KS`, but its `market_id` points to Kansas City Metro.

## Automatic behavior

1. An exact known market area resolves to its linked metro.
2. A new unknown city/state automatically creates a standalone `observed` market.
3. Unknown cities are never guessed into a nearby metro.
4. Events, venues, external events, and new signals receive `market_id` automatically.
5. Existing rows are backfilled additively during migration.

## Discovery behavior

A city search that resolves to a market expands across that market's linked areas. A Kansas City search can therefore return qualifying events in Missouri and Kansas without rewriting the event's physical location.

## Baseline foundation

V2 adds:

- `market_metric_snapshots`
- `market_daily_metrics_v1`
- 28-day baseline-readiness calculations in the Intelligence Lab

No public Hype Score or predictive conclusion is introduced in V2.

## Deployment order

Apply migration `0003_market_registry_metro_baseline_foundation.sql` before deploying the V2 application code. The V2 pages expect the new registry tables/columns to exist.
