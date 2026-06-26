# Feature: Coverage & "data as of" transparency layer

> MVP-6. The non-negotiable trust companion to every procurement surface. Owns the
> shared coverage, freshness, provenance, and capability-gate components + hook.
> Build this **first** — every other feature depends on it.

## Feature owner profile

Implementation subagent type: **shared-component / design-system engineer** (shadcn
+ TanStack Query + Lingui). Produces reusable cross-domain components consumed by
procurement (and later legal/justice).

## Summary

A reusable layer that exposes, near every number: source coverage (CUI / amount /
date / CPV presence rates vs thresholds), freshness ("data as of" + cadence), and
the capability gate (which answer classes are allowed vs blocked). It standardizes
`CoverageRibbon`, `DataStatusBadge`, `FreshnessBadge`, `SourceProvenanceDrawer`,
`EvidenceLink`, `IdentityConfidenceBadge`, `PrivacyBoundaryNotice`,
`ReviewSignalBadge`, plus a `useCapabilityGate` hook.

## Facts / Decisions / Assumptions

- **Fact:** The scraper exposes `aggregate_quality_by_grain` (per-grain coverage
  rates) and `public_contracts_filter_capabilities_v1` (machine-readable gate of
  allowed/blocked answer classes) (UX §5.2, §6.4).
- **Fact:** Thresholds — authority CUI ≥0.95, supplier CUI ≥0.95, amount ≥0.95
  (spend), CPV ≥0.85, date ≥0.85, authority territory ≥0.70 (UX §6.4).
- **Fact:** Blocked in v1: `supplier_region_filter`, `llm_generated_filter`
  (UX §6.4, §11.4).
- **Fact:** Sync CronJobs are code-complete but `suspend: true`; some validation
  jobs were erroring 2026-06-25 — so freshness has a real lag (UX §6.3).
- **Fact:** README §"Shared components to standardize" already names this exact set;
  this feature realizes them for procurement and keeps them domain-agnostic.
- **Decision:** Components live under `src/components/shared/` (or the agreed shared
  path), are domain-agnostic (take props, not procurement types), and are re-exported
  for other domains.
- **Decision:** The gate is consumed via a `useCapabilityGate(gate)` hook returning
  helpers: `isAllowed(answerClass)`, `isBlocked(dimension)`, `coverageOf(metric)`,
  `meets(metric)`. Features call it to decide whether to render a value, hide a
  filter, or downgrade spend→count.
- **Decision:** Coverage is shown at three altitudes: page (`CoverageRibbon`),
  element (`DataStatusBadge` on a KPI/chart), and detail (tooltip + drawer).
- **Assumption:** Freshness watermark + cadence are available from the gate payload
  (`dataAsOf`, `cadence`) or a sibling metadata endpoint; until then mocks provide
  them and the live adapter maps them.

## Route and URL state

- **None.** Cross-cutting components + hook. No route, no URL state of its own.
  Consuming features pass data + gate; components are presentational.

## Data contract and mock states

Types (canonical; re-exported, referenced by every feature) — `CoverageGrade`,
`CapabilityGate` from `design.md` §6.2, plus:

```ts
type DataStatus = 'live' | 'mock' | 'partial' | 'stale' | 'blocked' | 'unverified'

type ProvenanceInfo = {
  readonly sourceLabel: string            // 'e-licitatie / SEAP'
  readonly sourceUrl: string | null       // deep link
  readonly scraperRef: string | null      // scraper-references catalog id
  readonly retrievedAt: string | null
  readonly publishedAt: string | null
  readonly parserNotes: string[]          // caveats (currency, name hygiene, etc.)
}

type IdentityConfidence = 'high' | 'medium' | 'low'
```

Component prop contracts:

```ts
// Page-level summary
function CoverageRibbon(props: {
  status: DataStatus
  coverage: CoverageGrade[]
  dataAsOf: string | null
  cadence: string | null
  blocked?: string[]            // human labels of blocked dimensions in context
  collapsible?: boolean         // mirror PnrrDataQualityBanner pattern
}): JSX.Element

function DataStatusBadge(props: { status: DataStatus; label?: string;
  tooltip?: string }): JSX.Element

function FreshnessBadge(props: { kind: 'actualizat' | 'publicat' | 'pana_la';
  date: string | null; stale?: boolean }): JSX.Element

function SourceProvenanceDrawer(props: { provenance: ProvenanceInfo;
  trigger: React.ReactNode }): JSX.Element   // shadcn Sheet/Drawer

function EvidenceLink(props: { href: string; label?: string;
  kind?: 'source' | 'document' | 'record' }): JSX.Element

function IdentityConfidenceBadge(props: { confidence: IdentityConfidence;
  reason?: string }): JSX.Element

function PrivacyBoundaryNotice(props: { reason: string;
  variant?: 'aggregated' | 'redacted' | 'withheld' }): JSX.Element

function ReviewSignalBadge(props: { signal: string;
  caption?: string /* default 'semnal de verificare, nu o concluzie' */ }): JSX.Element
```

Mock states (storybook-style fixtures the implementer ships):

- **All-green coverage** — every metric ≥ threshold; status `live`.
- **Partial** — amount < 0.95; status `partial`; spend answers downgraded.
- **Stale** — `dataAsOf` older than cadence; status `stale` + suspended-sync note.
- **Blocked** — supplier-region / LLM dimension; status `blocked` + reason.
- **Unverified** — a not-yet-served lane (TED/per-lot); status `unverified`.
- **Mock** — local mock-mode badge so dev builds never imply live data.

## UI structure & behavior

- **`CoverageRibbon`:** compact horizontal strip (icon + summary sentence + status
  badge + "data as of") that expands (`Collapsible`, like `PnrrDataQualityBanner`)
  into per-metric coverage bars (`metric: rate / threshold ✓/✗`) and the blocked-
  filter list. Neutral amber/slate styling, never red/danger.
- **`DataStatusBadge`:** small pill next to a KPI/chart title; status via
  text + icon + color (never color alone). Tooltip gives the precise rate.
- **`FreshnessBadge`:** "Date până la 25.06.2026 · cadență: zilnic (suspendat)";
  `stale` adds a subtle warning icon + text.
- **`SourceProvenanceDrawer`:** Sheet with source label + link, scraper ref,
  retrieval/publication dates, and a bulleted parser-caveats list (currency
  unconverted, name hygiene pending, procedures-date gap, dedup note).
- **`useCapabilityGate`:** pure hook over the gate object; no fetching.

## Component reuse and proposed new components

- Reuse: `Collapsible`, `Badge`, `Tooltip`, `Sheet`, `Progress` (coverage bars),
  `Separator`, lucide icons (`Info`, `AlertCircle`, `ShieldCheck`, `Clock`,
  `ExternalLink`, `Lock`).
- New (all shared): the eight components above + `useCapabilityGate`.

## Interactions

- Ribbon expand/collapse persists per session (local state; not URL).
- Provenance drawer opens from any record/KPI; focus-managed.
- Badges are non-interactive except tooltip; the drawer is the deep affordance.

## Loading, empty, error, partial, stale states

- These components **are** the partial/stale/blocked rendering for the domain.
- When coverage data itself is missing, render `unverified` rather than implying
  completeness.
- Never silently omit a number that should carry coverage — show the badge.

## Accessibility and i18n

- All status conveyed by text + icon + color; coverage bars have text values.
- Drawer/Sheet focus-managed with heading + close (Radix).
- Tooltips supplement, never sole carrier of critical info.
- All strings Lingui-wrapped; RO: "Acoperire", "Date până la", "Sursă",
  "Necesită verificare", "Indisponibil în v1", "semnal de verificare, nu o
  concluzie", "Încredere identitate". Acronyms expanded.

## Privacy, provenance, source citation

- This feature is the privacy/provenance mechanism for the domain:
  `PrivacyBoundaryNotice` explains aggregation/redaction; `SourceProvenanceDrawer`
  + `EvidenceLink` cite sources; `IdentityConfidenceBadge` discloses weak joins.
- `ReviewSignalBadge` enforces neutral language platform-wide (no wrongdoing copy).

## Acceptance checklist

- [ ] Eight components + `useCapabilityGate` implemented, domain-agnostic, exported.
- [ ] `CoverageRibbon` collapsible with per-metric bars + blocked list + data-as-of.
- [ ] All six `DataStatus` states render distinctly (text+icon+color).
- [ ] Gate hook correctly reports allowed/blocked/coverage and downgrades spend→count.
- [ ] Provenance drawer shows source, ref, dates, caveats.
- [ ] `ReviewSignalBadge` always shows the neutral caption.
- [ ] Storybook/fixtures cover all-green/partial/stale/blocked/unverified/mock.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No data fetching (pure presentational + a pure hook).
- No procurement-specific types in the component signatures (kept generic for reuse).
- No editing of coverage thresholds (server-owned).

## Open questions (blockers only)

None. If the freshness watermark/cadence endpoint is not yet wired, the documented
Assumption (mock now, map in the live adapter) keeps the layer shippable.
