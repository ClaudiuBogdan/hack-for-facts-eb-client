# Guide: Creating a Romanian UAT Financial Analysis Report

## Using Transparenta.eu Advanced Map Analytics

**Version**: 1.0 | **Date**: March 2026 | **Platform**: Transparenta.eu

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Platform Capabilities Overview](#2-platform-capabilities-overview)
3. [Data Sources Reference](#3-data-sources-reference)
4. [Classification Systems Reference](#4-classification-systems-reference)
5. [Core Financial Metrics — Map Configurations](#5-core-financial-metrics--map-configurations)
6. [Sector-Specific Analysis Maps](#6-sector-specific-analysis-maps)
7. [Commitment Pipeline Analysis Maps](#7-commitment-pipeline-analysis-maps)
8. [Demographic and Economic Context Maps](#8-demographic-and-economic-context-maps)
9. [Cross-Source Composite Analysis Maps](#9-cross-source-composite-analysis-maps)
10. [Statistical Outlier Detection Guide](#10-statistical-outlier-detection-guide)
11. [Bins Configuration Guide](#11-bins-configuration-guide)
12. [Multi-Year Trend Analysis](#12-multi-year-trend-analysis)
13. [Report Structure and Assembly](#13-report-structure-and-assembly)
14. [Interpretation Framework](#14-interpretation-framework)
15. [Limitations and Workarounds](#15-limitations-and-workarounds)
16. [Quick Reference Tables](#16-quick-reference-tables)

---

## 1. Introduction

### 1.1 Purpose

This guide provides step-by-step instructions for creating a comprehensive financial analysis of Romanian UATs (Unități Administrativ-Teritoriale) using Transparenta.eu's Advanced Map Analytics. It translates financial analysis methodology into concrete platform configurations.

### 1.2 Target Audience

- **Journalists** investigating local budget problems during the 2026 budget public discussion
- **Public policy analysts** evaluating fiscal health across Romania's 3000+ territorial units
- **Civil society organizations** advocating for budget transparency
- **Local government officials** benchmarking their performance against peers

### 1.3 What You Will Produce

A collection of 30+ saved maps and table views that together form a complete financial analysis report covering:

- Fiscal health indicators for every UAT in Romania
- Statistical outlier detection revealing problematic territories
- Sector-specific spending analysis (education, health, infrastructure)
- Commitment pipeline and cash flow stress indicators
- Demographic and economic context integration
- Multi-year trend analysis

### 1.4 Political Context (2026)

Romania's national fiscal constraints materially change the operating environment for local budgets:

- **EU Excessive Deficit Procedure (EDP)**: Romania remains under EDP with projected deficits of 9.3% (2024), 8.4% (2025), and 6.2% (2026) of GDP
- **EU Funds Conditionality**: Under EDP, Romania faces risk of EU funds suspension if fiscal path deviations occur
- **Consolidation Cascading**: National deficit reduction creates tighter transfer envelopes, stricter spending controls, and higher pressure for local tax compliance
- **Policy Regime Changes**: VAT increases, wage/pension freeze extensions, property tax changes affecting local budgets

| Year | Policy Event | Local Budget Impact |
|------|--------------|---------------------|
| 2024 | First consolidation package | VAT increase from 19% to 24% |
| 2025 | Extended wage/pension freezes | Personnel cost rigidity increased |
| 2025 | Property tax reforms | Own-source revenue structure changed |
| 2026 | New EDP milestone | EU funds conditional on compliance |

---

## 2. Platform Capabilities Overview

### 2.1 Advanced Map Analytics Architecture

The Advanced Map Analytics feature is a geospatial data analysis tool operating at UAT granularity (3000+ territorial units identified by SIRUTA codes). It supports:

- **5 data series types**: Budget execution, commitments, INS statistics, GeoJSON datasets, and calculated series
- **Cross-series calculations**: DAG-based formula engine supporting sum, subtract, multiply, divide with arbitrary nesting
- **6 statistical filter methods**: Z-score, IQR, MAD, percentile band, rank, median compare
- **Configurable bins**: Auto-generated or manual choropleth classification with gradient/manual color modes
- **Dual view**: Interactive Leaflet map + sortable data table
- **Persistence**: Save, snapshot, restore, and publicly share map configurations

### 2.2 Data Pipeline

```
Series Configuration → Request Building → Server Fetch (CSV) → Local INS/GeoJSON Injection
    → Calculation Engine (DAG) → Value Filters → Bins Classification → Map/Table Rendering
```

Each saved map encodes the full state: all series definitions, active series selection, value filter rules, bins presets, and view preferences — all serialized to URL parameters and backend snapshots.

### 2.3 Series Types Available

| Type | Code | Source | Use For |
|------|------|--------|---------|
| Budget Execution | `line-items-aggregated-yearly` | GraphQL API (ANAF data) | Revenue/expense analysis by classification |
| Commitments | `commitments-analytics` | GraphQL API | Payment pipeline, arrears, execution rates |
| INS Statistics | `ins-series` | INS Tempo datasets | Population, employment, demographics |
| GeoJSON Dataset | `geojson-dataset-series` | Local GeoJSON properties | Static reference data (INS Pop 2021) |
| Calculated | `aggregated-series-calculation` | Computed from other series | Ratios, differences, composite metrics |

### 2.4 Output Formats

| Format | Description |
|--------|-------------|
| **Choropleth map** | Color-coded UAT boundaries, continuous heatmap or discrete bins |
| **Data table** | Sortable columns per series, filterable by bin groups |
| **CSV export** | Wide matrix format (rows = SIRUTA codes, columns = series) |
| **Public link** | Read-only shareable view with unique public ID |

---

## 3. Data Sources Reference

### 3.1 Budget Execution Data (`line-items-aggregated-yearly`)

**Source**: Execuții bugetare (Budget Execution) — aggregated at principal ordonator level

**Coverage**: 2016–2025 (annual), with quarterly/monthly detail

**Filter Configuration Reference**:

| Field | Type | Description | Common Values |
|-------|------|-------------|---------------|
| `account_category` | enum | Revenue or expense | `'vn'` (venituri/revenues), `'ch'` (cheltuieli/expenses) |
| `report_type` | enum | Aggregation level | `'Executie bugetara agregata la nivel de ordonator principal'` |
| `is_uat` | boolean | Filter to UAT-level entities only | `true` for territorial analysis |
| `normalization` | enum | Value transformation | `'total'`, `'per_capita'`, `'percent_gdp'` |
| `currency` | enum | Output currency | `'RON'`, `'EUR'`, `'USD'` |
| `inflation_adjusted` | boolean | Constant price adjustment | `true` for trend comparisons |
| `functional_prefixes` | string[] | Budget purpose filter | `['65']` for education, `['66']` for health |
| `economic_prefixes` | string[] | Budget type filter | `['10']` for personnel, `['71']` for capital |
| `funding_source_ids` | string[] | Revenue source | `['B']` for own revenues |
| `expense_types` | string[] | Operational/development | `['dezvoltare']`, `['functionare']` |
| `report_period` | object | Time filter | `{ type: 'YEAR', selection: { interval: { start: '2025', end: '2025' } } }` |

**Exclude filters**: Mirror of include filters under `exclude.*` — use to remove specific classification branches (e.g., exclude inter-entity transfers `['51.01', '51.02']`).

**Default exclusions applied by platform**:
- Expenses: Economic prefixes `51.01`, `51.02` (inter-entity transfers)
- Income: Functional prefixes `36.02.05`, `37.02.03`, `37.02.04`, `47.02.04`

### 3.2 Commitments Data (`commitments-analytics`)

**Source**: Angajamente bugetare (Budget Commitments)

**Coverage**: 2019–2025

**Available Metrics** (14 total):

| Metric | Romanian | English | Period |
|--------|----------|---------|--------|
| `CREDITE_ANGAJAMENT` | Credite de angajament | Commitment credits | M/Q/Y |
| `CREDITE_BUGETARE` | Credite bugetare | Budget credits | Q/Y |
| `LIMITA_CREDIT_ANGAJAMENT` | Limita creditului de angajament | Commitment credit limit | Q/Y |
| `PLATI_TREZOR` | Plăți trezorerie | Treasury payments | M/Q/Y |
| `PLATI_NON_TREZOR` | Plăți non-trezorerie | Non-treasury payments | M/Q/Y |
| `RECEPTII_TOTALE` | Recepții totale | Total receipts | M/Q/Y |
| `RECEPTII_NEPLATITE` | Recepții neplătite | Unpaid receipts (arrears) | Q/Y |
| `RECEPTII_NEPLATITE_CHANGE` | Variația recepțiilor neplătite | Unpaid receipts change | M only |
| `CREDITE_ANGAJAMENT_INITIALE` | Credite angajament inițiale | Initial commitment credits | Q/Y |
| `CREDITE_BUGETARE_INITIALE` | Credite bugetare inițiale | Initial budget credits | Q/Y |
| `CREDITE_ANGAJAMENT_DEFINITIVE` | Credite angajament definitive | Definitive commitment credits | Q/Y |
| `CREDITE_BUGETARE_DEFINITIVE` | Credite bugetare definitive | Definitive budget credits | Q/Y |
| `CREDITE_ANGAJAMENT_DISPONIBILE` | Credite angajament disponibile | Available commitment credits | Q/Y |
| `CREDITE_BUGETARE_DISPONIBILE` | Credite bugetare disponibile | Available budget credits | Q/Y |

**Key derived calculations from commitments**:
- **Total Payments** = `PLATI_TREZOR + PLATI_NON_TREZOR`
- **Execution Rate** = `Total Payments / CREDITE_BUGETARE × 100`
- **Commitment Rate** = `CREDITE_ANGAJAMENT / LIMITA_CREDIT_ANGAJAMENT × 100`
- **Arrears Ratio** = `RECEPTII_NEPLATITE / RECEPTII_TOTALE × 100`
- **Budget Rectification Impact** = `CREDITE_BUGETARE_DEFINITIVE - CREDITE_BUGETARE_INITIALE`

### 3.3 INS Statistics Data (`ins-series`)

**Source**: INS Tempo (National Institute of Statistics) — linked by SIRUTA code

**Configuration fields**:

| Field | Type | Description |
|-------|------|-------------|
| `datasetCode` | string | INS matrix code (e.g., `'POP107D'`) |
| `period` | object | Time filter (same as report_period) |
| `aggregation` | enum | Per-SIRUTA reducer: `'sum'`, `'average'`, `'first'` |
| `classificationSelections` | Record | Dimension filters: AND across types, OR within each type |
| `territoryCodes` | string[] | INS territory code filter |
| `sirutaCodes` | string[] | SIRUTA code filter |
| `unitCodes` | string[] | Unit of measure filter |
| `hasValue` | boolean | Require non-null observations (default: true) |

**Key datasets for UAT analysis**:

| Code | Category | Description | Level |
|------|----------|-------------|-------|
| `POP107D` | Core | Resident population | UAT |
| `POP108D` | Core | Population variant | UAT |
| `POP201D` | Demography | Live births | UAT |
| `POP206D` | Demography | Deaths | UAT |
| `POP309E` | Demography | Emigrants | UAT |
| `POP310E` | Demography | Immigrants | UAT |
| `FOM104D` | Economy | Average number of employees | UAT |
| `SOM101E` | Employment | Registered unemployed | UAT |
| `SOM101F` | Employment | Registered unemployment share | UAT |
| `SOM103A` | Employment | Unemployment rate | County |
| `LOC101B` | Housing | Existing dwellings | UAT |
| `LOC103B` | Housing | Total living area (m²) | UAT |
| `GOS107A` | Utilities | Water distributed (thousand m³) | UAT |
| `GOS110A` | Utilities | Sewer network length (km) | UAT |
| `GOS116A` | Utilities | Gas network length (km) | UAT |
| `GOS118A` | Utilities | Gas distributed (thousand m³) | UAT |
| `SCL101C` | Education | School units | UAT |
| `SCL103D` | Education | Enrolled students | UAT |
| `SAN101B` | Health | Health units | UAT |
| `SAN104B` | Health | Medical staff/beds | UAT |
| `TUR101C` | Tourism | Tourist accommodation | UAT |

**Derived demographic indicators** (computed as calculated series):

| Indicator | Formula | Datasets | Unit |
|-----------|---------|----------|------|
| Birth rate | (POP201D / POP107D) × 1000 | Births, Population | per 1,000 |
| Death rate | (POP206D / POP107D) × 1000 | Deaths, Population | per 1,000 |
| Natural increase | POP201D − POP206D | Births, Deaths | absolute |
| Natural increase rate | ((POP201D − POP206D) / POP107D) × 1000 | All three | per 1,000 |
| Net migration | POP310E − POP309E | Immigrants, Emigrants | absolute |
| Net migration rate | ((POP310E − POP309E) / POP107D) × 1000 | All three | per 1,000 |
| Employment rate | (FOM104D / POP107D) × 1000 | Employees, Population | per 1,000 |
| Dwellings rate | (LOC101B / POP107D) × 1000 | Dwellings, Population | per 1,000 |
| Living area/capita | LOC103B / POP107D | Living area, Population | m²/capita |
| Water/capita | GOS107A / POP107D | Water, Population | m³/capita |
| Gas/capita | GOS118A / POP107D | Gas, Population | m³/capita |
| Sewer network density | (GOS110A / POP107D) × 1000 | Sewer, Population | km/1,000 |
| Gas network density | (GOS116A / POP107D) × 1000 | Gas network, Population | km/1,000 |

### 3.4 GeoJSON Dataset (`geojson-dataset-series`)

**Source**: Local GeoJSON feature properties — computed client-side, never sent to server.

**Available datasets**:

| Key | Description | Unit |
|-----|-------------|------|
| `insPop2021` | INS Population Census 2021 | inhabitants |

**Filter options**: `countyFilterIds` (array of county IDs), `regionFilterIds` (array of region IDs).

**Use case**: Quick population reference without server roundtrip. Useful as denominator in per-capita calculations when INS Tempo data is unavailable.

---

## 4. Classification Systems Reference

### 4.1 Functional Classifications (Budget Purpose)

Romanian COFOG3 hierarchical format: `XX.XX.XX` (chapter.subchapter.article).

**Revenue-side top-level codes**:

| Code | Description |
|------|-------------|
| 01 | Profit tax |
| 03 | Income tax |
| 04 | Shares and amounts broken down from income tax |
| 07 | Taxes on property |
| 10 | Value Added Tax |
| 11 | Amounts broken down from VAT |
| 16 | Taxes on use of goods, authorization |
| 30 | Revenues from property |
| 33 | Revenues from services and other activities |
| 36 | Miscellaneous revenues |
| 42 | Subsidies |
| 43 | Subsidies from other administrations |
| 45 | Amounts from EU on account of payments |
| 48 | Amounts from EU (2014-2020 framework) |
| 49 | Non-reimbursable financial assistance for NRRP |

**Expenditure-side functional codes** (most relevant for UAT analysis):

| Code | Romanian | English | Relevance |
|------|----------|---------|-----------|
| **51** | Autorități publice | Public authorities | Administrative overhead |
| **54** | Alte servicii publice generale | Other general public services | General services |
| **61** | Ordine publică | Public order and safety | Security spending |
| **65** | Învățământ | Education | Core social service |
| **66** | Sănătate | Health | Core social service |
| **67** | Cultură, recreere | Culture, recreation | Quality of life |
| **68** | Asigurări și asistență socială | Social insurance and assistance | Social protection |
| **70** | Locuințe, servicii, dezvoltare | Housing, services, development | Infrastructure |
| **74** | Protecția mediului | Environmental protection | Sustainability |
| **80** | Acțiuni economice generale | General economic actions | Economic development |
| **84** | Transporturi | Transport | Infrastructure |

### 4.2 Economic Classifications (Budget Type)

Hierarchical format: `XX.XX.XX` (chapter.subchapter.article).

**Top-level economic codes**:

| Code | Romanian | English | Category |
|------|----------|---------|----------|
| **10** | Cheltuieli cu personalul | Personnel expenses | Current/operational |
| **20** | Bunuri și servicii | Goods and services | Current/operational |
| **30** | Dobânzi | Interest payments | Current/debt |
| **40** | Subvenții | Subsidies | Transfer |
| **51** | Transferuri între unități | Transfers between admin units | Transfer (excluded by default) |
| **55** | Alte transferuri | Other transfers | Transfer |
| **56** | Proiecte FEN post-aderare | EU-funded projects (post-accession) | Capital/EU |
| **57** | Asistență socială | Social assistance | Transfer/social |
| **58** | Proiecte FEN 2014-2020 | EU-funded projects (2014-2020) | Capital/EU |
| **59** | Alte cheltuieli | Other expenses | Mixed |
| **60** | Proiecte PNRR nerambursabile | NRRP projects (grants) | Capital/EU |
| **61** | Proiecte PNRR împrumut | NRRP projects (loans) | Capital/EU |
| **65** | Programe rambursabile | Reimbursable programs | Capital |
| **70** | Cheltuieli de capital (total) | Capital expenditures (summary) | Capital |
| **71** | Active nefinanciare | Non-financial assets | Capital/investment |
| **72** | Active financiare | Financial assets | Capital/financial |
| **80** | Împrumuturi | Loans given | Financial |
| **81** | Rambursări de credite | Loan repayments | Debt service |
| **85** | Plăți anii precedenți recuperate | Prior year payments recovered | Adjustment |

### 4.3 Funding Sources

| Code | Romanian | English | Analytical Significance |
|------|----------|---------|------------------------|
| **A** | Integral de la buget | Entirely from budget | Central government dependency |
| **B** | Venituri proprii | Own revenues | Fiscal autonomy indicator |
| **C** | Credite externe | External credits/loans | Debt exposure |
| **D** | Credite interne | Internal credits/loans | Domestic debt |
| **E** | Fonduri externe nerambursabile | Non-reimbursable external funds (EU) | EU fund dependency |
| **F** | Venituri proprii și subvenții | Own revenues and subsidies | Mixed funding |
| **G** | Subvenții de la bugetul de stat | State budget subsidies | Transfer dependency |
| **H** | Subvenții de la alte administrații | Subsidies from other administrations | Inter-governmental |
| **I** | Alte surse | Other sources | Miscellaneous |

### 4.4 Expense Types

| Value | Romanian | English | Use |
|-------|----------|---------|-----|
| `functionare` | Funcționare | Operational/current | Day-to-day spending |
| `dezvoltare` | Dezvoltare | Development/capital | Investment spending |

---

## 5. Core Financial Metrics — Map Configurations

Each subsection below defines one saved map. Follow these steps for each:

1. **Create a new map** in Advanced Map Analytics
2. **Add base series** as described (type, filters, normalization)
3. **Add calculated series** if the metric is a ratio/difference
4. **Set the calculated series as active** (drives map coloring)
5. **Configure bins** using the recommended preset
6. **Add value filters** for outlier highlighting
7. **Save with descriptive name** for the report

### 5.1 Map: Budget Balance Per Capita

**What it shows**: Whether each UAT spends more than it earns, normalized by population. The single most important indicator of fiscal health.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Total Revenues** | `line-items-aggregated-yearly` | `account_category: 'vn'`, `is_uat: true`, `normalization: 'per_capita'`, `report_type: 'Executie bugetara agregata la nivel de ordonator principal'`, `report_period: { type: 'YEAR', selection: { interval: { start: '2025', end: '2025' } } }` |
| **B: Total Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `is_uat: true`, `normalization: 'per_capita'`, same report_type and period |
| **C: Balance (active)** | `aggregated-series-calculation` | `calculation: { op: 'subtract', args: ['A_id', 'B_id'] }` |

**Bins preset** (diverging, 7 bins):

| Bin | Range (RON/capita) | Color | Label |
|-----|--------------------|-------|-------|
| 1 | < -1000 | `#b2182b` (dark red) | Deficit sever |
| 2 | -1000 to -500 | `#ef8a62` (red-orange) | Deficit ridicat |
| 3 | -500 to -200 | `#fddbc7` (light orange) | Deficit moderat |
| 4 | -200 to 200 | `#f7f7f7` (neutral gray) | Echilibrat |
| 5 | 200 to 500 | `#d1e5f0` (light blue) | Excedent moderat |
| 6 | 500 to 1000 | `#67a9cf` (blue) | Excedent ridicat |
| 7 | >= 1000 | `#2166ac` (dark blue) | Excedent semnificativ |

**Recommended value filters**:
- `zscore` with `mode: 'abs_gte'`, `threshold: 2` — highlights extreme cases on both sides

**Interpretation guide**:

| Value | Interpretation | Action |
|-------|---------------|--------|
| < -1000 RON/cap | Severe fiscal stress — expenses far exceed revenues | Immediate investigation — check for arrears, structural deficits |
| -1000 to -500 | Significant deficit — sustainability concerns | Review spending structure, check transfer dependency |
| -500 to -200 | Moderate deficit — manageable if temporary | Monitor trends, compare with peer group |
| -200 to 200 | Balanced — normal operational range | Baseline performance |
| > 200 | Surplus — accumulating reserves or under-spending | Check if under-execution or genuine fiscal capacity |

### 5.2 Map: Budget Execution Rate

**What it shows**: How much of the approved budget was actually spent. Low rates indicate governance/capacity problems; very high rates may indicate procedure bypass.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Treasury Payments** | `commitments-analytics` | `metric: 'PLATI_TREZOR'`, `is_uat: true`, annual period |
| **B: Non-Treasury Payments** | `commitments-analytics` | `metric: 'PLATI_NON_TREZOR'`, same filters |
| **C: Total Payments** | `aggregated-series-calculation` | `{ op: 'sum', args: ['A_id', 'B_id'] }` |
| **D: Budget Credits** | `commitments-analytics` | `metric: 'CREDITE_BUGETARE'`, same filters |
| **E: Execution Rate (active)** | `aggregated-series-calculation` | `{ op: 'multiply', args: [{ op: 'divide', args: ['C_id', 'D_id'] }, 100] }` |

**Bins preset** (5 bins):

| Bin | Range (%) | Color | Label |
|-----|-----------|-------|-------|
| 1 | < 50 | `#d73027` (red) | Sub-execuție severă |
| 2 | 50 to 70 | `#fc8d59` (orange) | Sub-execuție |
| 3 | 70 to 95 | `#91cf60` (green) | Normal |
| 4 | 95 to 105 | `#fee08b` (yellow) | Limită |
| 5 | >= 105 | `#d73027` (red) | Supra-execuție |

**Interpretation**:

| Range | Signal | Possible Causes |
|-------|--------|-----------------|
| < 50% | Severe under-execution | Capacity failure, procurement blockages, administrative paralysis |
| 50–70% | Concerning under-execution | Slow procurement, staffing gaps, project delays |
| 70–95% | Normal execution range | Expected operational performance |
| 95–105% | Near-full or slight over-execution | Tight budget management or minor adjustments |
| > 105% | Over-execution flag | Potential procedure bypass, emergency spending, rectification lag |

### 5.3 Map: Arrears Ratio

**What it shows**: The proportion of goods/services received but not yet paid for — a direct measure of cash flow stress.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Unpaid Receipts** | `commitments-analytics` | `metric: 'RECEPTII_NEPLATITE'`, `is_uat: true`, annual period |
| **B: Total Receipts** | `commitments-analytics` | `metric: 'RECEPTII_TOTALE'`, same filters |
| **C: Arrears Ratio (active)** | `aggregated-series-calculation` | `{ op: 'multiply', args: [{ op: 'divide', args: ['A_id', 'B_id'] }, 100] }` |

**Bins preset** (5 bins):

| Bin | Range (%) | Color | Label |
|-----|-----------|-------|-------|
| 1 | < 5 | `#1a9850` (dark green) | Normal |
| 2 | 5 to 10 | `#91cf60` (light green) | Ușor |
| 3 | 10 to 20 | `#fee08b` (yellow) | Moderat |
| 4 | 20 to 30 | `#fc8d59` (orange) | Semnificativ |
| 5 | >= 30 | `#d73027` (red) | Sever |

**Interpretation**:

| Range | Signal | Consequence |
|-------|--------|-------------|
| < 5% | Healthy cash flow | Normal payment cycle |
| 5–10% | Minor delays | Acceptable within payment terms |
| 10–20% | Moderate arrears | Supplier relationships may be strained |
| 20–30% | Significant cash flow stress | Payment chain disruption likely, suppliers may refuse contracts |
| > 30% | Severe arrears crisis | Risk of service interruption, legal actions, creditworthiness damage |

### 5.4 Map: Personnel Cost Ratio

**What it shows**: What proportion of total spending goes to salaries and staff costs — high values indicate rigidity and limited capacity for services/investment.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Personnel Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `economic_prefixes: ['10']`, `is_uat: true`, annual period |
| **B: Total Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `is_uat: true`, same period |
| **C: Personnel Ratio (active)** | `aggregated-series-calculation` | `{ op: 'multiply', args: [{ op: 'divide', args: ['A_id', 'B_id'] }, 100] }` |

**Bins preset** (5 bins):

| Bin | Range (%) | Color | Label |
|-----|-----------|-------|-------|
| 1 | < 40 | `#1a9850` (dark green) | Scăzut |
| 2 | 40 to 50 | `#91cf60` (light green) | Normal |
| 3 | 50 to 60 | `#fee08b` (yellow) | Moderat |
| 4 | 60 to 70 | `#fc8d59` (orange) | Ridicat |
| 5 | >= 70 | `#d73027` (red) | Sever |

**Interpretation**:

| Range | Signal | Implication |
|-------|--------|-------------|
| < 40% | Low personnel costs | Either efficient or underpaying staff — check service quality |
| 40–50% | Normal range | Balanced allocation between staff and operations |
| 50–60% | Moderate | Growing rigidity, less flexibility for other spending |
| 60–70% | High — concerning | Limited service delivery capacity, minimal discretionary budget |
| > 70% | Severe — structural problem | Budget almost entirely consumed by salaries, no investment possible |

### 5.5 Map: Self-Funding Ratio (Fiscal Autonomy)

**What it shows**: What proportion of expenses is covered by own revenues (funding source B) — low values indicate high dependency on central government transfers.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Own Revenues** | `line-items-aggregated-yearly` | `account_category: 'vn'`, `funding_source_ids: ['B']`, `is_uat: true`, annual period |
| **B: Total Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `is_uat: true`, same period |
| **C: Autonomy Ratio (active)** | `aggregated-series-calculation` | `{ op: 'multiply', args: [{ op: 'divide', args: ['A_id', 'B_id'] }, 100] }` |

**Bins preset** (5 bins):

| Bin | Range (%) | Color | Label |
|-----|-----------|-------|-------|
| 1 | < 20 | `#d73027` (red) | Foarte scăzut |
| 2 | 20 to 30 | `#fc8d59` (orange) | Scăzut |
| 3 | 30 to 50 | `#fee08b` (yellow) | Moderat |
| 4 | 50 to 70 | `#91cf60` (light green) | Ridicat |
| 5 | >= 70 | `#1a9850` (dark green) | Foarte ridicat |

**Interpretation**:

| Range | Signal | Risk Profile |
|-------|--------|--------------|
| < 20% | Very low autonomy | Structurally dependent — vulnerable to any transfer reduction |
| 20–30% | Low autonomy | High dependency, limited fiscal maneuver |
| 30–50% | Moderate autonomy | Mixed funding, some resilience |
| 50–70% | Good autonomy | Strong local tax base, moderate transfer dependency |
| > 70% | High autonomy | Largely self-sufficient, resilient to national policy changes |

### 5.6 Map: Development Spending Ratio

**What it shows**: What proportion of total spending goes to investment/capital (dezvoltare) — low values indicate a UAT stuck in operational mode with no development capacity.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Development Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `expense_types: ['dezvoltare']`, `is_uat: true`, annual period |
| **B: Total Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `is_uat: true`, same period |
| **C: Development Ratio (active)** | `aggregated-series-calculation` | `{ op: 'multiply', args: [{ op: 'divide', args: ['A_id', 'B_id'] }, 100] }` |

**Bins preset** (5 bins):

| Bin | Range (%) | Color | Label |
|-----|-----------|-------|-------|
| 1 | < 5 | `#d73027` (red) | Fără investiții |
| 2 | 5 to 10 | `#fc8d59` (orange) | Investiții scăzute |
| 3 | 10 to 15 | `#fee08b` (yellow) | Moderat |
| 4 | 15 to 25 | `#91cf60` (light green) | Bun |
| 5 | >= 25 | `#1a9850` (dark green) | Investiții ridicate |

**Interpretation**:

| Range | Signal | Significance |
|-------|--------|-------------|
| < 5% | Severe underinvestment | No capital spending — UAT is in survival mode |
| 5–10% | Low investment | Minimal infrastructure development |
| 10–15% | Moderate | Basic investment capacity, typical for small communes |
| 15–25% | Good investment level | Active development program |
| > 25% | High investment phase | Major projects underway — verify sustainability and EU co-financing |

### 5.7 Map: Total Revenue Per Capita

**What it shows**: The overall fiscal capacity of each UAT — total revenues normalized by population.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Revenues (active)** | `line-items-aggregated-yearly` | `account_category: 'vn'`, `is_uat: true`, `normalization: 'per_capita'`, annual period |

**Bins preset** (6 bins, auto-generated from data with gradient red-to-green).

### 5.8 Map: Total Expense Per Capita

**Series configuration**: Same as 5.7 but `account_category: 'ch'`.

---

## 6. Sector-Specific Analysis Maps

These maps decompose spending by functional classification to reveal sector-level priorities and gaps.

### 6.1 Map: Education Spending Per Capita

**Functional code**: `65` (Învățământ)

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Education Expenses (active)** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `functional_prefixes: ['65']`, `is_uat: true`, `normalization: 'per_capita'`, annual period |

**Sub-sector drill-down options** (create additional series if needed):

| Sub-code | Description |
|----------|-------------|
| 65.03 | Pre-school and primary education |
| 65.04 | Secondary education |
| 65.05 | Post-secondary non-tertiary education |
| 65.07 | Subsidiary education services |
| 65.50 | Other education expenditures |

**Recommended filters**: Apply `iqr_outlier` (lower side, multiplier 1.5) to flag UATs with abnormally low education spending.

**Cross-reference**: Create a companion INS series with `SCL103D` (enrolled students) to compute per-student spending as a calculated series.

### 6.2 Map: Health Spending Per Capita

**Functional code**: `66` (Sănătate)

**Series**: `line-items-aggregated-yearly`, `account_category: 'ch'`, `functional_prefixes: ['66']`, `normalization: 'per_capita'`

**Cross-reference**: INS dataset `SAN104B` (medical staff/beds) for spending-per-medical-unit analysis.

### 6.3 Map: Infrastructure Investment Per Capita

**Functional codes**: `70` (Housing, services, development) + `84` (Transport)

**Series**: `line-items-aggregated-yearly`, `account_category: 'ch'`, `functional_prefixes: ['70', '84']`, `expense_types: ['dezvoltare']`, `normalization: 'per_capita'`

**Note**: Filter to `expense_types: ['dezvoltare']` to capture only capital/investment spending in infrastructure, excluding operational maintenance.

### 6.4 Map: Social Protection Spending Per Capita

**Functional code**: `68` (Social insurance and assistance)

**Series**: `line-items-aggregated-yearly`, `account_category: 'ch'`, `functional_prefixes: ['68']`, `normalization: 'per_capita'`

### 6.5 Map: Administrative Overhead Ratio

**What it shows**: What percentage of total spending goes to public administration itself.

**Series configuration**:

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Admin Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `functional_prefixes: ['51']`, `is_uat: true`, annual period |
| **B: Total Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `is_uat: true`, same period |
| **C: Admin Ratio (active)** | `aggregated-series-calculation` | `{ op: 'multiply', args: [{ op: 'divide', args: ['A_id', 'B_id'] }, 100] }` |

**Bins**: `< 15%` (green), `15–20%`, `20–25%`, `25–30%`, `>= 30%` (red)

**Interpretation**: > 30% administrative overhead is a strong inefficiency signal — the UAT is spending nearly a third of its budget on running itself.

### 6.6 Map: Goods and Services Spending Per Capita

**Economic code**: `20` (Bunuri și servicii)

**Series**: `line-items-aggregated-yearly`, `account_category: 'ch'`, `economic_prefixes: ['20']`, `normalization: 'per_capita'`

**Significance**: Second largest operational category after personnel. Abnormally high values may indicate outsourcing to avoid personnel caps.

---

## 7. Commitment Pipeline Analysis Maps

These maps use the commitments data source to analyze the full budget cycle: authorization → commitment → receipt → payment.

### 7.1 Map: Commitment Utilization Rate

**What it shows**: How close UATs are to their maximum authorized commitment level.

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Commitment Credits** | `commitments-analytics` | `metric: 'CREDITE_ANGAJAMENT'` |
| **B: Commitment Limit** | `commitments-analytics` | `metric: 'LIMITA_CREDIT_ANGAJAMENT'` |
| **C: Utilization Rate (active)** | Calculation | `(A / B) × 100` |

**Bins**: `< 50%` (blue — under-committed), `50–80%`, `80–95%` (green — normal), `95–100%` (yellow), `>= 100%` (red — over-committed)

**Signal**: > 95% means the UAT has almost no flexibility to make new commitments within its authorization.

### 7.2 Map: Payment Gap Ratio

**What it shows**: The gap between what was committed and what was actually paid.

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Commitment Credits** | `commitments-analytics` | `metric: 'CREDITE_ANGAJAMENT'` |
| **B: Treasury Payments** | `commitments-analytics` | `metric: 'PLATI_TREZOR'` |
| **C: Non-Treasury Payments** | `commitments-analytics` | `metric: 'PLATI_NON_TREZOR'` |
| **D: Total Payments** | Calculation | `B + C` |
| **E: Payment Gap** | Calculation | `A - D` |
| **F: Payment Gap Ratio (active)** | Calculation | `(E / A) × 100` |

**Interpretation**: A high payment gap (> 30%) means the UAT committed to spending but didn't follow through with payments — indicating either administrative bottlenecks or cash shortages.

### 7.3 Map: Budget Rectification Impact

**What it shows**: How much the budget changed between initial approval and final definitive credits.

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Definitive Credits** | `commitments-analytics` | `metric: 'CREDITE_BUGETARE_DEFINITIVE'` |
| **B: Initial Credits** | `commitments-analytics` | `metric: 'CREDITE_BUGETARE_INITIALE'` |
| **C: Change** | Calculation | `A - B` |
| **D: Change % (active)** | Calculation | `(C / B) × 100` |

**Signal**: Large positive changes indicate supplementary allocations (often transfers or EU funds arriving mid-year). Large negative changes indicate budget cuts or unrealistic initial planning.

### 7.4 Map: Cash Flow Health Index

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Total Payments** | Calculated | `PLATI_TREZOR + PLATI_NON_TREZOR` |
| **B: Obligations** | Calculated | `CREDITE_ANGAJAMENT + RECEPTII_NEPLATITE` |
| **C: Cash Flow Index (active)** | Calculation | `(A / B) × 100` |

**Interpretation**: < 70% indicates the UAT is paying less than 70% of its total obligations — a cash flow stress signal.

---

## 8. Demographic and Economic Context Maps

These maps provide the socioeconomic context needed to interpret financial metrics.

### 8.1 Map: Population Distribution

| Series | Type | Configuration |
|--------|------|---------------|
| **A (active)** | `ins-series` | `datasetCode: 'POP107D'`, `aggregation: 'first'`, latest year |

**Bins**: Use log-scale bins for population size classes (communes under 2000, small towns 2000–10000, towns 10000–50000, cities 50000–200000, large cities > 200000).

### 8.2 Map: Population Change (Trend)

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Population Current** | `ins-series` | `POP107D`, year 2024 |
| **B: Population Previous** | `ins-series` | `POP107D`, year 2019 |
| **C: Change % (active)** | Calculation | `((A - B) / B) × 100` |

**Signal**: Negative values indicate population decline — these UATs face shrinking tax bases.

### 8.3 Map: Employment Rate

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Employees** | `ins-series` | `datasetCode: 'FOM104D'`, `aggregation: 'first'` |
| **B: Population** | `ins-series` | `datasetCode: 'POP107D'`, `aggregation: 'first'` |
| **C: Employment Rate (active)** | Calculation | `(A / B) × 1000` (per 1,000 inhabitants) |

### 8.4 Map: Natural Population Increase Rate

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Births** | `ins-series` | `POP201D`, `aggregation: 'sum'` |
| **B: Deaths** | `ins-series` | `POP206D`, `aggregation: 'sum'` |
| **C: Population** | `ins-series` | `POP107D`, `aggregation: 'first'` |
| **D: Natural Increase Rate (active)** | Calculation | `((A - B) / C) × 1000` |

**Diverging bins**: Negative (red — population decline), Zero band (gray), Positive (green — population growth).

### 8.5 Map: Infrastructure — Water Supply Per Capita

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Water Distributed** | `ins-series` | `GOS107A`, `aggregation: 'sum'` |
| **B: Population** | `ins-series` | `POP107D`, `aggregation: 'first'` |
| **C: Water/Capita (active)** | Calculation | `A / B` |

---

## 9. Cross-Source Composite Analysis Maps

These maps combine budget data with INS statistics to create powerful cross-domain analyses.

### 9.1 Map: Spending Per Employee (Economic Efficiency Proxy)

**What it shows**: How much the UAT spends per employee in its territory — a rough measure of public spending efficiency relative to local economic activity.

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Total Expenses** | `line-items-aggregated-yearly` | `account_category: 'ch'`, `is_uat: true` |
| **B: Employees** | `ins-series` | `FOM104D`, `aggregation: 'first'` |
| **C: Spending/Employee (active)** | Calculation | `A / B` |

### 9.2 Map: Education Spending Per Student

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Education Expenses** | `line-items-aggregated-yearly` | `functional_prefixes: ['65']`, `account_category: 'ch'` |
| **B: Enrolled Students** | `ins-series` | `SCL103D`, `aggregation: 'sum'` |
| **C: Per Student (active)** | Calculation | `A / B` |

### 9.3 Map: Revenue Growth vs Population Change

**What it shows**: Whether revenue dynamics are keeping pace with demographic changes.

| Series | Type | Configuration |
|--------|------|---------------|
| **A: Revenue 2025** | `line-items-aggregated-yearly` | `account_category: 'vn'`, year 2025 |
| **B: Revenue 2021** | `line-items-aggregated-yearly` | `account_category: 'vn'`, year 2021 |
| **C: Revenue Growth %** | Calculation | `((A - B) / B) × 100` |
| **D: Pop 2024** | `ins-series` | `POP107D`, 2024 |
| **E: Pop 2019** | `ins-series` | `POP107D`, 2019 |
| **F: Pop Change %** | Calculation | `((D - E) / E) × 100` |
| **G: Divergence (active)** | Calculation | `C - F` |

**Interpretation**: Positive divergence = revenue growing faster than population (improving capacity). Negative = population growing faster than revenue (fiscal stress building).

### 9.4 Map: Transfer Dependency with Population Context

| Series | Type | Configuration |
|--------|------|---------------|
| **A: State Transfers** | `line-items-aggregated-yearly` | `account_category: 'vn'`, `funding_source_ids: ['A', 'G']` |
| **B: Total Revenues** | `line-items-aggregated-yearly` | `account_category: 'vn'` |
| **C: Transfer Share (active)** | Calculation | `(A / B) × 100` |
| **D: Population (context)** | `ins-series` | `POP107D` |

Use the table view to cross-reference: UATs with high transfer dependency AND small population indicate structural vulnerability.

---

## 10. Statistical Outlier Detection Guide

The platform provides 6 statistical methods natively in the value filter system. This section explains when and how to use each.

### 10.1 Method Comparison

| Method | Best For | Robust to Outliers? | Min Sample | Key Parameter |
|--------|----------|---------------------|------------|---------------|
| **Z-score** | Normally distributed data | No | 2 | threshold (default: 2) |
| **IQR outlier** | Skewed distributions | Yes | 4 | multiplier (default: 1.5) |
| **MAD robust z-score** | Heavy-tailed distributions | Very robust | 3 | threshold (default: 3.5) |
| **Percentile band** | Selecting specific quantile ranges | N/A | 1 | min/max percentile |
| **Rank** | Finding top/bottom N | N/A | 1 | direction, count |
| **Median compare** | Simple above/below median split | Yes | 1 | mode (gt/lt/gte/lte) |

### 10.2 Recommended Method by Metric

| Metric | Recommended Method | Reasoning |
|--------|-------------------|-----------|
| Budget balance per capita | **MAD robust z-score** (threshold 3.5) | Budget data has heavy tails (a few very large cities skew means) |
| Execution rate | **IQR outlier** (both sides, multiplier 1.5) | Identifies both under- and over-execution anomalies |
| Arrears ratio | **Percentile band** (90th–100th percentile) | Right-skewed distribution, focus on worst performers |
| Personnel ratio | **Z-score** (abs_gte, threshold 2) | Relatively normally distributed across UATs |
| Self-funding ratio | **IQR outlier** (lower side, multiplier 1.5) | Focus on structurally dependent UATs |
| Development ratio | **Rank** (bottom 50) | Get the 50 UATs with lowest investment |
| Sector spending | **MAD robust z-score** (threshold 3) | Cross-sector spending has different scales |

### 10.3 How to Configure Value Filters

**Step 1**: In the value filters panel, click "Add Rule".

**Step 2**: Choose the rule kind:

For **threshold rules**:
1. Set `seriesRef` to `active` (uses the map's active series) or choose a specific series
2. Select operator: `gt`, `gte`, `lt`, `lte`, `eq`, `neq`, `between`, `not_between`, `is_defined`, `is_undefined`
3. Enter threshold value(s)
4. Set join with previous rule: `AND` (narrow) or `OR` (widen)

For **statistical rules**:
1. Set `seriesRef` as above
2. Select `statsType` and configure parameters per the table below

### 10.4 Statistical Filter Parameter Reference

**Percentile Band** (`percentile_band`):
```
minPercentile: 0      # Lower bound (0-100)
maxPercentile: 5      # Upper bound (0-100)
→ Shows UATs in the bottom 5th percentile
```

**Rank** (`rank`):
```
direction: 'bottom'   # 'top' or 'bottom'
count: 50             # Number of entries to show
→ Shows the 50 worst-performing UATs
```

**Median Compare** (`median_compare`):
```
mode: 'lt'            # 'gt', 'gte', 'lt', 'lte'
→ Shows all UATs below the median
```

**Z-Score** (`zscore`):
```
mode: 'abs_gte'       # 'abs_gte' (both sides), 'gte' (high), 'lte' (low)
threshold: 2          # Standard deviations from mean
→ Shows UATs more than 2σ from the mean (approximately top/bottom 2.3%)
```
Uses population standard deviation (divides by N, not N−1).

**IQR Outlier** (`iqr_outlier`):
```
side: 'both'          # 'upper', 'lower', 'both'
multiplier: 1.5       # Tukey fence multiplier
→ Standard outlier detection: value < Q1 - 1.5×IQR or value > Q3 + 1.5×IQR
```
Use `multiplier: 3.0` for extreme outliers only.

**MAD Robust Z-Score** (`mad_robust_zscore`):
```
threshold: 3.5        # Robust z-score threshold
→ Uses median and median absolute deviation instead of mean/stddev
→ Formula: robustZ = 0.6745 × (value − median) / MAD
→ Shows UATs with |robustZ| >= threshold
```
Most robust method for budget data — resistant to the distortion caused by large cities.

### 10.5 Combining Multiple Filters

Rules are evaluated sequentially. Use `joinWithPrevious` to combine:

**AND chains** (narrow progressively):
```
Rule 1: Arrears ratio > 20%
AND Rule 2: Execution rate < 70%
AND Rule 3: Personnel ratio > 60%
→ Shows only UATs meeting ALL three criteria (multi-distress signals)
```

**OR chains** (widen progressively):
```
Rule 1: Z-score outlier on deficit per capita (|z| >= 3)
OR Rule 2: Z-score outlier on arrears ratio (|z| >= 3)
OR Rule 3: Z-score outlier on execution rate (|z| >= 3)
→ Shows UATs that are extreme outliers on ANY of the three metrics
```

**Mixed AND/OR** (for complex screening):
```
Rule 1: Deficit per capita < -500 (threshold)
AND Rule 2: Population > 5000 (threshold, different series)
→ First two narrow to large UATs in deficit
OR Rule 3: Arrears ratio > 30% (threshold)
→ Then also include any UAT with severe arrears regardless of size
```

### 10.6 Creating a "Red Flags" Composite Filter

For the most impactful analysis, create a map with multiple series and apply a cascading filter:

1. **Series A**: Deficit per capita
2. **Series B**: Arrears ratio
3. **Series C**: Execution rate
4. **Series D**: Personnel ratio
5. **Series E**: Development ratio
6. **Active**: Deficit per capita (drives coloring)

**Filter rules**:
```
Rule 1 (threshold): Series A < -500 (deficit per capita below -500 RON)
AND Rule 2 (threshold): Series B > 20 (arrears above 20%)
→ UATs with both significant deficit AND significant arrears
```

Or for broader screening:
```
Rule 1 (stats): rank, bottom 100, Series A (100 worst deficits)
→ Then visually inspect the table for patterns across all 5 metrics
```

---

## 11. Bins Configuration Guide

### 11.1 When to Use Which Color Scheme

| Data Pattern | Color Scheme | Colors |
|--------------|-------------|--------|
| **Diverging** (deficit/surplus, growth/decline) | Red-to-blue or red-to-green with neutral center | `#d73027` → `#f7f7f7` → `#2166ac` |
| **Sequential** (spending amounts, ratios) | Light-to-dark gradient | `#fff7bc` → `#d7301f` (default) |
| **Categorical risk** (normal/warning/critical) | Traffic light | Green → Yellow → Red |

### 11.2 Bin Count Guidelines

| Data | Recommended Bins | Reasoning |
|------|-----------------|-----------|
| Ratios (0-100%) | 5 bins | Clear quintile-like classification |
| Per capita spending | 6-7 bins | Enough granularity for wide ranges |
| Growth rates (diverging) | 7 bins | Symmetric around zero with neutral center |
| Binary classification | 2-3 bins | Simple above/below threshold |
| Outlier highlighting | 3 bins | Normal / Warning / Critical |

### 11.3 Auto-Generation vs Manual

**Use auto-generation when**:
- First exploring a metric (don't know the data range)
- The distribution is roughly uniform
- You want "nice" rounded boundaries

**Use manual bins when**:
- You have domain-specific thresholds (e.g., < 50% execution = severe)
- You need diverging schemes with a meaningful center point
- You want to match the interpretation tables in this guide

### 11.4 Bins Configuration Details

- **Boundary semantics**: Always `[min, max)` — inclusive minimum, exclusive maximum
- **Last bin**: Must be open-ended (`max: null`) — captures all values above the last boundary
- **Maximum recommended**: 12 bins (platform warns above this threshold for readability)
- **No-data styling**: Default gray `#cccccc` with label "Fara date" — customize if needed
- **Color modes**:
  - `gradient`: Linear RGB interpolation between start and end colors
  - `manual`: Pick individual colors per bin — better for diverging or categorical schemes

---

## 12. Multi-Year Trend Analysis

### 12.1 Year-over-Year Comparison Maps

Create the same metric for multiple years to track trends.

**Example: Revenue Per Capita Trend (2021 vs 2025)**:

| Series | Configuration |
|--------|---------------|
| **A: Revenue 2025** | `account_category: 'vn'`, `normalization: 'per_capita'`, year 2025 |
| **B: Revenue 2021** | Same configuration, year 2021 |
| **C: Growth % (active)** | `((A - B) / B) × 100` |

**Use inflation-adjusted values** (`inflation_adjusted: true`) for fair multi-year comparisons.

### 12.2 Trend Analysis Map Collection

Create these 6 maps for a complete trend picture:

| Map | Metric | Period |
|-----|--------|--------|
| Revenue growth | `((Rev_2025 - Rev_2021) / Rev_2021) × 100` | 2021 → 2025 |
| Expense growth | `((Exp_2025 - Exp_2021) / Exp_2021) × 100` | 2021 → 2025 |
| Balance change | `Balance_2025 - Balance_2021` | 2021 → 2025 |
| Revenue vs expense divergence | `Revenue_growth - Expense_growth` | 2021 → 2025 |
| Personnel ratio change | `Personnel_ratio_2025 - Personnel_ratio_2021` | 2021 → 2025 |
| Arrears trend | `Arrears_2025 - Arrears_2023` | 2023 → 2025 |

**Diverging bins** for all trend maps: negative (red), near-zero (gray), positive (green/blue).

### 12.3 Structural Break Detection

To detect policy impacts (e.g., 2024 VAT increase):

1. Create revenue per capita for 2023 (pre-VAT) and 2024 (post-VAT)
2. Calculate the change: `((Rev_2024 - Rev_2023) / Rev_2023) × 100`
3. Apply IQR outlier filter to find UATs disproportionately affected
4. Compare with national median change to identify relative winners/losers

---

## 13. Report Structure and Assembly

### 13.1 Recommended Report Phases

Execute these phases in order, as each builds on the previous:

**Phase 1: Context Maps** (3 maps — establish the demographic baseline)
1. Population distribution
2. Population change trend
3. Employment rate

**Phase 2: Core Financial Health** (8 maps — answer "which UATs are in trouble?")
4. Budget balance per capita
5. Total revenue per capita
6. Total expense per capita
7. Execution rate
8. Arrears ratio
9. Personnel cost ratio
10. Self-funding ratio
11. Development spending ratio

**Phase 3: Sector Analysis** (6 maps — decompose spending by purpose)
12. Education spending per capita
13. Health spending per capita
14. Infrastructure investment per capita
15. Social protection per capita
16. Administrative overhead ratio
17. Goods & services per capita

**Phase 4: Commitment Pipeline** (4 maps — analyze the payment cycle)
18. Commitment utilization
19. Payment gap ratio
20. Budget rectification impact
21. Cash flow health index

**Phase 5: Cross-Source Analysis** (4 maps — combine budget + demographic data)
22. Spending per employee
23. Education spending per student
24. Revenue growth vs population change
25. Transfer dependency with population context

**Phase 6: Trend Analysis** (6 maps — track changes over time)
26. Revenue growth 2021-2025
27. Expense growth 2021-2025
28. Balance change
29. Revenue vs expense divergence
30. Personnel ratio change
31. Arrears trend

**Phase 7: Outlier Detection Pass** (apply to Phase 2 maps)
- For each core financial health map, create variant versions with:
  - MAD robust z-score filter (threshold 3.5)
  - Rank filter (bottom 50)
  - IQR outlier filter (both sides)

### 13.2 Final Report Section Mapping

| Report Section | Maps Used | Analysis Type |
|----------------|-----------|---------------|
| **Rezumat Executiv** | Maps 4, 7, 8, 10, 11 + outlier variants | Executive summary of worst cases |
| **Prezentare Generală Națională** | Maps 4-11 (table view, national totals) | Aggregate indicators |
| **Analiză pe Județe** | All maps with county filter | County-by-county comparison |
| **UAT-uri Problematice** | Outlier variants + Red Flags composite | Deep dive on worst performers |
| **Analiză Sectorială** | Maps 12-17 | Sector-specific findings |
| **Pipeline de Angajamente** | Maps 18-21 | Cash flow and payment analysis |
| **Context Demografic** | Maps 1-3, 22-25 | Socioeconomic baseline |
| **Tendințe** | Maps 26-31 | Multi-year trajectory |
| **Clustere Geografice** | All maps (visual map inspection) | Spatial pattern identification |
| **Concluzii și Recomandări** | Synthesis of all analyses | Findings + policy implications |

### 13.3 Map Naming Convention

Use consistent naming for organization:

```
[Phase]-[Number] [Metric Name] ([Year/Period]) [Filter if applied]
```

Examples:
- `P2-04 Sold bugetar per capita (2025)`
- `P2-04 Sold bugetar per capita (2025) — Outlieri MAD`
- `P3-12 Cheltuieli educație per capita (2025)`
- `P6-26 Creștere venituri 2021-2025`

---

## 14. Interpretation Framework

### 14.1 Analysis Workflow Per Map

For each map, follow this systematic interpretation:

**Step 1: National Distribution**
- Switch to table view
- Note the min, max, mean, median values
- Count how many UATs fall in each bin

**Step 2: Geographic Clustering**
- Switch to map view
- Look for geographic concentrations of problems
- Note if problem UATs cluster in specific counties/regions

**Step 3: Outlier Identification**
- Apply statistical filter (MAD z-score recommended)
- Record the outlier list
- Check if the same UATs appear as outliers across multiple metrics

**Step 4: Cross-Metric Correlation**
- Use table view with multiple enabled series
- Sort by the active metric
- Check adjacent columns for correlated problems
- Example: Do UATs with high arrears also have low execution rates?

**Step 5: Contextual Explanation**
- For each flagged UAT, check:
  - Population size (is it a tiny commune or a city?)
  - Employment rate (is there economic activity?)
  - Population trend (is it growing or declining?)
  - Geographic location (rural, peri-urban, urban?)

**Step 6: Trend Verification**
- Is the problem getting worse? (Compare trend maps)
- Is it chronic or recent? (Look at 5-year trajectory)
- Did it coincide with a policy event? (Check structural break detection)

**Step 7: Peer Comparison**
- Filter by population range (use `min_population`/`max_population`) to compare similar-sized UATs
- Is this UAT worse than its peers, or is the problem widespread?

### 14.2 Red Flag Scoring Model

Assign points for each red flag to create a composite risk score:

| Red Flag | Threshold | Points | Metric Source |
|----------|-----------|--------|---------------|
| Severe deficit per capita | < -1000 RON | 20 | Map 4 |
| Moderate deficit per capita | -500 to -1000 RON | 10 | Map 4 |
| High arrears | > 30% | 20 | Map 8 |
| Moderate arrears | 20-30% | 10 | Map 8 |
| Severe under-execution | < 50% | 20 | Map 7 |
| Under-execution | 50-70% | 10 | Map 7 |
| Personnel overload | > 70% | 15 | Map 9 |
| High personnel | 60-70% | 8 | Map 9 |
| No development spending | < 5% | 15 | Map 11 |
| Low development | 5-10% | 8 | Map 11 |
| Very low fiscal autonomy | < 20% | 10 | Map 10 |
| Low fiscal autonomy | 20-30% | 5 | Map 10 |
| Operational ratio > 90% | > 90% | 10 | (100% - Map 11 value) |

**Risk levels**:

| Score | Level | Action |
|-------|-------|--------|
| 80-100+ | CRITICAL | Immediate investigation, highlight in report |
| 60-79 | HIGH | Detailed deep-dive section in report |
| 40-59 | MEDIUM | Include in county-level analysis |
| 20-39 | LOW | Monitor, include in aggregate statistics |
| 0-19 | MINIMAL | Normal operations |

### 14.3 Political Narrative Testing

The report should test competing narratives with evidence:

**Narrative A: "Local governments are underfunded"**

| Evidence Source | What to Check |
|----------------|---------------|
| Map 5 (Revenue/capita) | Distribution of fiscal capacity across UAT types |
| Map 10 (Self-funding) | How many UATs are structurally dependent |
| Map 12-16 (Sectors) | Service burden (spending per capita by function) vs population structure |
| Cross-reference | Before/after equalization: do transfers reduce dispersion? |

**Narrative B: "Local governments are inefficient"**

| Evidence Source | What to Check |
|----------------|---------------|
| Map 15 (Admin overhead) | Administrative overhead ratio distribution |
| Map 9 (Personnel) | Personnel share vs peer median |
| Map 7 (Execution) | Can they execute their existing budgets? |
| Map 22 (Spending/employee) | Unit cost benchmarks across peer groups |

**Narrative C: "The problem is arrears, not annual deficit"**

| Evidence Source | What to Check |
|----------------|---------------|
| Map 8 (Arrears) | Commitment coverage and unpaid receipts |
| Map 18-21 (Pipeline) | Full payment pipeline health |
| Map 8 vs Map 4 | UATs with high arrears but moderate annual deficit |

**Narrative D: "EU funds will solve it"**

| Evidence Source | What to Check |
|----------------|---------------|
| Map 11 (Development) | Investment capacity as signal of absorption readiness |
| Map 7 (Execution) | Can UATs execute even domestic budgets? |
| Map 23 (Rectification) | Budget supplementation pattern (EU funds arriving mid-year) |

### 14.4 Peer Group Definitions

For fair comparison, segment UATs by population:

| Peer Group | Population Range | Typical Entity |
|------------|-----------------|----------------|
| Micro communes | 0 – 2,000 | Rural commune |
| Small communes | 2,000 – 5,000 | Average commune |
| Medium communes | 5,000 – 10,000 | Large commune / small town |
| Small towns | 10,000 – 20,000 | Small town / oraș |
| Medium towns | 20,000 – 50,000 | Medium town |
| Cities | 50,000 – 100,000 | City / municipiu |
| Large cities | 100,000 – 300,000 | Large city |
| Metropolitan | > 300,000 | București, Cluj, Timișoara, Iași |

To filter by peer group: use `min_population` and `max_population` in the series filter, or apply a `between` threshold value filter on the population INS series.

---

## 15. Limitations and Workarounds

### 15.1 What the Platform Cannot Do Directly

| Limitation | Impact | Workaround |
|------------|--------|------------|
| **No conditional/step functions** | Cannot create composite indices (FHI) with if/else scoring | Use multi-series table view + manual scoring, or weighted average approximation |
| **No power/exponent functions** | Cannot compute CAGR exactly | Use `((end/start) - 1) × 100` as simplified growth rate for multi-year |
| **No Gini coefficient** | Cannot measure inequality within regions | Export table data, compute offline |
| **No linear regression** | Cannot compute trend slopes | Use 2-point comparison (start year vs end year) as proxy |
| **No county-level aggregation** | Maps show individual UAT values, not county totals | Use county filter to view one county at a time; use table view for county totals |
| **Undefined propagation in calculations** | If any operand is undefined for a SIRUTA, the result is undefined | Ensure all series have good coverage; use `is_defined` filter to check |
| **Division by zero** | Returns undefined (not infinity or error) | Check denominator series coverage before creating ratio calculations |

### 15.2 Calculation Engine Behavior to Know

- **Operations**: Only `sum`, `subtract`, `multiply`, `divide` — no modulo, power, log, conditional
- **Nesting**: Unlimited depth — e.g., `((A - B) / C) × 100` is fully supported
- **Constants**: You can use numeric constants as operands — e.g., multiply by `100` or `1000`
- **Undefined handling**: Strict — if any operand is undefined, the result is undefined (no fallback to zero)
- **Unit inference**: If you don't set a unit on the calculated series, it inherits from the first dependency. Mixed-unit calculations emit a warning.
- **Sparse coverage warning**: Triggers when less than 40% of SIRUTA codes have values

### 15.3 Data Coverage Considerations

- **Budget execution**: Coverage is good from 2016 onward. Some small entities may have incomplete data.
- **Commitments**: Coverage starts from 2019. Not all entities report commitments.
- **INS data**: Annual datasets have best coverage. Some UAT-level datasets are only available for census years.
- **Population**: Latest census data (2021) is in GeoJSON; INS Tempo has annual estimates.
- **SIRUTA linkage**: The key that connects budget entities to geographic boundaries. Missing SIRUTA codes mean the UAT won't appear on the map.

### 15.4 Performance Considerations

- Each map can hold multiple series, but complex configurations with many series may take longer to load
- URL state has a ~1800 character budget warning — very complex configs may need to be saved as backend snapshots
- Table view with many enabled series creates wide tables — consider enabling only the columns you need for each analysis

---

## 16. Quick Reference Tables

### 16.1 Series Type Quick Reference

| Need | Series Type | Key Config |
|------|-------------|------------|
| Total spending/revenue | `line-items-aggregated-yearly` | `account_category`, `normalization` |
| Spending by sector | `line-items-aggregated-yearly` | `functional_prefixes: ['XX']` |
| Spending by economic type | `line-items-aggregated-yearly` | `economic_prefixes: ['XX']` |
| Own revenues only | `line-items-aggregated-yearly` | `funding_source_ids: ['B']` |
| Development only | `line-items-aggregated-yearly` | `expense_types: ['dezvoltare']` |
| Payment metrics | `commitments-analytics` | `metric: 'PLATI_TREZOR'` etc. |
| Arrears data | `commitments-analytics` | `metric: 'RECEPTII_NEPLATITE'` |
| Budget credits | `commitments-analytics` | `metric: 'CREDITE_BUGETARE'` |
| Population | `ins-series` | `datasetCode: 'POP107D'` |
| Employment | `ins-series` | `datasetCode: 'FOM104D'` |
| Any ratio/difference | `aggregated-series-calculation` | `calculation: { op, args }` |

### 16.2 Common Calculations Quick Reference

| Metric | Formula | Operands |
|--------|---------|----------|
| Percentage | `(A / B) × 100` | `{ op: 'multiply', args: [{ op: 'divide', args: [A, B] }, 100] }` |
| Per capita | `A / Population` | `{ op: 'divide', args: [A, Pop] }` |
| Per 1000 | `(A / Pop) × 1000` | `{ op: 'multiply', args: [{ op: 'divide', args: [A, Pop] }, 1000] }` |
| Difference | `A - B` | `{ op: 'subtract', args: [A, B] }` |
| Growth % | `((New - Old) / Old) × 100` | Nested: subtract, divide, multiply |
| Balance | `Revenue - Expenses` | `{ op: 'subtract', args: [Rev, Exp] }` |
| Ratio | `A / B` | `{ op: 'divide', args: [A, B] }` |

### 16.3 Threshold Reference Card

| Metric | Critical | Warning | Normal | Good |
|--------|----------|---------|--------|------|
| Budget balance/capita | < -1000 RON | -500 to -1000 | -200 to 200 | > 200 |
| Execution rate | < 50% | 50-70% | 70-95% | 80-95% |
| Arrears ratio | > 30% | 20-30% | 5-10% | < 5% |
| Personnel ratio | > 70% | 60-70% | 40-50% | < 40% |
| Self-funding ratio | < 20% | 20-30% | 30-50% | > 50% |
| Development ratio | < 5% | 5-10% | 10-15% | > 15% |
| Admin overhead | > 30% | 25-30% | 15-20% | < 15% |
| Commitment utilization | > 95% | 90-95% | 50-80% | 80-90% |

### 16.4 Statistical Filter Quick Reference

| Goal | Method | Configuration |
|------|--------|---------------|
| Find extreme outliers | MAD robust z-score | threshold: 3.5 |
| Find moderate outliers | IQR outlier | side: 'both', multiplier: 1.5 |
| Find top/bottom N | Rank | direction: 'bottom'/'top', count: 50 |
| Split above/below median | Median compare | mode: 'lt' or 'gt' |
| Select a percentile range | Percentile band | min: 0, max: 10 (bottom 10%) |
| Find outliers (normal dist.) | Z-score | mode: 'abs_gte', threshold: 2 |

### 16.5 Normalization Options

| Option | Effect | When to Use |
|--------|--------|-------------|
| `total` | Absolute amounts in original currency | Comparing total fiscal capacity |
| `per_capita` | Divided by population | Comparing across UATs of different sizes |
| `percent_gdp` | As percentage of GDP | National-level analysis |
| `currency: 'EUR'` | Convert to Euros | International comparisons |
| `inflation_adjusted: true` | Constant prices | Multi-year trend analysis |

### 16.6 Functional Code Cheat Sheet for UAT Analysis

| Analysis | Functional Prefix(es) | Description |
|----------|----------------------|-------------|
| Total budget | (no prefix) | All functional categories |
| Education | `65` | Învățământ |
| Health | `66` | Sănătate |
| Culture & recreation | `67` | Cultură, recreere, religie |
| Social protection | `68` | Asigurări și asistență socială |
| Housing & development | `70` | Locuințe, servicii, dezvoltare publică |
| Environment | `74` | Protecția mediului |
| Transport | `84` | Transporturi |
| Public administration | `51` | Autorități publice |
| Public order | `61` | Ordine publică |
| Economic actions | `80` | Acțiuni economice generale |

### 16.7 Economic Code Cheat Sheet

| Analysis | Economic Prefix | Description |
|----------|----------------|-------------|
| Personnel costs | `10` | Cheltuieli cu personalul |
| Goods & services | `20` | Bunuri și servicii |
| Interest payments | `30` | Dobânzi |
| Subsidies | `40` | Subvenții |
| Social assistance | `57` | Asistență socială |
| Capital investment | `71` | Active nefinanciare |
| EU-funded projects | `56`, `58`, `60` | FEN + PNRR projects |
| Debt service | `81` | Rambursări de credite |

---

## Appendix A: Complete Map Inventory

| # | Map Name | Phase | Type | Active Metric |
|---|----------|-------|------|---------------|
| 1 | Populația UAT-urilor | P1 | INS | Population count |
| 2 | Evoluția populației 2019-2024 | P1 | Calculated | Population change % |
| 3 | Rata de angajare | P1 | Calculated | Employees per 1000 |
| 4 | Sold bugetar per capita | P2 | Calculated | Revenue - Expense per capita |
| 5 | Venituri totale per capita | P2 | Execution | Revenue per capita |
| 6 | Cheltuieli totale per capita | P2 | Execution | Expense per capita |
| 7 | Rata de execuție bugetară | P2 | Calculated | Payments / Credits × 100 |
| 8 | Rata arieratelor | P2 | Calculated | Unpaid / Total receipts × 100 |
| 9 | Ponderea cheltuielilor de personal | P2 | Calculated | Personnel / Total expenses × 100 |
| 10 | Autonomia fiscală | P2 | Calculated | Own revenues / Expenses × 100 |
| 11 | Cheltuieli de dezvoltare | P2 | Calculated | Development / Total expenses × 100 |
| 12 | Cheltuieli educație per capita | P3 | Execution | Education spending / capita |
| 13 | Cheltuieli sănătate per capita | P3 | Execution | Health spending / capita |
| 14 | Investiții infrastructură per capita | P3 | Execution | Infrastructure capital / capita |
| 15 | Cheltuieli protecție socială per capita | P3 | Execution | Social protection / capita |
| 16 | Overhead administrativ | P3 | Calculated | Admin / Total expenses × 100 |
| 17 | Bunuri și servicii per capita | P3 | Execution | Goods & services / capita |
| 18 | Rata de utilizare a creditelor | P4 | Calculated | Commitments / Limit × 100 |
| 19 | Decalaj de plată | P4 | Calculated | (Committed - Paid) / Committed × 100 |
| 20 | Impact rectificare bugetară | P4 | Calculated | (Definitive - Initial) / Initial × 100 |
| 21 | Indicele sănătății fluxului de numerar | P4 | Calculated | Payments / (Commitments + Arrears) × 100 |
| 22 | Cheltuieli per angajat | P5 | Calculated | Total expenses / Employees |
| 23 | Cheltuieli educație per elev | P5 | Calculated | Education spending / Students |
| 24 | Divergența venituri vs populație | P5 | Calculated | Revenue growth - Population growth |
| 25 | Dependența de transferuri | P5 | Calculated | Transfers / Total revenue × 100 |
| 26 | Creștere venituri 2021-2025 | P6 | Calculated | Revenue growth % |
| 27 | Creștere cheltuieli 2021-2025 | P6 | Calculated | Expense growth % |
| 28 | Variația soldului bugetar | P6 | Calculated | Balance change (absolute) |
| 29 | Divergența venituri-cheltuieli | P6 | Calculated | Revenue growth - Expense growth |
| 30 | Variația ponderii personal | P6 | Calculated | Personnel ratio change (pp) |
| 31 | Tendința arieratelor | P6 | Calculated | Arrears ratio change (pp) |

---

## Appendix B: Glossary

| Term | Romanian | Definition |
|------|----------|------------|
| UAT | Unitate Administrativ-Teritorială | Administrative-territorial unit (commune, town, municipality, county) |
| SIRUTA | Sistem Informatic al Registrului Unităților Teritorial-Administrative | Unique numeric code identifying each territorial unit |
| CUI | Cod Unic de Identificare | Unique fiscal identification code for entities |
| Ordonator principal | Ordonator principal de credite | Principal credit ordinator (highest budget authority, usually the mayor) |
| Execuție bugetară | Budget execution | Actual spending vs budgeted amounts |
| Angajamente bugetare | Budget commitments | Legal obligations to spend, preceding actual payments |
| Credite bugetare | Budget credits | Maximum authorized spending amounts |
| Credite de angajament | Commitment credits | Maximum amounts that can be committed (multi-year) |
| Plăți trezorerie | Treasury payments | Payments processed through the national treasury |
| Recepții neplătite | Unpaid receipts | Goods/services received but not yet paid (arrears) |
| Funcționare | Operational | Current/recurrent spending (salaries, utilities, supplies) |
| Dezvoltare | Development | Capital/investment spending (construction, equipment) |
| Venituri proprii | Own revenues | Locally generated revenues (property tax, fees, etc.) |
| FEN | Fonduri Externe Nerambursabile | Non-reimbursable external funds (EU grants) |
| PNRR | Planul Național de Redresare și Reziliență | National Recovery and Resilience Plan |
| EDP | Procedura de Deficit Excesiv | Excessive Deficit Procedure (EU fiscal surveillance) |
| INS | Institutul Național de Statistică | National Institute of Statistics |
| COFOG | Classification of Functions of Government | International functional classification standard |

---

## Appendix C: Data Quality Checklist

Before starting analysis, verify:

- [ ] Budget execution data is available for the target year
- [ ] Commitments data covers the same entities and period
- [ ] INS population data is available (check latest year in POP107D)
- [ ] SIRUTA codes link correctly between budget entities and map boundaries
- [ ] Default exclusions are applied (inter-entity transfers: economic 51.01, 51.02)
- [ ] Normalization is consistent across compared series (all per_capita or all total)
- [ ] Inflation adjustment is applied for multi-year comparisons
- [ ] Currency is consistent across all series in the same map

---

*This guide is designed for use with Transparenta.eu's Advanced Map Analytics feature. For platform-specific UI instructions, refer to the in-app help documentation.*
