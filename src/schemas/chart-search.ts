import { z } from 'zod';
import { lazySchema, type LazyOutput } from '@/lib/route-contract';
import { generateRandomColor } from '@/components/charts/components/chart-renderer/color-utils';
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults';
import { analyticsFilterSchema, commitmentsMetricSchema, currencySchema, normalizationSchema, reportPeriodSchema } from './analytics-filter-search';
import { CHART_TYPES, createDefaultChart, createDefaultCommitmentsYearReportPeriod, createDefaultExecutionYearReportPeriod, defaultYearRange } from './chart-defaults';
import { COMPANY_ANALYSIS_COHORT_MODES, COMPANY_ANALYSIS_METRICS, COMPANY_ANALYSIS_RELEASE_ID_RE, companyAnalysisScopeSchema } from './company-analysis-scope-route-contract';

type SeriesId = string;
export type Operand = SeriesId | Calculation | number;
export type Operation = 'sum' | 'subtract' | 'multiply' | 'divide';
// Add mechanism to avoid circular dependencies. Also, add validation for operations: Ex: divide by zero, etc.
export interface Calculation {
  op: Operation;
  args: Array<Operand>;
}

/** A chart URL contains the entire editable document. The router validates it synchronously. */
function buildChartDocumentSchemas() {
  /**
   * Global chart configuration that can be overridden by individual series
   */
  const ChartConfigSchema = z.object({
    chartType: z.enum(CHART_TYPES).describe('The visualization type for this chart. Available types: "line" (trends over time), "bar" (comparisons), "area" (cumulative trends), "bar-aggr" (aggregated comparisons), "pie-aggr" (proportions), "treemap-aggr" (hierarchical breakdowns), "sankey-aggr" (flow diagrams). Choose based on your analytical goal: use line/area for trends, bar for comparisons, pie/treemap for distributions.'),
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

  /**
   * Series-specific configuration that can override global settings
   */
  const SeriesConfigSchema = z.object({
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

  const CommitmentsReportTypeEnum = z.enum(['PRINCIPAL_AGGREGATED', 'SECONDARY_AGGREGATED', 'DETAILED'])
    .describe('Aggregation level for commitments reports. "PRINCIPAL_AGGREGATED" aggregates at main ordering-creditor level, "SECONDARY_AGGREGATED" aggregates at secondary level, and "DETAILED" returns line-item-level granularity.');
  const CommitmentsExcludeSchema = z.object({
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

  const CommitmentsFilterSchema = z.object({
    report_period: reportPeriodSchema.schema().optional(),
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
    normalization: normalizationSchema.schema().optional(),
    currency: currencySchema.schema().optional(),
    inflation_adjusted: z.boolean().optional(),
    show_period_growth: z.boolean().optional(),
    exclude: CommitmentsExcludeSchema.optional(),
    exclude_transfers: z.boolean().optional(),
  });

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

  const BaseSeriesConfigurationSchema = z.object({
    id: z.string().default(() => crypto.randomUUID()).describe('Unique identifier for this series. Auto-generated UUID. Must be unique within the chart and immutable once created. Referenced by calculations and other series. Used as key in data structures. Format: UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000").'),
    enabled: z.boolean().default(true).describe('Whether this series is active and should be processed. When false, the series is ignored completely (not queried, not calculated, not rendered). Use enabled=false to temporarily disable a series without deleting it. Default: true.'),
    label: z.string().default('').describe('Human-readable name for this series. Displayed in legends, tooltips, and data tables. Should be descriptive and concise. Examples: "Total Education Spending", "Cluj - Healthcare", "Budget Deficit". Supports internationalization - use descriptive English/Romanian. Avoid abbreviations unless well-known.'),
    unit: z.string().optional().default('RON').describe('Unit of measurement for the series values. Displayed alongside values in tooltips and labels. Common values: "RON" (Romanian lei), "EUR" (euros), "RON/capita" (per capita), "%" (percentage), "" (dimensionless). For API-fetched series, the unit may come from the backend. For custom series, set explicitly.'),
    config: SeriesConfigSchema.describe('Series-specific visual configuration. Overrides global chart config for this series only. Controls visibility, colors, labels, and display options. See SeriesConfigSchema for all available options.'),
    createdAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp when this series was created. Auto-generated. Used for tracking and auditing. Format: "2025-10-25T10:00:00Z". Immutable after creation.'),
    updatedAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp of last modification. Auto-updated on changes. Used for tracking edits and cache invalidation. Format: "2025-10-25T10:00:00Z". Should be updated whenever series configuration changes.'),
  });

  const SeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('line-items-aggregated-yearly').describe('Series type: "line-items-aggregated-yearly" - standard analytics query series. Queries budget data via GraphQL executionAnalytics API using the filter. Data is aggregated (summed) across all matching line items and grouped by time period. Most common series type for showing spending/revenue trends. Use for: education spending over time, healthcare by county, infrastructure investments. Automatic aggregation handles thousands of line items. Data points determined by report_period granularity (YEAR/MONTH/QUARTER).'),
    unit: z.string().optional().default('').describe('Unit of measurement for values. For this series type, typically comes from the API response based on normalization. "RON" for total amounts, "RON/capita" for per_capita normalization, "EUR" for euro conversions. Usually left empty to auto-fill from API. Override only if you need a custom unit label.'),
    filter: analyticsFilterSchema.schema().describe('Complete analytics filter defining what data to query. This is the core configuration - specifies time period, classifications (functional/economic), entities, normalization, and all other query parameters. See AnalyticsFilterSchema for 30+ available filter fields. Example: { report_period: {...}, account_category: "ch", functional_prefixes: ["70."], normalization: "per_capita" } queries per-capita education spending.').default({
      report_period: createDefaultExecutionYearReportPeriod(),
      account_category: 'ch',
      report_type: 'Executie bugetara agregata la nivel de ordonator principal',
      exclude: {
        economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
      },
    }),
  }).loose();

  const SeriesGroupConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('aggregated-series-calculation').describe('Series type: "aggregated-series-calculation" - computed/calculated series. Generates data by performing mathematical operations on other series in the same chart. Does not query the database - all data comes from calculation. Use for: budget deficit (revenue - expenses), growth rates, weighted averages, custom metrics. Requires other series to exist first. Calculation evaluated after all data series are loaded. Supports nesting for complex formulas.'),
    calculation: CalculationSchema.describe('The calculation definition specifying how to compute this series from other series. Defines the mathematical operation (sum/subtract/multiply/divide) and operands (series IDs, nested calculations, or constants). Example: { op: "subtract", args: ["revenue-series-id", "expenses-series-id"] } creates deficit series. Validates for circular dependencies and division by zero. See CalculationSchema for detailed structure and examples.').default({ op: 'sum', args: [] }),
  }).loose()

  // Add custom series with editable data values and unit
  const CustomSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('custom-series').describe('Series type: "custom-series" - manually entered data points. User provides explicit year/value pairs instead of querying database. Use for: external benchmarks, targets/goals, projections, historical data not in database, comparison baselines. Data is editable in the UI. Useful for overlaying non-budget data on budget charts (e.g., GDP, population growth). Each data point is a { year, value } object.'),
    data: z.array(z.object({
      year: z.number().describe('The year for this data point (as integer). Example: 2023. Must match the x-axis scale of the chart. For monthly charts, this would be represented differently. Typically covers the same range as other series for alignment.'),
      value: z.number().default(1).describe('The numeric value for this year. Can be any number - positive, negative, decimal. Unit specified in the series unit field. Default is 1 (useful for creating ratio baselines). Edit to match your target or benchmark values.'),
    })).default(Array.from({ length: defaultYearRange.end - defaultYearRange.start + 1 }, (_, index) => ({ year: index + defaultYearRange.start, value: 1 }))).describe('Array of year/value data points. Default provides one data point per year in the default range (2016-2025) with value=1. Edit to provide your custom data. Example: [{ year: 2020, value: 1000000 }, { year: 2021, value: 1050000 }, ...] for annual targets. Can have gaps - missing years won\'t show data points.'),
  }).loose();

  const CustomSeriesValueConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('custom-series-value').describe('Series type: "custom-series-value" - constant horizontal line. Single value applied to all time periods. Use for: thresholds, targets, reference lines, averages. Displays as horizontal line across entire chart. Example: budget cap of 10M RON, population benchmark, compliance threshold. Simpler than custom-series when the value doesn\'t change over time.'),
    value: z.number().default(1).describe('The constant value to display across all time periods. Shown as a horizontal reference line. Can be any number. Example: 1000000 for a 1M RON threshold, 0 for a zero baseline, -500000 for a deficit target. Unit specified in the series unit field. Useful for showing targets, caps, or comparison baselines.'),
    unit: z.string().optional().default('').describe('Unit of measurement for the constant value. Displayed in tooltips and labels. Should match other series for meaningful comparison. Examples: "RON", "RON/capita", "%", "thousands". Required for clarity when mixing with other series.'),
  }).passthrough();

  const StaticSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('static-series').describe('Series type: "static-series" - pre-defined dataset from server. References a dataset stored on the backend by ID. Use for: curated datasets, complex pre-computed metrics, frequently reused data, official statistics. Data is fetched from staticChartAnalytics API instead of executionAnalytics. Useful when data preparation is complex or when reusing across multiple charts. Backend maintains the dataset definition.'),
    seriesId: z.string().optional().describe('The unique identifier of the static dataset on the server. References a pre-defined dataset in the backend. Query the static datasets API to get available IDs and their descriptions. When set, the system fetches this dataset instead of building a query. The dataset includes its own time range, values, and metadata. Used for standardized metrics like "National Education Average", "EU Comparison Data", etc.'),
    unit: z.string().optional().default('').describe('Unit of measurement for the static dataset. Displayed in tooltips and labels. Should match other series for meaningful comparison. Examples: "RON", "RON/capita", "%", "thousands". Required for clarity when mixing with other series.'),
  }).passthrough();

  const InsSeriesAggregationSchema = z.enum(['sum', 'average', 'first']);

  const InsSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('ins-series').describe('Series type: "ins-series" - INS Tempo dataset series. Queries INS observations from the GraphQL INS module and maps them to chart-compatible time-series points. Requires one complete native source identity and complete supported periods; source alternatives and missing coverage remain unavailable.'),
    unit: z.string().optional().default('').describe('Unit of measurement for INS values. Usually inferred from dataset observations. Leave empty to auto-detect from API metadata.'),
    datasetCode: z.string().optional().describe('INS dataset code (matrix code), for example "POP107D". Required for querying observations. Selected from INS datasets catalog.'),
    period: reportPeriodSchema.schema().optional().describe('INS period selection using the same report-period interface as execution series. Supports period type (YEAR/QUARTER/MONTH) and either dates or interval selection.'),
    intervalOperation: z.enum(['sum', 'average', 'latest']).optional().describe('Explicit map interval reducer; omission never implies sum.'),
    periodicity: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY']).optional().describe('Frequency for a map latest-period request when the source publishes multiple frequencies.'),
    aggregation: InsSeriesAggregationSchema.default('sum').describe('Retained for saved-document compatibility. No reducer may combine alternative native INS source identities; choose one complete source series.'),
    territoryCodes: z.array(z.string()).optional().describe('Optional INS territory codes filter (e.g., ["RO"], county codes at NUTS3).'),
    sirutaCodes: z.array(z.string()).optional().describe('Optional INS SIRUTA codes filter (typically LAU localities/UATs).'),
    unitCodes: z.array(z.string()).optional().describe('Optional INS unit code filter. Use when dataset has multiple units of measure and a specific unit is required.'),
    classificationSelections: z.record(z.string(), z.array(z.string())).optional().describe('Classification selections keyed by INS classification type code. Values are allowed classification value codes for each type. AND semantics across type keys, OR semantics inside each value array.'),
    hasValue: z.boolean().default(true).describe('Retained for saved-document compatibility. Native charts inspect all source cells, including nulls, before deriving values; missing coverage remains unavailable.'),
  }).passthrough();

  const CommitmentsSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('commitments-analytics').describe('Series type: "commitments-analytics" - commitments time-series fetched from the commitments analytics API. Uses a commitments filter and one selected commitments metric.'),
    metric: commitmentsMetricSchema.schema().default('CREDITE_ANGAJAMENT').describe('Commitments metric that defines which field is queried for this series.'),
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
  const CompaniesAnalyticsReleasePinSchema = z.object({
    id: z.string().regex(COMPANY_ANALYSIS_RELEASE_ID_RE).describe('The companies analytics release the series was built on (a positive integer as text). Every read names it; a release the API no longer serves is shown as unavailable, never replaced by another.'),
    policy: z.literal('pinned').describe('Release policy. "pinned": the series always reads this release, for reproducible charts.'),
  });

  const CompaniesAnalyticsSeriesConfigurationSchema = BaseSeriesConfigurationSchema.extend({
    type: z.literal('companies-analytics').describe('Series type: "companies-analytics" - annual company financial figures from the companies analytics API (companyAnalysisSeries): the sum of one reported metric over a company scope, one point per fiscal year, with explicit gaps and coverage. Annual only; nominal RON or reported average headcount; balances and headcounts are never added across years.'),
    unit: z.string().optional().default('').describe('Not used for display: the unit always comes from the API (nominal RON, or reported average headcount). A typed unit cannot relabel lei as another currency.'),
    metric: z.enum(COMPANY_ANALYSIS_METRICS).default('TURNOVER').describe('The company metric summed per fiscal year (TURNOVER, NET_RESULT, EMPLOYEES, ...).'),
    period: reportPeriodSchema.schema().optional().describe('Fiscal years drawn, as a YEAR period (interval or dates). Omitted: every year the release offers for the metric. Monthly or quarterly periods are refused: company statements are annual.'),
    scope: companyAnalysisScopeSchema.schema().default({}).describe('The company scope, in the API input shape without fiscalYear: OR within a field, AND across fields. Company keys describe the release snapshot and its pinned ONRC edition; filing, financial ranges and size bands act on the reference year. county, uat and observedStatus select consensus buckets: a value key, or a basis key such as "(multiple_values)" for the companies without a common value; includeUnknown selects every such company, never an absence. onrc selects by observation on ONE ONRC identifier (status, county, a broad caenCode, exact onrcCaen "rev2:6201"), with exclusions that keep only companies with complete evidence; an exact onrcCaen exclusion does not exist. CAEN filters follow the pinned release: v3 releases test qualified class observations only (four-digit original token, known revision, catalog label), so a short token, unknown revision or unlabeled key never matches and a short token or unlabeled key does not block an exclusion; v2 releases test every observation, unknown revision included. An unparsed or unknown-revision CAEN observation makes CAEN coverage partial, so a CAEN exclusion never keeps that company.'),
    referenceYear: z.number().int().optional().describe('The fiscal year the scope is asked in: its selected-year filters apply there, and the REFERENCE_YEAR cohort is selected there. Omitted: the release default year.'),
    cohortMode: z.enum(COMPANY_ANALYSIS_COHORT_MODES).optional().describe('REFERENCE_YEAR follows the companies selected in the reference year; EACH_YEAR re-applies the filters every year. Omitted: the API default.'),
    dimensionBasis: z.literal('release-snapshot').default('release-snapshot').describe('Company dimensions (geography, observed status, ANAF attributes) describe the release snapshot, not each fiscal year.'),
    release: CompaniesAnalyticsReleasePinSchema.optional().describe('The pinned release. Omitted only while a new series is being configured; the editor pins the active release.'),
  }).loose();

  const SeriesSchema = z.discriminatedUnion('type', [
    SeriesConfigurationSchema,
    SeriesGroupConfigurationSchema,
    CustomSeriesConfigurationSchema,
    CustomSeriesValueConfigurationSchema,
    StaticSeriesConfigurationSchema,
    InsSeriesConfigurationSchema,
    CommitmentsSeriesConfigurationSchema,
    CompaniesAnalyticsSeriesConfigurationSchema,
  ]);

  // ============================================================================
  // ANNOTATIONS SCHEMA
  // ============================================================================

  const AnnotationSchema = z.object({
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

  // ============================================================================
  // MAIN CHART SCHEMA
  // ============================================================================

  const ChartSchema = z.object({
    id: z.string().default(() => crypto.randomUUID()).describe('Unique identifier for this chart. Auto-generated UUID. Used for referencing, saving, sharing, and URL routing. Must be unique across all charts in the system. Format: UUID v4 (e.g., "chart-550e8400-e29b-41d4"). Immutable once created - changing the ID creates a new chart instead of updating existing one.'),
    title: z.string().default('').describe('Human-readable title for the chart. Displayed prominently at the top of the visualization. Should clearly describe what the chart shows. Examples: "Education Spending Trend (2020-2024)", "Cluj vs București Healthcare Comparison", "Budget Deficit Analysis". Keep concise but descriptive (under 100 characters). Supports internationalization. Required for meaningful charts.'),
    description: z.string().optional().describe('Optional detailed description explaining the chart\'s purpose, methodology, or key insights. Displayed below the title or in an info tooltip. Use for: data sources, calculation methods, important caveats, interpretation guidance. Example: "Compares per capita education spending using official budget execution data normalized by county population." Markdown supported for formatting. Can be lengthy - use for comprehensive context.'),

    // Global chart configuration
    config: ChartConfigSchema.describe('Global chart configuration controlling visualization appearance and behavior. Includes chart type (line/bar/pie/etc.), display options (legends, tooltips, labels), and user interactions. These settings apply to all series unless overridden at series level. See ChartConfigSchema for 11 configuration options. Critical for defining how data is visualized.'),

    // Series data
    series: z.array(SeriesSchema).default([]).describe('Array of data series to display on the chart. Each series represents a dataset (query results, calculations, or custom data). Can contain multiple series for comparisons. Series types: "line-items-aggregated-yearly" (execution analytics queries), "commitments-analytics" (commitments analytics queries), "aggregated-series-calculation" (computed from other series), "custom-series" (manual data), "custom-series-value" (constant lines), "static-series" (pre-defined datasets), "ins-series" (INS Tempo observations), "companies-analytics" (annual company financial figures). Order affects rendering and legend order. Minimum 1 series for meaningful charts, but can be empty during creation.'),

    // Annotations
    annotations: z.array(AnnotationSchema).default([]).describe('Array of annotations marking important events, insights, or context on the chart. Each annotation points to a specific location and displays explanatory text. Use to highlight: policy changes, significant events, anomalies, milestones. Examples: "COVID-19 Pandemic", "New Budget Law Enacted", "Election Year". Annotations are optional - charts can have zero annotations. Can be created manually or programmatically. Visibility controlled by chart config.showAnnotations and individual annotation.enabled flags.'),

    // Metadata
    createdAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp when this chart was first created. Auto-generated on creation. Used for tracking, sorting, and auditing. Format: "2025-10-25T10:00:00Z". Immutable after creation - never changes even when chart is updated. Useful for "newest charts" sorting and creation history.'),
    updatedAt: z.string().default(() => new Date().toISOString()).describe('ISO 8601 timestamp of the most recent modification to this chart. Auto-updated whenever any field changes (title, series, config, annotations, etc.). Format: "2025-10-25T10:00:00Z". Used for cache invalidation, "recently edited" sorting, and change tracking. Should be set to current time on every save operation.'),
  }).default(createDefaultChart).describe('Complete chart definition combining configuration, data series, and annotations. This is the root schema for the entire chart system. A chart consists of: (1) Metadata (id, title, description, timestamps), (2) Global config (chart type, display options), (3) Series array (data sources and calculations), (4) Annotations array (context and insights). Charts are self-contained and portable - can be saved, shared, embedded, or exported. Used throughout the application for budget data visualization and analysis.');

  return {
    ChartConfigSchema,
    SeriesConfigSchema,
    CommitmentsReportTypeEnum,
    CommitmentsExcludeSchema,
    CommitmentsFilterSchema,
    BaseSeriesConfigurationSchema,
    SeriesConfigurationSchema,
    SeriesGroupConfigurationSchema,
    CustomSeriesConfigurationSchema,
    CustomSeriesValueConfigurationSchema,
    StaticSeriesConfigurationSchema,
    InsSeriesAggregationSchema,
    InsSeriesConfigurationSchema,
    CommitmentsSeriesConfigurationSchema,
    CompaniesAnalyticsReleasePinSchema,
    CompaniesAnalyticsSeriesConfigurationSchema,
    SeriesSchema,
    AnnotationSchema,
    ChartSchema,
  };
}

let documentSchemas: ReturnType<typeof buildChartDocumentSchemas> | undefined;

export function getChartDocumentSchemas() {
  return documentSchemas ??= buildChartDocumentSchemas();
}

export const chartUrlStateSchema = lazySchema(() => z.object({
  chart: getChartDocumentSchemas().ChartSchema,
  view: z.enum(["overview", "config", "series-config", "annotation-config"]).default("overview"),
  seriesId: z.string().optional(),
  annotationId: z.string().optional(),
}));

export type ChartUrlState = LazyOutput<typeof chartUrlStateSchema>;
