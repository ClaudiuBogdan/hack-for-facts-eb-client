# Parlament — design principles

Date: 2026-05-22
Status: Active
Scope: `transparenta.eu/parlament` and child routes

This document adapts patterns from the [UK Parliament Design System](https://designsystem.parliament.uk/) for transparenta.eu’s accountability-first Romanian Parliament section.

## Principles

### P1 — Transparency over ceremony
Every page shows data sources, legislature, and last sync. Methodology is one click away.

### P2 — Task-first hub
The hub answers: who represents me, what was voted recently, how is Parliament composed.

### P3 — One URL namespace
`/parlament/membri`, `/parlament/voturi`, `/parlament/grupuri` under a single namespace.

### P4 — Progressive disclosure
List → summary → detail → export. Never dump full lists without filters.

### P5 — Chamber-aware templates
Same components for Camera Deputaților and Senat with chamber-specific labels.

### P6 — Cross-link everything
Votes ↔ members ↔ groups ↔ budget institutions.

### P7 — Stable URLs
Use `memberId`, `groupId`, `voteId` in paths; add tabs as sub-routes.

### P8 — Mock-first
Schemas in `src/schemas/parliament.ts`, mocks in `src/features/parliament/mocks/`.

### P9 — No sidebar until mature
Entry via dashboard promo, budget links, learning cross-links.

### P10 — Accessible, mobile-first
Semantic headings, keyboard tables, descriptive links, shadcn/Radix patterns.

See also: `docs/user-stories/parlament.md`
