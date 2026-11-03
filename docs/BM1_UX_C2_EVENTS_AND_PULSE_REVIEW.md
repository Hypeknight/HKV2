# Simply Complex Events and early public Pulse review

Baseline: 1902cdbf83b7b8321b589e9ec64a6d6cd24c2ee6. Isolated worktree: /workspaces/HKV2-ux-c2. Branch: feature/bm1-simply-complex-events-ux-c2. Implementation only; no automatic merge or deployment.

## Requested experience

Event Discovery adopts the existing Simply Complex palette, editorial typography and restrained gold. Primary search and local context remain explicit, advanced filters are available through a native keyboard-operable disclosure, factual time links replace large metric tiles, and the results grid appears before secondary browsing. The existing remaining time rails and experience/sound/city paths are retained in disclosures. Search, time, city and quick-filter destinations preserve independent filters. Native and external identity and existing impression provenance remain intact.

The user clarified that the public Pulse question, rather than the city selector, should move earlier. The non-submittable question now follows the hero and precedes Living City event listings. A shared exported component prevents duplicate questions or identifiers and uses a level-two heading for the standalone early panel. Factual city inventory remains a separate lower section. The response controls remain disabled; no response collection, public aggregation or new write boundary is introduced. Empty, partial, unavailable and insufficient sample examples retain their original honest semantics.

## Scope and security

Database loaders, eligibility predicates, classification, sorting and time helpers are unchanged; source comparison verified the query/filter block and database-loader/helper block against the baseline. Default EventCard rendering remains unchanged; only the Events results request its new editorial variant. The variant keeps canonical destinations, source labels, impression subject/source/placement and image-failure fallback. Authentication, RLS, reporting definitions, entitlements, guest/Pulse participation and dependencies are unchanged. No migration or production environment change.

The existing server-only local HYPEKNIGHT_HOMEPAGE_PREVIEW=1 switch also disables Events page views, search submission tracking and result/rail impressions during private review. Production defaults remain instrumented. Review frames now support the actual Events page with current filter context; demonstration parameters cannot alter actual Events inventory.

## Validation and limitations

281 application tests pass, including eight focused regressions for result hierarchy, associated filter labels and retained values, filter destination context, partial results and unavailable totals, editorial source/impression integrity, early disabled Pulse placement, local telemetry isolation and responsive review context. Existing category, historical-page, truthful-state, auth, reporting, signal and participant/security application assertions remain passing. TypeScript, diff checks and the full production-configured build all exited 0. No database schema tests or production mutations are required or performed.

Chrome private preview: unfiltered Events returned 19 existing external listings; a Cosmic / Kansas City / MO search returned one matching event and retained three filters. Keyboard Tab moved to the city input with a visible 3px focus outline. Review iframe widths 320/360/390/768/1280 had no horizontal page overflow; submit buttons measured 48px. At 390px the first Events card begins around 853px into the document. These are CSS viewport checks, not physical-device or screen-reader certification.

Production role-specific sessions and forced query failures are not browser-tested here. Native-positive inventory, failure states and role boundaries have automated coverage. The preexisting server-local time parsing and four-hour missing-end assumptions remain outside this visual checkpoint. The public question is still a preview: a separately reviewed backend contract is required to make voting functional.

Fresh Render baseline and real-account release smoke tests remain a controlled-release gate. Render dashboard authentication was unavailable during implementation; the last verified deployment was the accepted baseline. PR #5 and all protected worktrees are preserved.
