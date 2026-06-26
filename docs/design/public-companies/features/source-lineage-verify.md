# Feature: Source lineage / "verify this" (cross-cutting)

> MVP-5. Cross-cutting provenance components used on every page and tab in the
> domain. Ships on the live AMEPIP core lane (the platform's strongest lineage).
> Read with `../design.md` (Pattern B/C) and every other feature file.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + shadcn `Sheet`/
`Dialog`/`Tooltip` + Lingui). Builds reusable, low-dependency provenance
primitives consumed by all other features.

## Summary

Every block of source-derived data in the domain exposes a compact
`SourceLineageBadge` that, when expanded, opens a `SourceProvenanceDrawer` showing
the full chain: source name, snapshot id, workbook SHA-256, workbook/accepted
dates, license, and a "verifică ↗" link to the official source URL. This is the
trust differentiator of the domain and must be cheap to drop onto any fact group.

## Facts, decisions, assumptions

- Fact (UX §1/§5/§13 MVP-5): AMEPIP is snapshot-scoped and chains back to a
  retrievable workbook. Lineage columns available today: `snapshot_id`,
  `raw_snapshot_id`, `workbook_sha256`, `workbook_bytes`, `source_url`,
  `ckan_last_modified`, `loaded_at`, `accepted_at`; plus a
  `public_enterprises.source_traceability` view. Current snapshot
  `amepip-core-3a44f2c099fb711c`. License CC-BY-4.0.
- Fact (UX §5): Per-fact lineage also includes `object_id`, `object_key`,
  `content_sha256`, `source_row_number`, `source_row_hash` for row-level
  traceability (used by tables and document lists).
- Fact (UX §7): Link, never merge — each source keeps its own lineage; a profile
  may show multiple sources (AMEPIP, S1001, json_apt, RegAS, BVB), each with its
  own badge. Never a single merged "official" provenance.
- Decision: The badge is the always-visible affordance; the drawer holds detail.
  Per README, the tooltip/badge never holds the only critical info — the source
  name + "as-of" date are printed in the badge text, not only in the drawer.
- Decision: `verifică ↗` opens the official source URL in a new tab
  (`rel="noopener noreferrer"`). For row-level facts (a table cell, a document),
  the drawer additionally shows `source_row_number` / `content_sha256` when present.
- Assumption: The API attaches a `SourceLineage` object to each fact group it
  returns; mock fixtures carry the same shape. (Confirmed feasible by the
  `source_traceability` view, Fact UX §5.)

## Route and URL state

- Fact: No route of its own. Components mount inside other features.
- Decision: The drawer's open/closed state is ephemeral local state (README:
  popovers/tooltips/temporary UI stay local), NOT a URL param.

## Data contract and mock states

```ts
// Attached to every fact group (design.md §6, extended for row-level)
type SourceLineage = {
  sourceName: string                    // 'AMEPIP' | 'S1001' | 'json_apt' | 'RegAS' | 'BVB' | …
  sourceLabel: string | null            // RO human label, e.g. 'AMEPIP (OUG 109/2011)'
  snapshotId: string | null             // 'amepip-core-3a44f2c099fb711c'
  workbookSha256: string | null
  workbookDate: string | null           // ckan_last_modified, ISO
  acceptedAt: string | null
  loadedAt: string | null
  sourceUrl: string | null              // official CKAN/issuer URL — the verify target
  license: string | null                // 'CC-BY-4.0'
  // Optional row-level fields (tables, documents)
  objectId?: string | null
  contentSha256?: string | null
  sourceRowNumber?: number | null
}

type DataStatus = 'live' | 'partial' | 'gated' | 'mock' | 'stale' | 'empty'
```

### States

- **Live**: badge "Sursă: AMEPIP · {workbookDate} · verifică ↗".
- **Mock** (dev/mock mode): badge prefixed with a `mock` `DataStatusBadge` so dev
  builds never imply real provenance.
- **Stale**: when `workbookDate` is old (>~9 months for yearly AMEPIP), the badge
  appends "ca la {workbookDate}" in muted tone (informative, not alarming).
- **Missing URL**: if `sourceUrl` is null, the verify link is omitted and the
  drawer shows "URL sursă indisponibil" — the badge still renders the snapshot id.
- **Gated lane**: a gated tab shows the lane's intended source name in its
  `LaneStatusPanel`, but no clickable verify until live.

## UI structure

### `SourceLineageBadge` (inline)

Compact, low-contrast chip placed at the end/footer of a fact group:
`Sursă: {sourceLabel ?? sourceName} · {workbookDate} · verifică ↗`. Clicking the
chip (or a small info icon) opens the drawer; the `verifică ↗` segment is itself a
direct external link (so a user can verify without opening the drawer).

### `SourceProvenanceDrawer` (shadcn `Sheet`, right side)

Headed "Proveniență date". Sections:
- **Sursă**: `sourceLabel`, license badge (CC-BY-4.0).
- **Instantaneu (snapshot)**: `snapshotId`, `workbookSha256` (with `copy-button`),
  `workbookDate`, `acceptedAt`, `loadedAt`.
- **Rând sursă** (only when row-level fields present): `sourceRowNumber`,
  `contentSha256`, `objectId`.
- **Verificare**: a prominent `Button`/link "Deschide sursa oficială ↗" →
  `sourceUrl` (new tab). Helper text: "Compară cifra cu sursa oficială AMEPIP."
- **Notă**: "Indicatorii AMEPIP sunt rate/KPI, nu valori contabile absolute."
  (shown when the fact group is indicator-based — Pattern D reinforcement).

### `DataStatusBadge` (shared)

Small pill with text + dot: `live` (neutral), `partial`, `gated` ("în curând"),
`mock`, `stale`, `empty`. Text is the source of truth; color is redundant.

### `LaneStatusPanel` (shared)

Full panel for a gated tab: a heading, a one-paragraph description of what the lane
will contain + why it is not yet live ("Această secțiune va fi disponibilă după
promovarea sursei în producție"), the intended `sourceName`, an optional
`RequestDatasetAction`/"anunță-mă", and a `gated` `DataStatusBadge`.

## Component reuse and proposed new components

- Reuse: `Sheet`, `Dialog` (mobile may use a `Dialog` instead of side `Sheet`),
  `Tooltip`, `Badge`, `Button`, `copy-button`, lucide icons
  (`ShieldCheck`/`FileCheck`/`ExternalLink`/`Info`).
- New (shared candidates per README): `SourceLineageBadge`,
  `SourceProvenanceDrawer`, `DataStatusBadge`, `LaneStatusPanel`,
  `RequestDatasetAction`. Place under `src/features/public-enterprises/components`
  initially; promote to a shared location when a second domain adopts them.

## Interactions

- Click badge/info → open drawer (focus moves into the drawer; Esc/close returns
  focus to the trigger — Radix `Sheet` handles this).
- Click `verifică ↗` (badge or drawer) → open `sourceUrl` in a new tab.
- Copy SHA-256 → `copy-button` writes to clipboard with a `toast.success`.
- "anunță-mă" (gated) → optional capture (out of MVP scope; render as a disabled/
  "în curând" affordance if no backend exists yet).

## Loading, empty, error, partial, stale states

- **Loading**: the badge is omitted (or shown as a skeleton) until its fact group's
  lineage loads; it never blocks the fact.
- **Empty/missing lineage**: if a fact group arrives without lineage (should not
  happen on live AMEPIP), render no badge rather than a fake one — never invent a
  snapshot id.
- Other states under Data contract → States.

## Accessibility and i18n

- Badge has an accessible name "Vezi proveniența datelor"; the external link has
  `aria-label` and an sr-only "se deschide într-o pagină nouă" (matching the
  existing `entity-result-row` external-link pattern).
- Drawer (`Sheet`) has a heading + close control + focus management (README).
- Status badges pair color with text; never color-only.
- All copy Lingui; dates via `Intl.DateTimeFormat('ro-RO')`; SHA shown verbatim
  (technical id, not localized).

## Privacy, provenance, and source-citation behavior

- This feature IS the provenance behavior for the domain. Hard rules it enforces
  for consumers: (1) every source-derived fact group carries a `SourceLineage`;
  (2) multiple sources render multiple badges (no merge); (3) mock mode is visibly
  labelled; (4) no fabricated lineage; (5) the verify link always points at the
  official source, never a Transparenta-internal page.

## Acceptance checklist

- [ ] A `SourceLineageBadge` can be dropped onto any fact group and renders source
      name + as-of date + verify link from a `SourceLineage` object.
- [ ] The drawer shows snapshot id, SHA-256 (copyable), dates, license, and an
      external verify link to the official AMEPIP URL.
- [ ] Row-level facts (table cells, documents) surface `source_row_number` /
      `content_sha256` when present.
- [ ] Multiple sources on one page render as separate badges; nothing is merged.
- [ ] Mock mode is visibly labelled; missing `sourceUrl` degrades without breaking.
- [ ] `DataStatusBadge` and `LaneStatusPanel` exist and are reused by every gated
      tab.
- [ ] Drawer manages focus and is keyboard/Esc closable; all strings Lingui;
      `yarn typecheck` clean.

## Non-goals

- No editing/annotation of provenance.
- No cross-snapshot diff (reserved, UX §14 Advanced-4).
- No backend for "anunță-mă" beyond a placeholder unless one already exists.

## Open questions (blockers only)

- None. Lineage data is live today (UX §5); this feature only surfaces it.
