# P2-B2 — Guest Presence and Patron Pulse

Baseline: production main `23ff1e8bffbb47abc5103ed6278443578aa591b4`. Additive migration: `20261008231932_bm1_guest_presence_pulse_participation.sql`. No production changes.

The existing shared activity trigger also referenced response-only fields on check-in records. The migration preserves the activity trail using a safe JSON row projection for both record shapes.

## Audited workflow and correction

| Handoff | Before | P2-B2 |
| --- | --- | --- |
| Official QR → participant | UUID column received a hex token; Server Component set a cookie | Route handler invokes credential-validated `join_event_presence`; opaque UUID in HttpOnly cookie |
| Participant → evidence | `verification_method` did not match `method`; expiry fallback/revocation incomplete | Database records the credential FK, method and bounded event/credential expiry |
| Evidence → participation | UI required login; actions required a form token never submitted and rejected missing auth | Cookie bearer + recorded active credential/evidence + public Live event authorize guest or account equally |
| Check-in/response storage | `user_id NOT NULL`, authenticated-only policies, non-atomic lookup/write | Nullable account, participant uniqueness, constrained RPCs, identity checks, same-participant transaction lock |
| Stored evidence → canonical signal | Independent best-effort emitter; repeat updates could emit duplicates; general RPC could claim Pulse verification | Participation trigger appends signal in the same transaction; identical retry is a no-op; ordinary telemetry cannot forge Pulse signals |
| Guest viewer state | Account-based check-in/response lookup | Only the cookie participant's sanitized state; no token, email or other participant returned |

## Security and lifecycle

Public RPCs receive an event ID and bearer token, not a trusted user ID or verification level. `auth.uid()` binds optional account identity. The official QR is validated by hashing the raw credential, matching its event, active/revoked state and time window. Its possession is the existing static/dynamic QR Presence assurance (`presence_supported`, not stronger physical/geofence verification). A copied static QR remains a known assurance limitation; this checkpoint does not invent stronger proof.

Public, non-removed scheduled/active event + event start/end is the Live gate. Missing end uses the existing 30-minute fallback. Participation also requires enabled Core settings, an open session with check-in enabled, and open pulse/window. Paid Intelligence/activation never grants participation. Venue visibility/acceptance does not decide event validity.

Participant/verification/credential tables retain no direct guest grants. Authenticated self-asserted Pulse write policies are retired; administrator authority and organizer reads remain. Public Pulse reads follow public event and visible session/pulse ancestry. Functions have fixed empty search paths, explicit grants and inaccessible private helpers. Mutations validate active option belonging to the pulse or bounded text. Removed/left check-ins cannot be silently reinstated.

One answer per participant/pulse is enforced. Identical retries return the same answer without another signal. `allow_multiple_responses=false` forbids changed answers; when true, the existing one-row answer model permits revisions, with append-only raw evidence for each accepted change. Legacy account uniqueness/read behavior and historical rows remain. No historical data is rewritten or missing observations treated as zero.

P2-B1's insert normalizer remains authoritative for stored event → canonical venue → unique registered market context; unresolved geography remains unresolved. Signals contain participant, check-in/response and verification/credential references, not credentials, emails or answer text. Core participation remains separate from paid Intelligence.

## Retained gaps

- `app/presence/join/[token]/page.tsx` is the legacy **venue** session flow and still requires an account. It does not establish event Presence; converting it safely needs its own venue credential/lifecycle contract.
- Legacy historical participant rows without credential evidence cannot unlock new participation: rescan the official QR.
- Static QR sharing, device/cookie reset and cross-device guest identity cannot prove unique human attendance. No unsupported uniqueness/attendance claim is introduced.
- Existing organizer session/pulse setup, Intelligence consumers and result aggregation are retained, not redesigned.
- Production migration preflight must check existing participant duplicate indexes before application. This migration intentionally fails instead of silently deleting conflicts.
