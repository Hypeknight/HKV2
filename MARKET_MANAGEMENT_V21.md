# HypeKnight Intelligence V2.1 — Market Management

This additive update turns the V2 Market Registry from a read-only audit page into an admin management surface.

## What it adds

- **Create Market** — creates a canonical market and primary market area.
- **Add / Move Market Area** — links a municipality/suburb to an existing metro. Existing matching events, venues, external events, and signals are reassigned to that market without changing physical city/state.
- **Exceptional Record Override** — lets an admin assign one event or venue to a different market without changing city-wide mapping.
- Existing V2 automatic assignment remains unchanged: known areas inherit their metro automatically, while unknown city/state pairs are observed rather than guessed into a nearby metro.

## Important distinction

City/state remains the physical display truth. `market_id` is the intelligence/discovery grouping. A city-wide area mapping should be preferred over a record-level override whenever the whole municipality belongs to a metro.

## Database

Migration `0004_market_management_admin_tools.sql` adds two admin-only RPCs:

- `create_hypeknight_market`
- `override_hypeknight_record_market`

It reuses the V2 RPC `link_hypeknight_market_area` for adding/moving cities and suburbs.

No tables, columns, routes, or legacy features are deleted.
