# BM1 P1-C — Venue Command Center

Base: production `1f322db359f91a60ead4d65fbd860c22f9bdbb0b`. Migration 0028 remains authoritative; no schema changes.

## Route contract

| Section / existing route | Decision |
| --- | --- |
| `/dashboard/venues/[id]` | New Overview and seven-section authenticated shell |
| `/profile` | Existing review presentation moved here; profile editors and hours reused |
| `/events` | Canonical events visible under existing event RLS; canonical Event Builder and venue-scoped connection queue |
| `/presence`, `/presence/qr` | Retained first-class capability and supporting QR page |
| `/analytics` | Factual stored record counts only, scoped by venue and RLS |
| `/management` | Manager roster, administrator lifecycle, claim/correction state and material proposals |
| `/intelligence` | Availability status only; no derived scores or Signal Alignment work |
| `/edit` | Redirect to Overview; duplicate landing retired |
| `/review` | Redirect to Profile; duplicate review route retired |
| `/edit/step-1`, `/edit/step-2`, `/edit/hours` | Retained Profile tools within the shell. Active venues may edit; name/address proposals require review for every actor |
| `/interactions`, `/moderation`, `/music-requests` | Retained Presence supporting tools; no duplicate implementation |
| `/edit/step-3` | Existing compatibility redirect to hours retained; package setup is not Venue Core |
| `/payment`, `/payment/success` | Existing authorized commerce compatibility routes retained outside primary navigation. Payment cannot activate identity |
| `/dashboard/venues/claims` | Existing personal submission/history flow retained |
| `/dashboard/venues/connections` | Existing aggregate queue retained; optional venue scope explicitly reauthorized |
| Admin manager lifecycle surface | Inline unconfirmed status editor retired; links to venue-scoped confirmed lifecycle flow. Claims review remains in Admin |

## Authority and lifecycle

- Every venue route is gated by the existing centralized `venue_managers` authority and administrator override.
- Manager roster is a minimal, venue-scoped server lookup inside the centralized authorization helper. Active managers see active relationships; admins see lifecycle history. No service-role writes are added.
- Only administrators grant, relabel, reactivate, suspend or soft-remove relationships, consistent with 0028 and the P1-A capability matrix. Venue managers cannot delegate access.
- Add targets an existing account UUID, verified server-side. Actor identity comes from authenticated server state. Duplicate relationships are updated rather than recreated.
- Owner / manager / staff are existing relationship labels. All active labels currently grant the same authority. Permissions JSON is preserved and cannot be edited here because granular enforcement is not implemented.
- All authority changes require explicit confirmation. Stale updates are rejected using the displayed timestamp and a conditional update. No hard deletions or owner compatibility rewrites.
- Explicit administrator revocation may leave zero active managers: 0028 recomputes claim state, the venue remains valid, and HypeKnight/admin stewardship remains. This is an intentional admin override, not an implied invalid/unpublished venue.
- Ordinary profile edits cannot silently change identity, location, lifecycle or moderation visibility. Closure/rebrand/new-business proposals remain pending corrections for independent review.
- Claims and corrections shown to managers are their own submissions under existing privacy RLS; admins see all scoped submissions. Claim state and verification are displayed separately.

## Remaining product gaps

- No self-service invitations or manager delegation; these need a reviewed capability/RLS contract.
- No granular role/permissions enforcement is claimed.
- Venue event lists are limited to existing event RLS visibility (latest 100), not all private organizer events.
- Presence legacy session/QR dashboard is retained. Shared `lib/presence/service.ts` and credential verification remain unchanged; unifying legacy session reporting with shared verification is future work.
- Counts are stored records, not unique guests or proven attendance. Patron Pulse waits for Signal Alignment.
- Correction review/application still uses the existing administrative review process; new business versus continuing identity requires human judgment.
- Legacy commerce and venue creation global-role gates remain compatibility work, not authority for an existing venue.
