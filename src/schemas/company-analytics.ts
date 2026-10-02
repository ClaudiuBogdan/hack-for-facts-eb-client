import { z } from 'zod'

/**
 * Companies analytics — the API's vocabulary and answers, as the client reads
 * them (server `src/modules/companies/core/analytics-types.ts` and
 * `shell/graphql/analytics-typedefs.ts`, schema `companies-analytics-ch-v1`).
 *
 * Every count, sum and mean stays the API's decimal string: nothing here
 * turns money or a count into a number. An empty contributor set is a null
 * sum, never 0; an explicit zero stays "0.00". Shared by the analysis page
 * (`/companies/analytics`) and the chart builder's `companies-analytics`
 * series, which persists a scope in this shape.
 */

export const COMPANY_ANALYSIS_SCHEMA_VERSION = 'companies-analytics-ch-v1'

export const COMPANY_ANALYSIS_METRICS = [
  'TURNOVER',
  'NET_PROFIT',
  'NET_LOSS',
  'EMPLOYEES',
  'TOTAL_REVENUE',
  'TOTAL_EXPENSES',
  'GROSS_PROFIT',
  'GROSS_LOSS',
  'RECEIVABLES',
  'CURRENT_ASSETS',
  'FIXED_ASSETS',
  'CASH_AND_BANK',
  'PREPAID_EXPENSES',
  'DEFERRED_INCOME',
  'SUBSCRIBED_CAPITAL',
  'INVENTORIES',
  'DEBTS',
  'PROVISIONS',
  'TOTAL_EQUITY',
  'PATRIMONY_REGIE',
  'NET_RESULT',
] as const
export const CompanyAnalysisMetricZ = z.enum(COMPANY_ANALYSIS_METRICS)
export type CompanyAnalysisMetric = z.infer<typeof CompanyAnalysisMetricZ>

export const CompanyAnalysisUnitZ = z.enum(['RON', 'HEADCOUNT'])
export type CompanyAnalysisUnit = z.infer<typeof CompanyAnalysisUnitZ>

/** FLOW over the fiscal year; STOCK at the statement date; HEADCOUNT an average. STOCK and HEADCOUNT never add across years. */
export const CompanyAnalysisMetricKindZ = z.enum(['FLOW', 'STOCK', 'HEADCOUNT'])
export type CompanyAnalysisMetricKind = z.infer<typeof CompanyAnalysisMetricKindZ>

const FLOW_METRICS: ReadonlySet<CompanyAnalysisMetric> = new Set(['TURNOVER', 'NET_PROFIT', 'NET_LOSS', 'TOTAL_REVENUE', 'TOTAL_EXPENSES', 'GROSS_PROFIT', 'GROSS_LOSS', 'NET_RESULT'])

/** The API's own unit and kind of a metric (`metricUnit` / `metricKind` on the server). */
export function companyMetricUnit(metric: CompanyAnalysisMetric): CompanyAnalysisUnit {
  return metric === 'EMPLOYEES' ? 'HEADCOUNT' : 'RON'
}

export function companyMetricKind(metric: CompanyAnalysisMetric): CompanyAnalysisMetricKind {
  if (metric === 'EMPLOYEES') return 'HEADCOUNT'
  return FLOW_METRICS.has(metric) ? 'FLOW' : 'STOCK'
}

export const COMPANY_ANALYSIS_STATUSES = ['REPORTED', 'MISSING', 'NOT_ADMITTED', 'HELD_PROFILE', 'HELD_OBSERVATION', 'HELD_QUALITY', 'HELD_COMPONENT'] as const
export const CompanyAnalysisStatusZ = z.enum(COMPANY_ANALYSIS_STATUSES)
export type CompanyAnalysisStatus = z.infer<typeof CompanyAnalysisStatusZ>

export const COMPANY_ANALYSIS_SIZE_BANDS = ['UNAVAILABLE', 'NEGATIVE', 'ZERO', 'FROM_1_TO_9', 'FROM_10_TO_49', 'FROM_50_TO_249', 'FROM_250'] as const
export const CompanyAnalysisSizeBandZ = z.enum(COMPANY_ANALYSIS_SIZE_BANDS)
export type CompanyAnalysisSizeBand = z.infer<typeof CompanyAnalysisSizeBandZ>

export const COMPANY_ANALYSIS_CAEN_BASES = ['REVISION_KNOWN', 'REVISION_UNKNOWN', 'MISSING'] as const
export const CompanyAnalysisCaenBasisZ = z.enum(COMPANY_ANALYSIS_CAEN_BASES)
export type CompanyAnalysisCaenBasis = z.infer<typeof CompanyAnalysisCaenBasisZ>

/** An ANAF observation; UNKNOWN is a missing observation, never NO. */
export const COMPANY_ANALYSIS_FLAG_VALUES = ['YES', 'NO', 'UNKNOWN'] as const
export const CompanyAnalysisFlagValueZ = z.enum(COMPANY_ANALYSIS_FLAG_VALUES)
export type CompanyAnalysisFlagValue = z.infer<typeof CompanyAnalysisFlagValueZ>

export const CompanyAnalysisFilingZ = z.enum(['FILED', 'NOT_FILED'])
export type CompanyAnalysisFiling = z.infer<typeof CompanyAnalysisFilingZ>

export const COMPANY_ANALYSIS_DIMENSIONS = ['COUNTY', 'UAT', 'MAIN_CAEN', 'LEGAL_FORM', 'OBSERVED_STATUS', 'VAT_PAYER', 'FISCALLY_INACTIVE', 'EMPLOYEE_SIZE'] as const
export const CompanyAnalysisDimensionZ = z.enum(COMPANY_ANALYSIS_DIMENSIONS)
export type CompanyAnalysisDimension = z.infer<typeof CompanyAnalysisDimensionZ>

export const COMPANY_ANALYSIS_RANKINGS = ['METRIC_SUM', 'COMPANIES', 'FILERS', 'CONTRIBUTORS'] as const
export const CompanyAnalysisRankByZ = z.enum(COMPANY_ANALYSIS_RANKINGS)
export type CompanyAnalysisRankBy = z.infer<typeof CompanyAnalysisRankByZ>

/** EACH_YEAR re-applies the selected-year filters to every year; REFERENCE_YEAR follows the cohort selected in the scope's fiscal year. */
export const COMPANY_ANALYSIS_COHORT_MODES = ['REFERENCE_YEAR', 'EACH_YEAR'] as const
export const CompanyAnalysisCohortModeZ = z.enum(COMPANY_ANALYSIS_COHORT_MODES)
export type CompanyAnalysisCohortMode = z.infer<typeof CompanyAnalysisCohortModeZ>

export const CompanyAnalysisRecordSortZ = z.enum(['METRIC', 'CUI'])
export type CompanyAnalysisRecordSort = z.infer<typeof CompanyAnalysisRecordSortZ>

export const CompanyAnalysisDirectionZ = z.enum(['DESC', 'ASC'])
export type CompanyAnalysisDirection = z.infer<typeof CompanyAnalysisDirectionZ>

export const CompanyAnalysisGapReasonZ = z.enum(['NO_STATEMENTS', 'NOT_ADMITTED', 'NO_REPORTED_VALUES'])
export type CompanyAnalysisGapReason = z.infer<typeof CompanyAnalysisGapReasonZ>

/** A release id: a positive integer as text (the API's `BigInt`, which it only accepts as a string). */
export const COMPANY_ANALYSIS_RELEASE_ID_RE = /^[1-9]\d{0,15}$/u

// ─────────────────────────────────────────────────────────────── scope ──

const keyFilterZ = z.object({
  in: z.array(z.string()).optional(),
  includeUnknown: z.boolean().optional(),
})
export type CompanyAnalysisKeyFilterInput = z.infer<typeof keyFilterZ>

export const CompanyAnalysisRangeZ = z.object({
  metric: CompanyAnalysisMetricZ,
  /** Inclusive bounds: decimal strings (lei, at most two decimals) or integer strings (employees). */
  min: z.string().optional(),
  max: z.string().optional(),
})
export type CompanyAnalysisRangeInput = z.infer<typeof CompanyAnalysisRangeZ>

/**
 * The question, in the API's input shape (`CompanyAnalysisScopeInput`): OR
 * within a field, AND across fields. Company keys (where, what, fiscal flags)
 * describe the release snapshot; filing, ranges and size bands act on the
 * fiscal year's statement. Without `fiscalYear` (as a chart persists it,
 * beside its reference year).
 */
export const CompanyAnalysisScopeZ = z.object({
  cuis: z.array(z.string()).optional(),
  county: keyFilterZ.optional(),
  uat: keyFilterZ.optional(),
  legalForms: z.array(z.string()).optional(),
  observedStatus: keyFilterZ.optional(),
  vatPayer: z.array(CompanyAnalysisFlagValueZ).optional(),
  fiscallyInactive: z.array(CompanyAnalysisFlagValueZ).optional(),
  mainCaen: z.array(z.object({ code: z.string(), revision: z.string().optional() })).optional(),
  mainCaenBasis: z.array(CompanyAnalysisCaenBasisZ).optional(),
  filing: CompanyAnalysisFilingZ.optional(),
  financialRanges: z.array(CompanyAnalysisRangeZ).optional(),
  employeeSizeBands: z.array(CompanyAnalysisSizeBandZ).optional(),
})
export type CompanyAnalysisScope = z.infer<typeof CompanyAnalysisScopeZ>
export type CompanyAnalysisScopeInput = CompanyAnalysisScope & { readonly fiscalYear?: number }

/** True when the scope constrains the selected year's statement (the server's `requiresStatement`). */
export function scopeNeedsStatement(scope: CompanyAnalysisScope): boolean {
  return scope.filing === 'FILED' || (scope.financialRanges?.length ?? 0) > 0 || (scope.employeeSizeBands?.length ?? 0) > 0
}

// ────────────────────────────────────────────────────────────── answers ──

const countZ = z.string().regex(/^\d+$/u)
const decimalZ = z.string().regex(/^-?\d+(?:\.\d+)?$/u)

export const CompanyAnalysisCoverageZ = z.object({
  reported: countZ,
  missing: countZ,
  notAdmitted: countZ,
  heldProfile: countZ,
  heldObservation: countZ,
  heldQuality: countZ,
  heldComponent: countZ,
})
export type CompanyAnalysisCoverage = z.infer<typeof CompanyAnalysisCoverageZ>

const releaseRefZ = z.object({
  releaseId: z.string().regex(COMPANY_ANALYSIS_RELEASE_ID_RE),
  publishedAt: z.string().nullable(),
  active: z.boolean(),
})
export type CompanyAnalysisReleaseRef = z.infer<typeof releaseRefZ>

export const CompanyAnalysisReleaseZ = z.object({
  release: releaseRefZ,
  publicationId: countZ.nullable(),
  schemaVersion: z.string(),
  populationPolicyVersion: z.string(),
  admissionPolicyVersion: z.string().nullable(),
  admissionPolicySha256: z.string().nullable(),
  inputSnapshotAt: z.string().nullable(),
  companies: countZ,
  companyYears: countZ,
  fiscalYears: z.array(z.number().int()),
  years: z.array(
    z.object({
      fiscalYear: z.number().int(),
      statements: countZ,
      metrics: z.array(z.object({ metric: CompanyAnalysisMetricZ, offered: z.boolean(), coverage: CompanyAnalysisCoverageZ })),
      sizeBands: z.array(z.object({ band: CompanyAnalysisSizeBandZ, statements: countZ })),
    }),
  ),
  metrics: z.array(
    z.object({
      metric: CompanyAnalysisMetricZ,
      unit: CompanyAnalysisUnitZ,
      kind: CompanyAnalysisMetricKindZ,
      offeredYears: z.array(z.number().int()),
    }),
  ),
  dimensions: z.array(z.object({ dimension: CompanyAnalysisDimensionZ, yearScoped: z.boolean(), labelSource: z.string() })),
  defaults: z.object({
    fiscalYear: z.number().int(),
    metric: CompanyAnalysisMetricZ,
    cohortMode: CompanyAnalysisCohortModeZ,
    rankBy: CompanyAnalysisRankByZ,
    topN: z.number().int(),
    recordSort: CompanyAnalysisRecordSortZ,
    direction: CompanyAnalysisDirectionZ,
    pageSize: z.number().int(),
  }),
  asOf: z.array(
    z.object({
      kind: z.string(),
      id: z.string().nullable(),
      published: z.string().nullable(),
      retrieved: z.string().nullable(),
      rows: z.string().nullable(),
    }),
  ),
  nameFilter: z.boolean(),
  limits: z.object({
    maxSelectedCuis: z.number().int(),
    maxCounties: z.number().int(),
    maxUats: z.number().int(),
    maxLegalForms: z.number().int(),
    maxObservedStatuses: z.number().int(),
    maxCaenCodes: z.number().int(),
    maxFinancialRanges: z.number().int(),
    maxMetrics: z.number().int(),
    maxRecordMetrics: z.number().int(),
    defaultTopN: z.number().int(),
    maxTopN: z.number().int(),
    defaultPageSize: z.number().int(),
    maxPageSize: z.number().int(),
  }),
  caveats: z.array(z.string()),
})
export type CompanyAnalysisRelease = z.infer<typeof CompanyAnalysisReleaseZ>

export const CompanyAnalysisMetricAggregateZ = z.object({
  metric: CompanyAnalysisMetricZ,
  unit: CompanyAnalysisUnitZ,
  kind: CompanyAnalysisMetricKindZ,
  /** Null when nothing was reported; an explicit zero stays "0.00". */
  sum: decimalZ.nullable(),
  contributors: countZ,
  mean: decimalZ.nullable(),
  coverage: CompanyAnalysisCoverageZ,
})
export type CompanyAnalysisMetricAggregate = z.infer<typeof CompanyAnalysisMetricAggregateZ>

const answerBaseZ = {
  release: releaseRefZ,
  scope: z.record(z.string(), z.unknown()),
  scopeHash: z.string(),
  fiscalYear: z.number().int(),
  caveats: z.array(z.string()),
}

export const CompanyAnalysisStatsZ = z.object({
  ...answerBaseZ,
  companies: countZ,
  filers: countZ,
  nonFilers: countZ,
  metrics: z.array(CompanyAnalysisMetricAggregateZ),
})
export type CompanyAnalysisStats = z.infer<typeof CompanyAnalysisStatsZ>

const caenZ = z.object({
  code: z.string(),
  revision: z.string().nullable(),
  basis: CompanyAnalysisCaenBasisZ,
  label: z.string().nullable(),
})
export type CompanyAnalysisCaen = z.infer<typeof caenZ>

export const CompanyAnalysisBucketZ = z.object({
  kind: z.enum(['GROUP', 'OTHER', 'UNKNOWN', 'TOTAL']),
  key: z.string().nullable(),
  label: z.string().nullable(),
  caen: caenZ.nullable(),
  groups: z.number().int(),
  companies: countZ,
  filers: countZ,
  metric: CompanyAnalysisMetricAggregateZ.nullable(),
})
export type CompanyAnalysisBucket = z.infer<typeof CompanyAnalysisBucketZ>

export const CompanyAnalysisBreakdownZ = z.object({
  ...answerBaseZ,
  dimension: CompanyAnalysisDimensionZ,
  metric: CompanyAnalysisMetricZ.nullable(),
  groupCount: z.number().int(),
  rankBy: CompanyAnalysisRankByZ,
  rankedBy: CompanyAnalysisRankByZ,
  topN: z.number().int(),
  groups: z.array(CompanyAnalysisBucketZ),
  other: CompanyAnalysisBucketZ,
  unknown: CompanyAnalysisBucketZ,
  totals: CompanyAnalysisBucketZ,
})
export type CompanyAnalysisBreakdown = z.infer<typeof CompanyAnalysisBreakdownZ>

export const CompanyAnalysisSeriesPointZ = z.object({
  fiscalYear: z.number().int(),
  available: z.boolean(),
  gapReason: CompanyAnalysisGapReasonZ.nullable(),
  companies: countZ,
  filers: countZ,
  metric: CompanyAnalysisMetricAggregateZ,
})
export type CompanyAnalysisSeriesPoint = z.infer<typeof CompanyAnalysisSeriesPointZ>

export const CompanyAnalysisSeriesZ = z.object({
  ...answerBaseZ,
  metric: CompanyAnalysisMetricZ,
  unit: CompanyAnalysisUnitZ,
  kind: CompanyAnalysisMetricKindZ,
  cohortMode: CompanyAnalysisCohortModeZ,
  referenceYear: z.number().int().nullable(),
  cohortCompanies: countZ.nullable(),
  fromYear: z.number().int(),
  toYear: z.number().int(),
  points: z.array(CompanyAnalysisSeriesPointZ),
})
export type CompanyAnalysisSeries = z.infer<typeof CompanyAnalysisSeriesZ>

const labelledZ = z.object({ code: z.string(), label: z.string().nullable() })

export const CompanyAnalysisRecordZ = z.object({
  cui: z.string(),
  /** The current public name (not pinned to the release); null when the company is not publicly named. */
  currentName: z.string().nullable(),
  legalForm: z.string(),
  county: labelledZ.nullable(),
  uat: labelledZ.nullable(),
  observedStatus: labelledZ.nullable(),
  vatPayer: CompanyAnalysisFlagValueZ,
  fiscallyInactive: CompanyAnalysisFlagValueZ,
  mainCaen: caenZ.nullable(),
  registrationYear: z.number().int().nullable(),
  filed: z.boolean(),
  employeeSizeBand: CompanyAnalysisSizeBandZ.nullable(),
  values: z.array(
    z.object({
      metric: CompanyAnalysisMetricZ,
      /** The reported value only; null for every other status, and for a company without a statement. */
      value: decimalZ.nullable(),
      status: CompanyAnalysisStatusZ.nullable(),
    }),
  ),
})
export type CompanyAnalysisRecord = z.infer<typeof CompanyAnalysisRecordZ>

export const CompanyAnalysisRecordsZ = z.object({
  ...answerBaseZ,
  sort: CompanyAnalysisRecordSortZ,
  sortMetric: CompanyAnalysisMetricZ.nullable(),
  direction: CompanyAnalysisDirectionZ,
  totalCount: countZ,
  edges: z.array(z.object({ cursor: z.string(), node: CompanyAnalysisRecordZ })),
  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
})
export type CompanyAnalysisRecords = z.infer<typeof CompanyAnalysisRecordsZ>

// ───────────────────────────────────────────────────────── capabilities ──

/** The metric is offered for the year: admitted, with at least one reported value. */
export function metricOfferedIn(release: CompanyAnalysisRelease, fiscalYear: number, metric: CompanyAnalysisMetric): boolean {
  return release.metrics.find((entry) => entry.metric === metric)?.offeredYears.includes(fiscalYear) ?? false
}

export function offeredMetricsIn(release: CompanyAnalysisRelease, fiscalYear: number): readonly CompanyAnalysisMetric[] {
  return COMPANY_ANALYSIS_METRICS.filter((metric) => metricOfferedIn(release, fiscalYear, metric))
}

export function yearCapabilityOf(release: CompanyAnalysisRelease, fiscalYear: number) {
  return release.years.find((year) => year.fiscalYear === fiscalYear)
}
