# Challenge Entity Analysis Page

**Status:** Draft
**Date:** 2026-03-05
**Scope:** MVP — analysis page + one reusable component

## Context

The challenge learning flow asks users to select a UAT (city/commune) as their "active entity." Currently, lessons reference budget concepts abstractly. This spec introduces a **dedicated Entity Analysis Page** that shows real budget data for the selected entity, and a **reusable component** that can be embedded in challenge lesson steps with guided interactivity.

## Goals

1. Give users a persistent reference page with their selected entity's real budget analysis
2. Reuse existing entity visualization components adapted for the challenge context
3. Extract a first reusable component (`EntityBudgetOverview`) for interactive lesson steps
4. Keep all data public — no authentication required for the analysis data

## Non-Goals (future phases)

- Peer comparison across similar-sized cities
- Anomaly detection deep-dives as interactive lessons
- Full component library for all lesson types
- Server-side rendering / SSR for the analysis page

---

## 1. Entity Analysis Page

### Route

```
/buget-primarie/challenges/my-city
```

A peer route to module pages, nested inside the `ChallengesLayout` (so the sidebar and learning progress provider are available).

### Access

- Accessible via **QuickLinks** / resources section from any challenge step
- Also linked from the **ChallengesHubPage** when an entity is selected (e.g. next to the entity badge)
- The active entity comes from the route CUI (`/buget-primarie/$cui/...`), so no separate UAT selection step is required

### Data Source

Uses the existing `useEntityDetails` hook with the `selectedEntityCui` from `useCampaignProgress()`.

```typescript
const { selectedEntityCui } = useCampaignProgress()
const { data, isLoading } = useEntityDetails({
  cui: selectedEntityCui,
  reportPeriod: 'ytd',           // latest year-to-date
  reportType: 'PRINCIPAL_AGGREGATED',
  trendPeriod: 'yearly',
})
```

No additional API endpoints required — all data comes from the existing `getEntityDetails` GraphQL query.

### Page Sections

#### 1.1 Header

- Entity name and type (city/commune/county)
- County name, population (from `uat` field)
- "Change entity" link back to UAT picker
- Period indicator (e.g. "2025 YTD")

#### 1.2 Financial KPIs (reuse `EntityFinancialSummary`)

Three cards showing:
- **Total Income** — with YoY trend arrow (up/down/flat)
- **Total Expenses** — with YoY trend arrow
- **Budget Balance** — with YoY trend arrow

Trend arrows derived from comparing last two data points in the trend series.

**Adaptation from existing component:** Add optional `showTrendIndicator` prop or wrap with a challenge-specific decorator that computes and displays the YoY change percentage badge.

#### 1.3 Financial Trends Chart (reuse `EntityFinancialTrends`)

Income/expense bars + balance line chart showing multi-year trend.

**Adaptation:** Simplified controls — no normalization toggle in the challenge context (default to total, RON). Add subtle annotation labels for the current year vs previous years.

#### 1.4 Budget Treemap (reuse `BudgetTreemap`)

Interactive treemap showing expense breakdown by functional classification.

**Adaptation:** Default to functional (`fn`) primary grouping. Drilldown enabled. No normalization/currency toggle — keep it simple for the challenge context.

#### 1.5 Anomaly Flags (new, lightweight)

A summary list of detected anomalies from the entity's line items:
- `YTD_ANOMALY` — unusual year-to-date spending
- `MISSING_LINE_ITEM` — expected line items not present

Display as a card with count badge and expandable list. Data comes from `executionLineItems` where `anomaly` field is populated.

**Component:** `EntityAnomalySummary` — new, small component.

### Layout

```
┌──────────────────────────────────────────┐
│  Header: Entity Name / County / Pop      │
│  [Change Entity]            Period: 2025 │
├──────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐           │
│  │Income│  │Expens│  │Balanc│  KPI cards │
│  │ ▲ 5% │  │ ▲ 3% │  │ ▼ 2% │           │
│  └──────┘  └──────┘  └──────┘           │
├──────────────────────────────────────────┤
│  Financial Trends Chart                  │
│  [====Bar+Line Chart================]    │
├──────────────────────────────────────────┤
│  Budget Treemap                          │
│  [====Treemap========================]   │
├──────────────────────────────────────────┤
│  Anomaly Flags (2 found)                 │
│  • YTD anomaly: Education spending...    │
│  • Missing: Healthcare line item...      │
└──────────────────────────────────────────┘
```

### Empty / Loading States

- **Loading:** Skeleton cards matching the layout
- **No entity selected:** Full-page CTA to select an entity, with a brief explanation of why
- **API error:** Error boundary with retry, consistent with existing challenge error handling

---

## 2. Reusable Component: `EntityBudgetOverview`

### Purpose

A self-contained component that fetches and displays the entity's financial KPIs and trend chart. Designed to be embedded in MDX challenge steps as an interactive reference.

### Props

```typescript
type EntityBudgetOverviewProps = {
  /** If not provided, reads from useCampaignProgress() */
  readonly cui?: string
  /** Show annotations / guided highlights */
  readonly annotations?: BudgetAnnotation[]
  /** Compact mode for embedding in lesson content */
  readonly compact?: boolean
}

type BudgetAnnotation = {
  readonly target: 'income' | 'expenses' | 'balance' | 'trend-chart'
  readonly message: string
  readonly variant?: 'info' | 'question' | 'insight'
}
```

### What it renders

1. **Financial KPIs** — 3 cards (income, expenses, balance) with YoY trend indicators
2. **Trend Chart** — Simplified `EntityFinancialTrends` (compact mode reduces height)
3. **Annotations** — Optional callout bubbles pointing to specific parts of the data

### Registration

Register as an MDX component in `challenge-mdx-components.tsx`:

```typescript
export const challengeCustomMdxComponents: Record<string, React.LazyExoticComponent<...>> = {
  EntityBudgetOverview: lazy(() => import('../interactive/EntityBudgetOverview')),
}
```

### Usage in MDX

```mdx
# Understanding Your City's Budget

Let's look at how your city manages its finances. Below you can see
the key financial indicators for your selected entity:

<EntityBudgetOverview
  annotations={[
    { target: "income", message: "This is the total revenue collected", variant: "info" },
    { target: "balance", message: "Is this positive or negative? What does it mean?", variant: "question" }
  ]}
/>

Based on what you see above, answer the following question:

<Quiz ... />
```

### Behavior

- Reads `selectedEntityCui` from `useCampaignProgress()` (or uses explicit `cui` prop)
- Fetches data via `useEntityDetails` (TanStack Query — cached, deduped)
- If no entity selected, shows inline prompt to return to the entity search flow
- Annotations render as positioned tooltips/callouts near the target section

---

## 3. QuickLinks Integration

### From Challenge Steps

Add the entity analysis page to the `QuickLinks` component available in MDX steps:

```mdx
<QuickLinks links={[
  { label: "Your City's Budget", href: "/buget-primarie/challenges/my-city" }
]} />
```

Alternatively, provide a built-in link that appears automatically when an entity is selected — part of the challenge step player chrome (e.g. a small "View my city" button in the step header/toolbar).

### From Hub Page

The `ChallengesHubPage` already shows the selected entity badge. Add a link from the badge to the analysis page.

---

## 4. File Structure

```
src/features/challenges/
├── components/
│   ├── analysis/
│   │   ├── EntityAnalysisPage.tsx       # Full analysis page
│   │   ├── EntityAnalysisHeader.tsx     # Header with entity info
│   │   ├── EntityAnomalySummary.tsx     # Anomaly flags card
│   │   └── EntityBudgetOverview.tsx     # Reusable KPI + trends component
│   ├── interactive/
│   │   └── EntityBudgetOverview.tsx     # Re-export or thin wrapper for MDX
│   └── player/
│       └── challenge-mdx-components.tsx  # Register EntityBudgetOverview
├── routes/
│   # Route file for /challenges/my-city
```

New route file:
```
src/routes/buget-primarie/challenges/my-city.lazy.tsx
```

---

## 5. Data Flow

```
useCampaignProgress()
  └── selectedEntityCui
        │
        ├── EntityAnalysisPage (full page)
        │     └── useEntityDetails(cui, ytd, yearly)
        │           ├── EntityFinancialSummary (+ trend indicators)
        │           ├── EntityFinancialTrends
        │           ├── BudgetTreemap
        │           └── EntityAnomalySummary
        │
        └── EntityBudgetOverview (MDX embeddable)
              └── useEntityDetails(cui, ytd, yearly)
                    ├── EntityFinancialSummary (compact)
                    └── EntityFinancialTrends (compact)
```

Both paths use the same `useEntityDetails` query key, so TanStack Query deduplicates and caches the data. Navigating between the analysis page and lesson steps incurs no extra API calls.

---

## 6. Existing Components to Reuse

| Component | Source | Adaptation Needed |
|-----------|--------|-------------------|
| `EntityFinancialSummary` | `src/components/entities/EntityFinancialSummary.tsx` | Add YoY trend indicator badges |
| `EntityFinancialTrends` | `src/components/entities/EntityFinancialTrends.tsx` | Compact mode, simplified controls |
| `BudgetTreemap` | `src/components/budget-explorer/BudgetTreemap.tsx` | Default fn grouping, no normalization toggle |
| `useEntityDetails` | `src/lib/hooks/useEntityDetails.ts` | No changes needed |
| `useTreemapDrilldown` | `src/components/budget-explorer/useTreemapDrilldown.ts` | No changes needed |

## 7. New Components to Build

| Component | Description | Complexity |
|-----------|-------------|------------|
| `EntityAnalysisPage` | Full analysis page composing all sections | Medium |
| `EntityAnalysisHeader` | Entity name, county, population, change link | Small |
| `EntityAnomalySummary` | Anomaly count + expandable list | Small |
| `EntityBudgetOverview` | Reusable KPI + trends for MDX embedding | Medium |
| `BudgetAnnotation` | Positioned callout/tooltip for guided highlights | Small |

---

## 8. MVP Delivery Checklist

### Phase 1: Entity Analysis Page
- [ ] Create route `/buget-primarie/challenges/my-city`
- [ ] Build `EntityAnalysisPage` composing header + KPIs + trends + treemap + anomalies
- [ ] Build `EntityAnalysisHeader` with entity info and change link
- [ ] Add YoY trend indicators to KPI cards (wrap or extend `EntityFinancialSummary`)
- [ ] Build `EntityAnomalySummary` card
- [ ] Handle empty states (no entity, loading, error)
- [ ] Add link from `ChallengesHubPage` entity badge to analysis page

### Phase 2: Reusable Component
- [ ] Build `EntityBudgetOverview` (KPIs + compact trends + annotations)
- [ ] Register in `challenge-mdx-components.tsx`
- [ ] Build `BudgetAnnotation` callout component
- [ ] Add QuickLinks integration for easy navigation from steps
- [ ] Create example MDX step using `EntityBudgetOverview` with annotations

### Future Phases
- [ ] Peer comparison component (compare to similar-sized cities)
- [ ] Interactive treemap component for lesson steps
- [ ] Anomaly deep-dive component for advanced module lessons
- [ ] Per-capita / Euro normalization toggle in challenge context
