# BM1 P3-B Community Pulse activation candidate

## Baseline and boundary

Based on GitHub main `31e3e1aef0657a30f58b30b90eae1a7cedf04b07` (P3-A merged). Branch `feature/bm1-public-community-pulse-p3b`. This candidate prepares signed-in homepage responses and a separate administrator editor. Production remains the disabled preview until an approved database and application release. Event Patron Pulse, Presence QR, native/external discovery and commerce are unchanged.

Guest collection remains deferred. No guest grant route, arbitrary browser identity, challenge bypass or public table write is introduced. A signed-in first release avoids making unverified guest uniqueness promises. The existing P3-A guest foundation remains available only to its privileged server contract.

## Homepage and participation

The existing early, compact Simply Complex Community Pulse slot accepts the active component when the server-only `HYPEKNIGHT_COMMUNITY_PULSE_ENABLED` is exactly `1`. Unset is disabled. Loading, no question, unavailable, sign-in, saved choice, revision conflict, closed/paused and aggregate states are explicit. The default disabled preview and sandbox remain unchanged. No itinerary or homepage redesign is included.

A trusted RPC selects one explicitly chosen question per scope, using the canonical active market/area registry. Exact area takes precedence over market, then platform. An unknown city falls back to platform. Location sets editorial context, not proof of residence. Unpublished, archived, future and guest-enabled questions cannot reach this adapter. Paused and closed questions remain readable with collection stopped. Selection and publication are separate audited actions.

The private POST requires exact same Origin, JSON content type and a 2 KiB actual stream limit. The adapter verifies the Supabase session with `getUser()` and derives the account itself. The database rechecks account existence, anonymous/deleted/banned state and question eligibility. Client actor, verification and guest identifiers are ignored. A durable transactionally updated per-account budget permits 20 attempts per fixed minute across all questions, including invalid options, conflicts and retries. This is an account abuse control, not a proof of personhood or defense against distributed accounts. Existing authentication infrastructure and ingress protection remain relevant.

Each question/account retains one effective response. Operation UUIDs survive ambiguous failures while the card is mounted. Retrying uses the identical choice and expected revision. Refresh reads authoritative own-state instead of replaying a stored browser operation. Changes use compare-and-set revision, replace the effective choice, and allow at most six accepted revisions, including the first response. Separate concurrent requests cannot create extra effective responses. The notice and explicit consent checkbox precede collection. Participant state is never placed in the public homepage snapshot and all HTTP endpoints are private/no-store.

## Editorial operations and privacy

`/admin/community-pulse` uses the existing administrator guard. Each server action guards independently and uses the caller session. Private database functions recheck current authority and eligible account state. Draft form supports two to six single-choice options, a platform/market/verified-area scope and an explicit UTC window of at most 30 days. Published wording, IDs, scope and window stay fixed. Draft corrections use archive and replacement. Successor-version creation remains an existing P3-A database contract and is not exposed as an ambiguous edit in this initial UI.

The editor supports scheduling, opening, pause/resume, confirmed permanent closure, archive/takedown, homepage selection, safe recent action/time audit summaries and explicit expiry/retention runs. It lists the newest 100 questions and reports the complete editorial inventory count. There is no raw-response browser or public participant search.

Public results use P3-A's one-time frozen whole-question cohort after closure. No live running totals, arbitrary periods, city slices or overlapping cohort endpoint is introduced. Zero through four effective responses have the same insufficient result and no counts, percentages or reconstructable total. Five or more require a complete internally consistent option sample before percentages display. This is the public community contract, independent of the existing event organizer option-level safeguards. Results describe voluntary respondents and never imply population preference, attendance or measured demand. Editorial review must still consider overlapping questions and side information.

The additive migration creates only private RLS-protected homepage-selection and request-budget tables. Every new function has an explicit empty search path and explicit role privileges. Public user roles have no direct private table access. Homepage selection and collection RPCs are service-role-only. Editorial invoker wrappers dispatch to private definer functions with current database authorization. Service keys never reach client components.

## Operational dependencies and activation order

1. Review P3-B and validate on disposable resources. Complete a representative authenticated staging/browser smoke test before public activation. Preserve PR #5 and existing worktrees.
2. Approve and apply the P3-A migration first, followed by this P3-B migration, to the confirmed Hypeknight Supabase project. Neither is automatically applied by this branch or Render build.
3. Deploy the reviewed application with the flag off. Recheck exact GitHub/Render SHA and database permissions/advisors. The application already requires its server-only Supabase service credential.
4. Enable the flag only for approved staging first. Test authorized editor and ordinary account, cross-origin rejection, retry, revision, own-state and suppression.
5. Before public enablement, assign an editor to run expiry/retention at least daily. The confirmed bounded maintenance action closes at most 50 expired questions and purges at most 50 sealed raw samples older than 90 days per run. Repeat batches as needed. Counters older than two hours are removed globally on maintenance and opportunistically for an active account. An unattended scheduler is a separate operational dependency, not silently created here.
6. Document private erasure/moderation request handling and audit retention. P3-A's known-ID moderation path can exclude responses before sealing. A full subject erasure workflow is still absent. Review whether this operational gap permits a limited launch. Do not advertise anonymity.
7. Approve activation, enable the server flag in production, create/review one signed-in question, publish it, explicitly select it for the homepage and perform a read-only production smoke test. Do not create fake production responses. Empty/unavailable states remain truthful if backend prerequisites fail.

Turning the flag off disables the new app collector and restores the preview. Pause a question to stop collection while keeping the question readable. Archive to withdraw public reading. Previously retrieved aggregates cannot be recalled. None of these controls change event-specific Patron Pulse.

## Verification commands

- `node --test tests/*.test.cjs`, `npm run typecheck`, `git diff --check`, `npm run build`.
- `NODE_PATH=<temporary tools>/node_modules node tests/community-pulse-home-db.cjs` runs P3-A plus P3-B SQL checks on PGlite. Set `COMMUNITY_PULSE_TEST_DATABASE_URL` to a fresh loopback PostgreSQL database to additionally race independent request-budget sessions. The original `tests/community-pulse-db.cjs` native mode independently races first effective responses.
- `tests/community-pulse-transport.cjs` is opt-in and requires empty disposable local Supabase, local URL/database URL and local anon/service keys via `COMMUNITY_PULSE_LOCAL_*` environment variables. It rejects non-loopback resources before touching the database. It creates its own profiles/market fixture, applies both migrations and creates ephemeral test accounts through real local Auth. It tests PostgREST role grants and starts Next on loopback 3234 to verify real cookie sessions, origin rejection, own state, retries, concurrent revisions, frozen aggregation and admin page guards. It never accepts a linked project.
- Run Supabase security advisors against that disposable database and inspect only application findings. Use representative staging for responsive browser checks before activation. Fixture rendering does not prove production administrator authorization.

## Next checkpoint

Approve the signed-in release only after the listed integration and operational gates. Governed guest participation needs its own reviewed challenge, trusted ingress, keyed scoped abuse bucket, secure cookie adapter and failure/rate-limit acceptance tests. It can follow without rewriting the public community question or event-specific Patron Pulse contracts.
