# BM1 E2B — Venue Claims and RLS Authority Alignment

Baseline: 8bd4c061fd4fe384553c914a34af200fc11d5409, feature/bm1-alignment-october.
Production catalog read-only preflight: Hypeknight eyolwkeprivhazeeyjoz, 2026-10-06. No production mutation.

## Findings and decisions

| Finding | Classification | Decision |
| --- | --- | --- |
| 28 owner_id/venue_owner_id/global-role venue policies | CHANGE | Replace permissive duplicates with active relationship authority, not a fallback. Preserve independent event ownership. |
| Administrator policies and active visible public venue/settings reads | KEEP | Public identity does not depend on claim, verification, subscription or payment. |
| Foundation grants revoked from authenticated | CHANGE | Own claim/correction submission and reads; admin review and manager lifecycle only. Locations remain private. |
| profiles own-row policy permits app_role escalation | BLOCKER → CHANGE | Invoker role-protection trigger prevents self-assigned admin; service/admin provisioning retained. This is the authority root. |
| ALL grants include TRUNCATE, unprotected by RLS | BLOCKER → CHANGE | Revoke unnecessary destructive grants and anonymous writes. |
| Generic venue update exposes canonical identity/location/status/verification | CHANGE | Ordinary fields only; material proposals go to venue_corrections for review. |
| No venue_claims application paths | CHANGE | Add venue-specific submit/list and admin review; atomic approval establishes manager, rejection retains venue. |
| venue_owner_requests approval globally promotes role, not a venue claim | RETIRE | Freeze new global requests/promotions; keep historical records and navigation to replacement workflow. |
| Manager writes only 0026 backfill and two legacy creators | CHANGE | Admin-only lifecycle updates plus atomic claim/creation triggers; manager identity immutable; no manager delegation. |
| Service-role connection decisions | KEEP | Auth.getUser and requested venue helper authorize before writes; decline only disconnects event. |
| Service-role event builder connection writes | KEEP / BLOCKER | Caller owns/authenticates event; target management only auto-approves via helper. First-address-match ambiguity remains E2C; never use claim evidence to merge identity. |
| Private manager lookups/location hints and managed lists | KEEP | Server-only and scoped to authenticated user's active venue IDs. |
| Venue checkout user-client writes | CHANGE | Draft configuration and pending checkout only; no user settlement/activation. |
| Success reconciliation can authorize URL venue but mutate Stripe metadata venue | BLOCKER → CHANGE | Match session metadata to requested venue and authorize actual venue before privileged writes. |
| Stripe venue settlement activates venue identity | RETIRE | Settlement changes subscription only. Signed webhooks remain system-authorized; payment never grants venue authority or visibility. |
| Presence service/credential library | KEEP / BLOCKER | Existing participant calls bind server cookies/auth or validated credentials; no venue credential creation caller. Library is not a general authorization boundary; E2C should constrain future venue entry points. |
| Legacy venue presence checkin self-insert lacks session evidence | BLOCKER → CHANGE | Remove direct self-insert policy; route session-code admission through authenticated database RPC with exact venue/session/expiry checks. |
| Music DJ moderation differs from old RLS | CHANGE | Active assignment grants music moderation only. |
| Legacy draft subscription pricing and feature/allowance configuration | BLOCKER | Retain legitimate draft configuration only; authoritative pricing/allowances require E2C commerce redesign. No paid or active entitlement writes by managers. |
| Legacy billing event names mismatch constraint | BLOCKER | Existing admin refund/settlement accounting mismatch is E2C commerce scope, not hidden with permissive writes. |

## Claims before / after

Before: no venue-specific UI, foundation tables inaccessible, old workflow only promoted a global role. No atomic review/manager transition.
After: submit a pending claim against an existing venue ID with session-derived claimant. Duplicate pending claims are rejected. Admin review is one user-client UPDATE; triggers serialize on the venue, bind reviewer, keep claim evidence immutable, and atomically establish an active manager on approval. Approval does not alter verification_state, owner_id, location, identity, public state, or other manager history. Rejection touches claim/review state only. Manager suspension/removal recomputes claim_state without revoking other managers. Existing disputed state needs explicit admin resolution. No hard deletion client path is granted.

Legacy creation uses a server-generated UUID and a non-returning user-client INSERT: INSERT RETURNING evaluates SELECT policy before the AFTER trigger, so no owner-based read exception is introduced. The next read resolves the newly committed manager relationship. The database inserts the authenticated manager in the venue transaction, replacing the two-operation service write. Creation role remains a compatibility gate, not existing-venue authority. Corrections are review proposals; accepting one does not automatically apply identity/location changes.

## Production policy inventory

| Table | Policy | Command | Classification |
| --- | --- | --- | --- |
| venue_owner_requests | admins can update all venue owner requests | UPDATE | RETIRE |
| venue_owner_requests | admins can view all venue owner requests | SELECT | KEEP |
| venue_owner_requests | users can insert own venue owner requests | INSERT | RETIRE |
| venue_owner_requests | users can view own venue owner requests | SELECT | KEEP |
| venue_billing_events | admins can manage all venue billing events | ALL | KEEP |
| venue_billing_events | owners can view own venue billing events | SELECT | CHANGE |
| venue_hours | admins can manage all venue hours | ALL | KEEP |
| venue_hours | owners can manage own venue hours | ALL | CHANGE |
| venue_hours | public can view hours for public venues | SELECT | KEEP |
| venue_feature_profiles | admins can manage all venue feature profiles | ALL | KEEP |
| venue_feature_profiles | owners can manage own venue feature profiles | ALL | CHANGE |
| venue_feature_profiles | public can view features for public venues | SELECT | KEEP |
| venue_subscription_usage | admins can manage all venue subscription usage | ALL | KEEP |
| venue_subscription_usage | owners can insert own venue subscription usage | INSERT | CHANGE |
| venue_subscription_usage | owners can update own venue subscription usage | UPDATE | CHANGE |
| venue_subscription_usage | owners can view own venue subscription usage | SELECT | CHANGE |
| venue_plan_definitions | admins can manage venue plan definitions | ALL | KEEP |
| venue_plan_definitions | public can view active venue plans | SELECT | KEEP |
| venue_subscription_features | admins can manage all venue subscription features | ALL | KEEP |
| venue_subscription_features | owners can insert own venue subscription features | INSERT | CHANGE |
| venue_subscription_features | owners can update own venue subscription features | UPDATE | CHANGE |
| venue_subscription_features | owners can view own venue subscription features | SELECT | CHANGE |
| venue_music_request_flags | admins can manage all music request flags | ALL | KEEP |
| venue_music_request_flags | authenticated users can flag music requests | INSERT | KEEP |
| venue_music_request_flags | owners can view music request flags for own venues | SELECT | CHANGE |
| venue_music_request_flags | users can remove own music request flags | DELETE | KEEP |
| venue_interaction_settings | admins can manage all interaction settings | ALL | KEEP |
| venue_interaction_settings | owners can manage own interaction settings | ALL | CHANGE |
| venue_interaction_settings | public can view interaction settings for public venues | SELECT | KEEP |
| venue_comments | admins can manage all venue comments | ALL | KEEP |
| venue_comments | authenticated users can add venue comments | INSERT | KEEP |
| venue_comments | public can view live venue comments | SELECT | KEEP |
| venue_comments | users can delete own venue comments | DELETE | KEEP |
| venue_comments | users can update own venue comments | UPDATE | KEEP |
| venue_comments | venue owners can manage comments for own venues | ALL | CHANGE |
| venue_comment_flags | admins can manage all comment flags | ALL | KEEP |
| venue_comment_flags | authenticated users can flag venue comments | INSERT | KEEP |
| venue_comment_flags | users can remove own comment flags | DELETE | KEEP |
| venue_comment_flags | venue owners can view flags for own venues | SELECT | CHANGE |
| venue_music_requests | admins can manage all venue music requests | ALL | KEEP |
| venue_music_requests | authenticated users can add venue music requests | INSERT | KEEP |
| venue_music_requests | public can view venue music requests | SELECT | KEEP |
| venue_music_requests | users can delete own venue music requests | DELETE | KEEP |
| venue_music_requests | users can update own venue music requests | UPDATE | KEEP |
| venue_music_requests | venue owners can manage music requests for own venues | ALL | CHANGE |
| venue_music_request_votes | admins can manage all music request votes | ALL | KEEP |
| venue_music_request_votes | authenticated users can vote on music requests | INSERT | KEEP |
| venue_music_request_votes | owners can view votes for own venue requests | SELECT | CHANGE |
| venue_music_request_votes | users can delete own music request votes | DELETE | KEEP |
| venue_music_request_votes | users can update own music request votes | UPDATE | KEEP |
| venue_presence_sessions | admins can manage all venue presence sessions | ALL | KEEP |
| venue_presence_sessions | owners can manage own venue presence sessions | ALL | CHANGE |
| venue_dj_assignments | admins can manage all dj assignments | ALL | KEEP |
| venue_dj_assignments | djs can view own assignments | SELECT | KEEP |
| venue_dj_assignments | venue owners can view assignments for own venues | SELECT | CHANGE |
| venue_subscriptions | admins can manage all venue subscriptions | ALL | KEEP |
| venue_subscriptions | owners can insert own venue subscriptions | INSERT | CHANGE |
| venue_subscriptions | owners can update own venue subscriptions | UPDATE | CHANGE |
| venue_subscriptions | owners can view own venue subscriptions | SELECT | CHANGE |
| venue_system_entitlements | Admins manage venue_system_entitlements | ALL | KEEP |
| venue_event_connection_requests | venue_connection_request_read | SELECT | CHANGE |
| venue_presence_checkins | admins can manage all venue presence checkins | ALL | KEEP |
| venue_presence_checkins | authenticated users can create own presence checkins | INSERT | KEEP |
| venue_presence_checkins | owners can view presence checkins for own venues | SELECT | CHANGE |
| venue_presence_checkins | users can view own presence checkins | SELECT | KEEP |
| venues | admins can manage all venues | ALL | KEEP |
| venues | owners can update own venues | UPDATE | CHANGE |
| venues | owners can view own venues | SELECT | CHANGE |
| venues | public can view active visible venues | SELECT | KEEP |
| venues | published venues are public | SELECT | CHANGE |
| venues | venue owners and admins create venues | INSERT | CHANGE |
| venues | venue owners and admins update owned venues | UPDATE | CHANGE |
| venues | venue owners can insert own venues | INSERT | CHANGE |

## Functions and triggers

All installed venue triggers were inspected. Timestamp and market-assignment triggers are KEEP; market RPCs explicitly require database admin. Venue vote/flag recount and expiration functions are SECURITY INVOKER with no legacy ownership predicate (KEEP; participation hardening remains E2C). current_role reads database profiles (KEEP after profile-role protection). No deployed venue claim or manager workflow function exists. Event owner functions remain independent; publicly callable event transition actor parameters require a separate security review (BLOCKER outside venue patch).

## Validation

- node --test tests/venue-authority.test.cjs: 27 passed, including claim actor/reviewer binding, ordinary vs material edits and privileged checkout scope.
- python3 tests/venue-rls.test.py: 48 isolated PostgreSQL 17 authority/claim/presence assertions passed; migration transaction apply/rollback restores the original schema/policy, then committed apply is tested with synthetic data rolled back.
- npx tsc --noEmit and git diff --check: passed.
- npm run build: compilation and type/lint stages passed; page-data collection fails on existing /admin/ambassadors because NEXT_PUBLIC_SUPABASE_URL is absent in the Codespace. No production secrets were loaded to bypass this.
- Fixture reproduces production columns, non-FK constraints and policies from read-only metadata. It omits unrelated foreign keys and market/timestamp/recount triggers; shared presence tables use minimal grant-test stubs. This is focused database coverage, not a full restored production-clone integration test.

Migration 0028 is prepared after 0027, never applied to production. Apply the reviewed migration before deploying this application checkpoint: new claim policies/RPC and atomic creation require 0028. Verify it on a full staging clone before production rollout. No applied migrations are changed, and no merge, push or deployment is performed.


## Additional catalog dependencies

Shared presence_participants and presence_verifications have no client grants/policies (KEEP private). presence_credentials has no policies but inherited ALL grants, including TRUNCATE (BLOCKER → CHANGE: revoke client grants). All audited venue/foundation/presence tables have RLS enabled. Production has zero pending venue claims, so the partial unique index has no duplicate cleanup dependency.

| Function | Classification | Authority |
| --- | --- | --- |
| patron_pulse_current_actor_role | KEEP | Independent event owner role |
| get_owned_event_signal_summary | KEEP | Independent event owner |
| get_featured_inventory_for_event | KEEP | Independent event owner |
| reserve_featured_inventory | KEEP | Independent event owner |
| create_featured_draft_order | KEEP | Independent event owner |
| get_my_entertainment_profile_v1 | KEEP | Own event history |
| transition_event_status | BLOCKER | Public definer accepts actor parameters; separate event security review required |

Correction review/apply tooling, identity turnover resolution, fine-grained staff permissions, withdrawal/disputes and manager lifecycle audit history remain E2C scope. No venue identities or event validity fields are rewritten by claim review.

## Intended file manifest

- app/admin/actions.ts
- app/admin/venue-owner-requests/actions.ts
- app/admin/venue-owner-requests/page.tsx
- app/dashboard/venue-owner-request/actions.ts
- app/dashboard/venue-owner-request/page.tsx
- app/dashboard/venues/[id]/payment/success/page.tsx
- app/dashboard/venues/actions.ts
- app/dashboard/venues/page.tsx
- app/dashboard/venues/presence/actions.ts
- app/venues/[slug]/page.tsx
- components/admin/AdminControlShell.tsx
- lib/stripe/reconcile-venue-checkout.ts
- lib/stripe/webhook-handler.ts
- lib/supabase/admin.ts
- tests/venue-authority.test.cjs
- app/admin/venue-claims/actions.ts
- app/admin/venue-claims/page.tsx
- app/dashboard/venues/claims/actions.ts
- app/dashboard/venues/claims/page.tsx
- docs/BM1_E2B_CLAIMS_RLS_AUDIT.md
- lib/venues/claims.ts
- supabase/migrations/0028_bm1_venue_claims_rls_authority.sql
- tests/venue-rls-pre-e2b.json
- tests/venue-rls.test.py
- tests/venue-rls.test.sql
