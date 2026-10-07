# BM1 venue capability contract  P1-A/P1-B

Authority: migration 0028 and `lib/venues/authority.ts`. Active `venue_managers` records grant venue management; administrators retain their override. Venue `owner_id` and global `venue_owner` do not authorize management. Venue identity, physical location, claim state, verification, moderation visibility, event validity and paid enhancements are separate.

## Entity visibility

| Entity | Public view / associated events | Management / claim | Event creation |
| --- | --- | --- | --- |
| Public claimed venue | Visible subject to moderation; show independently public events | Active managers/admin; no automatic competing transfer | Any authenticated organizer may create an event at its location |
| Public unclaimed venue | Equally valid public entity; lack of claim/verification alone is not a visibility veto | HypeKnight/admin stewardship; authenticated claim reviewed against existing entity | Same organizer flow; no claim/payment prerequisite |
| Administratively hidden venue | Excluded from public discovery/detail; public events retain their own visibility decisions | Authorized managers/admin can access management; claims/corrections never unhide it | Manager may explicitly select it; creation never publishes/unhides venue |

The four hidden production test venues are intentional and must remain unchanged.

## Actor actions

Y = permitted within the stated scope; R = reviewed proposal; E = existing entitlement required;  = no management permission. This is the governing contract, not a claim that all listed UI is already implemented.

| Action | Active venue manager | Ordinary organizer / non-manager | Administrator |
| --- | --- | --- | --- |
| View venue | Public plus own management access to hidden venue | Public venues only | All for moderation |
| Edit ordinary factual information | Y, scoped to managed venue | ; propose correction | Y |
| Propose material identity/location correction | R; no silent identity/history transfer | R for accessible venue | Review/apply with identity safeguards |
| Manage managers | Admin-reviewed lifecycle; no implicit grant delegation |  | Invite/activate/suspend/remove under 0028 |
| View associated events | Public events plus scoped management connection queue | Public events; own event dashboard | Moderation access |
| Create event at venue/location | Canonical Event Builder; optional explicit managed venue selection | Canonical Event Builder; location does not confer venue authority | Same builder with existing override |
| Accept/reject canonical connection | Y for managed venue; rejection preserves event validity | ; organizer owns its event, not venue acceptance | Y |
| Use Presence | Manage own venue operations; participant actions follow existing scoped rules | Public/participant actions only; no management grant | Y for moderation/operations |
| View factual analytics | Scoped legitimate venue facts | Public facts only; own event analytics independently | Y |
| Patron Pulse / Intelligence | Scoped access plus applicable E; payment never grants identity/authority | No privileged venue analytics; ordinary product entitlements separately | Existing admin override |
| Claim venue | No claim needed for own active relationship; other eligible existing venue may be requested | R for eligible existing venue | Review; approval grants manager record, rejection preserves entity |

## Implementation map and remaining gaps

- `app/dashboard/events/new/page.tsx` preserves explicit venue context for both flyer/source entry paths. `step-1/page.tsx` lists active managed venues through `getOwnedVenues`, whose compatibility name resolves through `getManagedVenueIds`. Only minimal venue location fields cross to the selector client.
- `components/events/ManagedVenueSelect.tsx` optionally fills ordinary location inputs. The server action reauthorizes the selected ID and reads authoritative venue facts; submitted user IDs/location overrides cannot substitute authority or mutate venue facts.
- `app/dashboard/events/actions.ts`: explicit authorized ID creates an approved canonical relationship; no ID creates an unmatched event. Both retain the ordinary building/review/publication lifecycle. Retired address-only automatic connection helper and its privileged event/request writes.
- `app/dashboard/venues/page.tsx`: Create event links to the canonical builder with explicit venue context. No venue-specific builder added.
- Existing `/venues`, `/venues/[slug]`, dashboard profile/hours, connections, claims, Presence, music requests and interactions remain separate routes. Public detail uses moderation visibility plus scoped authority; list uses existing public filters. No production visibility records changed.
- P1-C should consolidate Overview/Profile/Events/Presence/Analytics/Management/Intelligence navigation, implement reviewed manager lifecycle UI, and reconcile remaining legacy publication/verification/payment presentation with this contract. Audit public listing/detail filters before changing them; do not infer a bug from an empty production list.

## Encountered legacy classification

| Reference | Classification | Decision |
| --- | --- | --- |
| Event `owner_id` in create/edit/revision/source/payment/removal/duplicate actions | EVENT OWNERSHIP | Keep; authenticated organizer owns event regardless of venue authority |
| Event `owner_type` from global `venue_owner` in `getOwnerType` | COMPATIBILITY | Keep metadata temporarily; not a venue authorization decision |
| `getOwnedVenues` name | COMPATIBILITY | Keep API name; implementation already uses active manager authority |
| Address matching helper reading venue `owner_id` | RETIRE | Remove automatic identity attachment and unused legacy selection column |
| `requireVenueAuthority` / active manager lookups | VENUE AUTHORITY | Reuse centralized server-only authorization, no owner fallback |
| Venue creation `requireVenueOwnerOrAdmin`, owner_id storage | RETIRE gate / COMPATIBILITY storage | Defer creation-entry modernization; 0028 creates manager relationship atomically, no manager authority fallback |
| Standalone admin event creation / legacy commented builder code | RETIRE direction | No manager navigation to it; admin operations and broad dead-code cleanup deferred |

No schema migration, production write, claim/payment mutation or alternate role system is introduced by this checkpoint.
