# PNRR Map V2 Design: Multi-Granularity + Advanced Filters

## Research Summary

### UAT Mapping Reliability

| Strategy | Match Rate | Notes |
|----------|-----------|-------|
| CUI → UAT natcode | 47.0% overall | Most reliable when available. Unmatched = national entities (ministries, CFR, CNAIR) |
| Locality+county (prefix-stripped) | 90.2% (non-national) | Strip "MUNICIPIUL", "ORAȘUL", "COMUNA", "JUDEȚUL" prefixes. Unmatched = mostly București |
| Beneficiary name | Low | Very few primării in PNRR data; beneficiary names rarely match UAT names |

**Recommended cascading strategy:**
1. CUI match first (most reliable)
2. Fallback to stripped locality + county match
3. București projects → aggregate at county level (no UAT-level disaggregation)
4. National projects → exclude from UAT/county map, show only in national view

### Entity Type Distribution

| Type | Count | % |
|------|-------|---|
| Private companies | 12,613 | 50.7% |
| Other public institutions | 11,610 | 46.7% |
| Hospitals | 208 | 0.8% |
| Agencies | 188 | 0.8% |
| Ministries | 187 | 0.8% |
| National companies | 42 | 0.2% |
| Military | 35 | 0.1% |
| Primării (city halls) | 2 | ~0% |

**Key insight:** Very few primării are direct PNRR beneficiaries. Most local projects are implemented by private companies or specialized public agencies on behalf of local authorities.

---

## Proposed Architecture

### 1. Granularity Switcher

Three views, user-selectable via segmented control:

| Granularity | GeoJSON | Features | What it shows |
|-------------|---------|----------|---------------|
| **National** | None | 1 | Summary cards/stats for all of Romania. No map — just aggregated metrics. |
| **County** | `judete.json` | 42 | Choropleth by county (existing implementation). |
| **UAT** | `uat.json` | 3,186 | Choropleth by UAT. Requires CUI/locality→SIRUTA mapping. |

### 2. Entity Type Filter

Classify each project at parse time. Filter options:

- `all` — All projects
- `public` — All public institutions (ministries, agencies, hospitals, national companies, military, county councils, etc.)
- `private` — Private companies
- `primarie` — City halls (primării) — note: very few in this dataset

**Classification logic:** Keyword matching on `beneficiary` name:
```
primarie:    PRIMARIA / PRIMĂRIA
public:      MINISTERUL, AUTORITATEA, AGENȚIA, DIRECTIA, SPITALUL,
             CONSILIUL JUDEȚEAN, COMPANIA NAȚIONALĂ, UNITATEA MILITARĂ,
             JUDEȚUL, MUNICIPIUL, ORAȘUL, COMUNA, etc.
private:     Everything else
```

### 3. Aggregation Metric (Series)

Same 5 metrics as today, but computed per granularity:
- `total-value`
- `project-count`
- `per-capita`
- `grant-share`
- `anomaly-count`

### 4. Advanced Filter Panel

A collapsible panel (like the existing MapFilter on `/map`) with sections:

**Section 1: Granularity**
- Radio/Segmented: Național | Județ | UAT

**Section 2: Entity Type**
- Checkbox group: Toate | Instituții publice | Companii private | Primării

**Section 3: Aggregation Metric**
- Radio/Segmented: Valoare totală | Număr proiecte | Per capita | Grant % | Anomalii

**Section 4: Additional Filters**
- Componentă PNRR (multi-select)
- Sursă finanțare (grant / loan / grant+loan)
- Include proiecte naționale (toggle)
- Exclude micro-proiecte (<€5k) (toggle)

### 5. Data Flow

```
PnrrDashboard
  → filterProjects(projects, urlFilters)  // existing
    → PnrrMapView
      → PnrrMapFilterPanel (local state for map-specific filters)
        → applyEntityTypeFilter(filteredProjects, entityTypes)
          → applyGranularityMapping(projects, granularity)
            → National: computeAggregates → summary cards
            → County: COUNTY_NAME_TO_MNEMONIC → HeatmapCountyDataPoint[]
            → UAT: cui/locality→siruta mapping → HeatmapUATDataPoint[]
              → InteractiveMap + MapLegend
```

### 6. UAT Mapping Implementation

**File:** `src/features/pnrr/lib/uat-mapping.ts`

Build a lookup at app startup (or in build step):

```typescript
// 1. From UAT GeoJSON: build cui→natcode and (strippedName,county)→natcode lookups
const uatByCui: Map<string, string> = new Map()
const uatByLocality: Map<string, string> = new Map() // key: "normalizedLocality|county"

// 2. For each project, resolve SIRUTA:
function resolveSiruta(project: PnrrProject): string | null {
  // Try CUI first
  if (project.cui && uatByCui.has(project.cui)) {
    return uatByCui.get(project.cui)!
  }
  // Fallback to locality+county
  if (project.county !== 'Național') {
    const key = `${normalize(stripPrefix(project.locality))}|${project.county}`
    if (uatByLocality.has(key)) {
      return uatByLocality.get(key)!
    }
  }
  return null
}
```

**Coverage estimate:**
- CUI match: ~47% overall
- Locality match: ~90% of non-national
- Combined: ~90%+ of all projects (national excluded)
- Unmapped: ~10% → exclude from UAT map or show in county fallback

---

## Open Questions

### Q1: București UAT handling
București is not a single UAT in the GeoJSON — it's divided into 6 sectors. PNRR projects list "București" as locality. Options:
- **A.** Aggregate all București projects at county level (no UAT disaggregation)
- **B.** Distribute București projects equally across all 6 sectors (artificial)
- **C.** Try to infer sector from beneficiary name (e.g., "PRIMĂRIA SECTORULUI 1")

### Q2: National projects in non-national views
National projects (~0.7% of data) have county="Național" and locality="NAȚIONAL". Options:
- **A.** Exclude from county/UAT map entirely, show only in national view
- **B.** Include in county/UAT map with a toggle (but they have no geographic assignment)
- **C.** Assign them to București (since many national ministries are headquartered there)

### Q3: UAT map performance
3,186 UAT polygons + canvas labels + 90% data coverage = heavy rendering. Options:
- **A.** Accept the performance cost (React 19 + canvas renderer handles it)
- **B.** Cap zoom levels to prevent rendering all UATs at once
- **C.** Use clustering or simplify geometry at low zoom

### Q4: Entity type naming
The classification uses keyword heuristics. Should we:
- **A.** Keep it simple (public/private/primarie)
- **B.** Add more granular types (ministry, hospital, national company, agency, etc.)

### Q5: Should the advanced filter panel share state with the rest of the PNRR page?
Currently the map uses `filteredProjects` from the dashboard-level filters (component, county, funding source, search). Should the map-specific filters (granularity, entity type, aggregation metric) also sync to URL, or stay local to the map view?
