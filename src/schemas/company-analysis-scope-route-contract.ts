import { z } from 'zod'
import { lazySchema, type LazyOutput } from '@/lib/route-contract'

/** The company selectors a saved chart carries. API response schemas stay in company-analytics.ts. */
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

export const COMPANY_ANALYSIS_SIZE_BANDS = ['UNAVAILABLE', 'NEGATIVE', 'ZERO', 'FROM_1_TO_9', 'FROM_10_TO_49', 'FROM_50_TO_249', 'FROM_250'] as const

export const COMPANY_ANALYSIS_CAEN_BASES = ['REVISION_KNOWN', 'REVISION_UNKNOWN', 'MISSING'] as const

/** An ANAF observation; UNKNOWN is a missing observation, never NO. */
export const COMPANY_ANALYSIS_FLAG_VALUES = ['YES', 'NO', 'UNKNOWN'] as const

/** EACH_YEAR re-applies the selected-year filters to every year; REFERENCE_YEAR follows the cohort selected in the scope's fiscal year. */
export const COMPANY_ANALYSIS_COHORT_MODES = ['REFERENCE_YEAR', 'EACH_YEAR'] as const

/**
 * How a company's ONE activity was selected (v3). Every basis is a DERIVED
 * selection, never a principal activity a source published: the only
 * classified ONRC observation of the edition (not an exclusive
 * authorisation); one of several ONRC classes, chosen because ANAF's fiscal
 * code has the same digits; ANAF's fiscal code (its revision unpublished)
 * when the edition holds no class. The last three select nothing that may be
 * ranked as a sector: several classes without a unique match, an ANAF code
 * no catalog names (a source observation), and no qualified selection —
 * which is not "no activity".
 */
export const COMPANY_ANALYSIS_ACTIVITY_BASES = [
  'ONRC_SINGLE_CLASS',
  'ONRC_CLASS_ANAF_NUMERIC_MATCH',
  'ONRC_MULTIPLE_CLASSES',
  'ANAF_FISCAL_CODE',
  'ANAF_FISCAL_UNCATALOGUED',
  'NO_QUALIFIED_SELECTION',
] as const

/**
 * A company's ANAF-assumed main activity in a v4 release: ANAF's fiscal CAEN
 * token ASSUMED to be its main activity, matched to one exact ONRC class key
 * (`revision`, `code`; the revision is ONRC's, ANAF publishes none) — never a
 * principal activity ONRC published. The statuses are the profile's; only the
 * selecting ones name a key, the others are unclassified buckets
 * (`(<status>)`), never ranked.
 */
export const COMPANY_ANALYSIS_MAIN_ACTIVITY_STATUSES = [
  'RESOLVED',
  'RESOLVED_LATEST_REVISION',
  'NO_ONRC_MATCH',
  'UNRESOLVED_TOKEN_FORM',
  'TOKEN_PLACEHOLDER',
  'TOKEN_INVALID',
  'SOURCE_MISSING',
  'SOURCE_UNBOUND',
  'CORRECTED',
  'CORRECTION_WITHHELD',
] as const

/** A release id: a positive integer as text (the API's `BigInt`, which it only accepts as a string). */
export const COMPANY_ANALYSIS_RELEASE_ID_RE = /^[1-9]\d{0,15}$/u

export const COMPANY_ANALYSIS_FILING = ['FILED', 'NOT_FILED'] as const
export const COMPANY_ANALYSIS_ACTIVITY_SOURCES = ['ONRC', 'ANAF'] as const

/**
 * A CONSENSUS bucket selector (county, UAT, observed status) of the pinned
 * edition: a value key, or a basis key `(multiple_values)` — exactly the
 * breakdown bucket of that key. `includeUnknown` selects every basis bucket
 * (no consensus value), never an absence.
 */
const keyFilter = lazySchema(() => z.object({
  in: z.array(z.string()).optional(),
  includeUnknown: z.boolean().optional(),
}))
export type CompanyAnalysisKeyFilterInput = LazyOutput<typeof keyFilter>

/**
 * The supported ONRC exclusions. Each needs complete evidence: a company with
 * partial or unresolved evidence abstains (is not selected), never counted as
 * an absence. An exact `rev<N>:<code>` exclusion does not exist (a code of
 * unknown revision may carry the same digits): a scope holding one is refused
 * here rather than read without it.
 */
const onrcExclude = lazySchema(() => z.strictObject({
  /** No identifier carries these status codes (status coverage complete). */
  status: z.array(z.string()).optional(),
  /**
   * CAEN coverage complete (an unparsed or unknown-revision row makes it
   * partial) and no matching observation: v3 releases test qualified classes
   * only, so a short token or unlabeled key does not block it; v2 every code.
   */
  caenCode: z.array(z.string()).optional(),
  /** A known county consensus outside these codes. */
  county: z.array(z.string()).optional(),
  /** A known legal form outside these. */
  legalForm: z.array(z.string()).optional(),
}))
export type CompanyAnalysisOnrcExcludeInput = LazyOutput<typeof onrcExclude>

/**
 * OBSERVATION filters over the edition's public resolved identifiers, all on
 * the SAME identifier: OR within a field, AND across fields. A public 1048
 * matches also next to a conflicting status; `caenCode` (4 digits) matches,
 * in a v3 release, a qualified class observation of any known revision (a v2
 * release matched every observation, unknown revision included); `onrcCaen`
 * (`rev2:6201`) is exact, and a code of unknown revision never matches it.
 */
export const companyAnalysisOnrcSchema = lazySchema(() => z.strictObject({
  status: z.array(z.string()).optional(),
  county: z.array(z.string()).optional(),
  caenCode: z.array(z.string()).optional(),
  onrcCaen: z.array(z.string()).optional(),
  exclude: onrcExclude.schema().optional(),
}))
export type CompanyAnalysisOnrcInput = LazyOutput<typeof companyAnalysisOnrcSchema>

export const companyAnalysisRangeSchema = lazySchema(() => z.object({
  metric: z.enum(COMPANY_ANALYSIS_METRICS),
  /** Inclusive bounds: decimal strings (lei, at most two decimals) or integer strings (employees). */
  min: z.string().optional(),
  max: z.string().optional(),
}))
export type CompanyAnalysisRangeInput = LazyOutput<typeof companyAnalysisRangeSchema>

/**
 * The question, in the API's input shape (`CompanyAnalysisScopeInput`): OR
 * within a field, AND across fields. Company keys (where, what, fiscal flags,
 * the ONRC observations) describe the release snapshot and its pinned
 * edition; filing, ranges and size bands act on the fiscal year's statement.
 * Without `fiscalYear` (as a chart persists it, beside its reference year).
 */
export const companyAnalysisScopeSchema = lazySchema(() => z.object({
  cuis: z.array(z.string()).optional(),
  county: keyFilter.schema().optional(),
  uat: keyFilter.schema().optional(),
  legalForms: z.array(z.string()).optional(),
  observedStatus: keyFilter.schema().optional(),
  onrc: companyAnalysisOnrcSchema.schema().optional(),
  vatPayer: z.array(z.enum(COMPANY_ANALYSIS_FLAG_VALUES)).optional(),
  fiscallyInactive: z.array(z.enum(COMPANY_ANALYSIS_FLAG_VALUES)).optional(),
  mainCaen: z.array(z.object({ code: z.string(), revision: z.string().optional() })).optional(),
  mainCaenBasis: z.array(z.enum(COMPANY_ANALYSIS_CAEN_BASES)).optional(),
  /**
   * v3: the exact selected activity — ONRC with its revision (`rev0`…`rev3`),
   * ANAF without one (ANAF publishes none). An ANAF selector never matches an
   * ONRC selection, nor the reverse.
   */
  activity: z.array(z.object({ source: z.enum(COMPANY_ANALYSIS_ACTIVITY_SOURCES), code: z.string(), revision: z.string().optional() })).optional(),
  /** v3: the selection's basis. */
  activityBasis: z.array(z.enum(COMPANY_ANALYSIS_ACTIVITY_BASES)).optional(),
  /** v4: the exact ONRC key of the ANAF-assumed main activity (`rev3` + `4711`); never a code without its revision. */
  mainActivity: z.array(z.object({ revision: z.enum(['rev0', 'rev1', 'rev2', 'rev3']), code: z.string().regex(/^\d{4}$/u) })).optional(),
  /** v4: the main activity's status (the unresolved buckets). */
  mainActivityStatus: z.array(z.enum(COMPANY_ANALYSIS_MAIN_ACTIVITY_STATUSES)).optional(),
  filing: z.enum(COMPANY_ANALYSIS_FILING).optional(),
  financialRanges: z.array(companyAnalysisRangeSchema.schema()).optional(),
  employeeSizeBands: z.array(z.enum(COMPANY_ANALYSIS_SIZE_BANDS)).optional(),
}))
export type CompanyAnalysisScope = LazyOutput<typeof companyAnalysisScopeSchema>
export type CompanyAnalysisScopeInput = CompanyAnalysisScope & { readonly fiscalYear?: number }
