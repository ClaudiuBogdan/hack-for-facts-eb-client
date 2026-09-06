import { z } from 'zod';
import { ChartTypeEnum, createDefaultChart } from './constants';
import { generateRandomColor } from '@/components/charts/components/chart-renderer/color-utils';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults';

export const defaultYearRange = {
  start: 2016,
  end: 2026,
};

export const DEFAULT_SELECTED_YEAR = 2025;

export const defaultExecutionPeriodStartYear = defaultYearRange.start;
export const defaultCommitmentsPeriodStartYear = 2019;


export function createDefaultExecutionYearReportPeriod() {
  const latestDefaultYear = String(DEFAULT_SELECTED_YEAR);
  return {
    type: 'YEAR' as const,
    selection: {
      interval: {
        start: latestDefaultYear,
        end: latestDefaultYear,
      },
    },
  };
}

export function createDefaultCommitmentsYearReportPeriod() {
  const latestDefaultYear = String(defaultYearRange.end);
  return {
    type: 'YEAR' as const,
    selection: {
      interval: {
        start: latestDefaultYear,
        end: latestDefaultYear,
      },
    },
  };
}

/**
 * Global chart configuration that can be overridden by individual series
 */
export const ChartConfigSchema = z.object({
  chartType: ChartTypeEnum.describe('The visualization type for this chart. Available types: "line" (trends over time), "bar" (comparisons), "area" (cumulative trends), "bar-aggr" (aggregated comparisons), "pie-aggr" (proportions), "treemap-aggr" (hierarchical breakdowns), "sankey-aggr" (flow diagrams). Choose based on your analytical goal: use line/area for trends, bar for comparisons, pie/treemap for distributions.'),
  color: z.string().default(() => generateRandomColor()).describe('Default color for the entire chart (hex format). Individual series can override this with their own colors. Example: "#0062ff" for blue, "#00c49f" for teal. Ensure sufficient contrast for accessibility.'),
  showDataLabels: z.boolean().optional().describe('Whether to display data values directly on the chart for all series. Useful for presentations or when exact values matter more than visual trends. Can be overridden per series. Warning: too many labels can clutter the visualization.'),
  showGridLines: z.boolean().default(true).describe('Whether to display horizontal grid lines on the chart. Grid lines help readers estimate values more accurately. Generally recommended for line and bar charts, less useful for pie/treemap charts.'),
  showLegend: z.boolean().default(true).describe('Whether to display the legend showing series labels and colors. Essential for multi-series charts. Can be disabled for single-series charts to save space. Legend appears at the top of the chart by default.'),
  showRelativeValues: z.boolean().optional().describe('Whether to display values as percentages relative to the first series. Useful for comparing proportional changes across series. Example: if Series A is 100 and Series B is 150, Series B shows as 150%. Only applicable to multi-series charts.'),
  showTooltip: z.boolean().default(true).describe('Whether to show interactive tooltips on hover/click. Tooltips display exact values, series names, and dates. Highly recommended for all chart types as they provide detailed information without cluttering the visualization.'),
  showDiffControl: z.boolean().optional().describe('Whether to display a range selector control that allows users to select a time range and calculate the difference between start and end values. Useful for analyzing changes over specific periods. Best suited for time-series line and area charts. Example: select 2020-2023 to see the 3-year change.'),
  editAnnotations: z.boolean().default(true).describe('Whether users can create, edit, move, and delete annotations on the chart. When false, annotations are read-only. Disable in published/shared charts to prevent modifications. Enable in analysis mode to allow marking important events or insights.'),
  showAnnotations: z.boolean().default(true).describe('Whether to display annotations on the chart. Annotations are visual markers with text that highlight important events, policy changes, or insights. Examples: "COVID-19 Impact", "New Budget Law". When false, annotations are hidden but preserved in the chart data.'),
  yearRange: z.object({
    start: z.number().optional().describe('Starting year to display on the chart. Overrides the data range. Example: 2020 to focus on recent years. If not set, uses the earliest year from the data.'),
    end: z.number().optional().describe('Ending year to display on the chart. Overrides the data range. Example: 2024 to exclude future projections. If not set, uses the latest year from the data.'),
  }).optional().describe('Optional year range to limit what is displayed on the chart, regardless of the underlying data range. Useful for focusing on specific time periods without changing the data queries. Example: { start: 2020, end: 2024 } shows only 5 years even if data spans 2016-2025.'),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

/**
 * Series-specific configuration that can override global settings
 */
export const SeriesConfigSchema = z.object({
  showDataLabels: z.boolean().default(false).describe('Whether to display numeric data values directly on the chart for this series (y-axis values). Overrides the global chart showDataLabels setting. Useful when one series needs emphasis while others remain uncluttered. Example: show labels only on the "Total Budget" series.'),
  dataLabels: z.array(z.string()).optional().describe('Specific x-axis data points where labels should be shown. When set, only these points display labels instead of all points. Useful for highlighting key dates. Example: ["2020", "2024"] to label only start and end years. If not set, labels appear on all data points (when showDataLabels is true).'),
  dataLabelOffset: z.number().optional().describe('Vertical offset in pixels for positioning data labels relative to their default position on the y-axis. Positive values move labels up, negative values move them down. Useful for preventing label overlap on dense charts. Example: 10 moves labels 10px higher. Default position is directly above/on the data point.'),
  color: z.string().default('#0000ff').describe('Color for this series (hex format). Overrides the global chart color. Each series in a multi-series chart should have a distinct color for clarity. Example: "#0062ff" (blue), "#00c49f" (teal), "#ff6b6b" (red). Use color-blind friendly palettes for accessibility.'),
  xAxisPrefixToRemove: z
    .string()
    .optional()
    .describe(
      'Optional prefix to strip from x-axis labels for this series only. Useful when mixing different time granularities (e.g., yearly series "2023" with monthly series "2023-01"). Set to "2023-" to display "01" instead of "2023-01", aligning monthly labels with yearly ones. Example: For monthly data "2023-01", "2023-02", set xAxisPrefixToRemove: "2023-" to show "01", "02".'
    ),
}).default({
  showDataLabels: false,
  color: '#0000ff',
});

export type SeriesConfig = z.infer<typeof SeriesConfigSchema>;

// ============================================================================
// ANALYTICS FILTER SCHEMA (reusable from existing system)
// ============================================================================

// TODO: change to the new report types
export const ReportTypeEnum = z.enum(['Executie bugetara agregata la nivel de ordonator principal', 'Executie bugetara agregata la nivel de ordonator secundar', 'Executie bugetara detaliata'])
  .describe('The aggregation level of budget execution reports in the Romanian public finance system. "Executie bugetara agregata la nivel de ordonator principal" (PRINCIPAL_AGGREGATED): data aggregated at the level of main budget administrators (e.g., Ministry of Education) - use for high-level analysis. "Executie bugetara agregata la nivel de ordonator secundar" (SECONDARY_AGGREGATED): data aggregated at secondary budget administrators - use for more detailed analysis. "Executie bugetara detaliata" (DETAILED): itemized budget execution with full detail - use for granular analysis. Choose based on desired detail level.');
export type ReportType = z.infer<typeof ReportTypeEnum>;

export const CommitmentsReportTypeEnum = z.enum(['PRINCIPAL_AGGREGATED', 'SECONDARY_AGGREGATED', 'DETAILED'])
  .describe('Aggregation level for commitments reports. "PRINCIPAL_AGGREGATED" aggregates at main ordering-creditor level, "SECONDARY_AGGREGATED" aggregates at secondary level, and "DETAILED" returns line-item-level granularity.');
export type CommitmentsReportType = z.infer<typeof CommitmentsReportTypeEnum>;

export const CommitmentsMetricEnum = z.enum([
  'CREDITE_ANGAJAMENT',
  'PLATI_TREZOR',
  'PLATI_NON_TREZOR',
  'RECEPTII_TOTALE',
  'RECEPTII_NEPLATITE_CHANGE',
  'LIMITA_CREDIT_ANGAJAMENT',
  'CREDITE_BUGETARE',
  'CREDITE_ANGAJAMENT_INITIALE',
  'CREDITE_BUGETARE_INITIALE',
  'CREDITE_ANGAJAMENT_DEFINITIVE',
  'CREDITE_BUGETARE_DEFINITIVE',
  'CREDITE_ANGAJAMENT_DISPONIBILE',
  'CREDITE_BUGETARE_DISPONIBILE',
  'RECEPTII_NEPLATITE',
]).describe('Commitments metric to query for the time series. Each metric maps to a backend commitments analytical field.');
export type CommitmentsMetric = z.infer<typeof CommitmentsMetricEnum>;

export const Normalization = z.enum(['total', 'total_euro', 'per_capita', 'per_capita_euro', 'percent_gdp'])
  .describe('How to normalize monetary values for fair comparison. "total": absolute amounts. "per_capita": amounts divided by population for fair comparisons between different-sized entities. "percent_gdp": express as % of GDP. "total_euro" and "per_capita_euro" are legacy; prefer normalization="total"|"per_capita" + currency="EUR".');
export type Normalization = z.infer<typeof Normalization>;

export const Currency = z.enum(['RON', 'EUR', 'USD'])
  .describe('Output currency for normalized values. "RON": Romanian Leu (default). "EUR": Euro. "USD": US Dollar.');
export type Currency = z.infer<typeof Currency>;

// ----------------------------------------------------------------------------
// Reporting period (client-side Zod schema to mirror GraphQL ReportPeriodInput)
// ----------------------------------------------------------------------------
export const ReportPeriodTypeZ = z.enum(['YEAR', 'MONTH', 'QUARTER'])
  .describe('Time granularity for budget data. "YEAR": annual data points (e.g., 2020, 2021, 2022) - use for multi-year trends and long-term analysis. "MONTH": monthly data points (e.g., 2023-01, 2023-02) - use for seasonal patterns and detailed timing analysis. "QUARTER": quarterly data points (e.g., 2023-Q1, 2023-Q2) - use for mid-range analysis balancing detail and clarity. Choose based on your analysis needs: yearly for trends, monthly for patterns, quarterly for balance.');
export type ReportPeriodTypeZ = z.infer<typeof ReportPeriodTypeZ>;

const DateInputZ = z.string().describe('Date string in format matching the period type. For YEAR: "2023". For MONTH: "2023-01". For QUARTER: "2023-Q1". Must be consistent with the period type specified.');

const PeriodSelectionZ = z.union([
  z.object({
    interval: z.object({
      start: DateInputZ.describe('Start date of the continuous period. Format depends on type: YEAR="2020", MONTH="2020-01", QUARTER="2020-Q1". Inclusive boundary - data from this date is included.'),
      end: DateInputZ.describe('End date of the continuous period. Format depends on type: YEAR="2024", MONTH="2024-12", QUARTER="2024-Q4". Inclusive boundary - data up to and including this date is included.')
    }).describe('Continuous date range from start to end. Use for analyzing trends over time. Example: { start: "2020", end: "2024" } for a 5-year period. All dates between start and end are included.'),
    dates: z.undefined().optional(),
  }).describe('Select a continuous interval of dates. Use when analyzing trends or changes over time. Example: analyzing education spending from 2020 to 2024.'),
  z.object({
    dates: z.array(DateInputZ).describe('Array of specific, non-continuous dates to query. Use for comparing specific time points or non-adjacent periods. Example: ["2020", "2022", "2024"] to see only even years. Format depends on type: YEAR=["2020","2021"], MONTH=["2023-01","2023-06"], QUARTER=["2023-Q1","2023-Q4"].'),
    interval: z.undefined().optional(),
  }).describe('Select specific non-continuous dates. Use when you need specific time points rather than a continuous range. Example: comparing Q1 across multiple years ["2020-Q1", "2021-Q1", "2022-Q1"].'),
]).describe('Period selection mode: use "interval" for continuous ranges (most common), or "dates" for specific non-continuous time points. Only one mode can be active at a time.');

export const ReportPeriodInputZ = z.object({
  type: ReportPeriodTypeZ,
  selection: PeriodSelectionZ,
}).describe('Complete period specification for budget data queries. Combines granularity (YEAR/MONTH/QUARTER) with either a continuous interval or specific dates. Example: { type: "YEAR", selection: { interval: { start: "2020", end: "2024" } } } for yearly data from 2020-2024.');
export type ReportPeriodInputZ = z.infer<typeof ReportPeriodInputZ>;

export const AnalyticsFilterSchema = z.object({
  // Required
  report_period: ReportPeriodInputZ.optional().describe('Time period specification for the data query. Combines granularity (YEAR/MONTH/QUARTER) with date selection (interval or specific dates). Required for most queries. Example: { type: "YEAR", selection: { interval: { start: "2020", end: "2024" } } } retrieves annual data for 5 years.'),
  account_category: z.enum(['ch', 'vn']).default('ch').describe('Type of budget account: "ch" (cheltuieli/expenses) for spending data, or "vn" (venituri/revenue) for income data. Default is "ch". Use "ch" for analyzing government expenditures (education, healthcare, infrastructure). Use "vn" for analyzing revenue sources (taxes, fees, transfers).'),

  // Dimensional filters
  report_ids: z.array(z.string()).optional().describe('Filter by specific report IDs from the budget execution database. Use when you have exact report identifiers to query. Rarely used in typical analysis - prefer filtering by entity, period, or classification instead.'),
  report_type: ReportTypeEnum.optional().describe('Aggregation level of the budget data. Choose based on detail needed: use "Executie bugetara agregata la nivel de ordonator principal" for high-level ministry/department totals, "Executie bugetara agregata la nivel de ordonator secundar" for intermediate detail, or "Executie bugetara detaliata" for itemized line-by-line data. Most common: principal aggregated for trends, detailed for deep dives.'),
  main_creditor_cui: z.string().optional().describe('Filter by the CUI (Cod Unic de Identificare - unique fiscal identifier) of the main creditor/budget holder. Use to analyze spending by a specific top-level institution. Example: Ministry of Education\'s CUI to see all education-related spending. Single value only - use entity_cuis array for multiple entities.'),
  reporting_years: z.array(z.number()).optional().describe('Legacy filter for years (deprecated - prefer using report_period instead). Array of calendar years as numbers. Example: [2020, 2021, 2022]. Note: report_period provides more flexibility with monthly/quarterly granularity.'),
  entity_cuis: z.array(z.string()).optional().describe('Filter by specific public entity CUIs (fiscal identifiers). Use to analyze one or more specific institutions. Example: ["12345678", "87654321"] for two specific schools or hospitals. For geographic entities (counties, cities), use uat_ids instead. Can combine multiple entities to create comparison charts.'),
  functional_codes: z.array(z.string()).optional().describe('Filter by exact Romanian COFOG3 functional classification codes. Use full codes for precise filtering. Example: ["70.11.01"] for primary education specifically. Format: XX.XX.XX (2 digits + 2 digits + 2 digits). For broader categories, use functional_prefixes instead. See Romanian COFOG3 classification: 70=Education, 84=Health, 60=Infrastructure, etc.'),
  functional_prefixes: z.array(z.string()).optional().describe('Filter by functional classification prefixes to include entire categories and subcategories. More common than functional_codes. Example: ["70."] includes ALL education spending (70.11 primary, 70.12 secondary, 70.13 higher, etc.). ["84."] for all healthcare. ["60."] for all infrastructure. Use prefixes for broad analysis, exact codes for precision. Most queries use prefixes.'),
  economic_codes: z.array(z.string()).optional().describe('Filter by exact Romanian economic classification codes. Economic classifications categorize spending by type (personnel, goods, services, investments). Example: ["20.30.01"] for base salaries specifically. Format varies by level (chapters, subchapters, articles). For broader categories like "all personnel expenses", use economic_prefixes instead.'),
  economic_prefixes: z.array(z.string()).optional().describe('Filter by economic classification prefixes to include entire expense categories. Example: ["20."] for ALL personnel expenses (salaries, bonuses, social contributions). ["30."] for goods and services. ["60."] for capital investments. Combine with functional filters for detailed analysis like "personnel expenses in education": functional_prefixes=["70."] + economic_prefixes=["20."].'),
  funding_source_ids: z.array(z.string()).optional().describe('Filter by funding source identifiers. Funding sources distinguish between state budget, local budgets, EU funds, loans, etc. Use to analyze specific financing mechanisms. Example: filter to show only EU-funded projects. Available source IDs depend on the budget structure - query the funding sources API for valid values.'),
  budget_sector_ids: z.array(z.string()).optional().describe('Filter by budget sector identifiers. Sectors represent organizational divisions within the public finance system. Use to analyze specific sectors or compare across sectors. Query the budget sectors API for available IDs and their meanings. Less commonly used than functional/economic classifications.'),
  expense_types: z.array(z.enum(['dezvoltare', 'functionare'])).optional().describe('Filter by expense type in Romanian public finance. "dezvoltare" (development/capital expenses): investments, infrastructure, equipment purchases - one-time costs that create assets. "functionare" (operational/current expenses): salaries, utilities, maintenance - recurring costs. Use to distinguish between investment spending and day-to-day operations. Example: ["dezvoltare"] to see only capital projects.'),
  program_codes: z.array(z.string()).optional().describe('Filter by budget program codes. Programs are strategic groupings of activities toward specific goals (e.g., "Rural Development Program", "Digital Transformation Program"). Use to track spending on specific policy initiatives. Available codes depend on government program structure - less standardized than COFOG3 classifications.'),

  // Geography
  county_codes: z.array(z.string()).optional().describe('Filter by Romanian county codes (județ codes). Use to analyze specific counties or compare regions. Example: ["CJ"] for Cluj county, ["B", "CJ", "TM"] for București, Cluj, and Timiș. County codes are 1-2 letter abbreviations. Combine with functional/economic filters for regional analysis like "education spending in Cluj". See Romanian county code list for all values.'),
  regions: z.array(z.string()).optional().describe('Filter by development regions (regiuni de dezvoltare). Romania has 8 development regions (Nord-Est, Sud-Est, Sud, Sud-Vest, Vest, Nord-Vest, Centru, București-Ilfov). Use for macro-regional analysis and EU fund distribution studies. Example: ["Nord-Vest"] for northwestern Romania. Less granular than county_codes but useful for regional policy analysis.'),
  uat_ids: z.array(z.string()).optional().describe('Filter by UAT (Unitate Administrativ-Teritorială) identifiers - administrative territorial units like cities, towns, communes. Use to analyze local budgets. Example: specific city hall budgets. More granular than county_codes. When is_uat is true, this filters to local government entities. Essential for per-capita comparisons between cities.'),
  entity_types: z.array(z.string()).optional().describe('Filter by type of public entity (e.g., "school", "hospital", "city_hall", "ministry"). Use to analyze spending patterns across similar institution types. Example: ["hospital"] to compare all hospitals\' budgets. Available types depend on entity classification in the database. Less standardized than COFOG3 - prefer functional_prefixes for broad categories.'),
  tags: z.array(z.string()).optional().describe('Filter by faceted classification tags in namespace::value form (e.g. "kind::hospital", "level::local"). Tags in the SAME facet (same namespace) combine with OR, tags in DIFFERENT facets combine with AND: ["kind::hospital","kind::clinic","level::local"] means (hospital OR clinic) AND locally-owned. Ancestor roll-up is built in: "kind::school" also matches every school subtype. The vocabulary ships as the entity-tags.json asset.'),
  is_uat: z.boolean().optional().describe('Boolean flag: when true, filters to only UAT (local government) entities; when false or omitted, includes all entity types. Critical for local vs national analysis. Set to true for analyzing city/commune budgets. Set to false or omit for central government. Combine with uat_ids for specific local governments. Essential when using normalization=per_capita for meaningful comparisons.'),
  is_territorial_executive: z.boolean().optional().describe('Filter geographic executive authorities independently of creditor hierarchy. False explicitly excludes executives.'),
  search: z.string().optional().describe('Free-text search across entity names, descriptions, and classifications. Use for exploratory queries when you don\'t know exact codes. Example: "biblioteca" to find library-related spending, "digitalizare" for digitalization projects. Less precise than structured filters but useful for discovery. Search is case-insensitive and supports partial matches.'),

  // Population
  min_population: z.number().optional().describe('Minimum population threshold for filtering entities. Use to focus on larger cities/counties. Example: 100000 to include only cities with 100k+ residents. Useful when analyzing per-capita data to exclude very small localities where per-capita figures can be volatile. Combine with max_population for population range filters.'),
  max_population: z.number().optional().describe('Maximum population threshold for filtering entities. Use to focus on smaller cities/communes or exclude large metropolitan areas. Example: 50000 to include only smaller towns. Useful for studying rural vs urban spending patterns. Combine with min_population to create population brackets like "medium-sized cities (50k-200k residents)".'),

  // Aggregates & transforms
  normalization: z.enum(['total', 'per_capita', 'percent_gdp', 'total_euro', 'per_capita_euro']).optional().describe('How to normalize/transform monetary values. "total": raw absolute amounts. "per_capita": divide by population for fair comparison between different-sized entities. "percent_gdp": express as % of GDP. "total_euro" and "per_capita_euro" are legacy; prefer normalization="total"|"per_capita" + currency="EUR".'),
  currency: Currency.optional().describe('Output currency for monetary values. Ignored when normalization="percent_gdp".'),
  inflation_adjusted: z.boolean().optional().describe('Adjust monetary values for inflation to constant 2024 prices. Ignored when normalization="percent_gdp".'),
  show_period_growth: z.boolean().optional().describe('For time series, return period-over-period growth (%) instead of levels.'),
  aggregate_min_amount: z.number().or(z.string()).optional().describe('Minimum threshold for aggregated total amounts (after summing all matching line items). Use to filter out small budget items when looking at totals. Example: 1000000 to show only aggregates over 1M RON. Applied after aggregation, so filters based on sum of all items. Different from item_min_amount which filters individual line items. Accepts number or string.'),
  aggregate_max_amount: z.number().or(z.string()).optional().describe('Maximum threshold for aggregated total amounts (after summing all matching line items). Use to focus on smaller budget categories or cap visualizations. Example: 10000000 to show only aggregates under 10M RON. Applied after aggregation. Useful for excluding very large categories that would skew treemap/pie charts. Accepts number or string.'),

  // Per-item thresholds
  item_min_amount: z.number().or(z.string()).optional().describe('Minimum threshold for individual budget line items BEFORE aggregation. Filters out small transactions. Example: 10000 to exclude items under 10k RON. Applied to each line item before summing. Different from aggregate_min_amount. Use to remove noise from detailed data or focus on significant individual expenses. Accepts number or string.'),
  item_max_amount: z.number().or(z.string()).optional().describe('Maximum threshold for individual budget line items BEFORE aggregation. Filters out very large transactions. Example: 1000000 to exclude items over 1M RON. Applied to each line item before summing. Use to focus on routine expenses or exclude extraordinary one-time purchases. Opposite of item_min_amount. Accepts number or string.'),

  // Exclude filters (advanced)
  exclude: z
    .object({
      report_ids: z.array(z.string()).optional().describe('Exclude specific report IDs from results. Negative filter - removes matching reports. Use when you want most data except specific known reports. Example: exclude test reports or known erroneous entries.'),
      entity_cuis: z.array(z.string()).optional().describe('Exclude specific entities by CUI. Use to remove outliers or special cases. Example: exclude the capital city when analyzing regional patterns, or remove entities with known data quality issues. Opposite of the include entity_cuis filter.'),
      main_creditor_cui: z.string().optional().describe('Exclude a specific main creditor/budget holder by CUI. Use to remove a large institution that would dominate the analysis. Example: exclude Ministry of Defense from general spending analysis.'),
      functional_codes: z.array(z.string()).optional().describe('Exclude exact functional classification codes. Use to remove specific subcategories. Example: include all education (70.) but exclude higher education (70.13) by using functional_prefixes=["70."] and exclude.functional_codes=["70.13"].'),
      functional_prefixes: z.array(z.string()).optional().describe('Exclude entire functional categories by prefix. Use to remove broad categories. Example: analyze all spending except education by setting exclude.functional_prefixes=["70."]. More powerful than excluding individual codes.'),
      economic_codes: z.array(z.string()).optional().describe('Exclude exact economic classification codes. Use to remove specific expense types. Example: analyze personnel expenses except one specific subcategory.'),
      economic_prefixes: z.array(z.string()).optional().describe('Exclude entire economic categories by prefix. Use to remove broad expense types. Example: analyze all expenses except personnel by setting exclude.economic_prefixes=["20."]. Useful for "everything except X" queries.'),
      funding_source_ids: z.array(z.string()).optional().describe('Exclude specific funding sources. Use to remove EU-funded projects, external loans, or other special financing. Example: analyze only domestically-funded projects by excluding foreign funding sources.'),
      budget_sector_ids: z.array(z.string()).optional().describe('Exclude specific budget sectors. Use to remove sectors that would skew analysis or focus on a subset of sectors.'),
      expense_types: z.array(z.enum(['dezvoltare', 'functionare'])).optional().describe('Exclude development or operational expenses. Example: exclude.expense_types=["functionare"] to show only capital/development spending. Opposite of the include expense_types filter.'),
      program_codes: z.array(z.string()).optional().describe('Exclude specific program codes. Use to remove special programs or initiatives from general budget analysis.'),
      county_codes: z.array(z.string()).optional().describe('Exclude specific counties. Use to remove outliers like the capital or focus on a region by excluding others. Example: exclude București when analyzing rural counties.'),
      regions: z.array(z.string()).optional().describe('Exclude development regions. Use to focus analysis on other regions or remove special cases.'),
      uat_ids: z.array(z.string()).optional().describe('Exclude specific local government units. Use to remove outliers or special cases from local budget analysis.'),
      entity_types: z.array(z.string()).optional().describe('Exclude specific entity types. Example: exclude.entity_types=["hospital"] to analyze education and other sectors without healthcare facilities.'),
      tags: z.array(z.string()).optional().describe('Exclude entities carrying ANY of these faceted tags (namespace::value). Flat any-match, no facet grouping. Example: exclude.tags=["kind::hospital"] removes every hospital regardless of other filters.'),
    })
    .optional()
    .describe('Advanced exclusion filters - negative filtering to remove specific data from results. All fields work opposite to their include counterparts. Use for "everything except X" queries. Example: all spending except education in București. Combine include and exclude for precise control: include functional_prefixes=["70."] + exclude.functional_codes=["70.13"] gives "all education except higher education".'),
});

export type AnalyticsFilterType = z.infer<typeof AnalyticsFilterSchema>;

export const CommitmentsExcludeSchema = z.object({
  report_ids: z.array(z.string()).optional(),
  entity_cuis: z.array(z.string()).optional(),
  main_creditor_cui: z.string().optional(),
  functional_codes: z.array(z.string()).optional(),
  functional_prefixes: z.array(z.string()).optional(),
  economic_codes: z.array(z.string()).optional(),
  economic_prefixes: z.array(z.string()).optional(),
  funding_source_ids: z.array(z.string()).optional(),
  budget_sector_ids: z.array(z.string()).optional(),
  county_codes: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  uat_ids: z.array(z.string()).optional(),
  entity_types: z.array(z.string()).optional(),
});

export type CommitmentsExcludeType = z.infer<typeof CommitmentsExcludeSchema>;

export const CommitmentsFilterSchema = z.object({
  report_period: ReportPeriodInputZ.optional(),
  report_type: CommitmentsReportTypeEnum.optional(),
  entity_cuis: z.array(z.string()).optional(),
  main_creditor_cui: z.string().optional(),
  entity_types: z.array(z.string()).optional(),
  is_uat: z.boolean().optional(),
  is_territorial_executive: z.boolean().optional().describe('Filter geographic executive authorities independently of creditor hierarchy. False explicitly excludes executives.'),
  search: z.string().optional(),
  functional_codes: z.array(z.string()).optional(),
  functional_prefixes: z.array(z.string()).optional(),
  economic_codes: z.array(z.string()).optional(),
  economic_prefixes: z.array(z.string()).optional(),
  funding_source_ids: z.array(z.string()).optional(),
  budget_sector_ids: z.array(z.string()).optional(),
  county_codes: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  uat_ids: z.array(z.string()).optional(),
  min_population: z.number().optional(),
  max_population: z.number().optional(),
  aggregate_min_amount: z.number().optional(),
  aggregate_max_amount: z.number().optional(),
  item_min_amount: z.number().optional(),
  item_max_amount: z.number().optional(),
  normalization: Normalization.optional(),
  currency: Currency.optional(),
  inflation_adjusted: z.boolean().optional(),
  show_period_growth: z.boolean().optional(),
  exclude: CommitmentsExcludeSchema.optional(),
  exclude_transfers: z.boolean().optional(),
});

export type CommitmentsFilterType = z.infer<typeof CommitmentsFilterSchema>;

// ============================================================================
// SERIES CONFIGURATION
// ============================================================================

type SeriesId = string;
export type Operand = SeriesId | Calculation | number;
export type Operation = 'sum' | 'subtract' | 'multiply' | 'divide';
// Add mechanism to avoid circular dependencies. Also, add validation for operations: Ex: divide by zero, etc.
export interface Calculation {
  op: Operation;
  args: Array<Operand>;
}

const SeriesIdSchema = z.string().describe('Reference to another series by its ID. Used in calculations to reference data from other series. The series must exist in the same chart. Example: "series-edu-001" references the education spending series. Used as operand in calculations like "revenue - expenses" where each is a series ID.');
const OperationSchema = z.enum(['sum', 'subtract', 'multiply', 'divide']).describe('Mathematical operation for calculations. "sum": add all operands (2+ values) - use for totals. "subtract": first operand minus second (exactly 2 values) - use for deficits, growth. "multiply": multiply all operands - use for scaling, ratios. "divide": first operand divided by second (exactly 2 values) - use for per-unit calculations. Example: { op: "subtract", args: ["revenue-series-id", "expenses-series-id"] } calculates budget balance.');

const CalculationSchema: z.ZodType<Calculation> = z.lazy(() =>
  z.object({
    op: OperationSchema,
    args: z.array(OperandSchema).describe('Array of operands for the calculation. Each operand can be: (1) a series ID string referencing another series, (2) a nested Calculation object for complex expressions, or (3) a number constant. Minimum 2 operands. Order matters for subtract/divide. Example: ["series-a", "series-b"] for basic operations, or ["series-a", { op: "multiply", args: ["series-b", 2] }] for nested calculations. Warning: avoid circular references where series A depends on B and B depends on A.'),
  }).describe('Calculation definition for computed series. Defines a mathematical operation on other series or values. Supports nesting for complex expressions like "(A + B) / C". Common use cases: budget deficit = revenue - expenses, growth rate = (current - previous) / previous, weighted average = sum of (value * weight). System validates for circular dependencies and division by zero at runtime.')
);

const OperandSchema: z.ZodType<Operand> = z.lazy(() =>
  z.union([SeriesIdSchema, CalculationSchema, z.number()]).describe('An operand in a calculation. Can be: (1) Series ID string - references data from another series in the chart, (2) Nested Calculation - for complex expressions like ((A+B)/C), (3) Number constant - for fixed values like scaling factors or thresholds. Examples: "revenue-series-id" (series reference), { op: "sum", args: ["a", "b"] } (nested calc), 1000000 (constant). Choose based on needs: series for dynamic data, nested calc for multi-step math, number for constants.')
);

export const BaseSeriesConfigurationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()).describe('Unique identifier for this series. Auto-generated UUID. Must be unique within the chart and immutable once created. Referenced by calculations and other series. Used as key in data structures. Format: UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000").'),
  enabled: z.boolean().default(true).describe('Whether this series is active and should be processed. When false, the series is ignored completely (not queried, not calculated, not rendered). Use enabled=false to temporarily disable a series without deleting it. Default: true.'),
  label: z.string().default('').describe('Human-readable name for this series. Displayed in legends, tooltips, and data tables. Should be descriptive and concise. Examples: "Total Education Spending", "Cluj - Healthcare", "Budget Deficit". Supports internationalization - use descriptive English/Romanian. Avoid abbreviations unless well-known.'),
  unit: z.string().optional().default('RON').describe('Unit of measurement for the series values. Displayed alongside values in tooltips and labels. Common values: "RON" (Romanian lei), "EUR" (euros), "RON/capita" (per capita), "%" (percentage), "" (dimensionless). For API-fetched series, the unit may come from the backend. For custom series, set explicitly.'),
  config: SeriesConfigSchema.describe('Series-specific visual configuration. Overrides global chart config for this series only. Controls visibility, colors, labels, and display options. See SeriesConfigSchema for all available options.'),
  createdAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp when this series was created. Auto-generated. Used for tracking and auditing. Format: "2025-10-25T10:00:00Z". Immutable after creation.'),
  updatedAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp of last modification. Auto-updated on changes. Used for tracking edits and cache invalidation. Format: "2025-10-25T10:00:00Z". Should be updated whenever series configuration changes.'),
});

export const SeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
  type: z.literal('line-items-aggregated-yearly').describe('Series type: "line-items-aggregated-yearly" - standard analytics query series. Queries budget data via GraphQL executionAnalytics API using the filter. Data is aggregated (summed) across all matching line items and grouped by time period. Most common series type for showing spending/revenue trends. Use for: education spending over time, healthcare by county, infrastructure investments. Automatic aggregation handles thousands of line items. Data points determined by report_period granularity (YEAR/MONTH/QUARTER).'),
  unit: z.string().optional().default('').describe('Unit of measurement for values. For this series type, typically comes from the API response based on normalization. "RON" for total amounts, "RON/capita" for per_capita normalization, "EUR" for euro conversions. Usually left empty to auto-fill from API. Override only if you need a custom unit label.'),
  filter: AnalyticsFilterSchema.describe('Complete analytics filter defining what data to query. This is the core configuration - specifies time period, classifications (functional/economic), entities, normalization, and all other query parameters. See AnalyticsFilterSchema for 30+ available filter fields. Example: { report_period: {...}, account_category: "ch", functional_prefixes: ["70."], normalization: "per_capita" } queries per-capita education spending.').default({
    report_period: createDefaultExecutionYearReportPeriod(),
    account_category: 'ch',
    report_type: 'Executie bugetara agregata la nivel de ordonator principal',
    exclude: {
      economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    },
  }),
}).loose();

export const SeriesGroupConfigurationSchema = BaseSeriesConfigurationSchema.extend({
  type: z.literal('aggregated-series-calculation').describe('Series type: "aggregated-series-calculation" - computed/calculated series. Generates data by performing mathematical operations on other series in the same chart. Does not query the database - all data comes from calculation. Use for: budget deficit (revenue - expenses), growth rates, weighted averages, custom metrics. Requires other series to exist first. Calculation evaluated after all data series are loaded. Supports nesting for complex formulas.'),
  calculation: CalculationSchema.describe('The calculation definition specifying how to compute this series from other series. Defines the mathematical operation (sum/subtract/multiply/divide) and operands (series IDs, nested calculations, or constants). Example: { op: "subtract", args: ["revenue-series-id", "expenses-series-id"] } creates deficit series. Validates for circular dependencies and division by zero. See CalculationSchema for detailed structure and examples.').default({ op: 'sum', args: [] }),
}).loose()

// Add custom series with editable data values and unit
export const CustomSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
  type: z.literal('custom-series').describe('Series type: "custom-series" - manually entered data points. User provides explicit year/value pairs instead of querying database. Use for: external benchmarks, targets/goals, projections, historical data not in database, comparison baselines. Data is editable in the UI. Useful for overlaying non-budget data on budget charts (e.g., GDP, population growth). Each data point is a { year, value } object.'),
  data: z.array(z.object({
    year: z.number().describe('The year for this data point (as integer). Example: 2023. Must match the x-axis scale of the chart. For monthly charts, this would be represented differently. Typically covers the same range as other series for alignment.'),
    value: z.number().default(1).describe('The numeric value for this year. Can be any number - positive, negative, decimal. Unit specified in the series unit field. Default is 1 (useful for creating ratio baselines). Edit to match your target or benchmark values.'),
  })).default(Array.from({ length: defaultYearRange.end - defaultYearRange.start + 1 }, (_, index) => ({ year: index + defaultYearRange.start, value: 1 }))).describe('Array of year/value data points. Default provides one data point per year in the default range (2016-2025) with value=1. Edit to provide your custom data. Example: [{ year: 2020, value: 1000000 }, { year: 2021, value: 1050000 }, ...] for annual targets. Can have gaps - missing years won\'t show data points.'),
}).loose();


export const CustomSeriesValueConfigurationSchema = BaseSeriesConfigurationSchema.extend({
  type: z.literal('custom-series-value').describe('Series type: "custom-series-value" - constant horizontal line. Single value applied to all time periods. Use for: thresholds, targets, reference lines, averages. Displays as horizontal line across entire chart. Example: budget cap of 10M RON, population benchmark, compliance threshold. Simpler than custom-series when the value doesn\'t change over time.'),
  value: z.number().default(1).describe('The constant value to display across all time periods. Shown as a horizontal reference line. Can be any number. Example: 1000000 for a 1M RON threshold, 0 for a zero baseline, -500000 for a deficit target. Unit specified in the series unit field. Useful for showing targets, caps, or comparison baselines.'),
  unit: z.string().optional().default('').describe('Unit of measurement for the constant value. Displayed in tooltips and labels. Should match other series for meaningful comparison. Examples: "RON", "RON/capita", "%", "thousands". Required for clarity when mixing with other series.'),
}).passthrough();

export const StaticSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
  type: z.literal('static-series').describe('Series type: "static-series" - pre-defined dataset from server. References a dataset stored on the backend by ID. Use for: curated datasets, complex pre-computed metrics, frequently reused data, official statistics. Data is fetched from staticChartAnalytics API instead of executionAnalytics. Useful when data preparation is complex or when reusing across multiple charts. Backend maintains the dataset definition.'),
  seriesId: z.string().optional().describe('The unique identifier of the static dataset on the server. References a pre-defined dataset in the backend. Query the static datasets API to get available IDs and their descriptions. When set, the system fetches this dataset instead of building a query. The dataset includes its own time range, values, and metadata. Used for standardized metrics like "National Education Average", "EU Comparison Data", etc.'),
  unit: z.string().optional().default('').describe('Unit of measurement for the static dataset. Displayed in tooltips and labels. Should match other series for meaningful comparison. Examples: "RON", "RON/capita", "%", "thousands". Required for clarity when mixing with other series.'),
}).passthrough();

export const InsSeriesAggregationSchema = z.enum(['sum', 'average', 'first']);
export type InsSeriesAggregation = z.infer<typeof InsSeriesAggregationSchema>;

export const InsSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
  type: z.literal('ins-series').describe('Series type: "ins-series" - INS Tempo dataset series. Queries INS observations from the GraphQL INS module and maps them to chart-compatible time-series points. Requires one complete native source identity and complete supported periods; source alternatives and missing coverage remain unavailable.'),
  unit: z.string().optional().default('').describe('Unit of measurement for INS values. Usually inferred from dataset observations. Leave empty to auto-detect from API metadata.'),
  datasetCode: z.string().optional().describe('INS dataset code (matrix code), for example "POP107D". Required for querying observations. Selected from INS datasets catalog.'),
  period: ReportPeriodInputZ.optional().describe('INS period selection using the same report-period interface as execution series. Supports period type (YEAR/QUARTER/MONTH) and either dates or interval selection.'),
  intervalOperation: z.enum(['sum', 'average', 'latest']).optional().describe('Explicit map interval reducer; omission never implies sum.'),
  periodicity: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY']).optional().describe('Frequency for a map latest-period request when the source publishes multiple frequencies.'),
  aggregation: InsSeriesAggregationSchema.default('sum').describe('Retained for saved-document compatibility. No reducer may combine alternative native INS source identities; choose one complete source series.'),
  territoryCodes: z.array(z.string()).optional().describe('Optional INS territory codes filter (e.g., ["RO"], county codes at NUTS3).'),
  sirutaCodes: z.array(z.string()).optional().describe('Optional INS SIRUTA codes filter (typically LAU localities/UATs).'),
  unitCodes: z.array(z.string()).optional().describe('Optional INS unit code filter. Use when dataset has multiple units of measure and a specific unit is required.'),
  classificationSelections: z.record(z.string(), z.array(z.string())).optional().describe('Classification selections keyed by INS classification type code. Values are allowed classification value codes for each type. AND semantics across type keys, OR semantics inside each value array.'),
  hasValue: z.boolean().default(true).describe('Retained for saved-document compatibility. Native charts inspect all source cells, including nulls, before deriving values; missing coverage remains unavailable.'),
}).passthrough();

export const CommitmentsSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
  type: z.literal('commitments-analytics').describe('Series type: "commitments-analytics" - commitments time-series fetched from the commitments analytics API. Uses a commitments filter and one selected commitments metric.'),
  metric: CommitmentsMetricEnum.default('CREDITE_ANGAJAMENT').describe('Commitments metric that defines which field is queried for this series.'),
  unit: z.string().optional().default('').describe('Unit of measurement for values. For this series type, it is typically provided by the API response based on normalization settings.'),
  filter: CommitmentsFilterSchema.default({
    report_period: createDefaultCommitmentsYearReportPeriod(),
    report_type: 'PRINCIPAL_AGGREGATED',
    normalization: 'total',
    currency: 'RON',
    inflation_adjusted: false,
    exclude: {
      economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    },
  }).describe('Commitments analytics filter defining period, dimensions, transformations, and exclusions.'),
}).loose();

export const SeriesSchema = z.discriminatedUnion('type', [
  SeriesConfigurationSchema,
  SeriesGroupConfigurationSchema,
  CustomSeriesConfigurationSchema,
  CustomSeriesValueConfigurationSchema,
  StaticSeriesConfigurationSchema,
  InsSeriesConfigurationSchema,
  CommitmentsSeriesConfigurationSchema,
]);

export type SeriesConfiguration = z.infer<typeof SeriesConfigurationSchema>;
export type SeriesGroupConfiguration = z.infer<typeof SeriesGroupConfigurationSchema>;
export type StaticSeriesConfiguration = z.infer<typeof StaticSeriesConfigurationSchema>;
export type InsSeriesConfiguration = z.infer<typeof InsSeriesConfigurationSchema>;
export type CommitmentsSeriesConfiguration = z.infer<typeof CommitmentsSeriesConfigurationSchema>;
export type Series = z.infer<typeof SeriesSchema>;

// ============================================================================
// ANNOTATIONS SCHEMA
// ============================================================================

export const AnnotationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()).describe('Unique identifier for this annotation. Auto-generated UUID. Must be unique within the chart. Used for editing, deleting, and referencing annotations. Format: UUID v4. Immutable once created.'),
  type: z.literal('annotation').describe('Type discriminator for annotation objects. Always "annotation". Used internally for type safety and serialization. Required for the discriminated union pattern.'),
  enabled: z.boolean().default(true).describe('Whether this annotation is active and should be displayed (subject to chart showAnnotations setting). When false, annotation is completely hidden. Different from locked which affects editability. Use to temporarily hide annotations without deleting them. Default: true.'),
  locked: z.boolean().default(true).describe('Whether this annotation is editable by users. When true, users cannot move, edit, or delete this annotation (read-only). When false, users can drag, edit text, and delete. Set to true for published charts to prevent accidental modifications. Set to false in authoring mode. Independent of enabled status.'),
  title: z.string().describe('Primary text of the annotation. Displayed prominently in the label. Should be concise and descriptive. Examples: "COVID-19 Pandemic", "New Budget Law", "Election Year". Keep under 50 characters for readability. Required field - must not be empty for meaningful annotations.'),
  subtitle: z.string().optional().describe('Secondary text providing additional context. Displayed below the title in smaller font. Optional but recommended for detailed explanations. Examples: "Schools closed nationwide", "10% budget increase approved", "Policy change effective". Can be longer than title but keep under 100 characters. Omit if title is self-explanatory.'),
  color: z.string().default('#0062ff').describe('Color of the annotation visual elements (connector line, subject circle, label border). Hex format. Use to categorize annotations by type or severity. Examples: "#0062ff" (blue, neutral), "#ff6b6b" (red, negative events), "#00c49f" (green, positive events). Ensure sufficient contrast with chart background. Default is blue.'),
  connector: z.boolean().default(true).describe('Whether to show a line connecting the annotation point on the chart to the label. When true, draws a line from (pX, pY) to the label position. When false, only the label is shown (floating text). Use true for pointing to specific data points, false for general period annotations. Improves clarity by showing exactly what is annotated. Default: true.'),
  subject: z.boolean().default(false).describe('Whether to show a visual marker (circle or icon) at the annotation point (pX, pY) on the chart. When true, draws a filled circle at the exact point being annotated. When false, only connector line (if enabled) originates from that point. Use true to emphasize the exact moment/value being annotated. Common for event markers. Default: false.'),
  label: z.boolean().default(true).describe('Whether to display the text label containing title and subtitle. When false, only the connector and subject (if enabled) are shown. Rarely disabled - usually you want the explanatory text. Use false only for minimalist designs or when the visual marker alone is sufficient. Default: true.'),
  pX: z.number().default(0.5).describe('X-axis position of the annotation point as a percentage of chart width. Range: 0.0 (left edge) to 1.0 (right edge). This is where the annotation "points to" on the chart. Example: 0.5 for middle of chart, 0.25 for first quarter, 0.8 for near the end. For time-series, corresponds to a specific date (e.g., 0.5 might be 2020 in a 2016-2024 chart). Subject and connector originate from this point.'),
  pY: z.number().default(0.5).describe('Y-axis position of the annotation point as a percentage of chart height. Range: 0.0 (bottom) to 1.0 (top). Points to a specific value on the y-axis. Example: 0.9 for high values, 0.1 for low values, 0.5 for middle. Combine with pX to pinpoint exact data points. For marking peaks/troughs, set to the actual data value percentage.'),
  pXDelta: z.number().default(0.05).describe('X-axis offset for the label position relative to the annotation point (pX). Percentage of chart width. Positive values move label right, negative move left. Example: 0.05 moves label 5% of chart width to the right. Use to position labels so they don\'t overlap data or other annotations. Typical range: -0.3 to 0.3. Default: 0.05 (slightly right).'),
  pYDelta: z.number().default(0.05).describe('Y-axis offset for the label position relative to the annotation point (pY). Percentage of chart height. Positive values move label up, negative move down. Example: 0.1 moves label 10% of chart height upward. Use to prevent label overlap with data lines or other annotations. Typical range: -0.3 to 0.3. Adjust until label is readable and doesn\'t obscure data. Default: 0.05 (slightly up).'),
}).describe('Annotation configuration for marking important events, policy changes, or insights on charts. Annotations consist of a point on the chart (pX, pY), optional visual markers (subject, connector), and a text label (title, subtitle). Use to explain anomalies, highlight key moments, provide context. Example: marking "COVID-19 Impact" at March 2020 with explanation of budget changes. Annotations can be locked (read-only) or editable, enabled or hidden.');

export type TAnnotation = z.infer<typeof AnnotationSchema>;

// ============================================================================
// MAIN CHART SCHEMA
// ============================================================================

export const ChartSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()).describe('Unique identifier for this chart. Auto-generated UUID. Used for referencing, saving, sharing, and URL routing. Must be unique across all charts in the system. Format: UUID v4 (e.g., "chart-550e8400-e29b-41d4"). Immutable once created - changing the ID creates a new chart instead of updating existing one.'),
  title: z.string().default('').describe('Human-readable title for the chart. Displayed prominently at the top of the visualization. Should clearly describe what the chart shows. Examples: "Education Spending Trend (2020-2024)", "Cluj vs București Healthcare Comparison", "Budget Deficit Analysis". Keep concise but descriptive (under 100 characters). Supports internationalization. Required for meaningful charts.'),
  description: z.string().optional().describe('Optional detailed description explaining the chart\'s purpose, methodology, or key insights. Displayed below the title or in an info tooltip. Use for: data sources, calculation methods, important caveats, interpretation guidance. Example: "Compares per capita education spending using official budget execution data normalized by county population." Markdown supported for formatting. Can be lengthy - use for comprehensive context.'),

  // Global chart configuration
  config: ChartConfigSchema.describe('Global chart configuration controlling visualization appearance and behavior. Includes chart type (line/bar/pie/etc.), display options (legends, tooltips, labels), and user interactions. These settings apply to all series unless overridden at series level. See ChartConfigSchema for 11 configuration options. Critical for defining how data is visualized.'),

  // Series data
  series: z.array(SeriesSchema).default([]).describe('Array of data series to display on the chart. Each series represents a dataset (query results, calculations, or custom data). Can contain multiple series for comparisons. Series types: "line-items-aggregated-yearly" (execution analytics queries), "commitments-analytics" (commitments analytics queries), "aggregated-series-calculation" (computed from other series), "custom-series" (manual data), "custom-series-value" (constant lines), "static-series" (pre-defined datasets), "ins-series" (INS Tempo observations). Order affects rendering and legend order. Minimum 1 series for meaningful charts, but can be empty during creation.'),

  // Annotations
  annotations: z.array(AnnotationSchema).default([]).describe('Array of annotations marking important events, insights, or context on the chart. Each annotation points to a specific location and displays explanatory text. Use to highlight: policy changes, significant events, anomalies, milestones. Examples: "COVID-19 Pandemic", "New Budget Law Enacted", "Election Year". Annotations are optional - charts can have zero annotations. Can be created manually or programmatically. Visibility controlled by chart config.showAnnotations and individual annotation.enabled flags.'),

  // Metadata
  createdAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp when this chart was first created. Auto-generated on creation. Used for tracking, sorting, and auditing. Format: "2025-10-25T10:00:00Z". Immutable after creation - never changes even when chart is updated. Useful for "newest charts" sorting and creation history.'),
  updatedAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp of the most recent modification to this chart. Auto-updated whenever any field changes (title, series, config, annotations, etc.). Format: "2025-10-25T10:00:00Z". Used for cache invalidation, "recently edited" sorting, and change tracking. Should be set to current time on every save operation.'),
}).default(createDefaultChart).describe('Complete chart definition combining configuration, data series, and annotations. This is the root schema for the entire chart system. A chart consists of: (1) Metadata (id, title, description, timestamps), (2) Global config (chart type, display options), (3) Series array (data sources and calculations), (4) Annotations array (context and insights). Charts are self-contained and portable - can be saved, shared, embedded, or exported. Used throughout the application for budget data visualization and analysis.');

export type Chart = z.infer<typeof ChartSchema>;

// ============================================================================
// CHART STATE (Runtime data)
// ============================================================================

// New server data model types
export const AxisDataTypeEnum = z.enum(['STRING', 'INTEGER', 'FLOAT', 'DATE'])
  .describe('Data type for axis values in chart data. "STRING": text/categorical values (e.g., "2023", "Q1", county names). "INTEGER": whole numbers (e.g., 1000, 2500). "FLOAT": decimal numbers (e.g., 1000.50, 3.14). "DATE": ISO date strings (e.g., "2023-01-15"). Used for proper formatting and type checking in visualizations. X-axis typically STRING or DATE, Y-axis typically INTEGER or FLOAT.');
export type AxisDataType = z.infer<typeof AxisDataTypeEnum>;

export const AxisSchema = z.object({
  name: z.string().describe('Name of this axis. For x-axis: typically "Period", "Date", "Year". For y-axis: typically "Amount", "Value", or includes unit like "Amount (RON)". Displayed on axis labels. Should be descriptive of what the axis represents.'),
  type: AxisDataTypeEnum.describe('Data type of values on this axis. Determines formatting and parsing. X-axis usually STRING or DATE. Y-axis usually INTEGER or FLOAT for monetary values. Affects how values are displayed and sorted.'),
  unit: z.string().describe('Unit of measurement for axis values. For x-axis: often empty or "Year". For y-axis: "RON", "EUR", "RON/capita", "%", etc. Displayed in axis labels and tooltips. Should match series units. Can be empty string if dimensionless.'),
}).describe('Axis metadata describing the data type and unit for chart axes. Each series has x-axis and y-axis definitions. Provided by the API in query responses. Used for proper data formatting, axis labeling, and tooltip display.');
export type Axis = z.infer<typeof AxisSchema>;

export const AnalyticsSeriesPointSchema = z.object({
  x: z.string().describe('X-axis value for this data point. Format depends on axis type and granularity. For yearly data: "2023". For monthly: "2023-01". For quarterly: "2023-Q1". Always string even for dates/numbers. Corresponds to time period in most budget charts.'),
  y: z.number().describe('Y-axis numeric value for this data point. The actual measured value (spending amount, revenue, etc.). Already processed with normalization if requested (per capita, euro conversion). Can be positive, negative, or zero. Unit specified in axis.unit. Decimal precision preserved.'),
}).describe('Single data point in a series. Represents one value at one time period. Example: { x: "2023", y: 1500000 } means 1.5M RON in year 2023. Data points are ordered by x value. Missing x values indicate gaps in data.');
export type AnalyticsSeriesPoint = z.infer<typeof AnalyticsSeriesPointSchema>;

export const AnalyticsSeriesSchema = z.object({
  seriesId: z.string().describe('ID of the series this data belongs to. Matches the series.id from the chart configuration. Used to associate fetched data with its series definition. Required for multi-series charts to map data correctly.'),
  xAxis: AxisSchema.describe('Metadata about the x-axis (typically time). Defines the data type, name, and unit for x values. Usually type=STRING/DATE, name="Period"/"Year", unit="" or "Year". Consistent across all points in this series.'),
  yAxis: AxisSchema.describe('Metadata about the y-axis (measured values). Defines the data type, name, and unit for y values. Usually type=FLOAT/INTEGER, name="Amount", unit="RON" or "RON/capita". Reflects normalization applied to data.'),
  data: z.array(AnalyticsSeriesPointSchema).describe('Array of data points for this series. Each point is { x, y } representing one value at one time. Ordered chronologically by x. Length depends on time range and granularity. Can be empty if no data found. Example: [{ x: "2020", y: 1000000 }, { x: "2021", y: 1100000 }, ...]'),
}).describe('Runtime data structure returned by analytics API for one series. Contains the actual data points and axis metadata. Separate from series configuration (SeriesConfiguration). Created at query time, not persisted in chart definition. Used for rendering charts after data is fetched.');
export type AnalyticsSeries = z.infer<typeof AnalyticsSeriesSchema>;



export const AnalyticsInputSchema = z.object({
  seriesId: z.string().describe('ID of the series to query data for. Matches a series.id in the chart. Used by the API to return data tagged with the correct series ID. Required for associating query results with series.'),
  filter: AnalyticsFilterSchema.describe('Complete analytics filter for this query. Extracted from series.filter for API execution. Defines what data to fetch (period, classifications, entities, normalization, etc.). See AnalyticsFilterSchema for all 30+ filter options.'),
}).describe('Input structure for GraphQL analytics queries. Pairs a series ID with its filter definition. Used when querying the executionAnalytics API. Multiple inputs can be batched in a single query. The API returns AnalyticsSeries objects matching each input.');

export type AnalyticsInput = z.infer<typeof AnalyticsInputSchema>;

// ============================================================================
// Copy/Paste schemas
// ============================================================================

export const CopiedSeriesSchema = z.object({
  type: z.literal('chart-series-copy').describe('Type discriminator identifying this as copied series data. Always "chart-series-copy". Used by clipboard handlers to recognize series data. Enables type-safe copy/paste between charts.'),
  payload: z.array(SeriesSchema).describe('Array of series that were copied. Can be one or multiple series. Each series includes full configuration (filter, calculation, config, etc.). When pasted, series get new IDs but retain all other properties. Used to duplicate series within a chart or copy series between different charts. Preserves series type (line-items-aggregated-yearly, calculation, custom, etc.).'),
}).describe('Clipboard data structure for copied series. Used when users copy series from one chart to paste into another (or the same) chart. Stored in clipboard/localStorage temporarily. When pasting, the system generates new IDs but keeps all configuration. Enables quick duplication and reuse of complex series definitions.');

export type CopiedSeries = z.infer<typeof CopiedSeriesSchema>;

// Allow copying annotations between charts
export const CopiedAnnotationsSchema = z.object({
  type: z.literal('chart-annotations-copy').describe('Type discriminator identifying this as copied annotation data. Always "chart-annotations-copy". Used by clipboard handlers to recognize annotation data. Enables type-safe copy/paste of annotations between charts.'),
  payload: z.array(AnnotationSchema).describe('Array of annotations that were copied. Can be one or multiple annotations. Each annotation includes full configuration (title, subtitle, position, styling, etc.). When pasted, annotations get new IDs but retain positions and text. Used to duplicate annotations within a chart or copy annotations between different charts. Useful for reusing common annotations like "COVID-19 Impact" across multiple charts.'),
}).describe('Clipboard data structure for copied annotations. Used when users copy annotations from one chart to paste into another (or the same) chart. Stored in clipboard/localStorage temporarily. When pasting, the system generates new IDs but preserves positions (pX, pY, deltas) and content (title, subtitle). Enables quick reuse of annotation templates and common markers across multiple visualizations.');

export type CopiedAnnotations = z.infer<typeof CopiedAnnotationsSchema>;
