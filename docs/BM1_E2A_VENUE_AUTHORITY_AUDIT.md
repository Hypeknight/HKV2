# E2A — Venue Management Authority audit

Inspected branch: feature/bm1-alignment-october. Baseline: 93e414a060da070edd7bfc9fa18623b0ebcc001a.

0026 backfills legacy owners into active venue_managers and restricts the new tables to service_role. 0027 only repairs physical location links. No migration changes or production database writes are part of E2A.

## Decisions

- KEEP compatibility owner_id storage, history, admin display, recipient snapshots, and independent events.owner_id authorization.
- CHANGE all runtime venue management checks and lists to active venue_managers, with a profiles.app_role administrator override. No owner_id or global venue_owner role fallback. Missing tables and unexpected query errors fail closed.
- RETIRE global venue-owner onboarding/creation assumptions and commented implementations in E2B, without rewriting them in this authority checkpoint. Existing vetted legacy creation explicitly stores a manager relationship so newly created venues remain manageable. Identity creation itself does not constitute a claim workflow.
- Existing DJ assignments remain limited to music moderation; they do not grant general venue management.
- Scoped management pages/actions retain their authenticated guard and user-client reads/writes. Do not bypass restrictive legacy RLS with broad service-role writes. Existing connection decisions already use service-role writes; they recheck venue authority first. Private manager creation and lookup use server-only code. Management-list server reads are restricted to active manager venue IDs. Public participant operations stay on the user client.

## Equivalent authority paths

The existing requireVenueAuthority/requireVenueManagement callers cover venue edits, hours, interactions, comment moderation/pinning, removal requests, presence create/close, payment/review pages, and connection decisions. Their old resolver and user-client data queries were incompatible with 0026. E2A updates those callers to the server-authenticated resolver while retaining existing user-client data queries; rejection still only disconnects an event. Read/write restrictions remain RLS dependencies.

The identity-matches endpoint also needs its private location read on the server and the deployed address_line_1 field to reach its authority hints. This preserves physical-location-first matching. The older event-builder connection function still selects the first address match; replacing that ambiguous identity selection belongs in E2B.

## Remaining dependencies / next checkpoint

Legacy creation still stores venues.owner_id; venue_event_connection_requests.venue_owner_id remains a compatibility recipient snapshot. Admin pages/types and commented code still mention owner_id. Global venue_owner role/request storage remains compatible but gives no venue-specific permission.

Database policies in tracked legacy migrations still reference owner_id. They are not rewritten here: E2A fixes application-layer authorization only. Read-only production inspection confirmed legacy policies remain installed. A direct Data API caller can still receive permissions through legacy owner policies, independently of the new application guard. E2B should review this production RLS/grants inventory, then propose any justified migration for venue-specific authority together with claim approval/revocation and creation/location workflows. No production policy change is authorized by this checkpoint.

Subscription/lifecycle and payment-activation copy in legacy venue tools still need a separate commerce/lifecycle checkpoint; E2A does not make payment a source of venue authority.

## Production read-only authority/RLS preflight — 2026-10-06

The Codespace project reference was matched to the Hypeknight project before read-only catalog queries. Result: 4 venues, 2 active manager records, 0 legacy owners without an active matching manager. Venues without a legacy owner do not require a manager relationship for their identities to exist. Manager/location/claim/correction grants are service_role-only; no policies exist on those private foundation tables.

28 currently installed venue-related policies reference owner_id or venue_owner_id:

| Table | Policy | Command |
| --- | --- | --- |
| venue_billing_events | owners can view own venue billing events | SELECT |
| venue_comment_flags | venue owners can view flags for own venues | SELECT |
| venue_comments | venue owners can manage comments for own venues | ALL |
| venue_dj_assignments | venue owners can view assignments for own venues | SELECT |
| venue_event_connection_requests | venue_connection_request_read | SELECT |
| venue_feature_profiles | owners can manage own venue feature profiles | ALL |
| venue_hours | owners can manage own venue hours | ALL |
| venue_interaction_settings | owners can manage own interaction settings | ALL |
| venue_music_request_flags | owners can view music request flags for own venues | SELECT |
| venue_music_request_votes | owners can view votes for own venue requests | SELECT |
| venue_music_requests | venue owners can manage music requests for own venues | ALL |
| venue_presence_checkins | owners can view presence checkins for own venues | SELECT |
| venue_presence_sessions | owners can manage own venue presence sessions | ALL |
| venue_subscription_features | owners can insert own venue subscription features | INSERT |
| venue_subscription_features | owners can update own venue subscription features | UPDATE |
| venue_subscription_features | owners can view own venue subscription features | SELECT |
| venue_subscription_usage | owners can insert own venue subscription usage | INSERT |
| venue_subscription_usage | owners can update own venue subscription usage | UPDATE |
| venue_subscription_usage | owners can view own venue subscription usage | SELECT |
| venue_subscriptions | owners can insert own venue subscriptions | INSERT |
| venue_subscriptions | owners can update own venue subscriptions | UPDATE |
| venue_subscriptions | owners can view own venue subscriptions | SELECT |
| venues | owners can update own venues | UPDATE |
| venues | owners can view own venues | SELECT |
| venues | published venues are public | SELECT |
| venues | venue owners and admins create venues | INSERT |
| venues | venue owners and admins update owned venues | UPDATE |
| venues | venue owners can insert own venues | INSERT |

These policies still authorize legacy owners at the Data API layer. Conversely, a non-owner manager can pass the application guard but still be blocked, see incomplete private data, or receive a zero-row update from these policies. E2A deliberately does not bypass them. Existing management pages and venue edits/hours, feature/subscription/interactions writes, moderation, removal requests, and presence writes remain affected. Checkout retains its user-client subscription write. Existing connection service-role writes remain gated by the new authority check.

Legacy creation is still two server operations: user-client venue insertion and private manager insertion after the existing role gate. A manager insert failure stops the success redirect and grants no fallback authority, but the new venue row may require administrator recovery. Transactional creation/claim-state/location handling belongs in E2B; do not infer a claim approval or verified_at timestamp from this compatibility path.

Anonymous users retain public browsing: absent auth never triggers a privileged manager lookup. Active manager permissions/roles retain the previous resolver's general management semantics; fine-grained permissions are not introduced here.

Validation commands: node --test tests/venue-authority.test.cjs; git diff --check; npx tsc --noEmit; npm run build. The focused tests isolate external boundaries and assert actual resolver/action behavior. No production fixture writes or schema mutations were used.

## Validation results

- 21 focused Node tests passed.
- git diff --check passed.
- npx tsc --noEmit passed.
- npm run build compiled successfully and completed lint/type validation; page-data collection then failed on /admin/ambassadors because NEXT_PUBLIC_SUPABASE_URL is absent from this Codespace. No environment values were fabricated or production services contacted by the tests.

## Occurrence inventory (baseline line numbers)

This table includes every owner_id/venue_owner and equivalent owner helper occurrence in tracked application sources, including inactive comments and independent event ownership, to distinguish legitimate uses from venue authorization.

| Source | Class | Decision | Existing use |
| --- | --- | --- | --- |
| app/admin/actions.ts:8 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `async function requireEditor() {` |
| app/admin/actions.ts:18 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `if (!profile \|\| !['admin', 'venue_owner'].includes(profile.app_role)) {` |
| app/admin/actions.ts:26 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `const { supabase, user } = await requireEditor();` |
| app/admin/actions.ts:32 | KEEP | Keep compatibility creator/owner storage; separately record explicit management relationship. | `owner_id: user.id,` |
| app/admin/actions.ts:54 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `const { supabase, user } = await requireEditor();` |
| app/admin/event-claims/page.tsx:6 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const { data: claims, error } = await admin.from('event_claims').select(`*, external_event:external_events(id,name,city,state,source_code), event:events(id,name,slug,owner_id)`).order('status', { ascending: false }).order('created_at', { ascending: true }).limit(100);` |
| app/admin/events/[id]/page.tsx:406 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `event.owner_id` |
| app/admin/events/[id]/page.tsx:420 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq("id", event.owner_id)` |
| app/admin/events/[id]/page.tsx:424 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `event.owner_id` |
| app/admin/events/[id]/page.tsx:428 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq("owner_id", event.owner_id)` |
| app/admin/events/[id]/page.tsx:431 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `event.owner_id` |
| app/admin/events/[id]/page.tsx:435 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq("owner_id", event.owner_id)` |
| app/admin/events/[id]/page.tsx:439 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `event.owner_id` |
| app/admin/events/[id]/page.tsx:443 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq("owner_id", event.owner_id)` |
| app/admin/events/[id]/page.tsx:720 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `value={owner?.display_name \|\| owner?.username \|\| event.owner_id}` |
| app/admin/events/[id]/page.tsx:1410 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `value={owner?.display_name \|\| owner?.username \|\| event.owner_id}` |
| app/admin/events/[id]/page.tsx:1531 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `<Info label="Owner ID" value={event.owner_id} />` |
| app/admin/events/[id]/systems/page.tsx:54 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/admin/events/new/page.tsx:18 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `if (!profile \|\| !['admin', 'venue_owner'].includes(profile.app_role)) redirect('/dashboard');` |
| app/admin/events/page.tsx:39 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `owner_id,` |
| app/admin/events/page.tsx:1846 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `event.owner_id?.slice(0, 8) \|\|` |
| app/admin/linkdn/[roomId]/page.tsx:128 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id` |
| app/admin/page1.tsx:21 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (!profile \|\| !['admin', 'venue_owner'].includes(profile.app_role)) redirect('/dashboard');` |
| app/admin/patron-pulse/[eventId]/page.tsx:72 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/admin/patron-pulse/page.tsx:82 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/admin/payments/page.tsx:92 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `owner_id,` |
| app/admin/users/[id]/page.tsx:55 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', id)` |
| app/admin/users/[id]/page.tsx:61 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', id)` |
| app/admin/users/[id]/page.tsx:171 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `<option value="venue_owner">Venue Owner</option>` |
| app/admin/users/[id]/page.tsx:569 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', id)` |
| app/admin/users/actions.ts:38 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `if (!['user', 'venue_owner', 'admin'].includes(role)) {` |
| app/admin/users/page.tsx:39 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `supabase.from('events').select('id, owner_id, status, payment_status, is_paid'),` |
| app/admin/users/page.tsx:53 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `const ownedEvents = eventRows.filter((event) => event.owner_id === profile.id);` |
| app/admin/users/page.tsx:88 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `const venueOwners = rows.filter((profile) => profile.app_role === 'venue_owner');` |
| app/admin/users/page.tsx:113 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `<Metric label="Venue Owners" value={String(venueOwners.length)} />` |
| app/admin/users/page.tsx:206 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `<option value="venue_owner">Venue Owner</option>` |
| app/admin/users/page.tsx:298 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const APP_ROLES = ['user', 'venue_owner', 'ambassador', 'employee', 'admin'];` |
| app/admin/users/page.tsx:356 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('owner_id, status, is_public')` |
| app/admin/users/page.tsx:357 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.in('owner_id', profileIds);` |
| app/admin/users/page.tsx:362 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const ownerId = String(event.owner_id \|\| '');` |
| app/admin/venue-owner-requests/actions.ts:34 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `.from('venue_owner_requests')` |
| app/admin/venue-owner-requests/actions.ts:46 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `app_role: 'venue_owner',` |
| app/admin/venue-owner-requests/actions.ts:53 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `.from('venue_owner_requests')` |
| app/admin/venue-owner-requests/actions.ts:73 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `.from('venue_owner_requests')` |
| app/admin/venue-owner-requests/page.tsx:28 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `.from('venue_owner_requests')` |
| app/admin/venues/[id]/page.tsx:162 | KEEP | Admin display of historical/compatibility owner ID only. | `<Info label="Owner ID" value={venue.owner_id} />` |
| app/admin/venues/new/page.tsx:18 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `if (!profile \|\| !['admin', 'venue_owner'].includes(profile.app_role)) redirect('/dashboard');` |
| app/admin/venues/page.tsx:260 | KEEP | Admin display of historical/compatibility owner ID only. | `<Info label="Owner" value={venue.owner_id} />` |
| app/api/stripe/events/create-checkout-session/route.ts:19 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id,name,owner_id,payment_status,is_paid')` |
| app/api/stripe/events/create-checkout-session/route.ts:21 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/api/stripe/events/create-checkout-session/route.ts:70 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: user.id,` |
| app/api/stripe/events/extended-discovery/checkout/route.ts:199 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/api/stripe/events/extended-discovery/checkout/route.ts:209 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/api/stripe/events/extended-discovery/checkout/route.ts:448 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id:` |
| app/api/stripe/events/featured/checkout/route.ts:226 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/api/stripe/events/featured/checkout/route.ts:236 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/api/stripe/events/featured/checkout/route.ts:621 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: user.id,` |
| app/api/stripe/venues/create-checkout-session/route.ts:26 | CHANGE | Subscription operation permission must be venue-specific; payment does not grant identity. | `.select('id, name, owner_id')` |
| app/api/stripe/venues/create-checkout-session/route.ts:28 | CHANGE | Subscription operation permission must be venue-specific; payment does not grant identity. | `.eq('owner_id', user.id)` |
| app/dashboard/activity/page.tsx:40 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/[id]/edit/page.tsx:38 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/[id]/edit/step-1/page.tsx:30 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/[id]/edit/step-1/page.tsx:43 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/[id]/edit/step-2/page.tsx:14 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const { data: event, error } = await supabase.from('events').select('id,name,description,dress_code,entry_price,music_selection,age_requirement,event_type,vibe_tags,amenities,smoking_policy,parking_notes,special_notes,status').eq('id', id).eq('owner_id', user.id).single();` |
| app/dashboard/events/[id]/edit/step-3/page.tsx:16 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `supabase.from('events').select('id,name,extra_promo_days,end_time_is_explicit,status').eq('id', id).eq('owner_id', user.id).single(),` |
| app/dashboard/events/[id]/extended-discovery/success/page.tsx:56 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id` |
| app/dashboard/events/[id]/extended-discovery/success/page.tsx:59 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/[id]/extended-discovery/success/page.tsx:83 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `session.metadata?.owner_id !==` |
| app/dashboard/events/[id]/featured/success/page.tsx:57 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id` |
| app/dashboard/events/[id]/featured/success/page.tsx:60 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/[id]/featured/success/page.tsx:85 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `session.metadata?.owner_id !==` |
| app/dashboard/events/[id]/linkdn/actions.ts:21 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id')` |
| app/dashboard/events/[id]/linkdn/actions.ts:31 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) {` |
| app/dashboard/events/[id]/linkdn/page.tsx:33 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/[id]/linkdn/page.tsx:44 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) {` |
| app/dashboard/events/[id]/page.tsx:54 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/[id]/page.tsx:75 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq("owner_id", user.id)` |
| app/dashboard/events/[id]/patron-pulse/actions.ts:30 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, slug, name, owner_id')` |
| app/dashboard/events/[id]/patron-pulse/actions.ts:47 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const isOwner = event.owner_id === user.id;` |
| app/dashboard/events/[id]/patron-pulse/actions.ts:50 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (!isOwner && !isAdmin) {` |
| app/dashboard/events/[id]/patron-pulse/page.tsx:54 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/[id]/patron-pulse/page.tsx:75 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const isOwner = event.owner_id === user.id;` |
| app/dashboard/events/[id]/patron-pulse/page.tsx:78 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (!isOwner && !isAdmin) {` |
| app/dashboard/events/[id]/payment/actions.ts:21 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const { data:event } = await supabase.from('events').select('id,owner_id,total_price').eq('id',eventId).eq('owner_id',user.id).single();` |
| app/dashboard/events/[id]/payment/page.tsx:12 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const {data:event,error}=await supabase.from('events').select('id,name,slug,status,payment_status,is_paid,payment_override').eq('id',id).eq('owner_id',user.id).single(); if(error\|\|!event)notFound();` |
| app/dashboard/events/[id]/payment/success/page.tsx:9 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const {data:event,error}=await supabase.from('events').select('id,name,owner_id').eq('id',id).eq('owner_id',user.id).single(); if(error\|\|!event)notFound();` |
| app/dashboard/events/[id]/review/page.tsx:25 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const { data:event, error } = await supabase.from('events').select('*').eq('id',id).eq('owner_id',user.id).single();` |
| app/dashboard/events/[id]/sources/actions.ts:21 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id,slug,name,owner_id')` |
| app/dashboard/events/[id]/sources/actions.ts:26 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) throw new Error('You do not manage this event.');` |
| app/dashboard/events/[id]/sources/page.tsx:19 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id,slug,name,owner_id,city,state,event_start_at')` |
| app/dashboard/events/[id]/sources/page.tsx:23 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (!event \|\| event.owner_id !== user.id) notFound();` |
| app/dashboard/events/actions.ts:9 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `): 'user' \| 'venue_owner' \| 'admin' {` |
| app/dashboard/events/actions.ts:11 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `if (appRole === 'venue_owner') return 'venue_owner';` |
| app/dashboard/events/actions.ts:112 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `owner_id: user.id,` |
| app/dashboard/events/actions.ts:179 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:210 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:252 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:278 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `owner_id,` |
| app/dashboard/events/actions.ts:291 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:317 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:345 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:384 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:435 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:477 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:544 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/actions.ts:574 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) {` |
| app/dashboard/events/actions.ts:673 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id')` |
| app/dashboard/events/actions.ts:681 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) {` |
| app/dashboard/events/actions.ts:719 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id')` |
| app/dashboard/events/actions.ts:727 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) {` |
| app/dashboard/events/actions.ts:797 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id, status')` |
| app/dashboard/events/actions.ts:805 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) {` |
| app/dashboard/events/actions.ts:848 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:858 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `): 'user' \| 'venue_owner' \| 'admin' {` |
| app/dashboard/events/actions.ts:860 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (appRole === 'venue_owner') return 'venue_owner';` |
| app/dashboard/events/actions.ts:897 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id, address, city, state')` |
| app/dashboard/events/actions.ts:918 | CHANGE | Auto-approval of venue connection must resolve venue-specific authority. | `if (venue.owner_id === userId) {` |
| app/dashboard/events/actions.ts:936 | KEEP | Legacy connection recipient snapshot only; not permission. | `venue_owner_id: venue.owner_id,` |
| app/dashboard/events/actions.ts:1016 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: user.id,` |
| app/dashboard/events/actions.ts:1065 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.from('events').select('id, owner_id, status').eq('id', eventId).eq('owner_id', user.id).single();` |
| app/dashboard/events/actions.ts:1093 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `}).eq('id', eventId).eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:1112 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id, status, event_start_at, event_end_at, end_time_is_explicit')` |
| app/dashboard/events/actions.ts:1113 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('id', eventId).eq('owner_id', user.id).single();` |
| app/dashboard/events/actions.ts:1299 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `}).eq('id', eventId).eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:1317 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/actions.ts:1328 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:1380 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:1404 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:1462 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:1513 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:1576 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id);` |
| app/dashboard/events/actions.ts:1617 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/actions.ts:1640 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/actions.ts:1707 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: user.id,` |
| app/dashboard/events/actions.ts:1888 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id')` |
| app/dashboard/events/actions.ts:1896 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== user.id) {` |
| app/dashboard/events/actions.ts:2032 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| app/dashboard/events/actions.ts:2042 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/events/page.tsx:95 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq("owner_id", user.id)` |
| app/dashboard/page.tsx:27 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/page.tsx:32 | CHANGE | Dashboard venue set must use managed venues. | `.eq('owner_id', user.id)` |
| app/dashboard/page.tsx:77 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `profile?.app_role === 'venue_owner' \|\|` |
| app/dashboard/page.tsx:352 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `status={venueRows.length \|\| profile?.app_role === 'venue_owner' ? 'Available' : 'When needed'}` |
| app/dashboard/page.tsx:397 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `available={venueRows.length > 0 \|\| profile?.app_role === 'venue_owner'}` |
| app/dashboard/payments/page.tsx:35 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/dashboard/venue-owner-request/actions.ts:32 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `.from('venue_owner_requests')` |
| app/dashboard/venue-owner-request/actions.ts:43 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `.from('venue_owner_requests')` |
| app/dashboard/venue-owner-request/page.tsx:20 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `if (profile?.app_role === 'venue_owner' \|\| profile?.app_role === 'admin') {` |
| app/dashboard/venue-owner-request/page.tsx:25 | RETIRE | Global venue-owner request/promotion workflow is not a venue_claim. Preserve historical storage pending E2B replacement. | `.from('venue_owner_requests')` |
| app/dashboard/venues/[id]/edit/hours/page.tsx:35 | KEEP | Unused selected owner field only; access already goes through management guard. | `.select('id, owner_id, name, status')` |
| app/dashboard/venues/[id]/edit/step-2/page.tsx:25 | KEEP | Unused selected owner field only; access already goes through management guard. | `.select('id, owner_id, name, slug, description, special_message, status')` |
| app/dashboard/venues/actions.ts:17 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `async function requireVenueOwnerOrAdmin() {` |
| app/dashboard/venues/actions.ts:32 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `if (error \|\| !['venue_owner', 'admin'].includes(profile?.app_role \|\| '')) {` |
| app/dashboard/venues/actions.ts:40 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `const { supabase, user } = await requireVenueOwnerOrAdmin();` |
| app/dashboard/venues/actions.ts:57 | KEEP | Keep compatibility creator/owner storage; separately record explicit management relationship. | `owner_id: user.id,` |
| app/dashboard/venues/actions.ts:201 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id')` |
| app/dashboard/venues/actions.ts:411 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.select('id, owner_id')` |
| app/dashboard/venues/connections/actions.ts:34 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `// Legacy owner_id remains a compatibility fallback inside the resolver.` |
| app/dashboard/venues/connections/page.tsx:21 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `* - venues.owner_id remains a temporary compatibility fallback.` |
| app/dashboard/venues/connections/page.tsx:43 | CHANGE | Remove legacy owner union and missing-table fallback; query private manager table server-side. | `.eq('owner_id', user.id);` |
| app/dashboard/venues/new/step-1/page.tsx:20 | RETIRE | Legacy creation/editor role gate. Retained temporarily for existing workflow; never grants authority over existing venues. Replace with BM1 creation/claim workflow in E2B. | `if (!['venue_owner', 'admin'].includes(profile?.app_role \|\| '')) {` |
| app/dashboard/venues/page.tsx:14 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `// relationship. venues.owner_id remains a temporary compatibility` |
| app/dashboard/venues/page.tsx:29 | CHANGE | Remove legacy owner union and missing-table fallback; query private manager table server-side. | `.eq('owner_id', user.id);` |
| app/events/[slug]/page.tsx:210 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const isOwner = user?.id === event.owner_id;` |
| app/events/[slug]/page.tsx:212 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `const canManage = isOwner \|\| isAdmin;` |
| app/events/[slug]/page.tsx:884 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `{isOwner ? (` |
| app/events/external/[id]/claim/actions.ts:32 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| app/events/external/[id]/claim/page.tsx:14 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `supabase.from('events').select('id,name,city,state,event_start_at,status').eq('owner_id', user.id).order('event_start_at', { ascending: false }).limit(50),` |
| app/venues/[slug]/page.tsx:58 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `const isOwner = !!user && venue.owner_id === user.id;` |
| app/venues/[slug]/page.tsx:65 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `const canView = isPublicVenue \|\| isOwner \|\| isAdmin;` |
| app/venues/[slug]/page.tsx:136 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `isOwner \|\| isAdmin` |
| app/venues/[slug]/page.tsx:456 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `{(isOwner \|\| isAdmin) && (` |
| app/venues/[slug]/page.tsx:525 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `{(isOwner \|\| isAdmin) && (` |
| app/venues/[slug]/page.tsx:559 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `{isOwner && (` |
| app/venues/[slug]/page.tsx:739 | CHANGE | Public management controls and access bypass must use venue authority. | `const isOwner = !!user && venue.owner_id === user.id;` |
| app/venues/[slug]/page.tsx:749 | CHANGE | Public management controls and access bypass must use venue authority. | `isOwner \|\|` |
| app/venues/[slug]/page.tsx:823 | CHANGE | Public management controls and access bypass must use venue authority. | `const canBypassAccess = isOwner \|\| isAdmin;` |
| app/venues/[slug]/page.tsx:1306 | CHANGE | Public management controls and access bypass must use venue authority. | `{(isOwner \|\| isAdmin) ? (` |
| app/venues/[slug]/page.tsx:1311 | CHANGE | Public management controls and access bypass must use venue authority. | `{isOwner ? (` |
| app/venues/actions.ts:400 | CHANGE | Music moderation: active venue manager/admin or existing active DJ assignment. | `const { data: venueOwner } = await supabase` |
| app/venues/actions.ts:404 | CHANGE | Music moderation: active venue manager/admin or existing active DJ assignment. | `.eq('owner_id', user.id)` |
| app/venues/actions.ts:415 | CHANGE | Music moderation: active venue manager/admin or existing active DJ assignment. | `const canManage = isAdmin \|\| !!venueOwner \|\| !!djAssignment;` |
| lib/admin/event-queue.ts:43 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: string \| null;` |
| lib/admin/event-queue.ts:121 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: string \| null;` |
| lib/admin/event-queue.ts:248 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| lib/admin/event-queue.ts:451 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.map((event) => event.owner_id)` |
| lib/admin/event-queue.ts:495 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `row.owner_id` |
| lib/admin/event-queue.ts:496 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `? ownerMap.get(row.owner_id)` |
| lib/admin/event-queue.ts:737 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: row.owner_id,` |
| lib/dashboard/activity.ts:45 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', ownerId);` |
| lib/dashboard/activity.ts:157 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `isOwnerVisibleAdminAction(` |
| lib/dashboard/activity.ts:248 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `function isOwnerVisibleAdminAction(action: string) {` |
| lib/data.ts:126 | CHANGE | Management list must include active venue managers, not legacy owner IDs. | `.eq('owner_id', userId)` |
| lib/data.ts:144 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| lib/data.ts:188 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `.eq('owner_id', user.id)` |
| lib/data.ts:219 | CHANGE | Management list must include active venue managers, not legacy owner IDs. | `.eq('owner_id', user.id)` |
| lib/events/transition.ts:20 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: string;` |
| lib/events/transition.ts:153 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| lib/events/transition.ts:180 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: data.owner_id,` |
| lib/events/transition.ts:383 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `!record.owner_id \|\|` |
| lib/events/transition.ts:391 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: String(record.owner_id),` |
| lib/stripe/reconcile-extended-discovery-checkout.ts:183 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id,` |
| lib/stripe/reconcile-extended-discovery-checkout.ts:201 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `if (event.owner_id !== order.user_id) {` |
| lib/stripe/reconcile-featured-checkout.ts:81 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `session.metadata?.owner_id;` |
| lib/types.ts:7 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `app_role: 'user' \| 'venue_owner' \| 'admin';` |
| lib/types.ts:12 | KEEP | Event ownership, attribution, or compatibility role/storage; not venue authority. | `owner_id: string \| null;` |
| lib/venues/authority.ts:20 | RETIRE | Inactive/commented legacy implementation; no runtime authority. | `*   2. Legacy venues.owner_id compatibility fallback` |
| lib/venues/authority.ts:58 | CHANGE | Replace legacy fallback with private active manager lookup; use profiles.app_role for admin. | `.select('owner_id')` |
| lib/venues/authority.ts:64 | CHANGE | Replace legacy fallback with private active manager lookup; use profiles.app_role for admin. | `if (venue?.owner_id === userId) {` |
