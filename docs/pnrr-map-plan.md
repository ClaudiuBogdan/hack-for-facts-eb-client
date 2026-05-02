# PNRR Map Implementation Plan (Revised)

> **Status:** Reviewed by 2 subagents. Critical API and data-matching corrections applied below.

## 1. Executive Summary

Build a **choropleth map view** for PNRR data on the existing `/pnrr` page, reusing the app's established map infrastructure (`InteractiveMap`, GeoJSON polygons, tooltip/legend patterns). The map displays Romanian counties colored by aggregated PNRR metrics, with tabs to switch between different datasets.

---

## 2. Key Findings from Codebase Research

### 2.1 Map Infrastructure

| Component | Location | Role |
|-----------|----------|------|
| `InteractiveMap` | `src/components/maps/InteractiveMap.tsx` | Leaflet wrapper with GeoJSON layers, tooltips, click handlers |
| `MapLabels` / `CanvasLabelLayer` | `src/components/maps/` | High-performance polygon label rendering |
| `MapAnalyticsPublicView` | `src/features/advanced-map-analytics/components/map-analytics-public-view.tsx` | Full read-only map workspace (series selector, legend, table, analytics, entity panel) |
| `useGeoJsonData` | `src/hooks/useGeoJson.ts` | Loads `uat.json` (3,186 UATs) and `judete.json` (42 counties) |
| `MapLegend` | `src/components/maps/MapLegend.tsx` | Color scale legend (min/max/title/currency) |

### 2.2 GeoJSON Matching — **CRITICAL CORRECTION**

**County GeoJSON** (`judete.json`):
- **Key for data matching:** `properties.mnemonic` — a **2-letter code** (e.g., `"CJ"` for Cluj, `"B"` for București)
- **Key for display:** `properties.name` (e.g., "Cluj")
- Has population data: `pop2011`
- **The existing map system matches `data.county_code === properties.mnemonic`**

> ⚠️ **The original plan incorrectly assumed matching by `properties.name`.** We must build a `countyName → mnemonic` lookup and shape PNRR data using 2-letter mnemonic codes as the key.

**UAT GeoJSON** (`uat.json`):
- Key: `properties.natcode` (SIRUTA code)
- Also has: `properties.cui` (entity fiscal ID), `properties.county`, `properties.name`
- **21.6% of PNRR CUIs match UAT GeoJSON CUIs**

### 2.3 PNRR Geographic Fields

```typescript
// Available on every PnrrProject
county: string        // "Cluj", "București", "Național"
locality: string      // e.g., "Cluj-Napoca"
cui: string | null    // 96.5% coverage, 21.6% match UATs
beneficiary: string   // e.g., "Primăria Cluj-Napoca"
```

### 2.4 Existing Population Data

`src/features/pnrr/data/ins-county-population.json` has 2023 INS population for every county.

---

## 3. Recommended Architecture

### 3.1 Decision: Use `InteractiveMap` Directly

**Why not `MapAnalyticsPublicView`?**
- Tightly coupled to backend series APIs (`useAdvancedMapAnalyticsSeriesData`, CSV parsing, bin presets)
- Expects `AdvancedMapAnalyticsUrlState` with series configs, widgets, value filters — massive overhead for 5 simple client-side aggregations

**Why `InteractiveMap` directly is better:**
- PNRR data is entirely client-side (already loaded in `usePnrrData`)
- We only need **county-level choropleth** with a simple tab switcher
- We reuse **styling utilities**, **tooltip builders**, and **legend** without the series editor complexity

### 3.2 Component Hierarchy

```
PnrrDashboard (existing)
└── PnrrMapView (NEW)
    ├── PnrrMapSeriesTabs (NEW) — tab switcher for datasets
    ├── PnrrMapContent (NEW)
    │   ├── InteractiveMap (REUSE) — Leaflet + GeoJSON
    │   ├── MapLegend (REUSE) — color scale legend
    │   └── PnrrCountyDetailsPanel (NEW) — slide-out panel
    └── usePnrrMapSeries (NEW hook)
        └── Computes HeatmapCountyDataPoint[] from projects
```

---

## 4. Data Model: Map Series

### 4.1 County-Level Series (MVP — all 5 tabs)

| Series ID | Label | Calculation | Unit |
|-----------|-------|-------------|------|
| `total-value` | Valoare totală | `sum(valueEur)` per county | EUR |
| `project-count` | Număr proiecte | `count` per county | projects |
| `per-capita` | Valoare per capita | `sum(valueEur) / county_population` | EUR/person |
| `grant-share` | Grant (%) | `grant_sum / total_sum * 100` | % |
| `anomaly-count` | Proiecte cu anomalii | `count(where anomalies.length > 0)` | projects |

### 4.2 County Name → Mnemonic Lookup

**File:** `src/features/pnrr/lib/county-mnemonics.ts`

Build a static lookup from the GeoJSON:

```typescript
export const COUNTY_NAME_TO_MNEMONIC: Record<string, string> = {
  'Alba': 'AB',
  'Arad': 'AR',
  'Argeș': 'AG',
  'Bacău': 'BC',
  // ... all 42 counties
  'București': 'B',
}
```

This is generated once from `judete.json` properties (`name` → `mnemonic`).

---

## 5. Implementation Steps

### Phase 1: County-Level Map (MVP)

#### Step 1.1 — Create `county-mnemonics.ts`

**File:** `src/features/pnrr/lib/county-mnemonics.ts`

Static lookup table mapping PNRR county names to GeoJSON 2-letter mnemonic codes.

#### Step 1.2 — Create `usePnrrMapSeries` hook

**File:** `src/features/pnrr/hooks/usePnrrMapSeries.ts`

Transforms `PnrrProject[]` into `HeatmapCountyDataPoint[]` per series.

**Logic:**
1. Iterate all projects, skip `county === 'Național'`
2. Map county name to mnemonic via `COUNTY_NAME_TO_MNEMONIC[county]`
3. Aggregate by mnemonic
4. For each county, build `HeatmapCountyDataPoint`:
   ```typescript
   {
     county_code: mnemonic,      // e.g., "CJ"
     county_name: county,        // e.g., "Cluj"
     county_population: COUNTY_POPULATION[county],
     amount: totalValue,         // varies by series
     total_amount: totalValue,
     per_capita_amount: totalValue / population,
     county_entity: /* minimal entity stub or null */
   }
   ```
5. Return:
   - `series` array with label, unit, and `HeatmapCountyDataPoint[]`
   - `min` / `max` for the active series (for legend)

#### Step 1.3 — Create `PnrrMapSeriesTabs`

**File:** `src/features/pnrr/components/PnrrMapSeriesTabs.tsx`

Underline-style tab list (reuse pattern from `PnrrTabNav`).

```typescript
const SERIES_TABS = [
  { id: 'total-value', label: t`Valoare totală` },
  { id: 'project-count', label: t`Număr proiecte` },
  { id: 'per-capita', label: t`Per capita` },
  { id: 'grant-share', label: t`Grant %` },
  { id: 'anomaly-count', label: t`Anomalii` },
]
```

#### Step 1.4 — Create `PnrrMapContent`

**File:** `src/features/pnrr/components/PnrrMapContent.tsx`

Composes the actual map with **corrected prop names**:

```typescript
function PnrrMapContent({
  projects,
  activeSeriesId,
}: {
  readonly projects: readonly PnrrProject[]
  readonly activeSeriesId: PnrrMapSeriesId
}) {
  const { activeSeries, heatmapData, min, max } = usePnrrMapSeries(projects, activeSeriesId)
  const { data: geoJson } = useGeoJsonData('County')
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null)

  // Build feature style function — CORRECTED API
  const getFeatureStyle = useCallback(
    (feature: UatFeature, heatmapDataMap: Map<string, HeatmapCountyDataPoint>) => {
      const mnemonic = feature.properties.mnemonic as string
      const data = heatmapDataMap.get(mnemonic)
      if (!data) return DEFAULT_FEATURE_STYLE
      // Use existing color scale or custom logic
      const normalized = normalizeValue(data.amount, min, max)
      return {
        fillColor: getHeatmapColor(normalized),
        fillOpacity: 0.7,
        weight: 1,
        color: '#666',
      }
    },
    [min, max]
  )

  // Build tooltip — CORRECTED API
  const getTooltipContent = useCallback(
    ({ properties }: { properties: UatProperties }) => {
      const mnemonic = properties.mnemonic as string
      const data = heatmapData.find((d) => d.county_code === mnemonic)
      if (!data) return properties.name
      return `<strong>${data.county_name}</strong><br/>${formatCurrency(data.amount, 'compact', 'EUR')}`
    },
    [heatmapData]
  )

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-xl border border-border/60 sm:h-[600px]">
      <InteractiveMap
        geoJsonData={geoJson ?? null}
        mapViewType="County"
        heatmapData={heatmapData}
        filters={{}} // minimal AnalyticsFilterType
        getFeatureStyle={getFeatureStyle}
        getTooltipContent={getTooltipContent}
        onFeatureClick={(properties) => setSelectedCounty(properties.name)}
        showLabels
      />
      <MapLegend
        min={min}
        max={max}
        title={activeSeries.label}
        currency="EUR"
        normalization={activeSeriesId === 'per-capita' ? 'per_capita' : 'total'}
      />
      <PnrrCountyDetailsPanel
        county={selectedCounty}
        projects={projects}
        onClose={() => setSelectedCounty(null)}
      />
    </div>
  )
}
```

**Reuses:**
- `InteractiveMap` — with corrected prop names (`getFeatureStyle`, `getTooltipContent`, `mapViewType`, `heatmapData`)
- `MapLegend` — accepts `min`, `max`, `title`, `currency`, `normalization`
- `useGeoJsonData('County')`
- `getHeatmapColor`, `normalizeValue` from `src/components/maps/utils.ts`

#### Step 1.5 — Create `PnrrCountyDetailsPanel`

**File:** `src/features/pnrr/components/PnrrCountyDetailsPanel.tsx`

Slide-out panel using `Sheet` (do **not** reuse `MapAnalyticsEntityDetailsPanel` — too coupled to advanced map types).

Shows:
- County name
- Total value + project count for this county
- Top 5 beneficiaries in this county
- Top 5 projects in this county
- Component breakdown
- Anomaly summary

Clicking a project opens `PnrrProjectDrawer`. Clicking a beneficiary jumps to Projects tab with search filter.

#### Step 1.6 — Add "Hartă" Tab

**File:** `src/features/pnrr/components/PnrrTabNav.tsx`

Add `map` to `PnrrViewSchema` and the `TABS` array:

```typescript
{ id: 'map', label: t`Hartă`, icon: Map }
```

**File:** `src/features/pnrr/components/PnrrDashboard.tsx`

Add map view rendering:

```typescript
{view === 'map' && (
  <PnrrMapView projects={filteredProjects} filterState={filterState} />
)}
```

> The map should use `filteredProjects` (after `filterProjects()`) so it respects active filters (components, counties, etc.).

---

### Phase 2: UAT-Level Map (V2)

#### Step 2.1 — CUI-to-UAT Mapping

Build a lookup from UAT GeoJSON `properties.cui` → `properties.natcode` (SIRUTA).

#### Step 2.2 — UAT Series

Add two series:
- `uat-total-value`
- `uat-project-count`

Switch `useGeoJsonData('UAT')`. Aggregate by SIRUTA code.

#### Step 2.3 — UAT Details Panel

When UAT clicked: show UAT name, county, entity info (if known), PNRR projects.

---

### Phase 3: Polish & Integration

#### Step 3.1 — Component Filter on Map

Map uses `filteredProjects` from `PnrrDashboard`, so component/county/funding-source filters automatically apply.

#### Step 3.2 — Mobile Responsiveness

- Map height: `h-[400px]` mobile / `h-[600px]` desktop
- Tabs: horizontally scrollable on mobile
- Legend: `MapLegend` already handles small screens
- Details panel: full-screen `Sheet` on mobile

#### Step 3.3 — "Național" Badge

Show a small badge: "X proiecte naționale excluse din hartă" when national projects are present in the filtered set.

---

## 6. File List (New Files)

```
src/features/pnrr/
├── components/
│   ├── PnrrMapView.tsx              # Main map container (tabs + map + panel)
│   ├── PnrrMapContent.tsx           # InteractiveMap composition (CORRECTED API)
│   ├── PnrrMapSeriesTabs.tsx        # Tab switcher for map datasets
│   └── PnrrCountyDetailsPanel.tsx   # Slide-out county details (Sheet-based)
├── hooks/
│   └── usePnrrMapSeries.ts          # Data transformation: projects → HeatmapCountyDataPoint[]
└── lib/
    ├── county-mnemonics.ts          # County name → 2-letter mnemonic lookup
    └── map-utils.ts                 # Custom getFeatureStyle, getTooltipContent helpers
```

## 7. Reused Files (No Changes)

```
src/components/maps/
├── InteractiveMap.tsx               # Leaflet wrapper
├── MapLegend.tsx                    # Color scale legend
├── MapLabels.tsx                    # Canvas label layer
├── utils.ts                         # getHeatmapColor, normalizeValue, getPercentileValues
├── interfaces.ts                    # UatProperties, UatFeature
└── constants.ts                     # DEFAULT_FEATURE_STYLE

src/hooks/
└── useGeoJson.ts                    # GeoJSON loading

src/schemas/heatmap.ts               # HeatmapCountyDataPoint
```

## 8. Critical Corrections from Review

| Original Plan Issue | Correction |
|---|---|
| Matched by `properties.name` | Match by `properties.mnemonic` (2-letter code) |
| `featureStyle={styleFn}` | `getFeatureStyle={getFeatureStyle}` — receives `(feature, heatmapDataMap)` |
| `tooltipContent={(props) => ...}` | `getTooltipContent={getTooltipContent}` — receives `{ properties, heatmapData, mapViewType, filters }` |
| `onFeatureClick={(properties) => ...}` | `onFeatureClick={(properties, event) => ...}` |
| Custom `PnrrMapLegend` | Reuse `MapLegend` directly — accepts `min`, `max`, `title`, `currency`, `normalization` |
| Reuse `MapAnalyticsEntityDetailsPanel` | Build custom `PnrrCountyDetailsPanel` with `Sheet` |
| Keyed data by county name | Key data by 2-letter mnemonic; build `COUNTY_NAME_TO_MNEMONIC` lookup |

## 9. Data Flow Diagram

```
PnrrDashboard (view=map)
  → filterProjects(projects, filters)  ← respects active filters
    → PnrrMapView
      → PnrrMapSeriesTabs (active series)
      → usePnrrMapSeries(filteredProjects, activeSeries)
        • COUNTY_NAME_TO_MNEMONIC[county] → mnemonic
        • aggregate by mnemonic
        • build HeatmapCountyDataPoint[]
        → InteractiveMap
          • getFeatureStyle(feature, heatmapDataMap) → fillColor
          • getTooltipContent({ properties }) → HTML string
          • onFeatureClick(properties) → open county panel
        → MapLegend (min, max, title)
        → PnrrCountyDetailsPanel (Sheet)
```

## 10. Open Questions

1. **Should the map share filters with Projects tab?**
   - **Yes.** The map receives `filteredProjects`, so all active filters apply automatically.

2. **How to handle "Național" projects?**
   - Exclude from map. Show a badge with the count of excluded national projects.

3. **UAT-level or county-level first?**
   - County-level (MVP). UAT-level is V2 due to limited CUI coverage (~21.6%).

---

## 11. Estimated Effort

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | County map with 5 series, corrected API, legend, county panel | 2–3 days |
| Phase 2 | UAT map with CUI matching | 1 day |
| Phase 3 | Filter integration, mobile polish, national badge | 1 day |
| **Total** | | **4–5 days** |
