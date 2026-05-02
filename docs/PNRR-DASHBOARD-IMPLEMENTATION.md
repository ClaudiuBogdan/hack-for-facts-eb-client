# PNRR Dashboard — Implementation Summary

**Date:** May 2026  
**Scope:** Complete interactive PNRR (Planul Național de Redresare și Reziliență) dashboard for Transparenta.eu  
**Files Affected:** 40+ new/modified files across `src/features/pnrr/`, `src/components/`, `src/routes/`, `src/schemas/`

---

## 1. Feature Overview

Built a full-featured PNRR analytics dashboard with:
- **5 tab views:** Overview, Projects, Beneficiaries, Map, Anomalies
- **Interactive map** with UAT/county heatmaps and drill-down details
- **Advanced filtering** with 12+ filter dimensions
- **AI-powered natural language query** support
- **Mobile-first responsive design** with brutalist header aesthetic
- **Real-time currency conversion** (RON/EUR/USD) via ECB rates
- **Performance optimized** with React.memo, useMemo, useCallback throughout

---

## 2. Architecture

### 2.1 Directory Structure

```
src/features/pnrr/
├── components/
│   ├── PnrrDashboard.tsx          # Main orchestrator
│   ├── PnrrHeader.tsx             # Brutalist header + compact sticky nav
│   ├── PnrrSkeleton.tsx           # Loading skeletons
│   ├── PnrrTabNav.tsx             # 5-tab navigation
│   ├── PnrrMapPreview.tsx         # Mini map for Overview tab
│   ├── PnrrMapView.tsx            # Full-screen map view
│   ├── PnrrProjectsPreview.tsx    # Top projects sidebar
│   ├── PnrrEmblematicProjects.tsx # Featured projects section
│   ├── PnrrNationalSummary.tsx    # National-level aggregates
│   ├── PnrrCountyDetailsPanel.tsx # County drill-down panel
│   ├── PnrrUatDetailsPanel.tsx    # UAT drill-down panel
│   ├── PnrrAnomalyRibbon.tsx      # Anomaly summary strip
│   ├── PnrrStatsRibbon.tsx        # Key metrics ribbon
│   ├── PnrrContextBar.tsx         # Contextual info bar
│   ├── PnrrDataQualityBanner.tsx  # Data quality indicator
│   ├── PnrrQuickInvestigation.tsx # Quick investigation CTA
│   ├── charts/
│   │   ├── PnrrFundingBar.tsx     # Stacked grant/loan/mixed bar
│   │   ├── PnrrProgressHistogram.tsx # Progress distribution chart
│   │   ├── PnrrComponentChart.tsx # Component breakdown
│   │   └── PnrrCountyChart.tsx    # County breakdown
│   ├── filters/
│   │   ├── PnrrFilterSheet.tsx    # Slide-out filter panel
│   │   ├── PnrrFilterBar.tsx      # Quick filter chips
│   │   ├── PnrrActiveFilters.tsx  # Active filter display
│   │   └── PnrrInfoSheet.tsx      # Data explanation slide-over
│   ├── table/
│   │   ├── PnrrProjectTable.tsx   # Sortable/paginated project table
│   │   ├── PnrrProjectDrawer.tsx  # Side panel project details
│   │   └── PnrrExportButton.tsx   # CSV export
│   └── tabs/
│       ├── PnrrOverview.tsx       # Main dashboard view
│       ├── PnrrProjectsView.tsx   # Project list view
│       ├── PnrrBeneficiariesView.tsx # Beneficiary table view
│       └── PnrrAnomaliesView.tsx  # Anomaly investigation view
├── data/
│   ├── allocations.json           # Component/county allocations
│   ├── component-definitions.ts   # C1-C16 component metadata
│   ├── cri-definitions.ts         # CRI institution mapping
│   ├── emblematic-projects.ts     # Featured project list
│   ├── measure-definitions.ts     # Measure key definitions
│   ├── ins-county-population.json # Per-capita normalization data
│   ├── uat-mapping.ts             # UAT code ↔ name mapping
│   └── uat-populations.ts         # UAT population data
├── hooks/
│   ├── usePnrrData.ts             # TanStack Query data fetching
│   ├── usePnrrFilterState.ts      # URL-based filter state management
│   └── usePnrrMapSeries.ts        # Map metric series state
├── lib/
│   ├── data-transform.ts          # Filtering, aggregation, deduplication
│   ├── formatting.ts              # Currency/date/number formatting
│   ├── allocations.ts             # Allocation lookup utilities
│   ├── county-mnemonics.ts        # County code ↔ name mapping
│   ├── anomaly-definitions.ts     # Anomaly type definitions
│   ├── filter-constants.ts        # Progress category mappings
│   └── usePnrrCurrency.tsx        # Currency context + conversion
└── routes/
    └── pnrr.tsx / pnrr.lazy.tsx   # Route definitions
```

### 2.2 Data Flow

```
Public API (mfe.gov.ro JSON)
    ↓
usePnrrData() — TanStack Query caching
    ↓
PnrrDashboard — computes filteredProjects via filterProjects()
    ↓
Tab views receive projects + aggregates
    ↓
Components render with user-selected currency
```

---

## 3. Key Design Decisions

### 3.1 URL-Based Filter State
All filter state is persisted in URL search params via `usePnrrFilterState`, enabling:
- Deep-linkable filtered views
- Browser back/forward navigation
- Shareable links with exact filters

**Schema (`PnrrSearchSchema`):**
```typescript
{
  view: 'overview' | 'projects' | 'beneficiaries' | 'map' | 'anomalies'
  search?: string                    // Project search
  beneficiarySearch?: string         // Beneficiary search
  components?: string[]              // Component codes (C1-C16)
  counties?: string[]                // County names
  fundingSources?: ('grant' | 'loan' | 'grant/loan')[]
  measures?: string[]                // Measure keys
  cris?: string[]                    // CRI codes
  progressCategories?: string[]      // Progress buckets
  anomalyTypes?: string[]            // Anomaly signals
  entityTypes?: ('public' | 'private' | 'national')[]
  onlyAnomalies?: boolean
  excludeMicro?: boolean
  includeNational?: boolean
  sortBy?: string                    // Table sort column
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  mapLat?: number                    // Map center persistence
  mapLng?: number
  mapZoom?: number
  mapGranularity?: 'uat' | 'county'
  mapSeries?: string                 // Active heatmap metric
}
```

### 3.2 Currency Architecture
- `usePnrrCurrency()` returns the active currency ('RON' | 'EUR' | 'USD')
- ECB exchange rates loaded at build time from `allocations.json`
- `formatPnrrCurrency(valueEur, currency)` converts and formats
- Currency selection persisted via `usePersistedState` with localStorage fallback

### 3.3 Component Color System
Hardcoded palette for C1-C16 ensures visual consistency:
```typescript
C1: '#2563eb', C2: '#7c3aed', C3: '#db2777', C4: '#ea580c',
C5: '#16a34a', C6: '#0891b2', C7: '#ca8a04', C8: '#4f46e5',
C9: '#0d9488', C10: '#dc2626', C11: '#9333ea', C12: '#65a30d',
C13: '#0284c7', C14: '#e11d48', C15: '#059669', C16: '#7c2d12'
```

### 3.4 Mobile-First Layout
- Tab nav labels hidden on mobile (`hidden sm:inline`), icons only
- Pagination uses compact `< 1/47 >` on mobile, full buttons on desktop
- Ranked list rows use flex with `flex-1` label truncation
- Tables hidden on mobile, replaced with card layouts (`hidden md:block`)
- `min-w-0` on all flex/grid containers to prevent overflow
- Project cards stack vertically with colored progress bars

---

## 4. Tab Views

### 4.1 Overview Tab
**Components:**
- **Insight Cards** (4-up grid): Total value, absorption rate, loan debt, project count
- **RankedListCard** (×2): Top Components + Top Counties
  - Expandable (5 → all) with sticky footer
  - Background-fill bar proportional to value
  - Component code badges with colored borders
  - Click filters projects by that component/county
- **Map Preview** + **Projects Preview** side by side (5:2 grid on desktop)
- **Top 10 Beneficiaries**: Ranked list with click-to-search
- **Funding Bar**: Stacked grant/loan/mixed with summary cards
- **Progress Histogram**: Three-way toggle (tech/fin/gap) + count/value distribution
- **Emblematic Projects**: Featured project cards

**Layout Evolution:**
- Initially had separate "Analiză" tab → merged into Overview
- Ranked lists originally inline-mapped → extracted to memoized `componentItems`/`countyItems`
- Row layout evolved from grid→flex hybrid (broken alignment) → clean flex with `flex-1` label
- Right column: `[Count + Pct stack] [Value]` for consistent alignment

### 4.2 Projects Tab
- **Search input** with 300ms debounce, updates `filterState.search`
- **Desktop table**: Sortable columns (title, beneficiary, county, value, tech progress, fin progress)
- **Mobile cards**: Title, component badge, county, value, beneficiary, dual progress bars
- **Pagination**: 25/page, compact mobile pagination
- **Project drawer**: Side panel with full project details

### 4.3 Beneficiaries Tab
- **Search input** with 300ms debounce, updates `filterState.beneficiarySearch`
- **Sortable table**: Beneficiary, project count, total value, avg tech progress, avg fin progress
- **Click row**: Opens side panel with highest-value project for that beneficiary
- **Pagination**: 25/page

### 4.4 Map Tab
- **Heatmap layers**: Per-capita / total / count by UAT or county
- **Interactive features**: Click UAT → details panel, hover → tooltip with formatted value
- **URL persistence**: `mapLat`, `mapLng`, `mapZoom` saved to URL
- **County details panel**: County stats + top projects list
- **UAT details panel**: UAT stats + project list

### 4.5 Anomalies Tab
- **Anomaly type cards**: Summary of each anomaly type (count + value)
- **Filter integration**: Click anomaly type → filter projects by that signal
- **Project list**: Filtered view of flagged projects

---

## 5. Filter System

### 5.1 Filter Dimensions (12+)
| Dimension | UI Component | State Key |
|-----------|--------------|-----------|
| Component | Multi-select chips | `components` |
| County | Multi-select chips | `counties` |
| Funding Source | Toggle group | `fundingSources` |
| Measure | Multi-select (with composite keys) | `measures` |
| CRI | Multi-select (full names) | `cris` |
| Progress Category | Toggle group | `progressCategories` |
| Anomaly Type | Toggle group | `anomalyTypes` |
| Entity Type | Toggle group | `entityTypes` |
| Project Search | Text input (debounced) | `search` |
| Beneficiary Search | Text input (debounced) | `beneficiarySearch` |
| Only Anomalies | Checkbox | `onlyAnomalies` |
| Exclude Micro | Checkbox | `excludeMicro` |
| Include National | Checkbox | `includeNational` |

### 5.2 Composite Measure Keys
Supports filtering by compound measure identifiers like `C4.I3.loan` and `C4.I3.grant`:
- `filterProjects` splits measure keys on `.` and checks partial matches
- Display labels generated via `getMeasureDisplayLabel()`

### 5.3 Active Filter Display
- **Notion-inspired** minimal aesthetic: border chips with prefix + value
- Filter values rendered in `font-bold text-foreground` for high contrast
- Prefix in `text-muted-foreground` (e.g., "Component: C15 — Educație")
- CRI filters show full institution name from `PNRR_CRIS` lookup
- "Clear all" button removes all filters
- Compact mode for sticky header: count badge + truncated chips

---

## 6. Performance Optimizations

### 6.1 Memoization
| Computation | Hook | Dependencies |
|-------------|------|--------------|
| `topComponents` | `useMemo` | `aggregates.componentStats` |
| `topCounties` | `useMemo` | `aggregates.countyStats` |
| `componentItems` | `useMemo` | `topComponents`, `rawTotalValue`, `currency` |
| `countyItems` | `useMemo` | `topCounties`, `rawTotalValue`, `currency` |
| `beneficiaryItems` | `useMemo` | `topBeneficiaries`, `rawTotalValue`, `currency` |
| `filteredProjects` | `useMemo` | Individual primitive filter fields |
| `chips` | `useMemo` | All filter primitives + `filterState` |
| `activeSeriesValuesBySirutaCode` | `useMemo` | `heatmapData` |

### 6.2 Callback Stabilization
| Callback | Dependencies |
|----------|--------------|
| `handleComponentClick` | `filterState` (setters stable) |
| `handleCountyClick` | `filterState` |
| `handleBeneficiaryClick` | `filterState` |
| `toggleSort` (table) | `currentSortBy`, `currentSortOrder`, `setSorting` |
| `goToPage` | `setPagination` |
| `getTooltipContent` | `currency` |

### 6.3 Component Extraction
- `SortIcon` — module-level component (prevents unmount/remount)
- `BeneficiaryRow` — `React.memo` sub-component
- `ProjectRow` — `React.memo` sub-component
- Static option arrays (`PROGRESS_OPTIONS`, `ANOMALY_TYPE_OPTIONS`) moved outside components

### 6.4 Filter Dep Array Pattern
Instead of depending on the entire `filterState.search` object (which changes on every keystroke), `filteredProjects` uses individual primitives:
```typescript
[projects,
  filterState.search.search,
  filterState.search.beneficiarySearch,
  filterState.search.components,
  // ... each field individually
]
```

---

## 7. Bug Fixes Applied

### 7.1 Type Errors
| File | Issue | Fix |
|------|-------|-----|
| `PnrrOverview.tsx` | Missing `useUserCurrency` and `formatPnrrCurrency` imports | Added imports |
| `PnrrProjectDrawer.tsx` | `useUserCurrency` called after early return | Moved hook before `if (!project)` |
| `PnrrBeneficiariesView.tsx` | `currency` prop typed as `string` instead of union | Changed to `'RON' \| 'EUR' \| 'USD'` |
| `PnrrProjectTable.tsx` | `currency` prop typed as `string` | Changed to union type |
| `PnrrMapPreview.tsx` | Missing `currency` in `getTooltipContent` deps | Added to useCallback deps |
| `data-transform.ts` | Missing `'payment-pending'` in `anomalyCounts` | Added key to Record initializer |

### 7.2 Lint Warnings
| File | Issue | Fix |
|------|-------|-----|
| `PnrrBeneficiariesView.tsx` | Unnecessary `sortOrder` in `toggleSort` deps | Removed `sortOrder` |
| `PnrrProjectTable.tsx` | Missing `filterState` dependency | Destructured `setSorting`/`setPagination` + primitives |

### 7.3 Layout Fixes
| File | Issue | Fix |
|------|-------|-----|
| `PnrrOverview.tsx` | Ranked list rows misaligned (values at different X positions) | Replaced grid→flex hybrid with clean flex row: `[rank] [label flex-1] [count+pct] [value]` |
| `PnrrOverview.tsx` | Count text wrapping across lines | Added `whitespace-nowrap` |

---

## 8. UI/UX Highlights

### 8.1 Brutalist Header
- Massive typography: `text-6xl` mobile → `text-8xl` desktop
- Black inverted block for "Redresare și Reziliență" (`bg-foreground text-background`)
- Thick `border-b-2` separator
- Sidebar-aware compact sticky header with `left-[var(--sidebar-width)]`

### 8.2 Info Sheet
Slide-over panel explaining:
- Data dimensions (components, counties, UATs, funding sources)
- Anomaly types and what they mean
- Data source (mfe.gov.ro) and update frequency

### 8.3 Mobile Optimizations
- Tab labels hidden, icons only
- Pagination icon-only buttons
- Project cards with colored progress bars by component
- Progress section as full-width rows (label inline with percentage)
- Footer copyright wraps gracefully

### 8.4 Accessibility
- Semantic HTML (`<nav role="tablist">`, `<button role="tab">`)
- `aria-selected` on tabs
- `aria-label` on icon buttons
- Focus-visible rings on all interactive elements
- Tooltip explanations on info icons

---

## 9. Files Modified Outside `features/pnrr/`

| File | Change |
|------|--------|
| `src/components/app/app-shell.tsx` | Added PNRR route to navigation |
| `src/components/footer/AppFooter.tsx` | Mobile layout adjustments |
| `src/components/mobile/mobile-bottom-dock.tsx` | Added PNRR link |
| `src/components/privacy/CookieConsentBanner.tsx` | Z-index adjustment |
| `src/components/ui/multi-select.tsx` | Added `min-w-0` fix |
| `src/components/ui/progress.tsx` | Added `indicatorClassName` + `indicatorStyle` props |
| `src/components/ui/sidebar.tsx` | Exported `useSidebar` hook |
| `src/lib/hooks/usePersistedState.ts` | Enhanced with optional serialization |
| `src/routes/__root.tsx` | Route tree update |
| `src/routes/pnrr.tsx` + `pnrr.lazy.tsx` | New route files |
| `src/schemas/pnrr.ts` | PNRR type definitions |
| `src/locales/en/messages.po` | Extracted translations |
| `src/locales/ro/messages.po` | Extracted translations |

---

## 10. Testing

- `data-transform.test.ts` — Unit tests for `filterProjects` and `computeAggregates`
- Manual testing preferred per project guidelines
- Verified `yarn typecheck` and `yarn lint` pass

---

## 11. Known Issues / TODO

1. **Pre-existing type errors** in `PnrrAnomalyInfoPanel.tsx` and `PnrrAnomaliesView.tsx` (unrelated to recent changes)
2. **Missing translations**: 59 missing in `ro/messages.po` (admin), 293 in admin catalog
3. **Map pre-existing warnings**: `const` assertion on non-literals in `PnrrMapPreview.tsx` and `PnrrMapView.tsx`

---

## 12. Commands Used

```bash
# Development
yarn dev                    # Start dev server
yarn typecheck              # TypeScript check (run after every change)
yarn lint                   # ESLint with --max-warnings=0
yarn test                   # Vitest unit tests
yarn i18n:extract           # Extract Lingui translations
yarn i18n:compile           # Compile translation catalogs
yarn build:app              # Production build
```

---

*Document generated by Claude Code. All changes scoped to PNRR dashboard feature.*
