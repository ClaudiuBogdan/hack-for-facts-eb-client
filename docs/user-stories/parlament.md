# Parlament — user stories

Design principles: [`docs/specs/parlament-design-principles.md`](../specs/parlament-design-principles.md)

## Phase 0 — Hub

### P0-1 — Parliament entry point
As a visitor, I want a clear entry point at `/parlament` with task cards and data sources.

### P0-2 — Chamber composition
As a journalist, I want chamber composition summaries by grup parlamentar.

### P0-3 — Budget cross-link
As a citizen, I want a link to Parliament budget spending on `/buget-national-2026`.

## Phase 1 — Members

### P1-1 — Find by județ
As a citizen, I want to find deputați/senatori by județ via `/parlament/membri?find=1`.

### P1-2 — Search members
As a journalist, I want name search on `/parlament/membri`.

### P1-3 — Member profile
As a user, I want profile with group, chamber, județ at `/parlament/membri/$memberId`.

### P1-4 — Contact
As a citizen, I want contact tab or empty state with official links.

### P1-5 — Groups
As a journalist, I want grupuri parlamentare at `/parlament/grupuri`.

## Phase 2 — Votes

### P2-1 — Browse votes
Filterable index at `/parlament/voturi`.

### P2-2 — Division detail
Group breakdown at `/parlament/voturi/$chamber/$voteId`.

### P2-3 — Export
CSV export from division detail.

### P2-4 — Cross-links
Member names link to profiles from division lists.

## Phase 3 — Proiecte legislative

### P3-1 — Browse bills
Filterable index at `/parlament?tab=proiecte`.

### P3-2 — Bill detail
Romanian passage tracker at `/parlament/proiecte/$billId` with Detalii, Etape, Documente, Voturi tabs.

### P3-3 — Cross-links
Bills ↔ votes ↔ members via `relatedBillId` and initiator links.

## Phase 4 — Future
Member voting history analytics, group discipline, legislație links to Portal Legislativ.
