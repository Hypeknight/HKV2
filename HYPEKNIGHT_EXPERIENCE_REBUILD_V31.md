# HypeKnight Experience Rebuild V3.1

## Goal
Move HypeKnight from a collection of working modules into a coherent, mobile-first live-experience product while preserving the backend, operational tables, signal architecture, Market Registry, and Admin Control Center.

## Product model
- Public: fast discovery and decision-making.
- Logged-in patron: **My Night** — personalized recommendations, saved/Going activity, preferences, identity, and later social/messages.
- Creator/operator workspaces: secondary tools, available when needed but no longer competing with patron discovery.
- Admin: existing Admin Control Center remains the platform operations surface.

## Fixes in this release
1. Homepage location no longer uses the market with the most inventory. It uses browser/device geolocation with a manual fallback and stores only a coarse city/state context in local storage.
2. Surprise Me asks one question first: **Where are you?** It chooses only from that city/registered metro and uses saved preferences when the visitor is logged in.
3. Surprise results include **I like this** and **Not for me** feedback. Feedback reuses the existing `recommendation_selected` signal with value +1/-1 and metadata; no schema migration is required.
4. Homepage vibe cards now derive their displayed count and destination from the same observed search term so a card does not advertise inventory and open an empty search.
5. Profile completion now reads `user_event_preferences.onboarding_completed`, fixing the previous 75% limbo caused by looking for preference fields on `profiles`.
6. Saving preferences synchronizes the chosen home city/state into `profiles`, preventing contradictory location state between profile and discovery preferences.
7. Logged-in homepage and My Night dashboard use the existing preference ranking engine.
8. Logged-in navigation is reorganized around Discover / My Night / Saved / You. Venue/promoter/admin tools are secondary workspaces.
9. Event detail is visually separated from the homepage with a media + detail split hero, and duplicate engagement metrics are reduced.
10. `app/events/[slug]/page.tsx` is cleaned down to the single active implementation, removing thousands of lines of obsolete commented versions.

## Location implementation note
The browser requests device geolocation only after user interaction. Reverse geocoding is performed server-side through `/api/location/reverse`. The current beta fallback uses OpenStreetMap Nominatim. Before large-scale production traffic, replace this behind the same route with a contracted geocoding provider (Mapbox/Google/etc.) without changing the UI.

## No database migration
This release does not require a Supabase migration.

## Recommended validation
- `git diff --check`
- `npx tsc --noEmit`
- `npm run build` (the existing local OpenAI credential limitation may still stop page-data collection after compile/type validation)
- Mobile Safari/Chrome at ~390px width
- Desktop at 1440px+

## Functional tests
- Homepage location: allow device location; confirm displayed city/state changes.
- Search bar: confirm city/state auto-fill from stored location.
- Surprise Me: deny location and use manual city; then allow location; confirm only local/metro inventory is returned.
- Surprise feedback: click Not for me and confirm a different result is requested.
- Vibes: every visible vibe card should open at least one matching event.
- Profile: save profile + preferences; confirm 100% when the four current profile signals are complete.
- Recommendations: compare logged-in recommendations before/after changing music/vibe preferences.
- Event page: confirm Save, Interested, Going, Directions, Share, Pulse, and management controls still function.
