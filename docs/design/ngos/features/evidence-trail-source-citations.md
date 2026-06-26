# Feature: Evidence Trail & Source Citations

> MVP-3 — the platform's trust proposition: every claim cites its official source.
> Source UX: `docs/ux-research/ngos.md` §9, §10.5, §13 MVP-3. Domain design:
> `docs/design/ngos/design.md`. Foundation: `SourceProvenanceDrawer`, `EvidenceLink`,
> `FreshnessBadge`.

## Feature owner profile

Frontend implementation subagent specializing in **provenance / data-trust UI** (React
19 + TypeScript, TanStack Router with Zod `validateSearch`, shadcn `Sheet`/`Table`,
Lingui). Delivers the cross-cutting citation primitives consumed by the profile,
discovery, and name-only surfaces, plus a dedicated per-snapshot provenance page. This
is a dependency of MVP-1; build it first or in parallel.

## Summary

A reusable citation layer: an inline `SourceCitationChip` on every claim, a
`SourceProvenanceDrawer` for the quick provenance view, a per-profile `EvidenceTrail`
section listing all evidence rows, and a dedicated `/ong-uri/sursa/$snapshotId` page
showing full snapshot provenance (URL, declared date, SHA-256, parser version,
fingerprints, row count, status, accepted_at) and that snapshot's validation issues.

## Facts / Decisions / Assumptions

- **Fact:** Source traceability is strong — every `organization_evidence` row carries
  `source_snapshot_id`, `source_record_key`, `source_row_hash`, `source_url`,
  `source_id`, `review_status`, `confidence`, `identity_basis`, `attrs`.
- **Fact:** `source_snapshots` carries `source_url`, `content_sha256`,
  `content_length_bytes`, `parser_version`, `schema_fingerprint`, `header_fingerprint`,
  `row_count`, `status`, `is_current`, `source_declared_snapshot_date`, `accepted_at`.
- **Fact:** `validation_issues` exist per snapshot (DQ warnings/blockers), e.g. "412
  missing + 64 invalid + 180 over-long employment CUIs correctly excluded".
- **Fact:** Sources: ANOFM (RUEIS + employment accreditation), MMuncii (providers +
  services), ANAF (financials, pending), MJ (legal registry, name-only), SGG (public
  utility, name-only).
- **Decision:** Citation appears at the **point of use** — section headers and record
  rows — not only in a hidden trail. The trail is a first-class IA element.
- **Decision:** Two depths: a `SourceProvenanceDrawer` (quick, in-context) and a
  full-page `/ong-uri/sursa/$snapshotId` (linkable, shareable). The chip opens the
  drawer; a "Vezi sursa completă" link inside the drawer goes to the page.
- **Decision:** Show `source_declared_snapshot_date` as the user-facing "snapshot
  date" / `FreshnessBadge`; show SHA-256 truncated with a `CopyButton` for the full
  value.
- **Assumption:** `source_id` maps to a human authority label (ANOFM/MMuncii/MJ/SGG/
  ANAF) via a small client label map; if the API returns a display name, prefer it.

## Route and URL state

- **Route:** `/ong-uri/sursa/$snapshotId` (file route `ong-uri.sursa.$snapshotId.tsx`).
  `$snapshotId` validated as a non-empty id; unknown → `notFound()`.
- **Search params:** `from?` (backtrack context, e.g. the originating CUI/profile),
  `lang?`. Default view = no params.
- **Drawer (no route):** the `SourceProvenanceDrawer` is an ephemeral `Sheet`; its open
  state is local, not URL. Rationale: it is a transient inspection, not a shareable
  view; the shareable artifact is the `/ong-uri/sursa/$snapshotId` page.

## Data contract and mock states

Consumes `EvidenceRecord`, `SourceSnapshot`, `ValidationIssue` from `design.md` §6.

```ts
type SnapshotProvenance = {
  snapshot: SourceSnapshot
  authorityLabel: string                  // resolved from source_id
  evidenceRows: EvidenceRecord[]          // rows derived from this snapshot
  validationIssues: ValidationIssue[]
}

type CitationRef = {                       // what a chip needs
  sourceSnapshotId: string
  authorityLabel: string
  snapshotDate: string | null
  reviewStatus?: EvidenceRecord['reviewStatus']
  confidence?: number | null
}
```

**Mock states:**
1. **Healthy snapshot** — current, accepted, no validation issues, several evidence
   rows.
2. **Snapshot with DQ issues** — `validation_issues` listing excluded-CUI counts.
3. **Stale snapshot** — MMuncii 2023/2024 with `is_current: true` but old declared
   date → `FreshnessBadge` stale styling.
4. **Name-only source** — MJ/SGG snapshot whose evidence rows are `identity_basis:
   name_review`, `review_status: review_pending`.
5. **Unknown snapshot id** → `notFound()`.

## UI structure

### A. `SourceCitationChip` (inline, everywhere)
Compact: `Sursă: <authority> · <snapshot date>`. For non-confirmed rows, append a
small `review_status`/confidence marker. Opens the drawer on click; `aria-label`
"Vezi sursa: <authority>, <snapshot date>".

### B. `SourceProvenanceDrawer` (`Sheet`)
Heading "Sursa datelor". Body (label/value rows, no nested cards):
- Authority + `source_id`.
- `source_url` (external link, new tab, `rel="noreferrer"`).
- Snapshot date (`source_declared_snapshot_date`) + `FreshnessBadge`; `accepted_at`.
- `status` + `is_current`.
- `row_count`, `content_length_bytes`.
- `parser_version`, `schema_fingerprint`, `header_fingerprint` (mono, truncated).
- `content_sha256` truncated + `CopyButton` for full.
- Validation issues summary (count by severity) if any.
- Footer: "Vezi sursa completă →" → `/ong-uri/sursa/$snapshotId?from=…`.

### C. `EvidenceTrail` (profile section `#dovezi`)
Collapsible. A `Table` of all `EvidenceRecord`s for the org:
- Columns: Tip dovadă (`evidence_kind`, plain language), Sursă (authority), Bază
  identitate (`identity_basis` via `IdentityConfidenceBadge`), Stare
  (`review_status`), Încredere (`confidence` %, or "—"), Data instantaneu, Sursă (chip).
- Grouped by `evidence_kind`; name-only rows visually distinguished (amber row accent +
  identity badge), consistent with the references zone.

### D. `/ong-uri/sursa/$snapshotId` page
Constrained `max-w-5xl`. Breadcrumb `ONG-uri / Sursă / <authority> <date>`. Sections:
1. Header: authority, snapshot date, status, `FreshnessBadge`, "Înapoi" (uses `from`).
2. Provenance table (same fields as the drawer, full SHA-256 with copy).
3. `validation_issues` table (severity, code, message, count) — neutral framing:
   "Înregistrări excluse corect la încărcare", with a `PrivacyBoundaryNotice`-style
   explanation that exclusions are a data-quality feature, not a defect.
4. Derived-evidence list: the `EvidenceRecord`s produced by this snapshot, each linking
   to its organization profile (`/ong-uri/$cui`) where a CUI exists.

## Component reuse and proposed new components

- **Reuse:** `Sheet`, `Table`, `Collapsible`/`Accordion`, `Badge`, `CopyButton`,
  `Button`, `Breadcrumb`, `Skeleton`, `EmptyState`, `Alert`, `ScrollArea`, `Tooltip`.
- **Consume:** `IdentityConfidenceBadge` (MVP-4), `FreshnessBadge`,
  `PrivacyBoundaryNotice`, `DataStatusBadge`.
- **New (owned here, promote to `src/components/provenance/`):**
  - `SourceCitationChip` (a.k.a. `EvidenceLink`) — inline citation chip.
  - `SourceProvenanceDrawer` — the `Sheet`-based provenance viewer.
  - `EvidenceTrail` — the per-profile grouped evidence table.
  - `SnapshotProvenancePage` — content component for `/ong-uri/sursa/$snapshotId`.

## Interactions

- Chip click → open drawer; `Esc`/close button dismiss; focus returns to chip.
- "Vezi sursa completă →" → navigate to the snapshot page (`from` set).
- External `source_url` → new tab, `rel="noreferrer"`.
- `CopyButton` copies the full SHA-256.
- Evidence trail expand/collapse (mirrors profile `?evidence=1`).
- Snapshot page derived-evidence row → org profile.

## Loading, empty, error, partial, stale states

- **Loading:** drawer shows skeleton rows; snapshot page uses `pendingComponent`.
- **Empty:** no validation issues → "Fără probleme de validare pentru acest
  instantaneu." No derived evidence → `EmptyState`.
- **Partial:** missing fingerprint/hash fields → "—" (the source genuinely may omit
  them); never fabricate.
- **Stale:** `FreshnessBadge` styles old snapshot dates; explicit on drawer + page.
- **Error:** unknown snapshot id → `notFound()` page; fetch failure → inline `Alert`
  with retry, URL preserved.

## Accessibility and i18n

- Chips are buttons with descriptive `aria-label`; drawer focus-trapped with heading +
  close; tables semantic with `<th scope>`.
- Mono/fingerprint values have visible text plus copy; truncation has a tooltip with
  the full value where feasible (but full value also reachable via copy, never
  tooltip-only).
- Lingui throughout; expand authority acronyms; locale-aware dates; confidence as a
  locale percentage.

## Privacy, provenance, and source-citation behavior

- This feature *is* the provenance behavior: every claim across the domain links here.
- Validation-issue framing is neutral and explanatory (exclusions = quality control).
- Name-only evidence rows carry their `identity_basis`/`review_status` and never imply
  confirmed identity.
- No content beyond what the snapshot/evidence rows contain is invented.

## Acceptance checklist

- [ ] `SourceCitationChip` renders on every profile section header and discovery row,
      opening `SourceProvenanceDrawer`.
- [ ] Drawer shows source URL, snapshot date, status, row count, parser version,
      fingerprints, full-copy SHA-256, and validation summary.
- [ ] `EvidenceTrail` lists all evidence rows grouped by kind with identity badges and
      per-row citation.
- [ ] `/ong-uri/sursa/$snapshotId` route renders full provenance + validation issues +
      derived-evidence links; unknown id → `notFound()`.
- [ ] All five mock states render; mock surfaces marked with `DataStatusBadge`.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; drawer + page have smoke tests.

## Non-goals

- No snapshot-diff / supersede-history explorer (advanced ADV-4).
- No editing of snapshots or validation issues.
- No raw file download/proxy of the source content (link to `source_url` only).

## Open questions (blockers only)

None. (Non-blocking: authority display labels prefer API-provided names when available.)
