# BM1 production and event transition checkpoint — 2026-10-08

## Recovered state

Production Render service HKV2 is live at b208de6661347957d5ca0bec6a6e5a6327ac79f4, matching GitHub origin/main and the existing Codespace HEAD. Auto-deploy is disabled following a historical rollback; it was left unchanged. Supabase is healthy and migrations 0001–0028 are recorded. No deliberate production entity/authority/schema mutation, merge, deployment or environment change was performed. Ordinary navigation may emit existing view/click telemetry.

The original /workspaces/HKV2 remains on feature/bm1-security-maintenance. Its unfinished package.json/package-lock.json upgrades (Next 15.5.27, Nodemailer 10.0.16, PostCSS 8.5.29 and override) are preserved, excluded from this change. This work uses /workspaces/HKV2-event-transition-security, branch feature/bm1-event-transition-security, based on origin/main. Generated supabase/.temp/ and tsconfig.tsbuildinfo are never staged.

## P1-C production smoke evidence

| Check | Observed result / limit |
| --- | --- |
| Seven Command Center tabs | Aura Overview, Profile, Events, Presence, Analytics, Management, Intelligence load for administrator Tre. |
| Manager authority | Tre has an active Aura owner-manager relationship, but also administrator authority. A distinct non-admin active manager session still requires runtime testing. The 49 focused P1-C tests pass. |
| Non-manager denial | HK Sales receives no protected venue content; direct Command Center request produces a generic server exception. Secure denial, poor error UX remains. |
| Administrator override | Tre can open unclaimed Velvet Signal without a manager relationship. |
| Manager lifecycle | Controls and explicit confirmation checkboxes render. No grant, revoke or delegation was submitted. |
| Authority fallback | Existing focused tests/source inspection cover venue_managers authority and owner_id compatibility-only behavior. |
| Event Builder | Canonical chooser retains Aura venue_id across creation/source paths. No event created. |
| Claims / corrections | Claim history and admin review queue load; material identity/location corrections require review. No claim/correction submitted. |
| Presence | Workflow navigation loads; no session or check-in created. Expired April check-in appears under Active Check-ins: P2-A presentation/evidence gap. |
| Analytics / Intelligence | Analytics labels record counts; Intelligence explicitly unavailable pending signal alignment. Counts are not unique guests or verified attendance. |
| Public / hidden entities | Public homepage and external event page load. All four intentionally hidden test venues remain is_visible=false; listing empty and hidden detail returns 404. Canonical approved test event loads under admin and an unauthenticated HTTP GET returns 200 with its title and without Admin View. |
| Session persistence | Authenticated session survives all tested navigation. |

Read-only smoke tests cannot establish every mutation path. Production manager lifecycle mutations were intentionally not exercised. Discovery AI's unpaid account is a known expected limitation and is not a gate blocker.

## Confirmed security finding

The live SECURITY DEFINER transition_event_status(uuid,text,uuid,text,text,text,text,jsonb,jsonb) is executable by PUBLIC/anon/authenticated/service_role and trusts p_changed_by rather than binding it to auth.uid(). A caller can supply a genuine owner/admin ID. Its live body does not enforce the owner transition matrix. Existing permissive owner event RLS also allows direct approval/payment/lifecycle escalation and deletion of published records.

Events, event_status_history, event_revisions and profiles all have RLS enabled. History INSERT RLS binds changed_by to auth.uid(), but factual transition/history matching is a separate evidence-quality gap for P2-A. No exploit was invoked in production. Anonymous spoofing was reproduced only in an isolated synthetic PostgreSQL fixture, then rolled back.

## Narrow correction

- One new migration binds RPC actor IDs to authenticated identity, restricts owner provenance and removes anonymous execution. Trusted service/maintenance contexts remain supported.
- An event row trigger closes direct owner write escalation, preserves administrator/payment fields and ownership, enforces existing owner lifecycle transitions and reasons, and limits owner deletion to drafts/building/rejected records.
- Owner submit/resume actions stop clearing hidden_by_admin. Valid hidden-event cancellation remains hidden.
- Existing live RPC body, return type and atomic history insertion are preserved by an audited anchor patch. Existing applied migrations are untouched. No event data rewrite or new payment approval requirement.

Live RPC preflight: md5(pg_get_functiondef(...)) = eb0e3f3269cc9c9276cbcedd7cbbe862; expected BEGIN/event-id anchor position 567. Re-read definition and ACL before deployment; any drift requires review. The migration fails if the anchor is absent or its guard already exists.

## Validation

- git diff --check: pass.
- TypeScript npx tsc --noEmit: pass.
- Venue authority/product completion/Command Center: 49 tests pass.
- Isolated PostgreSQL 17: baseline exploit reproduced and rolled back, migration rollback checked, 40 authority/lifecycle assertions pass, including admin/service DELETE semantics.
- Next 15.5.15 production build: pass, all 100 static pages generated, using verified live public Supabase URL/anon configuration and production site URL. No service/Stripe/AI secrets were copied or invented. Build-time success does not validate dynamic third-party integrations.

The SQL fixture reproduces the audited authority/RLS/RPC behavior but is not a full production database clone; unrelated constraints/triggers are omitted. Staging compatibility and the remaining non-admin manager runtime test are release limitations.

## Controlled deployment gate

This is a feature-branch review checkpoint, not a production fix yet. Review the exact migration, action diff and tests. Confirm the production RPC preflight/ACL has not drifted and validate the migration in a representative non-production schema where available. Obtain explicit release approval before applying the new migration or triggering Render. Apply the reviewed migration transactionally, verify migration history/function ACL/guard and ownership controls, then merge only this scoped change and manually deploy its exact merge commit with Render auto-deploy left disabled. Perform read-only public/auth/session/Command Center smoke checks and report exact deployed commit. Do not test destructive exploit writes against production.

P2-A may proceed as read-only evidence auditing while the release gate is pending. Broad P2-B instrumentation/dashboard changes remain blocked until the canonical matrix and implementation plan are reviewed.
