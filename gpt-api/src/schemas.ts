import { z } from '@hono/zod-openapi'

// ── Shared ──

export const PageInfoSchema = z.object({
  totalCount: z.number().openapi({ description: 'Total number of matching records', example: 1250 }),
  hasNextPage: z.boolean().openapi({ description: 'Whether more records exist after the current page' }),
  hasPreviousPage: z.boolean().openapi({ description: 'Whether records exist before the current page' }),
}).openapi('PageInfo')

export const AxisSchema = z.object({
  name: z.string().openapi({ description: 'Axis label', example: 'Year' }),
  type: z.string().openapi({ description: 'Data type: "category", "value", or "time"', example: 'category' }),
  unit: z.string().nullable().optional().openapi({ description: 'Unit (e.g. "RON", "EUR", null)', example: 'RON' }),
}).openapi('Axis')

export const DataPointSchema = z.object({
  x: z.union([z.string(), z.number()]).openapi({ description: 'X-axis value (year or category)', example: 2024 }),
  y: z.union([z.number(), z.null()]).openapi({ description: 'Y-axis value in RON (or null)', example: 1500000.50 }),
}).openapi('DataPoint')

export const GrowthDataPointSchema = z.object({
  x: z.union([z.string(), z.number()]).openapi({ description: 'X-axis value' }),
  y: z.union([z.number(), z.null()]).openapi({ description: 'Y-axis value' }),
  growth_percent: z.number().nullable().optional().openapi({ description: 'Growth percentage from previous period' }),
}).openapi('GrowthDataPoint')

export const AnalyticsSeriesSchema = z.object({
  seriesId: z.string().openapi({ description: 'Series identifier', example: 'income-trend' }),
  xAxis: AxisSchema,
  yAxis: AxisSchema,
  data: z.array(DataPointSchema),
}).openapi('AnalyticsSeries')

export const GrowthAnalyticsSeriesSchema = z.object({
  seriesId: z.string().openapi({ description: 'Series identifier' }),
  metric: z.string().optional().openapi({ description: 'Metric name' }),
  xAxis: AxisSchema,
  yAxis: AxisSchema,
  data: z.array(GrowthDataPointSchema),
}).openapi('GrowthAnalyticsSeries')

export const EntityRefSchema = z.object({
  cui: z.string().openapi({ description: 'CUI of the related entity', example: '4288110' }),
  name: z.string().openapi({ description: 'Name of the related entity', example: 'JUDETUL CLUJ' }),
}).openapi('EntityRef')

// ── Include sections enum ──

export const INCLUDE_SECTIONS = [
  'details',
  'financials',
  'trends',
  'line_items',
  'reports',
  'relationships',
  'commitments_summary',
  'commitments_aggregated',
  'commitments_analytics',
  'commitment_vs_execution',
  'execution_analytics',
  'ins_observations',
  'funding_sources',
] as const

export type IncludeSection = typeof INCLUDE_SECTIONS[number]

export const DEFAULT_INCLUDES: IncludeSection[] = [
  'details',
  'financials',
  'trends',
  'line_items',
  'reports',
  'relationships',
  'commitments_summary',
  'commitments_aggregated',
  'commitments_analytics',
  'commitment_vs_execution',
  'execution_analytics',
  'funding_sources',
]

// ── Search ──

const UATSearchSchema = z.object({
  name: z.string().nullable().optional().openapi({ description: 'UAT name', example: 'MUNICIPIUL CLUJ-NAPOCA' }),
  county_code: z.string().nullable().optional().openapi({ description: 'Two-letter county code', example: 'CJ' }),
  county_name: z.string().nullable().optional().openapi({ description: 'County name', example: 'CLUJ' }),
  siruta_code: z.number().nullable().optional().openapi({ description: 'SIRUTA code', example: 54975 }),
  population: z.number().nullable().optional().openapi({ description: 'Population', example: 286598 }),
}).openapi('UATSearch')

export const SearchResultSchema = z.object({
  cui: z.string().openapi({ description: 'CUI — unique fiscal identifier. Use this to call GET /entities/{cui}.', example: '4288306' }),
  name: z.string().openapi({ description: 'Official entity name', example: 'UNIVERSITATEA TEHNICA DIN CLUJ-NAPOCA' }),
  entity_type: z.string().nullable().optional().openapi({ description: 'Entity type: admin_county_council, admin_city_hall, admin_town_hall, admin_commune_hall, edu_university, edu_school, health_hospital, justice_court, ministry, agency, authority, other.' }),
  is_uat: z.boolean().nullable().optional().openapi({ description: 'Whether this is a UAT (municipality/city/commune)' }),
  address: z.string().nullable().optional().openapi({ description: 'Official address' }),
  uat: UATSearchSchema.nullable().optional().openapi({ description: 'Geographic/administrative UAT data' }),
}).openapi('SearchResult')

export const SearchResponseSchema = z.object({
  nodes: z.array(SearchResultSchema),
  pageInfo: PageInfoSchema,
}).openapi('SearchResponse')

// ── Entity UAT (full) ──

const UATFullSchema = z.object({
  name: z.string().nullable().optional(),
  county_code: z.string().nullable().optional(),
  county_name: z.string().nullable().optional(),
  siruta_code: z.number().nullable().optional(),
  population: z.number().nullable().optional(),
  county_entity: EntityRefSchema.nullable().optional(),
}).openapi('UATFull')

// ── Execution Line Item ──

export const ExecutionLineItemSchema = z.object({
  line_item_id: z.string(),
  account_category: z.string().openapi({ description: '"ch" = expenses, "vn" = income' }),
  funding_source_id: z.number().nullable().optional(),
  expense_type: z.string().nullable().optional().openapi({ description: '"dezvoltare" (capital) or "functionare" (operational)' }),
  anomaly: z.string().nullable().optional().openapi({ description: 'Anomaly flag: "YTD_ANOMALY" or "MISSING_LINE_ITEM"' }),
  functionalClassification: z.object({
    functional_name: z.string(),
    functional_code: z.string(),
  }).nullable().optional(),
  economicClassification: z.object({
    economic_name: z.string(),
    economic_code: z.string(),
  }).nullable().optional(),
  ytd_amount: z.number().openapi({ description: 'Year-to-date amount in RON' }),
  quarterly_amount: z.number().openapi({ description: 'Quarterly amount in RON' }),
  monthly_amount: z.number().openapi({ description: 'Monthly amount in RON' }),
}).openapi('ExecutionLineItem')

// ── Standalone Execution Line Item (data discovery) ──

export const StandaloneExecutionLineItemSchema = z.object({
  line_item_id: z.string(),
  report_id: z.string().nullable().optional(),
  functional_code: z.string().nullable().optional(),
  economic_code: z.string().nullable().optional(),
  amount: z.number(),
  year: z.number().nullable().optional(),
  account_category: z.string().nullable().optional(),
  entity: EntityRefSchema.nullable().optional(),
  functionalClassification: z.object({ functional_name: z.string() }).nullable().optional(),
  economicClassification: z.object({ economic_name: z.string() }).nullable().optional(),
}).openapi('StandaloneExecutionLineItem')

// ── Report ──

export const ReportSchema = z.object({
  report_id: z.string(),
  reporting_year: z.number(),
  report_type: z.string(),
  report_date: z.string(),
  download_links: z.array(z.string()),
  main_creditor: EntityRefSchema,
  budgetSector: z.object({
    sector_id: z.string(),
    sector_description: z.string(),
  }),
}).openapi('Report')

// ── Funding Source ──

export const FundingSourceSchema = z.object({
  source_id: z.string(),
  source_description: z.string(),
}).openapi('FundingSource')

// ── Commitments Summary ──

export const CommitmentsSummarySchema = z.object({
  __typename: z.string().optional(),
  year: z.number(),
  quarter: z.number().nullable().optional(),
  month: z.number().nullable().optional(),
  entity_cui: z.string().nullable().optional(),
  entity_name: z.string().nullable().optional(),
  report_type: z.string().nullable().optional(),
  credite_angajament: z.number().nullable().optional().openapi({ description: 'Commitment credits (total commitments made YTD)' }),
  limita_credit_angajament: z.number().nullable().optional().openapi({ description: 'Commitment credit limit' }),
  credite_bugetare: z.number().nullable().optional().openapi({ description: 'Budget credits (total budget allocation)' }),
  credite_angajament_initiale: z.number().nullable().optional(),
  credite_bugetare_initiale: z.number().nullable().optional(),
  credite_angajament_definitive: z.number().nullable().optional().openapi({ description: 'Definitive commitment credits after amendments' }),
  credite_bugetare_definitive: z.number().nullable().optional().openapi({ description: 'Definitive budget credits after amendments' }),
  credite_angajament_disponibile: z.number().nullable().optional(),
  credite_bugetare_disponibile: z.number().nullable().optional(),
  receptii_totale: z.number().nullable().optional().openapi({ description: 'Total receptions (goods/services received)' }),
  plati_trezor: z.number().nullable().optional().openapi({ description: 'Treasury payments' }),
  plati_non_trezor: z.number().nullable().optional().openapi({ description: 'Non-treasury payments' }),
  receptii_neplatite: z.number().nullable().optional().openapi({ description: 'Unpaid receptions (arrears)' }),
  receptii_neplatite_change: z.number().nullable().optional(),
  total_plati: z.number().nullable().optional().openapi({ description: 'Total payments' }),
  execution_rate: z.number().nullable().optional().openapi({ description: 'Budget execution rate (0-1)', example: 0.85 }),
  commitment_rate: z.number().nullable().optional().openapi({ description: 'Commitment rate (0-1)', example: 0.92 }),
}).openapi('CommitmentsSummary')

// ── Commitments Line Item ──

export const CommitmentsLineItemSchema = z.object({
  id: z.string(),
  year: z.number(),
  month: z.number().nullable().optional(),
  report_type: z.string().nullable().optional(),
  entity_cui: z.string().nullable().optional(),
  entity_name: z.string().nullable().optional(),
  budget_sector_id: z.string().nullable().optional(),
  budget_sector_name: z.string().nullable().optional(),
  funding_source_id: z.string().nullable().optional(),
  funding_source_name: z.string().nullable().optional(),
  functional_code: z.string().nullable().optional(),
  functional_name: z.string().nullable().optional(),
  economic_code: z.string().nullable().optional(),
  economic_name: z.string().nullable().optional(),
  credite_angajament: z.number().nullable().optional(),
  limita_credit_angajament: z.number().nullable().optional(),
  credite_bugetare: z.number().nullable().optional(),
  credite_angajament_initiale: z.number().nullable().optional(),
  credite_bugetare_initiale: z.number().nullable().optional(),
  credite_angajament_definitive: z.number().nullable().optional(),
  credite_bugetare_definitive: z.number().nullable().optional(),
  credite_angajament_disponibile: z.number().nullable().optional(),
  credite_bugetare_disponibile: z.number().nullable().optional(),
  receptii_totale: z.number().nullable().optional(),
  plati_trezor: z.number().nullable().optional(),
  plati_non_trezor: z.number().nullable().optional(),
  receptii_neplatite: z.number().nullable().optional(),
  monthly_plati_trezor: z.number().nullable().optional(),
  monthly_plati_non_trezor: z.number().nullable().optional(),
  monthly_receptii_totale: z.number().nullable().optional(),
  monthly_receptii_neplatite_change: z.number().nullable().optional(),
  monthly_credite_angajament: z.number().nullable().optional(),
  is_quarterly: z.boolean().nullable().optional(),
  quarter: z.number().nullable().optional(),
  is_yearly: z.boolean().nullable().optional(),
  anomaly: z.string().nullable().optional(),
}).openapi('CommitmentsLineItem')

// ── Commitments Aggregated ──

export const CommitmentsAggregatedItemSchema = z.object({
  functional_code: z.string().nullable().optional(),
  functional_name: z.string().nullable().optional(),
  economic_code: z.string().nullable().optional(),
  economic_name: z.string().nullable().optional(),
  amount: z.number(),
  count: z.number(),
}).openapi('CommitmentsAggregatedItem')

// ── Commitment vs Execution ──

export const CommitmentVsExecutionSchema = z.object({
  frequency: z.string(),
  data: z.array(z.object({
    period: z.string(),
    commitment_value: z.number().nullable().optional(),
    execution_value: z.number().nullable().optional(),
    difference: z.number().nullable().optional(),
    difference_percent: z.number().nullable().optional(),
    commitment_growth_percent: z.number().nullable().optional(),
    execution_growth_percent: z.number().nullable().optional(),
    difference_growth_percent: z.number().nullable().optional(),
  })),
  total_commitment: z.number().nullable().optional(),
  total_execution: z.number().nullable().optional(),
  total_difference: z.number().nullable().optional(),
  overall_difference_percent: z.number().nullable().optional(),
  matched_count: z.number().nullable().optional(),
  unmatched_commitment_count: z.number().nullable().optional(),
  unmatched_execution_count: z.number().nullable().optional(),
}).openapi('CommitmentVsExecution')

// ── Heatmap UAT ──

export const HeatmapUATSchema = z.object({
  uat_id: z.string().nullable().optional(),
  uat_name: z.string().nullable().optional(),
  uat_code: z.string().nullable().optional(),
  siruta_code: z.number().nullable().optional(),
  county_code: z.string().nullable().optional(),
  county_name: z.string().nullable().optional(),
  population: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  per_capita_amount: z.number().nullable().optional(),
}).openapi('HeatmapUAT')

// ── Heatmap County ──

export const HeatmapCountySchema = z.object({
  county_code: z.string().nullable().optional(),
  county_name: z.string().nullable().optional(),
  county_population: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  per_capita_amount: z.number().nullable().optional(),
  county_entity: EntityRefSchema.nullable().optional(),
}).openapi('HeatmapCounty')

// ── Entity Analytics (rankings) ──

export const EntityAnalyticsItemSchema = z.object({
  entity_cui: z.string(),
  entity_name: z.string(),
  entity_type: z.string().nullable().optional(),
  uat_id: z.string().nullable().optional(),
  county_code: z.string().nullable().optional(),
  county_name: z.string().nullable().optional(),
  population: z.number().nullable().optional(),
  amount: z.number().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  per_capita_amount: z.number().nullable().optional(),
}).openapi('EntityAnalyticsItem')

// ── Aggregated Line Item ──

export const AggregatedLineItemSchema = z.object({
  functional_code: z.string().nullable().optional(),
  functional_name: z.string().nullable().optional(),
  economic_code: z.string().nullable().optional(),
  economic_name: z.string().nullable().optional(),
  amount: z.number(),
  count: z.number(),
}).openapi('AggregatedLineItem')

// ── Classification ──

export const ClassificationSchema = z.object({
  code: z.string(),
  name: z.string(),
}).openapi('Classification')

// ── INS Observation ──

export const InsObservationSchema = z.object({
  dataset_code: z.string(),
  value: z.number().nullable().optional(),
  value_status: z.string().nullable().optional(),
  time_period: z.object({
    iso_period: z.string().nullable().optional(),
    year: z.number().nullable().optional(),
    quarter: z.number().nullable().optional(),
    month: z.number().nullable().optional(),
    periodicity: z.string().nullable().optional(),
  }).nullable().optional(),
  territory: z.object({
    code: z.string().nullable().optional(),
    siruta_code: z.number().nullable().optional(),
    level: z.string().nullable().optional(),
    name_ro: z.string().nullable().optional(),
  }).nullable().optional(),
  unit: z.object({
    code: z.string().nullable().optional(),
    symbol: z.string().nullable().optional(),
    name_ro: z.string().nullable().optional(),
  }).nullable().optional(),
  classifications: z.array(z.object({
    id: z.number().nullable().optional(),
    type_code: z.string().nullable().optional(),
    type_name_ro: z.string().nullable().optional(),
    type_name_en: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    name_ro: z.string().nullable().optional(),
    name_en: z.string().nullable().optional(),
    sort_order: z.number().nullable().optional(),
  })).nullable().optional(),
}).openapi('InsObservation')

// ── INS Context ──

export const InsContextSchema = z.object({
  id: z.string(),
  code: z.string(),
  name_ro: z.string(),
  name_en: z.string().nullable().optional(),
  name_ro_markdown: z.string().nullable().optional(),
  name_en_markdown: z.string().nullable().optional(),
  level: z.number(),
  parent_id: z.number().nullable().optional(),
  parent_code: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  matrix_count: z.number().nullable().optional(),
}).openapi('InsContext')

// ── INS Dataset ──

export const InsDatasetSchema = z.object({
  id: z.string(),
  code: z.string(),
  name_ro: z.string(),
  name_en: z.string().nullable().optional(),
  definition_ro: z.string().nullable().optional(),
  definition_en: z.string().nullable().optional(),
  periodicity: z.any().nullable().optional(),
  year_range: z.array(z.number()).nullable().optional(),
  dimension_count: z.number().nullable().optional(),
  has_uat_data: z.boolean().nullable().optional(),
  has_county_data: z.boolean().nullable().optional(),
  has_siruta: z.boolean().nullable().optional(),
  sync_status: z.string().nullable().optional(),
  last_sync_at: z.string().nullable().optional(),
  context_code: z.string().nullable().optional(),
  context_name_ro: z.string().nullable().optional(),
  context_name_en: z.string().nullable().optional(),
  context_path: z.string().nullable().optional(),
  metadata: z.any().nullable().optional(),
}).openapi('InsDataset')

// ── INS Dataset Details (with dimensions) ──

export const InsDatasetDimensionSchema = z.object({
  index: z.number(),
  type: z.string(),
  label_ro: z.string(),
  label_en: z.string().nullable().optional(),
  is_hierarchical: z.boolean().nullable().optional(),
  option_count: z.number().nullable().optional(),
  classification_type: z.object({
    code: z.string(),
    name_ro: z.string(),
    name_en: z.string().nullable().optional(),
    is_hierarchical: z.boolean().nullable().optional(),
  }).nullable().optional(),
}).openapi('InsDatasetDimension')

export const InsDatasetDetailsSchema = InsDatasetSchema.extend({
  dimensions: z.array(InsDatasetDimensionSchema).nullable().optional(),
}).openapi('InsDatasetDetails')

// ── INS Dimension Value ──

export const InsDimensionValueSchema = z.object({
  nom_item_id: z.number().nullable().optional(),
  dimension_type: z.string().nullable().optional(),
  label_ro: z.string().nullable().optional(),
  label_en: z.string().nullable().optional(),
  parent_nom_item_id: z.number().nullable().optional(),
  offset_order: z.number().nullable().optional(),
  territory: z.object({
    code: z.string().nullable().optional(),
    siruta_code: z.string().nullable().optional(),
    level: z.string().nullable().optional(),
    name_ro: z.string().nullable().optional(),
  }).nullable().optional(),
  time_period: z.object({
    iso_period: z.string().nullable().optional(),
    year: z.number().nullable().optional(),
    quarter: z.number().nullable().optional(),
    month: z.number().nullable().optional(),
    periodicity: z.string().nullable().optional(),
  }).nullable().optional(),
  classification_value: z.object({
    type_code: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    name_ro: z.string().nullable().optional(),
  }).nullable().optional(),
  unit: z.object({
    code: z.string().nullable().optional(),
    symbol: z.string().nullable().optional(),
    name_ro: z.string().nullable().optional(),
  }).nullable().optional(),
}).openapi('InsDimensionValue')

// ── INS Latest Dataset Value ──

export const InsLatestDatasetValueSchema = z.object({
  latestPeriod: z.string().nullable().optional(),
  matchStrategy: z.string().nullable().optional(),
  hasData: z.boolean().nullable().optional(),
  dataset: InsDatasetSchema.nullable().optional(),
  observation: InsObservationSchema.nullable().optional(),
}).openapi('InsLatestDatasetValue')

// ── Full Entity Data Response ──

export const EntityDataResponseSchema = z.object({
  // Basic identification (always present)
  cui: z.string().openapi({ description: 'CUI — unique fiscal identifier', example: '4288306' }),
  name: z.string().openapi({ description: 'Official entity name' }),
  address: z.string().nullable().optional(),
  entity_type: z.string().nullable().optional(),
  is_uat: z.boolean().nullable().optional(),
  default_report_type: z.string().nullable().optional(),
  uat: UATFullSchema.nullable().optional(),

  // Relationships (include=relationships)
  parents: z.array(EntityRefSchema).nullable().optional().openapi({ description: 'Parent entities (ordonatori superiori)' }),
  children: z.array(EntityRefSchema).nullable().optional().openapi({ description: 'Child entities (subordinate units)' }),

  // Financial summary (include=financials)
  financials: z.object({
    total_income: z.number().nullable().optional().openapi({ description: 'Total income for period in RON' }),
    total_expenses: z.number().nullable().optional().openapi({ description: 'Total expenses for period in RON' }),
    budget_balance: z.number().nullable().optional().openapi({ description: 'Budget balance (income - expenses)' }),
    period: z.object({
      type: z.string(),
      year: z.string(),
    }),
    normalization: z.string(),
    currency: z.string(),
  }).nullable().optional(),

  // Historical trends (include=trends)
  trends: z.object({
    income: AnalyticsSeriesSchema.nullable().optional(),
    expenses: AnalyticsSeriesSchema.nullable().optional(),
    balance: AnalyticsSeriesSchema.nullable().optional(),
  }).nullable().optional(),

  // Execution line items (include=line_items)
  line_items: z.object({
    expenses: z.array(ExecutionLineItemSchema),
    income: z.array(ExecutionLineItemSchema),
  }).nullable().optional(),

  // Reports (include=reports)
  reports: z.object({
    nodes: z.array(ReportSchema),
    pageInfo: PageInfoSchema,
  }).nullable().optional(),

  // Funding sources (include=funding_sources)
  funding_sources: z.array(FundingSourceSchema).nullable().optional(),

  // Commitments summary (include=commitments_summary)
  commitments_summary: z.object({
    nodes: z.array(CommitmentsSummarySchema),
    pageInfo: PageInfoSchema,
  }).nullable().optional(),

  // Commitments aggregated (include=commitments_aggregated)
  commitments_aggregated: z.record(z.string(), z.object({
    nodes: z.array(CommitmentsAggregatedItemSchema),
    pageInfo: PageInfoSchema,
  })).nullable().optional().openapi({ description: 'Commitments aggregated by metric. Keys: CREDITE_BUGETARE_DEFINITIVE, CREDITE_ANGAJAMENT, PLATI_TREZOR' }),

  // Commitments analytics (include=commitments_analytics)
  commitments_analytics: z.array(GrowthAnalyticsSeriesSchema).nullable().optional(),

  // Commitment vs execution (include=commitment_vs_execution)
  commitment_vs_execution: CommitmentVsExecutionSchema.nullable().optional(),

  // Execution analytics (include=execution_analytics)
  execution_analytics: z.array(AnalyticsSeriesSchema).nullable().optional(),

  // INS observations (include=ins_observations)
  ins_observations: z.record(z.string(), z.object({
    nodes: z.array(InsObservationSchema),
    pageInfo: PageInfoSchema,
  })).nullable().optional().openapi({ description: 'INS observations keyed by dataset code' }),

  // Request errors (if any section failed)
  _errors: z.array(z.object({
    section: z.string().openapi({ description: 'Which data section failed' }),
    error: z.string().openapi({ description: 'Error message' }),
  })).optional().openapi({ description: 'Errors from failed data section fetches. Sections that failed will be null.' }),
}).openapi('EntityDataResponse')

export type EntityDataResponse = z.infer<typeof EntityDataResponseSchema>

// ── Heatmap Response (standalone endpoint) ──

export const HeatmapResponseSchema = z.object({
  data: z.array(HeatmapUATSchema),
}).openapi('HeatmapResponse')

// ── Heatmap County Response ──

export const HeatmapCountyResponseSchema = z.object({
  data: z.array(HeatmapCountySchema),
}).openapi('HeatmapCountyResponse')

// ── Rankings Response ──

export const RankingsResponseSchema = z.object({
  nodes: z.array(EntityAnalyticsItemSchema),
  pageInfo: PageInfoSchema,
}).openapi('RankingsResponse')

// ── Aggregated Line Items Response ──

export const AggregatedLineItemsResponseSchema = z.object({
  nodes: z.array(AggregatedLineItemSchema),
  pageInfo: PageInfoSchema,
}).openapi('AggregatedLineItemsResponse')

// ── Line Items Response ──

export const LineItemsResponseSchema = z.object({
  nodes: z.array(StandaloneExecutionLineItemSchema),
  pageInfo: PageInfoSchema,
}).openapi('LineItemsResponse')

// ── Commitments Line Items Response ──

export const CommitmentsLineItemsResponseSchema = z.object({
  nodes: z.array(CommitmentsLineItemSchema),
  pageInfo: PageInfoSchema,
}).openapi('CommitmentsLineItemsResponse')

// ── Classifications Response ──

export const ClassificationsResponseSchema = z.object({
  functional: z.array(ClassificationSchema).optional(),
  economic: z.array(ClassificationSchema).optional(),
  budget_sectors: z.array(FundingSourceSchema).optional(),
  funding_sources: z.array(FundingSourceSchema).optional(),
}).openapi('ClassificationsResponse')

// ── INS Contexts Response ──

export const InsContextsResponseSchema = z.object({
  nodes: z.array(InsContextSchema),
  pageInfo: PageInfoSchema,
}).openapi('InsContextsResponse')

// ── INS Datasets Response ──

export const InsDatasetsResponseSchema = z.object({
  nodes: z.array(InsDatasetSchema),
  pageInfo: PageInfoSchema,
}).openapi('InsDatasetsResponse')

// ── INS Observations Response ──

export const InsObservationsResponseSchema = z.object({
  nodes: z.array(InsObservationSchema),
  pageInfo: PageInfoSchema,
}).openapi('InsObservationsResponse')

// ── INS Dimension Values Response ──

export const InsDimensionValuesResponseSchema = z.object({
  nodes: z.array(InsDimensionValueSchema),
  pageInfo: PageInfoSchema,
}).openapi('InsDimensionValuesResponse')
