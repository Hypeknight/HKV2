# HypeKnight V3.4 — Event Builder + Commerce

V3.4 replaces the promoter-facing creation flow with a guided four-stage builder while preserving the existing moderation, event status, Stripe mode, coupon tables, and legacy event price fields for compatibility.

## Builder

1. **Start** — event identity, required venue name, required physical street address/city/state, date/time, optional external source URL, V3.3 duplicate check, and venue-address matching.
2. **Experience** — event type, music, vibe, age, attire, entry/access, with secondary information hidden under progressive disclosure.
3. **Enhance** — base HypeKnight promotion, additional promo days, and enabled event add-ons from `platform_products`.
4. **Review** — event preview + itemized order + payment readiness + existing moderation submission.

`/dashboard/events/new` is the new start chooser. Existing links to `/dashboard/events/new/step-1` remain valid.

## Address and venue permission

Physical address is validated server-side and must contain a street number/street name plus city/state. The normalized address is compared to HypeKnight venue records. If the matched venue belongs to the same user it is connected. If another account owns it, a `venue_event_connection_requests` row is created and the event remains pending until that venue owner approves from `/dashboard/venues/connections`.

## Event timing

The old promotion-window calculation ended events at midnight. V3.4 centralizes timing in `lib/events/lifecycle.ts`:

- explicit event end supplied → discovery/promotion end at that event end;
- no event end → discovery/promotion end 30 minutes after event start by default;
- enabled product with `requires_event_end=true` (Patron Pulse/Linkd’N) → event end is required and discovery remains active through that end.

Admin can change the default fallback minutes at `/admin/commerce`.

## Commerce

Migration 0006 adds:

- `platform_products`
- `event_product_selections`
- `event_orders`
- `event_order_items`
- `venue_event_connection_requests`
- event discovery/address/venue-match fields
- platform commerce settings

Patron Pulse and Linkd’N are seeded **disabled** with `$0.00` placeholder pricing. Admin must explicitly enable and price them before promoters can select them.

The old event pricing fields (`base_price`, `extra_promo_price`, `linkdn_price`, `total_price`, `payment_amount`, coupon fields) remain populated so current admin/reporting code does not break. New V3.4 purchases also receive an itemized order record.

## Coupons

The existing `event_coupons` and `event_coupon_redemptions` tables continue to be used. A coupon now also snapshots its discount onto `event_orders`, which preserves the historical subtotal/discount/total shown on the receipt.

## Stripe and receipts

Checkout is still Stripe-hosted. V3.4:

- attaches order metadata to the Checkout Session and PaymentIntent;
- enables one-time `invoice_creation`;
- stores Checkout Session, PaymentIntent, Charge, Stripe receipt URL, hosted invoice URL, and invoice PDF when available;
- adds `/dashboard/billing`;
- adds `/dashboard/receipts/[orderId]` with an itemized HypeKnight receipt and print/save-to-PDF action;
- exposes Stripe receipt / invoice PDF buttons when Stripe supplies those URLs.

The webhook and success reconciler now agree on `paid_awaiting_approval` for completed event payments.

## Admin

`/admin/commerce` controls:

- V3.4 builder enable flag
- venue address matching
- venue-owner approval requirement
- default 30-minute discovery fallback
- coupons
- receipts
- product availability, price, description, and whether an event end is required

The existing `/admin/settings` system is preserved.

## Install

Use a dedicated branch and rollback tag. From the HKV2 root:

```bash
git checkout main
git pull origin main
git tag pre-event-builder-commerce-v34
git push origin pre-event-builder-commerce-v34
git checkout -b feature/event-builder-commerce-v34
```

Extract the package to a temporary directory and copy only `HKV2/.` into the repo. Do not copy `node_modules`, `supabase/.temp`, or `tsconfig.tsbuildinfo`.

Then inspect:

```bash
git status --short
git diff --stat
git diff --check
```

Apply the migration:

```bash
npx supabase db push
npx supabase migration list
```

Expected new migration: `0006` local and remote.

Validate:

```bash
npx tsc --noEmit
npm run build
```

The existing local build may still stop during page-data collection for `/api/cron/discovery-ai-recommendations` if no local OpenAI key is configured. Compile/lint/type stages should pass before that known environment-only error.

## Minimum manual test

1. Create an event with a physical address and **no end time**. Confirm `promotion_end_at` and `discovery_end_at` are start + 30 minutes.
2. Create an event with an explicit end. Confirm discovery ends at that end.
3. Enable Patron Pulse or Linkd’N in Admin Commerce, give it a test price, select it on an event without an end time, and confirm the builder requires the end date/time.
4. Use an address matching a venue owned by another account. Confirm the event is pending and the venue owner can approve it.
5. Build an order, apply a coupon, complete Stripe test checkout, then open Billing & Receipts and the receipt detail.
6. Confirm admin event moderation/status behavior still follows the existing workflow.

## Validation performed while packaging

The V3.4 changed TypeScript/TSX files passed targeted TypeScript parser/transpile syntax validation. A full isolated `npx tsc --noEmit` could not be completed in the packaging environment because dependency installation timed out and left missing type packages. Run the normal repository typecheck locally before committing; do not merge if it surfaces V3.4 errors.
