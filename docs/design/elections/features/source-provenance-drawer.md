# Feature: Source / Provenance Drawer (shared)

> Self-sufficient spec. Foundation: `docs/design/README.md` (shared component
> `SourceProvenanceDrawer`). Domain: `../design.md` (`SourcePointer` §6). UX:
> `docs/ux-research/elections.md` §13.5, §15.4–15.6.

## Feature owner profile

Frontend platform/component engineer (React 19, shadcn/ui `Sheet`, Radix focus
management, Lingui). Builds a **shared, cross-domain** component with an
elections adapter; coordinates with the foundation owner so other domains reuse
it. Not a page; an interaction surface.

## Summary

A single click on any number, chart point, metric label, or result row reveals
exactly where the value came from: source resource, file, row number, row hash,
authority, source family, retrieval/publication dates, metric mapping status,
and access status — with a link to the official resource. This is core to
Transparenta.eu's trust proposition and differentiates from BEC/ROAEP portals.

## Facts / Decisions / Assumptions

- **Fact:** Every serving row carries `source_resource_id, source_file_id,
  source_row_number, source_row_hash, source_updated_at`; raw payloads stay in
  the raw DB.
- **Fact:** Metric values map via `source_metric_map` with `mapping_status` and
  `resolver_version`.
- **Fact:** Some resources are `inaccessible_with_evidence` (16) or
  `terminal_resource_requires_review` (4); `resourceUrl` may be null.
- **Decision:** Build as a **shared component** `SourceProvenanceDrawer` in
  `src/components/` (foundation-owned), taking a normalized `SourcePointer[]`
  plus a small `context` object (entity title, metric label). Elections passes
  its pointer shape; other domains pass theirs.
- **Decision:** Drawer is a Radix/shadcn `Sheet`: right side on `md`+, bottom on
  mobile. Triggered by `EvidenceLink` chips placed by consuming features.
- **Decision:** When `resourceUrl` is null and `accessStatus !== 'ok'`, render
  the evidenced-gap state (badge + reason), not a dead link.
- **Decision:** The drawer can show **multiple pointers** when a displayed value
  aggregates several source rows (e.g. a county total summing communes); it
  lists them with counts and a "valoarea afișată este o agregare" note.
- **Assumption:** `resolver_version` and raw payload preview are optional; if the
  adapter omits them, the drawer hides those rows gracefully.

## Trigger and state

- Not URL-routed by default (ephemeral UI state). **Decision:** open/close is
  local component state; the trigger chip is keyboard-focusable.
- **Optional deep-link (decision):** consuming pages may set `source=<rowHash>`
  in their search params to auto-open the drawer for a specific row (used by
  `ShareFilteredView` to share an exact-evidence link). The page reads `source`
  and opens the drawer for the matching pointer on mount; closing clears it.

## Data contract and mock states

```ts
interface ProvenanceContext {
  readonly entityTitle: string      // "Primar — Cluj-Napoca, 2024"
  readonly metricLabel: string | null  // canonical, e.g. "Voturi candidat"
  readonly sourceMetricCode: string | null
  readonly mappingStatus: string | null
  readonly resolverVersion: string | null
  readonly valueDisplay: string | null // "12.345 (43,2%)"
  readonly isAggregate: boolean
}

// Consumes SourcePointer[] from domain §6 plus the context above.
function openProvenance(pointers: readonly SourcePointer[], ctx: ProvenanceContext): void
```

API: pointers come embedded in already-fetched result data — **no extra fetch**
for the common single-row case. For raw-payload preview (optional), an on-demand
`fetchSourceRowPreview(sourceFileId, sourceRowNumber): Promise<RawPreview>` is
called only when the user expands "Vezi rândul brut".

Mock fixtures: `provenance-samples.ts`. Provide: a clean single pointer; an
aggregate (3 pointers); an inaccessible resource (`resourceUrl=null`,
`accessStatus='inaccessible_with_evidence'`); a metric with
`mapping_status='unmapped'`/legend code; a pointer with null `sourceUpdatedAt`.

## UI structure

`Sheet` content, top to bottom:

1. Header — `entityTitle` + `valueDisplay`; close button (`aria-label`).
2. **Sumar metric** — canonical `metricLabel`; if expert/available, the
   `sourceMetricCode` → canonical mapping with a `mapping_status` badge
   (`mapat` / `nemapat` / `în revizuire`) and `resolverVersion`.
3. **Sursă** — authority (AEP/BEC/ROAEP, expanded), source family,
   `FreshnessBadge` ("actualizat la …" / "publicat la …" from `sourceUpdatedAt`/
   `publishedAt`), `accessStatus` badge.
4. **Pointer(s)** — for each `SourcePointer`: resource id, file id, row number,
   truncated row hash (copy button), and a primary `EvidenceLink`/`Button`
   "Deschide resursa oficială" → `resourceUrl` (new tab) — OR the evidenced-gap
   block ("Sursă inaccesibilă (cu dovadă)" + reason + any evidence link) when
   null/inaccessible.
5. **Agregare** (only if `isAggregate`) — "Valoarea afișată însumează N rânduri
   de sursă" + the pointer list.
6. **Rând brut** (optional, collapsed) — "Vezi rândul brut" expands
   `fetchSourceRowPreview` into a read-only key/value or text view.
7. Footer — copy-all-provenance button; "Despre proven: ce înseamnă asta?" link.

## Component reuse and new components

- Reuse: `Sheet`, `Badge`, `Button`, `Tooltip`, `Skeleton`, copy-to-clipboard
  util, lucide (`ExternalLink`, `Copy`, `FileWarning`).
- Shared: `FreshnessBadge`, `DataStatusBadge` (for `accessStatus`),
  `EvidenceLink` (the trigger), `RequestDatasetAction` (for inaccessible — "cere
  redeschiderea sursei").
- New (shared component): `SourceProvenanceDrawer`, `ProvenancePointerRow`,
  `MetricMappingRow`.

## Interactions

- `EvidenceLink` chip (placed by features on figures/rows/chart points) opens
  the drawer with that value's pointers + context.
- Copy buttons copy hash / full provenance JSON.
- "Deschide resursa oficială" opens `resourceUrl` in a new tab
  (`rel="noopener"`).
- "Vezi rândul brut" lazy-loads the raw preview (own loading/error state).
- Closing returns focus to the trigger; clears `source` deep-link param if set.

## Loading / empty / error / partial / stale states

- **Loading:** only the optional raw preview loads; the pointer metadata is
  already present (no spinner for the core view).
- **Empty:** a value with no pointer (should not happen for serving rows) →
  "Provenință indisponibilă pentru această valoare" honest state.
- **Error:** raw-preview fetch fail → inline retry inside the expander; core
  provenance stays visible.
- **Partial / inaccessible:** evidenced-gap block; `mapping_status` shown when
  the metric is legend-coded/unmapped.
- **Stale:** `FreshnessBadge` shows the as-of date.

## Accessibility and i18n

- Radix `Sheet` manages focus trap, ESC close, labelled heading; trigger has
  `aria-haspopup="dialog"`.
- Hash and ids are in copyable text, not only tooltips.
- All copy via Lingui; expand AEP/BEC/ROAEP/SIRUTA; dates via `Intl`.
- The drawer never hides *critical* info in a tooltip (foundation rule).

## Privacy, provenance, source citation

- This is the provenance surface; it must be honest about inaccessible/unmapped
  sources and never fabricate a `resourceUrl`.
- No personal data is added here beyond what the pointer already references.
- Aggregate values disclose aggregation explicitly.

## Acceptance checklist

- [ ] Opens from any `EvidenceLink` with the correct pointer(s) + context.
- [ ] Shows resource/file/row/hash, authority, source family, freshness, access
      status, and a working official-resource link when available.
- [ ] Inaccessible/terminal resources render evidenced-gap state, no dead link.
- [ ] Metric mapping status + source code shown when present.
- [ ] Aggregate values list all contributing pointers.
- [ ] Optional `source=<rowHash>` deep-link auto-opens and clears on close.
- [ ] Focus management, ESC, copy buttons work; `yarn typecheck` clean; Lingui.

## Non-goals

- A full source-metric dictionary explorer (advanced, separate surface).
- Editing/flagging provenance (read-only here).
- Raw DB browsing beyond a single-row preview.

## Open questions (blockers only)

None. Raw-row preview is optional; if no preview endpoint exists at integration,
ship without the "Vezi rândul brut" expander — not a blocker.
