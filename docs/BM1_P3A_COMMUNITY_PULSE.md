# BM1 P3-A · Public Community Pulse foundation

Base commit `0706ad68da25bf13909089ecc6499040ed7f2f12`. This is an independent, single-choice question system. The homepage continues to show its disabled question preview. There is no public route, server action, seed question, polling job, or production migration in this checkpoint. Existing event Patron Pulse tables, Presence checks, guest limits and reporting permissions are untouched.

## Editorial lifecycle and scope

- An eligible HypeKnight administrator creates a question with two to six distinct choices, a prompt, optional description, and an opening and closing window of up to 30 days. Publishing requires a separate action. The question has no event, venue or organizer foreign key.
- A question is platform-wide or belongs to an active or supported registry market. An optional city and state must match an active linked registry area. The scope describes the question and its reporting cohort. It does not establish a participant's location or residence.
- Questions start in draft. An editor can schedule a future question or explicitly open it inside its window. A scheduled question becomes readable and eligible for responses at its opening instant. Expiry stops new responses even if the stored lifecycle still says scheduled or open.
- Pausing stops collection. An editor can resume inside the original window, close at or after opening, cancel a scheduled or paused question before opening by archiving it, or archive a draft or closed question. Closing early seals the shorter collection period. Closed and archived questions cannot reopen.
- Prompt, options, scope and window are immutable after creation. For a draft correction, archive the draft and create a replacement. A published successor has a new question and option IDs, a higher version, the same scope, and a nonoverlapping collection window. Old response IDs never migrate. The database allows one successor per question.
- Creator and lifecycle/moderation events are recorded privately. An administrator can void a response before sealing. Voids are permanent and are excluded from effective totals. A deliberately limited moderator RPC takes a known private response ID. A separate operational workflow must determine how moderators safely identify responses without a public or routine raw-response browser.

## Participation and trust

- The server uses the normal Supabase session and verifies `getUser()`. The database also rejects missing, banned, soft-deleted and Supabase anonymous accounts for account participation. A browser cannot declare verification or send an account or participant identifier as part of the accepted response input.
- Guests are disabled per question by default. The server-side grant function mints a cryptographically random token; the database stores only its digest. It accepts an opaque, question-scoped abuse bucket derived by a trusted server adapter after a verified, single-use anti-abuse challenge. P3-B must implement and review that adapter, including trusted ingress, a rotating keyed bucket, provider failure behavior and independent route rate limits. Never accept a bucket, challenge verdict or participant ID from browser input.
- A guest token is a bearer capability for one question. The future adapter must use a question-specific Secure, HttpOnly, SameSite cookie, reuse a valid existing grant, and cap its lifetime at the question window. Keep raw cookies and digests out of logs and client data. The database allows at most three grants per question and bucket in a rolling hour. A forged or copied arbitrary browser ID does not create a grant. Guests do not need Presence or a QR scan.
- The write transaction locks the question and uses one effective row per question and account or guest grant. Operation UUIDs are scoped to that participant and question. Reusing an accepted operation with the same choice and expected revision returns the original receipt. Reusing it with a different payload conflicts. A new operation must carry the current revision and the accepted notice version. A changed answer replaces the choice on the same effective row. Same-choice operations preserve the revision. Each participant gets at most six effective revisions, including the initial answer, and 12 accepted operation IDs per question. A changed choice requires ten seconds since the preceding change.
- When the same guest cookie is present, a prior guest response blocks a duplicate signed-in response. An account response can bind a known unused guest grant so signing out cannot use it to vote again. There is no general way to match cookie resets, multiple accounts, shared devices or distinct browsers to a person. Guest participation is limited and voluntary. It does not guarantee one human per vote, perfect uniqueness, or anonymity.
- Participant state returns only the caller's choice and revision after the same trusted identity resolution. Mark it private and non-cacheable in P3-B. A valid guest bearer can read its own response through the adapter. The cookie is neither a device identifier nor a proof of identity. The notice is required before the first response and on revisions. No free-form answers or demographic inputs are provided. Editors must avoid sensitive prompts.

## Public aggregate

The sole public result is a frozen snapshot for a closed question, built in the same transaction as closure from all effective rows. It includes question/version/scope, fixed collection period and seal time. There are no live tallies, alternate date filters, per-city or participant-type slices, previous snapshots, or public administrative overrides. Publication and participant-state reads are separate. The server adapter must continue to keep the public payload independent of caller identity and must handle archival/cache invalidation.

| State | Meaning |
| --- | --- |
| Pending | The editor has not sealed a result. No counts or option percentages are available. |
| Zero, private only | The sealed cohort has zero effective responses. The public envelope is identical to the one for 1–4. |
| Insufficient | Public response for any complete cohort below five. No total, option counts, percentages or hints that distinguish 0–4. |
| Available | Complete cohort of five or more. Every option has a count and percentage over the same denominator, rounded independently to two decimal places. |
| Incomplete | A closed snapshot is missing or inconsistent. No partial values are returned. |
| Unavailable | A fetch or dependency failed. The service reports failure without a numeric payload. |

An exact public sample of five or more may still permit inference when someone has outside information or knows some answers. A fixed, one-time cohort limits repeated-query and geographic differencing. It cannot prevent inference across editorially similar questions, coordinated submissions, or published material stored elsewhere. Review question overlap and the public release policy before activation. These are voluntary responses. They do not measure population preference, attendance or market demand.

Raw response, grant and operation records can be purged by an authorized administrator after 90 days from sealing. Frozen aggregates are unchanged by that purge. Audit records are retained separately and exclude the choice. P3-B needs retention enforcement for questions that expire without being sealed, private request handling for deletion, an audit retention policy, and a deliberate archive/takedown process. Where erasure is needed before closure, private moderation can exclude the response, but this foundation does not implement a full subject-erasure workflow.

## Database privileges

All seven new tables are in a non-exposed schema, have RLS enabled, and have no direct grants to anon, authenticated, or service role. Four public invoker wrappers dispatch editorial actions to private definer functions that recheck current profile authority and account eligibility. The four application RPCs are service-role-only, with explicit grants and an empty search path. The existing server-only Supabase admin client is the transport. A service credential must never reach the browser. Keep RPC inputs limited to the server adapter and do not connect generic service-role proxies. Auth, profiles, market registry and the existing `bm1_private.is_admin()` function are prerequisites.

## Validation

- `node --test tests/*.test.cjs`, `npm run typecheck`, `git diff --check`, and `npm run build`.
- `tests/community-pulse-db.cjs` creates prerequisite fixtures and applies the migration in an empty disposable database. With a temporary installation of `@electric-sql/pglite`, set `NODE_PATH` to its dependency directory and run `node tests/community-pulse-db.cjs`. This runs real PostgreSQL SQL and catalog privilege checks in a single session.
- For an independent-session race, install `pg` in a temporary directory, set `NODE_PATH` and point `COMMUNITY_PULSE_TEST_DATABASE_URL` to an empty loopback PostgreSQL database. Never target a linked or production project. This mode opens separate connections and races two first submissions for the same participant. The fixture checks the database is empty before creating prerequisite roles and tables.
- Full Supabase stack and Data API checks should be repeated against disposable development before activation. Verify exposed schemas, security advisors, admin and user JWT behavior, challenge and rate limits, and availability states with the actual PostgREST transport. No production migration is authorized here.

## P3-B connection

Keep the existing compact panel near the top of Simply Complex Home. Replace only its preview controls once a reviewed server route chooses an approved question ID, passes a trusted identity and notice acceptance, handles retries and revisions, and renders the closed aggregate states. Add a separate admin editor with publication, closing and audit controls. Limit public output to the selected scope and do not move event discovery down the mobile page unnecessarily.
