> Approved prototype checkpoint. The actual-homepage integration and release handoff are documented in [UX-C1 implementation](BM1_UX_C1_IMPLEMENTATION.md).

# UX-C1B — Living City, Public Pulse and Concierge

## Scope and capability audit

Builds on draft PR #16 at 1873b6a0f857e99952ae1b1a25f8c830673788e9. Accepted production/main: bdfa9724914144e6ed25f3913ba1b87b76117fb8. Isolated UX-C1 worktree only. Production homepage, event eligibility, entitlements, reporting, authentication, RLS and migrations are unchanged. No dependency, new write endpoint, profile expansion or deployment.

Existing lib/patron-pulse/service.ts and app/events/patron-pulse/actions.ts are event-bound. Sessions/questions require an event; response actions require legitimate Presence and call existing eligibility/collector-trust rules. The guest-participation migration preserves one effective response, retries and revisions under existing authority. Owner/admin reporting-completion RPCs are authorized event aggregates, not public city APIs. Do not repurpose these with fictitious events, arbitrary guest tokens or public access grants.

No independently governed community-question lifecycle, public city response aggregate, itinerary engine or verified district registry exists. Market areas are municipalities, not credible entertainment-district boundaries. These gaps were reported before implementation.

Existing /surprise is functional, preference-driven discovery. It chooses its own location and does not initialize from URL query parameters. The homepage links there without claiming its selected city was transferred. No automatic candidate or feedback requests are introduced.

## Design and information architecture

Simply Complex uses editorial hierarchy and a restrained gold serif signature, authentic listing imagery, charcoal surfaces and compact search-first composition. Georgia adds expression without a font download. Gold signals identity, focus and important actions.

Order: unchanged global navigation; hero/search/optional city; real lead listing; six native-first eligible cards; supported cultural category paths; city listing facts alongside a clearly disabled question; distinctive Surprise Me and Plan concept; quieter professional links; review-only state demonstrations.

Hero: Your night starts here. One primary search; Explore Tonight; native disclosure for Surprise Me, Plan My Night concept, City Pulse anchor and all upcoming events. No four competing mobile buttons. Existing imagery, neutral broken-image fallback, source labels, deterministic EventTime and accessible GET search remain.

Scoped tokens: background #0c0c0f; surface #17171c; raised #202026; text #f5f3ed; muted #b9b8c1; gold #e2bc68; line #38383f; 18px radius; 1280px width. Native keyboard disclosures, visible 3px gold focus, practical touch targets, reduced-motion overrides and no autoplay. No workspace redesign or global token change.

## Real city facts

citySnapshot consumes the existing sanitized PreviewInventory. Explicit city and state are required; city and normalized state match exactly. Counts distinguish native listings, external listings and supported categories. Categories overlap; multiple providers may describe one experience. These are not unique events, people, attendance, recorded interest or community responses.

The same existing query is bounded to 80 records per source BEFORE location filtering. Loaded with the page, not real-time or a complete city census. No signal/response/private participant query or reporting RPC is added.

| State | Display |
| --- | --- |
| No city/state | Select a place; no inferred counts |
| Complete nonempty snapshot | Separate native/external listing facts and category counts |
| Complete empty snapshot | Genuine zero in this bounded snapshot |
| Partial source failure | Retain real cards; withhold city totals and category counts |
| Unavailable | Unavailable, never zero |
| Loading example | Explicit example; no production activity claim |

## Community Pulse: future backend contract, not implemented

The four associated radio controls are disabled within a disabled fieldset. There is no form, submission handler, endpoint, fake response or storage. The panel states that responses are not open and no answers are collected. Community result examples have no fabricated response values. Populated listing inventory never substitutes for a populated response sample.

Activation requires separately reviewed backend work:

1. Independent question identity and city scope, editorial authority, publication/open/paused/closed lifecycle, start/end windows, option versions and retention. Do not attach a public question to a fake event or weaken event Presence guards.
2. Trusted collection and eligibility model, explicit signed-in/guest rules, consent, abuse/rate limits, idempotency and one latest effective response per participant/question. Revisions need defined authority and evidence history; retries cannot create participants. Existing event guest limits and RLS stay intact.
3. A complete consistent authorized aggregate snapshot; no pagination-truncated denominator. Return only question/version/scope, sample availability, freshness and approved display values. Never serialize raw answers, participant IDs, tokens, IPs or device fingerprints publicly.
4. Below five effective responses, withhold per-option counts and percentages AND alternative reconstructing totals/slices/history. Enforce at the trusted reporting boundary. No public administrator override. This is a display safeguard, not anonymity or inference resistance; repeated-query/differencing risks still require evaluation.
5. At five or more, show only supported factual results with defined denominator and freshness. Distinguish empty, insufficient, failed and incomplete samples. No percentages from incomplete retrieval. No inferred attendance, popularity, demographics or real-time claim.
6. Explicit least-privilege public reads and trusted writes, RLS and cross-question/city checks. Security/collector/privacy tests and separate additive-backend approval before activation. Existing owner/admin raw access is not changed.

## Concierge boundaries

Plan My Night is a noindex informational concept with no form, engine or data collection. Future proposed inputs: time window/area, chosen interests, optional group/spending context, event age requirements without assumed eligibility, voluntary accessibility preferences. Sensitive inputs remain optional future considerations, not collected here.

## CTA inventory

| CTA | Destination | Status |
| --- | --- | --- |
| Search | GET /events with q and selected city/state | Existing functional search |
| Explore Tonight | /events with when=tonight and city/state | Existing filter |
| City / Skip | Preview city/state / general preview | Request-scoped, optional |
| Native event | /events/canonical-slug | Existing native page |
| External event | /events/external/id | Existing source detail, labeled provider |
| Category | /events with supported category and city/state | Existing filter |
| Surprise Me | /surprise | Existing experience; choose location there |
| City Pulse | #city-pulse | Working in-page anchor |
| Community choices | None | Disabled preview, no submission |
| Plan My Night | /preview/simply-complex/plan | Explicit informational concept |
| Post an event | /dashboard/events/new/step-1 | Existing protected builder |
| Explore venues | /venues | Existing venue discovery; no claim bypass |
| Organizer tools | /promote | Existing information route |
| Plans and Patron Pulse | /pricing | Existing capabilities information |
| Retry | Full GET preview retaining city, removing demo | Reattempts source queries |

## Before versus after

| Area | Previous PR16 at 1873b6a | C1B |
| --- | --- | --- |
| Hero | Curiosity headline and three time links | Compact editorial Your night starts here; disclosed secondary paths |
| Inventory | Native-first, real cards and source identity | Retained data contract and fallback |
| Culture | Category tiles | Editorial links, same evidence |
| City | Optional selection | Listing facts, no activity inference |
| Participation | Absent | Clearly non-submittable question and truthful states |
| Surprise | Simple panel | Distinct gold concierge treatment, same route |
| Planning | Absent | Informational concept, no fake itinerary |
| 390px first listing | ~605.6px from prior inspection | Final measurements below |

## Validation and limitations

Final results are recorded below. Iframe checks are real responsive CSS viewports, not physical-device or screen-reader testing. No independently governed public question or production response fixture exists; submission/real community aggregation remains unavailable. No production data is fabricated. Selected city is not new persistent personalization. District discovery, planning and public response reporting await approved backend work.


## Final C1B validation evidence

- 259 application tests passed (33 focused prototype/data-contract tests); TypeScript, git diff checks and production-configured Next.js build passed. No dependencies or migrations changed.
- Final browser inspection used the production-mode build in Chrome, signed out, with actual iframe viewports. These are not physical devices or a screen-reader audit.
- No horizontal overflow at 320, 360, 390, 768 or 1280px, including the open secondary-path disclosure at 320px.

| Viewport | Content / scroll width | First listing top (document px) | Community panel height |
| --- | --- | --- | --- |
| 320 | 273 / 273 | 647.3 | 774 |
| 360 | 313 / 313 | 585 | 633 |
| 390 | 343 / 343 | 585 | 600 |
| 768 | 705 / 705 | 216.4 | 763 |
| 1280 | 1201 / 1201 | 203.2 | 591 |

At 390px the first listing starts at 585px, versus approximately 605.6px in the previous prototype. At 320px the search stacks for usable controls; the question options also stack, increasing panel height. This favors readable labels and touch targets over compressed content.

- Keyboard: market disclosure, secondary paths and search tab order exercised; submit button 48px high with visible 3px gold focus. Question has four disabled associated controls and no form.
- Real Kansas City snapshot observed: native 0, external 16. This is bounded public listing inventory, not unique experiences or patrons. Native positive-inventory examples remain unit-validated because no eligible native listing was in this snapshot.
- Browser demonstrations: complete empty shows valid zero; loading with selected city shows no counts; unavailable shows no counts; partial retains six real cards while withholding inventory/category totals; insufficient shows no option counts, response total or percentages. No production response samples exist.
- Retry from unavailable removed demo, retained Kansas City/MO, reloaded real counts (0/16). Planning concept rendered with no forms; existing Surprise Me destination loaded its location chooser without submitting a candidate request.
- One rapid state-navigation wait exceeded the browser tool deadline before the insufficient example resolved. Full-request navigation rendered the correct state; no related application error was captured. Do not represent this as tested network reliability.
- No React hydration or application errors observed during tested transitions/reloads. Browser-extension metadata errors were separate from application logs.
- Main and draft PR16 base remained bdfa9724914144e6ed25f3913ba1b87b76117fb8 before push. Render was verified against that baseline during the earlier audit; the renewed browser session now requires Render login, so a second fresh Live inspection was not completed. No production operation was attempted.

## Design approval recommendation

Ready for review as an isolated homepage prototype. Approve or revise the editorial hierarchy, city facts, disabled question presentation and concierge composition before any production implementation. Keep community submissions, public response aggregation, district discovery, persistent personalization and itineraries out of activation until separately scoped backend/privacy work is reviewed. The existing event-based Pulse authority and five-response safeguard remain unchanged.
