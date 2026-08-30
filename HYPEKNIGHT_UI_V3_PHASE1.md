# HypeKnight UI V3 — Phase 1

## Purpose

This release begins the HypeKnight experience rebuild without replacing the existing backend or deleting legacy routes. It establishes a reusable visual language and rebuilds the highest-traffic public entry points around mobile discovery and signal-producing choices.

## Included

- Modern sticky public navigation with desktop and mobile patterns.
- Logged-in mobile bottom navigation for Discover, My Night, Venues, and Profile.
- New homepage information architecture built around the question: “What are you doing tonight?”
- Signal-aware discovery command bar.
- Explicit time-intent controls for Live, Soon, Tonight, and Weekend.
- Vibe and market choices continue emitting declared signals.
- Modern event-card treatment across EventRail surfaces.
- New shared V3 visual primitives in globals.css (`hk-kicker`, `hk-glass-panel`, ambient hero treatments).
- Redesigned footer.
- Existing routes, database structures, signal APIs, Admin Control Center, and operational tables remain intact.

## Signal guardrails

This phase intentionally does not manufacture Hype, Momentum, Pulse, attendance, or confidence values. It exposes only information supported by current schedule/inventory data and captures user choices that will strengthen future intelligence.

## Next phases

1. Event detail experience + decision bar.
2. Venue experience + Follow / Directions / live context.
3. Logged-in patron “My Night” experience.
4. Operator management shell + intelligence views.
5. Progressive Hype / Momentum / Pulse / Confidence surfaces backed by sufficient evidence.
6. Admin Control Center visual alignment with the V3 component system.

## Migration approach

No legacy file is deleted in this phase. `components/Navbar.tsx` remains as a compatibility wrapper around the new V3 navigation so existing imports do not need to change.
