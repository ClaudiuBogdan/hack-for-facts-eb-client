import { z } from 'zod'

/**
 * Companies analytics — the API's vocabulary and answers, as the client reads
 * them (server `src/modules/companies/core/analytics-types.ts` and
 * `shell/graphql/analytics-typedefs.ts`, schema `companies-analytics-ch-v2`:
 * one pinned ONRC edition per release, `release.source`).
 *
 * Every count, sum and mean stays the API's decimal string: nothing here
 * turns money or a count into a number. An empty contributor set is a null
 * sum, never 0; an explicit zero stays "0.00". A source date stays the exact
 * civil text the API sent (`YYYY-MM-DD`), never a `Date`. Shared by the
 * analysis page (`/companies/analytics`) and the chart builder's
 * `companies-analytics` series, which persists a scope in this shape.
 */

/** The only schema and population the API serves (a v1 release is refused there, never reinterpreted here). */
export const COMPANY_ANALYSIS_SCHEMA_VERSION = 'companies-analytics-ch-v2'
export const COMPANY_ANALYSIS_POPULATION_POLICY_VERSION = 'public-onrc-edition-legal-person-v2'

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

// ──────────────────────────────────────────────────────── ONRC edition ──

/**
 * Why an ONRC edition consensus value (county, UAT, status, legal form,
 * recorded date) is what it is — or why it is null. Only SINGLE_OBSERVATION
 * and CONSISTENT_OBSERVATIONS are a known value.
 */
export const COMPANY_ANALYSIS_ONRC_BASES = ['SINGLE_OBSERVATION', 'CONSISTENT_OBSERVATIONS', 'PARTIAL_OBSERVATIONS', 'MULTIPLE_VALUES', 'MISSING', 'UNRESOLVED'] as const
export const CompanyAnalysisOnrcBasisZ = z.enum(COMPANY_ANALYSIS_ONRC_BASES)
export type CompanyAnalysisOnrcBasis = z.infer<typeof CompanyAnalysisOnrcBasisZ>

/** Whether a company's ONRC status / CAEN evidence is complete: only COMPLETE and COMPLETE_EMPTY can prove an absence. */
export const COMPANY_ANALYSIS_ONRC_COVERAGES = ['COMPLETE', 'COMPLETE_EMPTY', 'PARTIAL', 'UNRESOLVED'] as const
export const CompanyAnalysisOnrcCoverageZ = z.enum(COMPANY_ANALYSIS_ONRC_COVERAGES)
export type CompanyAnalysisOnrcCoverage = z.infer<typeof CompanyAnalysisOnrcCoverageZ>

/**
 * The key of a consensus bucket WITHOUT a value — county, UAT or observed
 * status — as the API names it: its basis in parentheses, `(multiple_values)`.
 * The same key filters exactly that bucket (`scope.county.in`).
 */
export function onrcBasisKey(basis: CompanyAnalysisOnrcBasis): string {
  return `(${basis.toLowerCase()})`
}

const ONRC_BASIS_BY_KEY: ReadonlyMap<string, CompanyAnalysisOnrcBasis> = new Map(COMPANY_ANALYSIS_ONRC_BASES.map((basis) => [onrcBasisKey(basis), basis]))

/** The basis a bucket key names, or null for a value key (a county code, a SIRUTA, a status code). */
export function onrcBasisOfKey(key: string): CompanyAnalysisOnrcBasis | null {
  return ONRC_BASIS_BY_KEY.get(key) ?? null
}

/** An exact civil date as the API writes a source date: `YYYY-MM-DD`, years 0001–9999. Text, never a `Date`. */
export const CIVIL_DATE_RE = /^(?!0000)\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u

/** A day that exists in its month (Gregorian leap years), read from the text's own digits — no `Date`, no time zone. */
export function isCivilDate(text: string): boolean {
  if (!CIVIL_DATE_RE.test(text)) return false
  const [year = 0, month = 0, day = 0] = text.split('-').map(Number)
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
  return day <= days
}
const civilDateZ = z.string().refine(isCivilDate, { message: 'an exact civil date YYYY-MM-DD (0001–9999)' })
/** An ONRC id or epoch: canonical positive integer text. */
const sourceIdZ = z.string().regex(/^[1-9]\d{0,18}$/u)
const sourceTextZ = z.string().min(1)

/**
 * The ONRC edition a release's company dimensions were exported from —
 * exactly the release's eight-key source pin. The release answers only while
 * this edition is still ONRC's published source; `editionId` and
 * `publicationEpoch` say whether the companies directory reads the same one.
 */
export const CompanyAnalysisSourceZ = z.object({
  editionId: sourceIdZ,
  publicationEpoch: sourceIdZ,
  sourceSnapshotId: sourceTextZ,
  /** ONRC's publication date of the edition's source files; null when unknown. */
  sourcePublishedAt: civilDateZ.nullable(),
  interpretationVersion: sourceTextZ,
  privacyPolicyVersion: sourceTextZ,
  dimensionPolicyVersion: sourceTextZ,
  eligibilityPolicyVersion: sourceTextZ,
})
export type CompanyAnalysisSource = z.infer<typeof CompanyAnalysisSourceZ>

// ─────────────────────────────────────────────────────────────── scope ──

/**
 * A CONSENSUS bucket selector (county, UAT, observed status) of the pinned
 * edition: a value key, or a basis key `(multiple_values)` — exactly the
 * breakdown bucket of that key. `includeUnknown` selects every basis bucket
 * (no consensus value), never an absence.
 */
const keyFilterZ = z.object({
  in: z.array(z.string()).optional(),
  includeUnknown: z.boolean().optional(),
})
export type CompanyAnalysisKeyFilterInput = z.infer<typeof keyFilterZ>

/**
 * The supported ONRC exclusions. Each needs complete evidence: a company with
 * partial or unresolved evidence abstains (is not selected), never counted as
 * an absence. An exact `rev<N>:<code>` exclusion does not exist (a code of
 * unknown revision may carry the same digits): a scope holding one is refused
 * here rather than read without it.
 */
const onrcExcludeZ = z.strictObject({
  /** No identifier carries these status codes (status coverage complete). */
  status: z.array(z.string()).optional(),
  /** No identifier carries these CAEN codes in any revision (CAEN coverage complete). */
  caenCode: z.array(z.string()).optional(),
  /** A known county consensus outside these codes. */
  county: z.array(z.string()).optional(),
  /** A known legal form outside these. */
  legalForm: z.array(z.string()).optional(),
})
export type CompanyAnalysisOnrcExcludeInput = z.infer<typeof onrcExcludeZ>

/**
 * OBSERVATION filters over the edition's public resolved identifiers, all on
 * the SAME identifier: OR within a field, AND across fields. A public 1048
 * matches also next to a conflicting status; `caenCode` (4 digits) matches
 * any revision, unknown included; `onrcCaen` (`rev2:6201`) is exact, and a
 * code of unknown revision never matches it.
 */
export const CompanyAnalysisOnrcZ = z.strictObject({
  status: z.array(z.string()).optional(),
  county: z.array(z.string()).optional(),
  caenCode: z.array(z.string()).optional(),
  onrcCaen: z.array(z.string()).optional(),
  exclude: onrcExcludeZ.optional(),
})
export type CompanyAnalysisOnrcInput = z.infer<typeof CompanyAnalysisOnrcZ>

export const CompanyAnalysisRangeZ = z.object({
  metric: CompanyAnalysisMetricZ,
  /** Inclusive bounds: decimal strings (lei, at most two decimals) or integer strings (employees). */
  min: z.string().optional(),
  max: z.string().optional(),
})
export type CompanyAnalysisRangeInput = z.infer<typeof CompanyAnalysisRangeZ>

/**
 * The question, in the API's input shape (`CompanyAnalysisScopeInput`): OR
 * within a field, AND across fields. Company keys (where, what, fiscal flags,
 * the ONRC observations) describe the release snapshot and its pinned
 * edition; filing, ranges and size bands act on the fiscal year's statement.
 * Without `fiscalYear` (as a chart persists it, beside its reference year).
 */
export const CompanyAnalysisScopeZ = z.object({
  cuis: z.array(z.string()).optional(),
  county: keyFilterZ.optional(),
  uat: keyFilterZ.optional(),
  legalForms: z.array(z.string()).optional(),
  observedStatus: keyFilterZ.optional(),
  onrc: CompanyAnalysisOnrcZ.optional(),
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
  /** The ONRC edition the release was exported from (its source pin). */
  source: CompanyAnalysisSourceZ,
})
export type CompanyAnalysisReleaseRef = z.infer<typeof releaseRefZ>

export const CompanyAnalysisReleaseZ = z.object({
  release: releaseRefZ,
  publicationId: countZ.nullable(),
  schemaVersion: z.literal(COMPANY_ANALYSIS_SCHEMA_VERSION),
  populationPolicyVersion: z.literal(COMPANY_ANALYSIS_POPULATION_POLICY_VERSION),
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
  /** GROUP only: the exact filter key — for COUNTY, UAT and OBSERVED_STATUS a consensus value, or `(<basis>)` for the companies without one. */
  key: z.string().nullable(),
  label: z.string().nullable(),
  /** Where the label came from (`territory_hub`, `api_nomenclature`, `current_db_catalog`); null without a label. */
  labelSource: z.string().nullable(),
  /** A basis group's basis (COUNTY, UAT, OBSERVED_STATUS); null for a value group and every other bucket. */
  basis: CompanyAnalysisOnrcBasisZ.nullable(),
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

const labelledZ = z.object({ code: z.string(), label: z.string().nullable(), labelSource: z.string().nullable() })

export const CompanyAnalysisRecordZ = z
  .object({
    cui: z.string(),
    /** The current public name in the companies directory — not an edition or registry name, not pinned to the release; null when not publicly named. */
    currentName: z.string().nullable(),
    legalForm: z.string(),
    legalFormBasis: CompanyAnalysisOnrcBasisZ,
    /** The edition's county consensus; null when there is none (`countyBasis` says why). */
    county: labelledZ.nullable(),
    countyBasis: CompanyAnalysisOnrcBasisZ,
    uat: labelledZ.nullable(),
    uatBasis: CompanyAnalysisOnrcBasisZ,
    /** The edition's complete status consensus; null otherwise (`observedStatusBasis` says why). */
    observedStatus: labelledZ.nullable(),
    observedStatusBasis: CompanyAnalysisOnrcBasisZ,
    observedStatusCoverage: CompanyAnalysisOnrcCoverageZ,
    onrcCaenCoverage: CompanyAnalysisOnrcCoverageZ,
    /** The civil date ONRC RECORDED, exact text — never a founding date, an age or a market tenure. */
    onrcRecordedDate: civilDateZ.nullable(),
    /** The year of `onrcRecordedDate` only. */
    onrcRecordedYear: z.number().int().nullable(),
    onrcRecordedDateBasis: CompanyAnalysisOnrcBasisZ,
    vatPayer: CompanyAnalysisFlagValueZ,
    fiscallyInactive: CompanyAnalysisFlagValueZ,
    mainCaen: caenZ.nullable(),
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
  // Both null, or the year is the date's own: an answer that disagrees with itself is no answer.
  .refine((record) => (record.onrcRecordedDate === null ? record.onrcRecordedYear === null : record.onrcRecordedYear === Number(record.onrcRecordedDate.slice(0, 4))), {
    message: 'onrcRecordedYear must be the year of onrcRecordedDate',
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
