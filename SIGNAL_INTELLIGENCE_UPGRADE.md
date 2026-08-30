# HypeKnight Signal Intelligence Upgrade — Bridge V1

This upgrade is intentionally additive. It does **not** delete existing HypeKnight files or replace existing operational tables. Existing features remain the source of truth for current application state; the new `signals` stream records historical actions for analysis.

## What this upgrade adds

### New foundation
- `public.signals` append-only intelligence stream.
- `record_hypeknight_signal(...)` validated database RPC.
- Anonymous browser-session IDs for public/non-logged-in signal continuity.
- Browser signal API at `/api/signals`.
- Reusable `SignalLink` and `SignalAnchor` components.
- Experimental event scoring utilities.
- Admin-only `/admin/intelligence` validation dashboard.

### Existing actions bridged into signals
- Homepage/page views.
- Event views.
- Venue views.
- Filtered discovery / Quick Search submissions.
- “Explore Tonight” time intent.
- “What’s Your Vibe?” selections.
- Active City selections.
- Surprise Me selections.
- Event Save / Unsave.
- RSVP Interested / Going / Not Going.
- Event Share.
- Directions clicks.
- Event comments.
- Patron Pulse check-ins.
- Patron Pulse responses.
- Venue comments.
- Venue presence joins.
- Venue music requests.
- Venue music-request votes.

## Why existing tables remain

Examples:

- `event_saves` answers: “Is this event saved right now?”
- `signals` answers: “When did this user/session save, unsave, return, RSVP, request directions, and respond to Pulse?”

Both are useful and should coexist.

## Deployment order

1. **Back up the current production database and current Git branch.**
2. Apply `supabase/migrations/0002_signal_intelligence_foundation.sql` to the Supabase project.
3. Verify `public.signals` exists and `record_hypeknight_signal` is callable.
4. Deploy the application changes.
5. Browse the homepage, an event, and a venue; use Save/RSVP/Share/Directions as a test account.
6. Open `/admin/intelligence` while logged in as an admin and verify signals appear.
7. Keep the experimental score private until weights and baselines are calibrated with real behavior.

## Safety / privacy decisions in V1

- Raw comment text is **not duplicated** into the signal stream.
- Patron Pulse free-text answers are **not duplicated** into signal metadata.
- Anonymous session IDs are random browser IDs, not names/emails/phone numbers.
- `actor_id` is assigned by the database from `auth.uid()`; callers cannot submit another user's actor ID through the RPC.
- Raw `signals` SELECT access is admin-only under the included RLS policy.
- Signal logging is best-effort and should never make Save/RSVP/Pulse fail.

## Experimental score warning

`lib/intelligence/event-score.ts` contains deliberately transparent V1 weights. They are placeholders for calibration and are commented accordingly. The admin Intelligence Lab calls the result an **experimental index**, not the public Hype Score.

Before public scoring, add:
- comparable-event baselines (market/category/day/time),
- stronger unique-user/session diminishing returns,
- event-stage-specific recency decay,
- manipulation/fraud controls,
- minimum sample thresholds,
- confidence-aware public display states,
- historical conversion calibration against actual/likely presence.

## Recommended next bridges

After this V1 is producing real data, the next additions should be:

1. Event-card impression tracking (not only detail-page views).
2. Search-result position and selection tracking.
3. “More Like This” / recommendation accept-reject loop.
4. Venue Follow and event Save semantic separation.
5. Live one-tap crowd / energy / door-wait Pulse questions.
6. Operator-reported live crowd, wait, cover, and event-status signals.
7. Metric snapshots / hourly event intelligence table.
8. Public “Building Hype / Heating Up / Trending” states only after enough evidence exists.

## Existing commented/legacy code

No existing file was intentionally deleted. Large legacy/commented sections already present in the source were left intact. New changes are marked with comments such as `SIGNAL BRIDGE`, `EXPERIMENTAL V1 WEIGHTS`, and deployment/privacy notes so they can be reviewed independently.
