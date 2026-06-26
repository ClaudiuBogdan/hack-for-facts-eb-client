# Feature: ANAF Financial Enrichment Section

> Next-1 — the biggest single data dependency; unblocks the "follow the money"
> journey. Source UX: `docs/ux-research/ngos.md` §13 Next-1, §15 (empty financials).
> Domain design: `docs/design/ngos/design.md`. Lives as the `#financiar` section on the
> NGO profile.

## Feature owner profile

Frontend implementation subagent specializing in **financial data display + charts**
(React 19 + TypeScript, Recharts/Visx already in the stack, shadcn, Lingui,
locale-aware money formatting). Reuses existing entity financial components
(`src/components/entities/EntityFinancialSummary.tsx`,
`EntityFinancialTrends.tsx`, `FinancialDataCard.tsx`) where shapes align. Must ship the
honest empty/placeholder state first, since `financial_indicators` = 0 rows today.

## Summary

The financial section of the NGO profile: a year-over-year snapshot of ANAF fiscal
indicators (income, subsidies, employees, assets) for the organization's CUI. Because
`financial_indicators` is empty today, the section ships as an honest "în curs de
actualizare" placeholder and lights up to a financial summary + mini-trend when the
enrichment worker seeds data — with no UI rebuild (same typed boundary).

## Facts / Decisions / Assumptions

- **Fact:** `ngo.financial_indicators` has **0 rows** — ANAF enrichment is defined in
  the contract but not seeded. Shape: `cui`, `fiscal_year`, `indicator_key` (+ value/
  unit per the boundary type).
- **Fact:** The enrichment worker is defined (seeds `ngo_source.anaf_financial_indicators`
  from promoted CUIs, ~1 req/s); timing is not committed (UX §16 Q2).
- **Fact:** 9,690 of 13,793 NGO CUIs also exist as `kind=company`, which may already
  have ANAF financials in the company domain — a cross-link opportunity.
- **Decision:** Render the section **always**, never omit it. Empty → "Date financiare
  în curs de actualizare" with `DataStatusBadge variant="partial"` and a note on what
  will appear when seeded.
- **Decision:** When seeded, show a financial summary card + a year-over-year mini-chart
  (income/subsidies/employees), each year-row cited to its ANAF snapshot.
- **Decision:** Reuse existing entity financial components when their props fit; do not
  fork money-formatting logic.
- **Assumption:** Priority indicators for NGOs are **income (venituri)**, **subsidii**,
  **număr angajați**, and **active** — the four named in UX §16 Q2. Marked assumption;
  exact `indicator_key` set is confirmed at seed time and the adapter maps keys→labels.
- **Assumption:** Indicator values are RON unless `unit` says otherwise; respect the
  platform's currency/normalization settings (RON/EUR) used elsewhere on the profile.

## Route and URL state

- **No own route.** Renders as the `#financiar` section within `/ong-uri/$cui`.
- Honors the profile's currency/inflation-adjustment settings (the platform already
  threads `currency` / `inflation_adjusted` params on entity routes). No new params.

## Data contract and mock states

Consumes `FinancialIndicator[]` from `design.md` §6, adapted to a per-year view:

```ts
type NgoFinancialYear = {
  fiscalYear: number
  indicators: Record<string, { value: number | null; unit: string | null }>
  // keys e.g. 'income' | 'subsidies' | 'employees' | 'assets'
  sourceSnapshotId: string
}

type NgoFinancials = {
  cui: string
  years: NgoFinancialYear[]            // [] today → placeholder
  seeded: boolean                      // false today
  companyCui?: string | null           // when CUI also a company with its own financials
}
```

**Mock states:**
1. **Empty (today's reality)** — `years: []`, `seeded: false` → placeholder.
2. **Single year** — one fiscal year of indicators.
3. **Multi-year trend** — 3–5 years for the mini-chart + YoY deltas.
4. **Sparse indicators** — some `indicator_key`s missing per year → "—" cells.
5. **Company cross-link** — `companyCui` set → "Vezi datele financiare ca firmă →".

Mark with `DataStatusBadge` (`partial` when empty, `mock`/`live` otherwise).

## UI structure

Within the profile `#financiar` section (unframed band, source-cited header):

**Empty (default today):**
- Heading "Date financiare (ANAF)".
- `EmptyState` / placeholder: "Date financiare în curs de actualizare. Când vor fi
  disponibile, vei vedea venituri, subvenții, număr de angajați și active pe an, cu
  sursa ANAF." + `DataStatusBadge variant="partial"`.
- If `companyCui` exists: "Acest CUI apare și ca firmă — vezi datele financiare
  disponibile →" to `/companies/$cui`.

**Seeded:**
- Financial summary card: latest-year headline indicators (venituri, subvenții,
  angajați, active) with locale-aware money/number formatting and YoY delta badges
  (neutral up/down, text + arrow, not color-only).
- Mini-trend chart (Recharts/Visx) for income + subsidies over years, with an adjacent
  **tabular fallback** (required a11y) listing the same year/value pairs.
- Per-year source chip → ANAF snapshot provenance (`/ong-uri/sursa/$snapshotId`).
- Subsidies highlighted as the donor/journalist-relevant figure; never framed as
  wrongdoing.

## Component reuse and proposed new components

- **Reuse:** `EntityFinancialSummary`, `EntityFinancialTrends`, `FinancialDataCard`
  and their skeletons (`*Skeleton.tsx`) when props fit; `Badge`, `Table`, `Alert`,
  `Button`, `Skeleton`, `EmptyState`, Recharts/Visx chart wrappers in
  `src/components/charts`.
- **Consume:** `SourceCitationChip`, `FreshnessBadge`, `DataStatusBadge`.
- **New (only if existing entity components don't fit):**
  - `NgoFinancialSection` — orchestrates empty vs seeded states for the profile.
  - `NgoFinancialTrendChart` (thin wrapper over the existing chart components with the
    tabular fallback) — only if `EntityFinancialTrends` can't be parameterized.

## Interactions

- Year-row source chip → ANAF snapshot page.
- Currency/inflation toggle (inherited from profile settings) reformats values.
- "Vezi datele financiare ca firmă →" → `/companies/$cui`.
- Chart hover → tooltip with exact values (also in the tabular fallback).

## Loading, empty, error, partial, stale states

- **Loading:** reuse the existing financial skeletons.
- **Empty:** the default placeholder above — explicit, never an omitted section
  (prevents implying the ONG has no finances, UX §15).
- **Partial:** missing indicator keys → "—" with the row/label retained; partial-year
  data labeled.
- **Stale:** ANAF snapshot date shown via `FreshnessBadge`; if older than expected,
  flagged.
- **Error:** fetch failure (when live) → inline `Alert` + retry; rest of profile
  unaffected.

## Accessibility and i18n

- Charts have adjacent tabular fallbacks and textual summaries for key values.
- Delta indicators use arrow + text, not color alone; `aria-label` on deltas.
- Lingui throughout; expand ANAF/CUI; locale-aware money/number/percent; respect
  currency setting.

## Privacy, provenance, and source-citation behavior

- Every figure cites its ANAF snapshot.
- Empty state is honest ("în curs de actualizare"), not silent.
- Subsidies/income presented neutrally; mission-vs-spending interpretation belongs to
  the user, not the UI (no derived accusations).

## Acceptance checklist

- [ ] `#financiar` section renders on the profile in both empty and seeded states from
      the same `NgoFinancials` boundary type.
- [ ] Empty state shows "Date financiare în curs de actualizare" + `DataStatusBadge`
      and never omits the section.
- [ ] Seeded state shows summary card + multi-year mini-chart with a tabular fallback,
      each year cited to ANAF.
- [ ] CUI-collision company financial cross-link appears when `companyCui` is set.
- [ ] Currency/inflation settings reformat values; locale-aware throughout.
- [ ] All five mock states render; mock surfaces marked with `DataStatusBadge`.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled.

## Non-goals

- No financial peer benchmarking (advanced ADV-3; depends on this + sector/county
  groupings).
- No client-side enrichment/scraping — data arrives from the seeded table.
- No mission-vs-spending judgments rendered as conclusions.

## Open questions (blockers only)

None block the placeholder (shippable now). Non-blocking product input (UX §16 Q2):
final ANAF `indicator_key` set and enrichment timing — the adapter maps keys→labels so
the UI is ready whenever seeding lands.
