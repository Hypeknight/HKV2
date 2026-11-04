# Current and near-term Discovery

Baseline: 6f91b4d8ccbbf3eba5232016ff2f1a64844e3413.

HypeKnight's standard consumer Discovery should help people decide what to do now and plan the next 14 days. External inventory previously had no upper time bound and could fill current discovery with far-future listings.

## Correction
- External homepage, Events search, preview inventory, recommendations, city Discovery and Surprise Me queries now require event_start_at <= request time + 14 * 24 hours. The upper boundary is inclusive. Existing current/ongoing lower-bound behavior on homepage/Events/preview remains unchanged.
- Recommendations and city Discovery no longer include external records with unknown event dates: these cannot support a dated plan.
- Native recommendations, city Discovery and Surprise Me now respect the same existing promotion/Discovery Window bounds already read by homepage/Events. Stored native windows, including authorized Extended Discovery, remain unchanged. This is not a revocation or reprice of paid entitlements.
- No event identity, category rules, provider URLs, source labels, ordering, query-failure semantics, collectors, public detail access, historical pages, RLS, schema or import jobs changed. The existing collectors still observe the actual eligible result set.
- Explicit calendar themes and administrative future-inventory management remain unchanged; this checkpoint addresses standard Discovery inventory, not a platform-wide deletion of future events.

## Validation
296 application tests pass, including 15 new tests executing the actual query AST with in-memory boundary rows. Covers just inside, exact 14 days, one millisecond beyond, months away, unknown dates, a DST-crossing interval, and native windows not yet started versus eligible earlier windows. No production fixtures or engagement data created. Existing category tests retain their assertions; external fixtures now use near-term dates instead of 2099.

TypeScript, diff check and production-configured build pass. Read-only browser review and controlled release are still required. No merge or deployment is authorized by this review checkpoint.
