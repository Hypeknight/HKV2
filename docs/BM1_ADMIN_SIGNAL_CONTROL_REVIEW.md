# Admin signal/control alignment — review checkpoint

Baseline: 6f91b4d8ccbbf3eba5232016ff2f1a64844e3413. No migration, dependency, entitlement or authorization-policy changes.

## Implemented
- Shared responsive professional shell for all Admin routes. Every prior navigation destination retained; explicit Signal Evidence and legacy venue-owner requests added. Native keyboard disclosures, associated tool-search label, one active destination, visible focus.
- New factual overview separates submission/revision/service queues, operational inventory and stored lifecycle status. No misleading combined attention score or payment-as-publication prerequisite. Service count explicitly covers lifecycle states, not all refund flags.
- New administrator-only canonical Signal Evidence: exact HEAD counts for a fixed rolling seven-day interval, no capped row aggregation, no identifiers/response content. Each failed, rejected, missing or malformed count becomes Unavailable independently. Valid zero stays zero. No service-role client or additional privileges.
- Historical save/Going/Pulse action signals are explicitly distinct from current state, effective responses and participants. Unknown acquisition is not classified; Featured exposure remains not instrumented. Legacy logs never enter canonical totals.
- Legacy analytics labeled capped diagnostic samples; unsupported Quiet/Busy/On fire city labels removed. Missing diagnostic arrays fail closed. Existing experimental lab remains experimental, with identifier/action terminology and capped-sample warnings.
- Data-free visual review is gated by the existing server-only HYPEKNIGHT_HOMEPAGE_PREVIEW=1 flag and contains only unavailable measurements. It does not provide an authenticated admin session or a new data endpoint. Disabled by default in production.

## Remaining work and release gate
This is the shared foundation plus overview/evidence alignment, not a rewrite of every administrative form or every old intelligence calculation. Existing event moderation, commerce, system settings, claims, Pulse operations, raw authorized diagnostics and their mutation paths remain unchanged. The experimental Intelligence Lab and legacy analytics still require separate completeness/calculation reviews; neither is represented as complete canonical reporting. Current saved/Going totals remain in authorized Event Mission Control, not global RLS-filtered table counts. No attendance, popularity or exposure scores added.

Real authenticated administrator browser testing is still required before release. Visual fixture review is not authority testing; mocked authorization regressions do not replace production RLS validation. No production records are edited for testing.

Consumer direction: standard Discovery focuses on current events and the next 14 days. External horizon correction is kept in a separate change. Native Extended Discovery entitlements are not silently revoked.

## Validation evidence
- 290/290 application tests pass (nine new focused regressions).
- TypeScript, git diff checks and full production-configured build pass.
- No previous Admin navigation destinations removed (source-set comparison).
- Browser fixtures: 320px viewport has 305px content/305px scroll width; 390px has 375/375; desktop 1265/1265. Native mobile disclosure and keyboard activation work. Tool search remains available.
- Production-default local server renders Not Found for the fixture route, without fixture content. Next streamed Not Found returned HTTP 200 with the 404 fallback marker; this is not proof of a hard HTTP 404. Signed-out /admin/signals returns a 307 authentication redirect.
- Actual authenticated administrator data/operations and real production RLS queries have not been exercised in this checkpoint. Release remains gated on that review.
