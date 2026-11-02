# Approved Simply Complex homepage implementation

Design approved from PR #16 at a837de10bb44b4abcb87c34a63b49a50cbc6d9b5. Source baseline remains bdfa9724914144e6ed25f3913ba1b87b76117fb8. Implementation stays in the isolated UX-C1 worktree and draft PR for review; no production merge, deployment or database change.

## Actual homepage integration

The root route now renders the approved shared SimplyComplexHome experience. Trusted server props select actual-homepage mode; user query parameters cannot enable demos or tracking. Market selection and Skip return to the root route, with exact city/state filtering of the authorized snapshot. Plan My Night uses a canonical informational destination at /plan-my-night. The sandbox remains separately available with its review controls and illustrative states.

Advanced filters initialize from the explicit page market without loading stale saved preferences over it. A subsequent explicit device-location action updates those filters, and a new page-market selection remounts the filter state. Without an explicit page market, the existing saved-location fallback remains available. Listener cleanup and both precedence paths are regression-tested.

The original homepage native/external queries, limits, visibility, moderation, removal and Discovery Window conditions remain unchanged. The existing sanitized inventory adapter supplies native-first cards and listing facts. No new query, paid eligibility rule, category classifier, metric definition, recommendation engine or participation capability is introduced.

Existing capabilities retained through secondary discovery: server-authorized personalized recommendations; live, soon, tonight, recently added and weekend sections; advanced discovery filters; device location; settings-controlled calendar highlights. Independent retrieval failures remain unavailable and successful content remains visible. Existing time-window helper semantics are retained: the legacy helper parses wall-clock values in the server timezone and assumes four hours when an end is absent. Those preexisting assumptions are not new evidence of actual event duration, attendance or lifecycle state. They require a separate time-filter correctness review; this visual integration does not certify them.

## Measurement and privacy

The root page retains TrackView. Actual-homepage search uses the existing recordSearchSubmission collector with homepage provenance; other DiscoverySearchForm consumers retain events_index. Declared market/vibe/time choices use existing SignalLink types and provenance. Visible primary cards and lead use the existing DiscoveryImpression component, with explicit placement, native/external identity and organic visibility/duration rules. No Featured measurement is invented.

Hidden secondary sections retain their existing cards; the existing visibility observer only records qualifying visible delivery. Sandbox rendering mounts no homepage telemetry. No participant data or raw responses enter public props. Recommendations are requested only after server identity is established; no role, identity, authentication or RLS boundary changes.

For private local browser verification ONLY, start the application with the server-only HYPEKNIGHT_HOMEPAGE_PREVIEW=1 flag. This disables homepage page/card/choice/search telemetry, including advanced homepage search, so the private preview is not measured as live homepage delivery. The flag is not a production requirement; production defaults retain existing tracking. It does not disable authentication or alter data authorization. It is scoped to this homepage, not a platform-wide analytics switch.

Public community responses remain disabled and results unavailable. Plan My Night remains a noindex concept with no form, preference storage or itinerary engine. The independently governed question lifecycle, trusted collection and complete privacy-reviewed public aggregate contract in the C1B report remain future work.

## Validation and release review

Focused tests exercise the actual homepage, not a stub, including eligibility exclusions, classification, zero/unavailable, selected-city context, private recommendation access, independent calendar failures, telemetry provenance, sandbox isolation and non-submittable concepts. Final suite/build and browser findings are recorded below after inspection.

No migrations, dependency changes, commerce modifications or protected-worktree file changes are included. PR #5 remains untouched. Release still requires a fresh production/Render alignment check and controlled release decision.


## Final validation evidence

- 273/273 application tests passed, including 14 new homepage-integration regressions and the existing category, truthful-state, authentication, signal, reporting, guest/Pulse and event-security assertion suites. TypeScript, git diff checks and the production-configured build all exited 0. No live database security suite or production mutation was performed.
- Browser: Chrome, signed out, production-mode private preview. Homepage telemetry was disabled with the local preview flag; the rendered primary and secondary card impression nodes were absent. Production-default instrumentation is covered by tests.
- No application console or hydration errors observed through root loads, city selection, reload, Back navigation, Plan concept navigation and responsive checks. Browser-extension metadata errors are separate.
- Exact city selection retained Kansas City/MO in primary search, time/category destinations and advanced fields. The bounded Kansas City snapshot showed native 0 / external 16. Columbia/MO returned a successful empty snapshot with native 0 / external 0 and truthful empty copy, not unavailable. No records were fabricated.
- The advanced/device-location disclosure and Recently Added event section remained keyboard accessible. No device geolocation permission was requested. Plan concept rendered no form, and its Back destination is the actual homepage.

| Actual homepage viewport | Content / scroll width | First listing top | Page overflow |
| --- | --- | --- | --- |
| 320px | 273 / 273px | 609px | None |
| 360px | 313 / 313px | 546px | None |
| 390px | 343 / 343px | 546px | None |
| 768px | 705 / 705px | 172px | None |
| 1280px | 1201 / 1201px | 159px | None |

At 390px the actual homepage first listing begins at 546px, compared with 585px in the approved sandbox (review banner removed). Primary submit is 48px high with a visible 3px gold focus indicator. Open compact secondary/advanced disclosures and event sections did not introduce page overflow. Iframes provide real CSS widths; physical-device and screen-reader testing are not claimed.

## Files in this integration

- app/page.tsx
- app/plan-my-night/page.tsx
- app/preview/simply-complex/plan/page.tsx
- app/preview/simply-complex/preview.css
- app/preview/simply-complex/review/page.tsx
- components/discovery/DiscoveryCommandBar.tsx
- components/discovery/DiscoverySearchForm.tsx
- components/discovery/PlanConcept.tsx
- components/preview/SimplyComplexHome.tsx
- docs/BM1_UX_C1B_DESIGN_AND_PUBLIC_PULSE_CONTRACT.md
- docs/BM1_UX_C1_IMPLEMENTATION.md
- tests/discovery-categories.test.cjs
- tests/interface-states.test.cjs
- tests/simply-complex-preview.test.cjs
- tests/helpers/homepage-render.cjs
- tests/homepage-integration.test.cjs

## Remaining release coverage

Authenticated recommendations and role boundaries are automated coverage here; no fresh real-account organizer/venue/admin session was exercised. Native-positive inventory and calendar-highlight fixtures are automated-only in this snapshot. Failed sources are tested with mocks and sandbox demonstrations, not by disrupting production. No independent public community question, complete response sample, district data or itinerary engine was activated.

Implementation is ready for source/release review. It has not been merged or deployed. A controlled release still requires fresh main/Render alignment and production smoke testing. Preserve the original security-maintenance files and PR #5.
