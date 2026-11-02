> Historical UX-C1 checkpoint. For the latest UX-C1B refinement, validation and public Pulse backend contract, see [UX-C1B review](BM1_UX_C1B_DESIGN_AND_PUBLIC_PULSE_CONTRACT.md).

# BM1 UX-C1 — Simply Complex design review

Status: working isolated prototype; design approval required. No production merge or deployment.

## Baseline and isolation

- GitHub main and Render Live: bdfa9724914144e6ed25f3913ba1b87b76117fb8.
- Render deployment: dep-db9vmflg1s2s73a7e4vg, verified Live on November 1, 2026.
- Worktree: /workspaces/HKV2-ux-c1.
- Branch: feature/bm1-simply-complex-ux-c1.
- Existing worktrees and draft PR #5 preserved. No existing tracked application file changed.

## Audit findings

| Priority | Finding | Treatment in this preview |
| --- | --- | --- |
| High | Inventory snapshots, repeated live/soon/tonight sections and system explanations compete with finding a night out. | Consolidate into one event collection; move business content below discovery. Preserve time-based entry points as links. |
| High | The initial viewport emphasizes large text and dashboard-like counts before event imagery. | Put real listing photography alongside the search hero; remove summary measurements from the preview. |
| Medium | Low-opacity text, tiny captions and many bordered translucent panels make hierarchy and readability inconsistent. | Solid charcoal surfaces, readable secondary text, restrained gold, fewer nested panels. |
| Medium | Several controls compete with the primary action. | One search submission, optional city disclosure with Skip, then Tonight / Weekend / All upcoming. |
| Medium | Card overlays compete with variable provider artwork. | Separate event names, source and dates from photographs; stable image ratios and error fallback. |
| Retain | UX-B1 categories/destinations, UX-B2 availability distinctions and UX-B3 navigation/authentication. | Reuse classification, canonical destinations, readRows/combinedState, EventTime and the unchanged root navigation. |

These are visual/hierarchy findings, not newly confirmed authorization or reporting defects. The current production homepage was inspected signed out. Personalized ranking and authenticated browser behavior were not re-audited in this visual checkpoint.

## Design principles and tokens

Simply Complex: make the next action obvious while preserving capability through clear entry points.

- Entertainment first: real event imagery, concise language, no fabricated popularity, prices, scores or delivery claims.
- Gold marks identity and important actions; most content stays neutral.
- Typography uses the existing system sans-serif; no webfont request or new package. Headings are tighter and heavier, body copy is relaxed and readable.
- Preview tokens are scoped to .sc-home. Existing globals, navigation and workspaces are unchanged.

| Token | Value / use |
| --- | --- |
| Background | #0c0c0f |
| Surface / raised | #17171c / #202026 |
| Primary / secondary text | #f5f3ed / #b9b8c1 |
| Gold | #e2bc68; dark text on filled actions |
| Border | #38383f |
| Content width | 1280px inside the existing application shell |
| Card radius | 18px; 8–12px controls |
| Spacing | 8, 12, 16, 20, 24, 32, 40, 56px |
| Type | 11–14px labels; 16–17px body; 22–34px section/card headings; 46–68px hero |
| Interaction | At least 44px primary controls; 3px focus outline; native form/disclosure semantics |
| Motion | Brief surface transition only; no autoplay or animated hero; reduced-motion override |

## Homepage information architecture

1. Existing brand/navigation and accurate server-provided account controls.
2. Clearly marked preview ribbon.
3. Search-led hero with optional city selection and real inventory spotlight.
4. Tonight, weekend and general Discovery entry points.
5. One upcoming collection (six cards); native inventory leads, followed by supplemental providers.
6. Categories supported by the available inventory; no invented category labels/counts.
7. Surprise Me as a secondary discovery interaction.
8. Free event-posting / venue / organizer tool entry points.
9. Existing supporting footer. Explicit state-review tools are prototype-only.

## Components and data boundaries

- SimplyComplexHome: scoped composition, semantic search, market disclosure, notices, cards, categories and secondary actions.
- PreviewArtwork: real provider imagery with neutral missing/broken-image fallback; no invented entertainment scene.
- EventTime: existing deterministic timestamp formatter reused unchanged, with dates visible immediately and no new relative-time claim.
- preview-home: mirrors the current homepage's authorized native/external query bounds (80 per source), then uses existing classification and destination helpers. It serializes only an explicit public presentation allowlist.
- /preview/simply-complex/loading: genuine route loading state.
- /preview/simply-complex/review: same application inside 390px, 768px or 1280px iframe viewports for review.

No changes to production /, Discovery eligibility, lifecycle, promotion entitlements, Featured, auth, signals, reporting, Pulse, RLS, migrations or dependencies. Prototype surfaces do not emit homepage impressions or synthetic engagement. Destination pages retain their existing behavior.

## Preview access and states

Start the existing application on private Codespaces port 3220. Open /preview/simply-complex. GitHub access to the private forwarded port is required. The Codespace must remain running.

- Default: real existing authorized homepage inventory.
- ?demo=empty: explicitly labeled successful-empty example; no fake events.
- ?demo=loading: explicitly labeled unresolved example plus real route loading.tsx.
- ?demo=unavailable: explicitly labeled failure example; does not claim no events.
- ?demo=partial: explicitly labeled withheld-native example; actual available external events remain.
- Try again uses a full request to real inventory, not a cosmetic state reset.

The demos do not interrupt production queries, modify records or imply their example state is the current market state. A successful empty result is distinguished from a failed retrieval even when no cards can be shown. No numeric metric has been added.

## Validation evidence

- 18 focused prototype tests; 244 complete application tests passing, including existing authorization and security regressions.
- TypeScript: passing.
- Full production-configured build and git diff --check: passing.
- Desktop preview populated with existing Ticketmaster records; source labels, stable imagery and dates visible.
- 390px mobile: one card column, no preview-content horizontal overflow (343px content / 343px scroll width). Seven inspected event images loaded.
- 768px tablet: two columns, no preview-content overflow (705px / 705px).
- Mobile navigation opens with Enter, closes with Escape; city disclosure opens with Enter; Tab reaches Skip with a visible 3px outline.
- Empty, loading, unavailable and partial demos exercised. Unavailable retry returned to six real event cards.
- No React hydration errors observed on inspected preview routes. Browser extension metadata errors were distinct from application errors. An existing development warning about global smooth scrolling remains outside this preview scope.

## Limitations and next design decisions

- Browser testing uses desktop Chrome and fixed-width real iframe viewports, not physical iOS/Android devices or screen-reader hardware.
- The currently returned inventory contains supplemental listings; native populated behavior is automated-test coverage, not a fabricated browser fixture.
- No account credentials or user roles were changed. Authenticated visual treatment inherits existing navigation and is not newly verified by role here.
- The spotlight is the first eligible native record, or the first external record when native inventory is absent. It is not Featured, an editorial endorsement or measured popularity. Approve an editorial selection policy separately if desired.
- City selection is session-independent URL context, not new saved-preference infrastructure. Personalization expansion is deferred.
- Date formatting retains existing explicit timestamp semantics. Provider UTC timestamps and source title-encoding defects are not silently reinterpreted or repaired here.
- Source snapshots remain bounded; no exhaustive city totals are asserted. Shared loader consolidation should be considered before replacing production /, to avoid long-term duplicated query maintenance.
- Shared nav/footer intentionally retain the current production styling. Review their future palette alignment separately after approving the homepage direction.
- Before production implementation: review hero copy and mobile density, approve source/spotlight presentation, test physical devices and an authenticated organizer account, and decide whether to retain six cards or introduce a controlled rail.

No merge or production deployment is approved by this checkpoint.

## Mobile refinement — November 1, 2026

The draft now uses tighter mobile hero spacing, a 38px headline, a single-row search at 390px, and a 2:1 spotlight image. Below 360px, the search returns to stacked controls. Desktop and tablet styling are unchanged.

Measured in the real 390px review frame: the first event moved from 736.8px to 605.6px from the frame top (131.1px earlier). Content remains 343px wide with no horizontal overflow; input and submit button are both 48px tall. Tab reaches the submit button with a visible 3px focus outline. No application console errors were observed.

Fresh validation: all 244 application tests, TypeScript, git diff --check, and the full production-configured build passed. This is still a draft prototype; physical-device and below-360px browser coverage remain unverified. No production changes.
