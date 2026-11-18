import { z } from 'zod';
import * as filters from './analytics-filter-search';
import { getChartDocumentSchemas } from './chart-search';

export {
  defaultYearRange,
  DEFAULT_SELECTED_YEAR,
  defaultExecutionPeriodStartYear,
  defaultCommitmentsPeriodStartYear,
  createDefaultExecutionYearReportPeriod,
  createDefaultCommitmentsYearReportPeriod,
} from './chart-defaults';
export type { Calculation, Operand, Operation } from './chart-search';

/** The earliest fiscal year the companies analytics releases hold (MFP statements from 2008): a saved chart's range may start there. */
export const COMPANIES_ANALYTICS_FIRST_YEAR = 2008;

export const ReportTypeEnum = filters.reportTypeSchema.schema();
export const CommitmentsMetricEnum = filters.commitmentsMetricSchema.schema();
export const Normalization = filters.normalizationSchema.schema();
export const Currency = filters.currencySchema.schema();
export const ReportPeriodTypeZ = filters.reportPeriodTypeSchema.schema();
export const ReportPeriodInputZ = filters.reportPeriodSchema.schema();
export const AnalyticsFilterSchema = filters.analyticsFilterSchema.schema();

export const {
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
} = getChartDocumentSchemas();

export type ChartConfig = z.infer<typeof ChartConfigSchema>;
export type SeriesConfig = z.infer<typeof SeriesConfigSchema>;
export type ReportType = z.infer<typeof ReportTypeEnum>;
export type CommitmentsReportType = z.infer<typeof CommitmentsReportTypeEnum>;
export type CommitmentsMetric = z.infer<typeof CommitmentsMetricEnum>;
export type Normalization = z.infer<typeof Normalization>;
export type Currency = z.infer<typeof Currency>;
export type ReportPeriodTypeZ = z.infer<typeof ReportPeriodTypeZ>;
export type ReportPeriodInputZ = z.infer<typeof ReportPeriodInputZ>;
export type AnalyticsFilterType = z.infer<typeof AnalyticsFilterSchema>;
export type CommitmentsExcludeType = z.infer<typeof CommitmentsExcludeSchema>;
export type CommitmentsFilterType = z.infer<typeof CommitmentsFilterSchema>;
export type InsSeriesAggregation = z.infer<typeof InsSeriesAggregationSchema>;
export type SeriesConfiguration = z.infer<typeof SeriesConfigurationSchema>;
export type SeriesGroupConfiguration = z.infer<typeof SeriesGroupConfigurationSchema>;
export type StaticSeriesConfiguration = z.infer<typeof StaticSeriesConfigurationSchema>;
export type InsSeriesConfiguration = z.infer<typeof InsSeriesConfigurationSchema>;
export type CommitmentsSeriesConfiguration = z.infer<typeof CommitmentsSeriesConfigurationSchema>;
export type CompaniesAnalyticsSeriesConfiguration = z.infer<typeof CompaniesAnalyticsSeriesConfigurationSchema>;
export type Series = z.infer<typeof SeriesSchema>;
export type TAnnotation = z.infer<typeof AnnotationSchema>;
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
  missingPeriods: z.array(z.string()).nullish().describe("Native reference coverage gaps; values for these periods are unavailable."),
  pointDetails: z.record(z.string(), z.object({
    exact: z.string().describe('The exact decimal value as the source sent it; y is only its plotting coordinate.'),
    note: z.string().optional().describe('Coverage of the point in words (who reported it).'),
  })).optional().describe('Per x label: the exact value and coverage of a point, for tooltips and export. Set by sources that serve exact decimals (companies analytics).'),
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
