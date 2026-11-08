# BM1 P3-B Community Pulse activation candidate

## Baseline and boundary

Based on GitHub main `31e3e1aef0657a30f58b30b90eae1a7cedf04b07` (P3-A merged). Branch `feature/bm1-public-community-pulse-p3b`. This candidate prepares signed-in homepage responses and a separate administrator editor. Production remains the disabled preview until an approved database and application release. Event Patron Pulse, Presence QR, native/external discovery and commerce are unchanged.

Guest collection remains deferred. No guest grant route, arbitrary browser identity, challenge bypass or public table write is introduced. A signed-in first release avoids making unverified guest uniqueness promises. The existing P3-A guest foundation remains available only to its privileged server contract.

## Homepage and participation

The existing early, compact Simply Complex Community Pulse slot accepts the active component when the server-only `HYPEKNIGHT_COMMUNITY_PULSE_ENABLED` is exactly `1`. Unset is disabled. Loading, no question, unavailable, sign-in, saved choice, revision conflict, closed/paused and aggregate states are explicit. The default disabled preview and sandbox remain unchanged. No itinerary or homepage redesign is included.

A trusted RPC selects one explicitly chosen question per scope, using the canonical active market/area registry. Exact area takes precedence over market, then platform. An unknown city falls back to platform. Location sets editorial context, not proof of residence. Unpublished, archived, future and guest-enabled questions cannot reach this adapter. Paused and closed questions remain readable with collection stopped. Selection and publication are separate audited actions.

The private POST requires exact same Origin, JSON content type and a 2 KiB actual stream limit. The adapter verifies the Supabase session with `getUser()` and derives the account itself. The database rechecks account existence, anonymous/deleted/banned state and question eligibility. Client actor, verification and guest identifiers are ignored. A durable transactionally updated per-account budget permits 20 attempts per fixed minute across all questions, including invalid options, conflicts and retries. This is an account abuse control, not a proof of personhood or defense against distributed accounts. Existing authentication infrastructure and ingress protection remain relevant.

Each question/account retains one effective response. Operation UUIDs survive ambiguous failures while the card is mounted. Retrying uses the identical choice and expected revision. Refresh reads authoritative own-state instead of replaying a stored browser operation. Changes use compare-and-set revision, replace the effective choice, and allow at most six accepted revisions, including the first response. The P3-A ten-second change cooldown and 12 accepted-operation cap also remain enforced. Separate concurrent requests cannot create extra effective responses. The notice and explicit consent checkbox precede collection. Participant state is never placed in the public homepage snapshot and all HTTP endpoints are private/no-store.

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

## Review evidence — November 8, 2026

| Check | Result |
| --- | --- |
| GitHub main and Render Live | Both `31e3e1aef0657a30f58b30b90eae1a7cedf04b07`; Render live deployment `dep-dbo9q095efls73d8ost0` |
| Protected draft PR #5 | Unchanged at `8761f254c0b98309f2f84fd127aa9f20d7234de4` |
| Production Supabase | Hypeknight `eyolwkeprivhazeeyjoz`, healthy; read-only catalog check confirms P3-A schema and P3-B home RPC absent |
| Full application suite | 324 passing, including existing event Patron Pulse and discovery/commerce regressions |
| TypeScript and diff checks | Pass |
| Optimized production-mode build | Pass with activation flag unset and with `1`; deployed public URLs and placeholder build credentials, without production data writes |
| PGlite SQL checks | Pass P3-A and P3-B lifecycle, identity, scope precedence/ambiguity, role grants, thresholds, suppression, retention and rate budgets |
| Native PostgreSQL 17 | Pass P3-A/P3-B SQL checks and independent-session account-budget race |
| Real disposable Supabase Auth/PostgREST + Next HTTP | Pass genuine local user JWTs, private cookie-derived identity, denied direct collector access, spoof rejection, duplicate replay, concurrent revisions, six-response frozen total, private own state, and authorized/unauthorized admin page handling |
| Supabase security advisors | No WARN or ERROR; 11 INFO `rls_enabled_no_policy` findings reflect nine deliberately deny-direct-access private tables plus two deny-access registry fixtures |
| Public responsive browser inspection | Pass on disposable published-question fixture at 320, 390, 768 and 1280 pixels; long text wraps without horizontal overflow |
| Authenticated browser and representative staging acceptance | Pending; fixture read/API/SSR checks do not establish production administrator or signed-in browser acceptance |
| Production changes | No schema application, voting enablement, question publication, merge or deployment |

The transport test respects the existing ten-second revision cooldown. It also checks Next's streamed redirect response for denied members and asserts protected question/editor content is absent, rather than assuming every redirect uses an HTTP 307 before streaming begins. Registry ambiguity falls back to the platform question instead of selecting an arbitrary market.

Recommendation: draft review is appropriate. Public activation still depends on the staging/browser, approved migration/release and editorial/retention/erasure operations described above. No guest launch is claimed.

## Continued development — public browser review

The private Codespace review was restored from its disposable Supabase backup. The actual homepage fetched a published local community question through the trusted service and loaded the anonymous participant state through the real HTTP route. No production data, credential or permission was used. The rest of this minimal fixture intentionally lacks discovery/settings tables, so their truthful Unavailable states and corresponding development-console diagnostics are expected; this is not a complete production-data staging environment.

Public browser inspection covered 320, 390, 768 and 1280 pixel iframe widths. After hydration, document scroll width equaled client width at each size. The 390-pixel review measured a roughly 584-pixel panel before correction and 505 pixels after correction with the same question and description, with results collapsed. The question now uses scoped compact typography, version information sits inside results details, and the choice preview uses two columns. Long unbroken prompt, description and 80-character option text wraps without horizontal overflow at the narrowest 320-pixel review.

The pending-results disclosure was opened in the real browser and correctly withheld counts and percentages while explaining that results follow editorial closure. The sign-in CTA retained `/#community-pulse` as its return destination. These checks establish the public layout and anonymous read flow. They do not establish an authorized administrator browser session, a signed-in browser submission or full staging acceptance. Those gates remain open and require an authorized staging sign-in. No authentication guard was weakened or bypassed.

`tests/community-pulse-browser-fixture.cjs` makes this public review repeatable against an already validated local transport fixture. It rejects hosted resources, checks that every existing profile belongs to the disposable fixture, creates a short-lived local editorial session internally and never prints credentials. It publishes an explicitly labeled development question, then starts Next with only local Supabase resources, the activation flag on and homepage telemetry off. `COMMUNITY_PULSE_REVIEW_SITE` must be the private Codespace HTTPS origin. Use `COMMUNITY_PULSE_REVIEW_REUSE_SERVER=1` to refresh the question without starting another server and `COMMUNITY_PULSE_REVIEW_STRESS_TEXT=1` for wrapping checks. It does not provide browser sign-in or production authority.

Application verification after the layout correction: all 324 tests, TypeScript, diff checks and the optimized build with activation enabled pass. SQL, permissions, collection trust and business rules are unchanged by this continuation. Production voting remains disabled, and PR #22 remains a draft.
