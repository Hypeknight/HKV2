# HypeKnight Admin Control Center V2.2

This release folds the V2.1 Market Management update into a broader admin-interface redesign.

## Goals

- Make every existing admin avenue discoverable from one persistent navigation system.
- Prioritize duties and exceptions before reporting/configuration.
- Support desktop and mobile administration without relying on memorized URLs.
- Preserve every existing admin route and page; no route is deleted.
- Keep the redesign additive so individual admin pages can be modernized progressively later.

## New admin shell

`app/admin/layout.tsx` centralizes admin access control and wraps all `/admin/*` pages in the new Control Center shell.

`components/admin/AdminControlShell.tsx` provides:

- persistent desktop sidebar;
- mobile slide-out navigation;
- grouped navigation based on the admin routes that actually exist;
- current-location indicator;
- admin-tool finder/search;
- quick access to the event review queue;
- public-site return link.

## Dashboard redesign

`app/admin/page.tsx` is reorganized around four admin questions:

1. What needs action?
2. What is happening now?
3. What do I need to do repeatedly?
4. Which workspace should I enter?

The dashboard keeps the existing operations summary, event lifecycle, activity, payment, user, venue, coupon, and lookup data sources.

## Restored/discoverable avenues

The shell explicitly surfaces existing routes for:

- Events
- Venues
- Venue Owner Requests
- DJs
- External Events
- Patron Pulse
- Linkd’N
- Intelligence Lab
- Market Registry
- Discovery Center
- AI Recommendations
- Users
- Ambassadors
- Payments
- Coupons
- Venue Plans
- Analytics
- Calendar
- Settings
- Configuration
- Lookups
- System Health
- Activity Center

The previous dashboard referenced `/admin/moderation`, but that route does not currently exist. This redesign does not create a fake moderation destination; moderation work continues through the event/content-specific operational pages that actually exist.

## V2.1 Market Management included

This package also retains:

- Create Market
- Add/Move Market Area
- Exceptional Event/Venue Market Override
- automatic observed-market cleanup after a city is linked into a metro
- migration `0004_market_management_admin_tools.sql`

## Deployment notes

This release contains the same pending V2.1 database migration (`0004`) plus the admin UI files. Apply the database migration before deploying UI code that depends on the new market-management RPCs.
