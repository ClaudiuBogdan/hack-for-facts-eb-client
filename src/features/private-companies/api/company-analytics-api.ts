import { GRAPHQL_INVALID_INPUT_CODE, GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  CompanyAnalysisBreakdownZ,
  CompanyAnalysisRecordsZ,
  CompanyAnalysisReleaseZ,
  CompanyAnalysisSeriesZ,
  CompanyAnalysisStatsZ,
  type CompanyAnalysisBreakdown,
  type CompanyAnalysisCohortMode,
  type CompanyAnalysisDimension,
  type CompanyAnalysisDirection,
  type CompanyAnalysisMetric,
  type CompanyAnalysisOnrcInput,
  type CompanyAnalysisRankBy,
  type CompanyAnalysisRecordSort,
  type CompanyAnalysisRecords,
  type CompanyAnalysisRelease,
  type CompanyAnalysisScopeInput,
  type CompanyAnalysisSeries,
  type CompanyAnalysisStats,
} from '@/schemas/company-analytics'

/**
 * The companies analytics API (`companyAnalysis*`), one request per shape so
 * a refused root cannot erase the rest of the answer. Every read after the
 * release names the release it was resolved from: the API answers that
 * release or refuses with `INVALID_INPUT` on `release` — never another one.
 * The answers are parsed as they come, decimal strings and all: nothing here
 * converts money or a count to a number, or a zero to a null.
 *
 * The derived activity (v3) is asked for only where it is offered: the
 * ACTIVITY breakdown has a document of its own, and a records page selects
 * the activity fields only for a release that lists ACTIVITY — so a question
 * on another dimension asks exactly what it asked before. The ANAF-assumed
 * main activity (v4, staged) the same way: its own breakdown document, its
 * record fields only for a release that lists MAIN_ACTIVITY, and the
 * release's `mainCaen` pin asked of an API that knows it (an older one
 * rejects the field at validation and is asked again without it).
 */

const COVERAGE = 'coverage { reported missing notAdmitted heldProfile heldObservation heldQuality heldComponent }'
const AGGREGATE = `metric unit kind sum contributors mean ${COVERAGE}`
/** Every answer names its release and the ONRC edition that release was exported from (its eight-key source pin). */
const RELEASE_REF =
  'release { releaseId publishedAt active source { editionId publicationEpoch sourceSnapshotId sourcePublishedAt interpretationVersion privacyPolicyVersion dimensionPolicyVersion eligibilityPolicyVersion } }'
const ANSWER = `${RELEASE_REF} scope scopeHash fiscalYear caveats`

const releaseQuery = (mainCaen: boolean) => /* GraphQL */ `
  query CompanyAnalysisRelease($release: BigInt) {
    companyAnalysisRelease(release: $release) {
      ${RELEASE_REF}
      publicationId
      schemaVersion
      populationPolicyVersion
      admissionPolicyVersion
      admissionPolicySha256
      inputSnapshotAt
      companies
      companyYears
      fiscalYears
      years { fiscalYear statements metrics { metric offered ${COVERAGE} } sizeBands { band statements } }
      metrics { metric unit kind offeredYears }
      dimensions { dimension yearScoped labelSource }
      defaults { fiscalYear metric cohortMode rankBy topN recordSort direction pageSize }
      asOf { kind id published retrieved rows }
      nameFilter
      limits { maxSelectedCuis maxCounties maxUats maxLegalForms maxObservedStatuses maxCaenCodes maxFinancialRanges maxMetrics maxRecordMetrics defaultTopN maxTopN defaultPageSize maxPageSize }
      caveats${mainCaen ? '\n      mainCaen { contentEpoch refreshId policy editionId }' : ''}
    }
  }
`
const RELEASE_QUERY = releaseQuery(true)
/** The release as an API from before the main activity (v4) serves it: asked only when that API rejected `mainCaen` at validation. */
const RELEASE_QUERY_WITHOUT_MAIN = releaseQuery(false)

const STATS_QUERY = /* GraphQL */ `
  query CompanyAnalysisStats($release: BigInt!, $scope: CompanyAnalysisScopeInput, $metrics: [CompanyAnalysisMetric!]) {
    companyAnalysisStats(release: $release, scope: $scope, metrics: $metrics) {
      ${ANSWER}
      companies
      filers
      nonFilers
      metrics { ${AGGREGATE} }
    }
  }
`

const CAEN = `code revision basis label descriptionStatus descriptions { revision label }`
const BUCKET = `kind key label labelSource basis caen { ${CAEN} } groups companies filers metric { ${AGGREGATE} }`
const ACTIVITY = `basis source code revision label descriptionStatus descriptions { revision label } derived`
const ACTIVITY_BUCKET = `${BUCKET} activity { ${ACTIVITY} } activityQuality { numericMatchSelected incompleteCoverage withUnqualifiedRows anafObservedFrom anafObservedTo }`

const BREAKDOWN_QUERY = /* GraphQL */ `
  query CompanyAnalysisBreakdown($release: BigInt!, $scope: CompanyAnalysisScopeInput, $dimension: CompanyAnalysisDimension!, $metric: CompanyAnalysisMetric, $rankBy: CompanyAnalysisRankBy, $topN: Int) {
    companyAnalysisBreakdown(release: $release, scope: $scope, dimension: $dimension, metric: $metric, rankBy: $rankBy, topN: $topN) {
      ${ANSWER}
      dimension
      metric
      groupCount
      rankBy
      rankedBy
      topN
      groups { ${BUCKET} }
      other { ${BUCKET} }
      unknown { ${BUCKET} }
      totals { ${BUCKET} }
    }
  }
`

/** The derived activity's breakdown (v3): its buckets carry the selection and its quality, and the unclassified buckets come apart. */
const ACTIVITY_BREAKDOWN_QUERY = /* GraphQL */ `
  query CompanyAnalysisActivityBreakdown($release: BigInt!, $scope: CompanyAnalysisScopeInput, $dimension: CompanyAnalysisDimension!, $metric: CompanyAnalysisMetric, $rankBy: CompanyAnalysisRankBy, $topN: Int) {
    companyAnalysisBreakdown(release: $release, scope: $scope, dimension: $dimension, metric: $metric, rankBy: $rankBy, topN: $topN) {
      ${ANSWER}
      dimension
      metric
      groupCount
      rankBy
      rankedBy
      topN
      groups { ${ACTIVITY_BUCKET} }
      other { ${ACTIVITY_BUCKET} }
      unknown { ${ACTIVITY_BUCKET} }
      unclassified { ${ACTIVITY_BUCKET} }
      totals { ${ACTIVITY_BUCKET} }
    }
  }
`

const MAIN_ACTIVITY = 'status revision code label matchBasis policy'
const MAIN_ACTIVITY_BUCKET = `${BUCKET} mainActivity { ${MAIN_ACTIVITY} }`

/** The ANAF-assumed main activity's breakdown (v4): each bucket's main activity, and the unresolved statuses apart, never ranked. */
const MAIN_ACTIVITY_BREAKDOWN_QUERY = /* GraphQL */ `
  query CompanyAnalysisMainActivityBreakdown($release: BigInt!, $scope: CompanyAnalysisScopeInput, $dimension: CompanyAnalysisDimension!, $metric: CompanyAnalysisMetric, $rankBy: CompanyAnalysisRankBy, $topN: Int) {
    companyAnalysisBreakdown(release: $release, scope: $scope, dimension: $dimension, metric: $metric, rankBy: $rankBy, topN: $topN) {
      ${ANSWER}
      dimension
      metric
      groupCount
      rankBy
      rankedBy
      topN
      groups { ${MAIN_ACTIVITY_BUCKET} }
      other { ${MAIN_ACTIVITY_BUCKET} }
      unknown { ${MAIN_ACTIVITY_BUCKET} }
      unclassified { ${MAIN_ACTIVITY_BUCKET} }
      totals { ${MAIN_ACTIVITY_BUCKET} }
    }
  }
`

const SERIES_QUERY = /* GraphQL */ `
  query CompanyAnalysisSeries($release: BigInt!, $scope: CompanyAnalysisScopeInput, $metric: CompanyAnalysisMetric, $cohortMode: CompanyAnalysisCohortMode, $fromYear: Int, $toYear: Int) {
    companyAnalysisSeries(release: $release, scope: $scope, metric: $metric, cohortMode: $cohortMode, fromYear: $fromYear, toYear: $toYear) {
      ${ANSWER}
      metric
      unit
      kind
      cohortMode
      referenceYear
      cohortCompanies
      fromYear
      toYear
      points { fiscalYear available gapReason companies filers metric { ${AGGREGATE} } }
    }
  }
`

const RECORD_ACTIVITY = `activity { ${ACTIVITY} } onrcClassKeyCount onrcUnqualifiedRowCount anafCaenForm anafOnrcAgreement anafStatusDate`

const recordsQuery = (activity: boolean, mainActivity: boolean) => /* GraphQL */ `
  query CompanyAnalysisRecords($release: BigInt!, $scope: CompanyAnalysisScopeInput, $sort: CompanyAnalysisRecordSort, $sortMetric: CompanyAnalysisMetric, $direction: CompanyAnalysisDirection, $metrics: [CompanyAnalysisMetric!], $first: Int, $after: String) {
    companyAnalysisRecords(release: $release, scope: $scope, sort: $sort, sortMetric: $sortMetric, direction: $direction, metrics: $metrics, first: $first, after: $after) {
      ${ANSWER}
      sort
      sortMetric
      direction
      totalCount
      edges {
        cursor
        node {
          cui
          currentName
          legalForm
          legalFormBasis
          county { code label labelSource }
          countyBasis
          uat { code label labelSource }
          uatBasis
          observedStatus { code label labelSource }
          observedStatusBasis
          observedStatusCoverage
          onrcCaenCoverage
          onrcRecordedDate
          onrcRecordedYear
          onrcRecordedDateBasis
          vatPayer
          fiscallyInactive
          mainCaen { ${CAEN} }
          ${activity ? RECORD_ACTIVITY : ''}
          ${mainActivity ? `mainActivity { ${MAIN_ACTIVITY} }` : ''}
          filed
          employeeSizeBand
          values { metric value status }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`

// ──────────────────────────────────────────────────────────── refusals ──

function refusedFieldOf(error: unknown): string | null {
  if (!(error instanceof GraphQLRequestError)) return null
  const entry = error.graphQLErrors.find((item) => item.extensions?.code === GRAPHQL_INVALID_INPUT_CODE)
  const field = entry?.extensions?.field
  return typeof field === 'string' ? field : entry ? '' : null
}

/** The API refused the pinned release: it is no longer published or retained. Never answered with another one. */
export function isReleaseRefused(error: unknown): boolean {
  return refusedFieldOf(error) === 'release'
}

/** The API refused a page's cursor (another release, scope or order): the list starts over. */
export function isCursorRefused(error: unknown): boolean {
  return refusedFieldOf(error) === 'after'
}

/**
 * The API refused a v3-only question (the ACTIVITY grouping, the `activity`
 * or `activityBasis` filters) on a release that does not offer it. Not a
 * withdrawal of the release: the hub falls back to the main-activity
 * grouping, the page says the release cannot answer it.
 */
export const RELEASE_CAPABILITY_UNAVAILABLE = 'RELEASE_CAPABILITY_UNAVAILABLE'

export function isCapabilityRefused(error: unknown): boolean {
  return (
    error instanceof GraphQLRequestError &&
    error.graphQLErrors.some((entry) => entry.extensions?.code === RELEASE_CAPABILITY_UNAVAILABLE)
  )
}

/** The capability a typed refusal names (`ACTIVITY`, `MAIN_ACTIVITY`), when it names one. */
export function refusedCapabilityOf(error: unknown): string | null {
  if (!(error instanceof GraphQLRequestError)) return null
  const capability = error.graphQLErrors.find((entry) => entry.extensions?.code === RELEASE_CAPABILITY_UNAVAILABLE)?.extensions?.capability
  return typeof capability === 'string' ? capability : null
}

/**
 * An API from before the main activity (v4) rejected the release's `mainCaen`
 * pin at validation, and nothing else: the release is asked again without
 * it (a v2/v3 release has none). Any other error is the read's own.
 */
export function isPreMainCaenApiError(error: unknown): boolean {
  return (
    error instanceof GraphQLRequestError &&
    error.graphQLErrors.length > 0 &&
    error.graphQLErrors.every(
      (entry) => (entry.path?.length ?? 0) === 0 && /^Cannot query field "mainCaen" on type "CompanyAnalysisRelease"\.(?: Did you mean .+\?)?$/u.test(entry.message),
    )
  )
}

/** The analytics service is not configured or has no published release. */
export function isAnalyticsUnavailable(error: unknown): boolean {
  return error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === 'SERVICE_UNAVAILABLE')
}

// ──────────────────────────────────────────────────────────────── scope ──

/** The ONRC observation filters as the API takes them: no empty list, no empty `exclude`, nothing at all when nothing is left. */
function apiOnrcOf(onrc: CompanyAnalysisOnrcInput | undefined): CompanyAnalysisOnrcInput | undefined {
  if (!onrc) return undefined
  const lists = <K extends string>(source: Partial<Record<K, readonly string[] | undefined>>, keys: readonly K[]) => {
    const out: Partial<Record<K, string[]>> = {}
    for (const key of keys) {
      const values = source[key]
      if (values && values.length > 0) out[key] = [...values]
    }
    return out
  }
  const exclude = onrc.exclude ? lists(onrc.exclude, ['status', 'caenCode', 'county', 'legalForm'] as const) : {}
  const out = { ...lists(onrc, ['status', 'county', 'caenCode', 'onrcCaen'] as const), ...(Object.keys(exclude).length > 0 ? { exclude } : {}) }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * The scope as the API takes it: no empty list (the API refuses one rather
 * than reading it as "every value"), no key filter without values or the
 * unknown group, the fixed field order its echo uses.
 */
export function apiScopeOf(scope: CompanyAnalysisScopeInput): CompanyAnalysisScopeInput {
  const out: Record<string, unknown> = {}
  if (scope.fiscalYear !== undefined) out.fiscalYear = scope.fiscalYear
  const list = <T,>(key: string, values: readonly T[] | undefined) => {
    if (values && values.length > 0) out[key] = [...values]
  }
  const keys = (key: string, filter: CompanyAnalysisScopeInput['county']) => {
    const values = filter?.in ?? []
    if (values.length === 0 && !filter?.includeUnknown) return
    out[key] = { ...(values.length > 0 ? { in: [...values] } : {}), ...(filter?.includeUnknown ? { includeUnknown: true } : {}) }
  }
  list('cuis', scope.cuis)
  keys('county', scope.county)
  keys('uat', scope.uat)
  list('legalForms', scope.legalForms)
  keys('observedStatus', scope.observedStatus)
  list('vatPayer', scope.vatPayer)
  list('fiscallyInactive', scope.fiscallyInactive)
  list(
    'mainCaen',
    scope.mainCaen?.map((selector) => (selector.revision ? { code: selector.code, revision: selector.revision } : { code: selector.code })),
  )
  list('mainCaenBasis', scope.mainCaenBasis)
  // An ANAF selector never carries a revision: ANAF publishes none.
  list(
    'activity',
    scope.activity?.map((selector) => (selector.source === 'ONRC' && selector.revision ? { source: 'ONRC', code: selector.code, revision: selector.revision } : { source: selector.source, code: selector.code })),
  )
  list('activityBasis', scope.activityBasis)
  list(
    'mainActivity',
    scope.mainActivity?.map((selector) => ({ revision: selector.revision, code: selector.code })),
  )
  list('mainActivityStatus', scope.mainActivityStatus)
  if (scope.filing) out.filing = scope.filing
  list(
    'financialRanges',
    scope.financialRanges?.filter((range) => range.min !== undefined || range.max !== undefined),
  )
  list('employeeSizeBands', scope.employeeSizeBands)
  const onrc = apiOnrcOf(scope.onrc)
  if (onrc) out.onrc = onrc
  return out as CompanyAnalysisScopeInput
}

// ──────────────────────────────────────────────────────────────── reads ──

const read = (operationName: string, document: string, variables: Record<string, unknown>, signal?: AbortSignal) =>
  graphqlQuery<Record<string, unknown>>(document, variables, { operationName, signal, auth: 'none' })

/** A root the API answered with null and no error: nothing to show, said as a failure rather than as an empty answer. */
function present<T>(value: T | null | undefined, operation: string): T {
  if (value === null || value === undefined) throw new GraphQLRequestError(`${operation} returned no answer`)
  return value
}

/** The active release (`pin` null) or the pinned one; a pin the API no longer serves is refused, never replaced. */
export async function readCompanyAnalysisRelease(pin: string | null, signal?: AbortSignal): Promise<CompanyAnalysisRelease> {
  const variables = pin === null ? {} : { release: pin }
  let data: Record<string, unknown>
  try {
    data = await read('CompanyAnalysisRelease', RELEASE_QUERY, variables, signal)
  } catch (error) {
    if (!isPreMainCaenApiError(error)) throw error
    data = await read('CompanyAnalysisRelease', RELEASE_QUERY_WITHOUT_MAIN, variables, signal)
  }
  return CompanyAnalysisReleaseZ.parse(present(data.companyAnalysisRelease, 'companyAnalysisRelease'))
}

export interface StatsRequest {
  readonly release: string
  readonly scope: CompanyAnalysisScopeInput
  readonly metrics: readonly CompanyAnalysisMetric[]
}

export async function readCompanyAnalysisStats(request: StatsRequest, signal?: AbortSignal): Promise<CompanyAnalysisStats> {
  const data = await read(
    'CompanyAnalysisStats',
    STATS_QUERY,
    { release: request.release, scope: apiScopeOf(request.scope), ...(request.metrics.length > 0 ? { metrics: request.metrics } : {}) },
    signal,
  )
  return CompanyAnalysisStatsZ.parse(present(data.companyAnalysisStats, 'companyAnalysisStats'))
}

export interface BreakdownRequest {
  readonly release: string
  readonly scope: CompanyAnalysisScopeInput
  readonly dimension: CompanyAnalysisDimension
  readonly metric: CompanyAnalysisMetric | null
  readonly rankBy: CompanyAnalysisRankBy
  readonly topN: number
}

export async function readCompanyAnalysisBreakdown(request: BreakdownRequest, signal?: AbortSignal): Promise<CompanyAnalysisBreakdown> {
  const [operation, document] =
    request.dimension === 'ACTIVITY'
      ? ['CompanyAnalysisActivityBreakdown', ACTIVITY_BREAKDOWN_QUERY]
      : request.dimension === 'MAIN_ACTIVITY'
        ? ['CompanyAnalysisMainActivityBreakdown', MAIN_ACTIVITY_BREAKDOWN_QUERY]
        : ['CompanyAnalysisBreakdown', BREAKDOWN_QUERY]
  const data = await read(
    operation,
    document,
    {
      release: request.release,
      scope: apiScopeOf(request.scope),
      dimension: request.dimension,
      ...(request.metric ? { metric: request.metric } : {}),
      rankBy: request.rankBy,
      topN: request.topN,
    },
    signal,
  )
  return CompanyAnalysisBreakdownZ.parse(present(data.companyAnalysisBreakdown, 'companyAnalysisBreakdown'))
}

export interface SeriesRequest {
  readonly release: string
  readonly scope: CompanyAnalysisScopeInput
  readonly metric: CompanyAnalysisMetric
  readonly cohortMode: CompanyAnalysisCohortMode
  readonly fromYear?: number
  readonly toYear?: number
}

export async function readCompanyAnalysisSeries(request: SeriesRequest, signal?: AbortSignal): Promise<CompanyAnalysisSeries> {
  const data = await read(
    'CompanyAnalysisSeries',
    SERIES_QUERY,
    {
      release: request.release,
      scope: apiScopeOf(request.scope),
      metric: request.metric,
      cohortMode: request.cohortMode,
      ...(request.fromYear !== undefined ? { fromYear: request.fromYear } : {}),
      ...(request.toYear !== undefined ? { toYear: request.toYear } : {}),
    },
    signal,
  )
  return CompanyAnalysisSeriesZ.parse(present(data.companyAnalysisSeries, 'companyAnalysisSeries'))
}

export interface RecordsRequest {
  readonly release: string
  readonly scope: CompanyAnalysisScopeInput
  readonly sort: CompanyAnalysisRecordSort
  readonly sortMetric: CompanyAnalysisMetric | null
  readonly direction: CompanyAnalysisDirection
  readonly metrics: readonly CompanyAnalysisMetric[]
  readonly first: number
  readonly after: string | null
  /** The release offers the derived activity: each company then carries it. */
  readonly activity?: boolean
  /** The release offers the ANAF-assumed main activity (v4): each company then carries it. */
  readonly mainActivity?: boolean
}

export async function readCompanyAnalysisRecords(request: RecordsRequest, signal?: AbortSignal): Promise<CompanyAnalysisRecords> {
  const data = await read(
    'CompanyAnalysisRecords',
    recordsQuery(request.activity ?? false, request.mainActivity ?? false),
    {
      release: request.release,
      scope: apiScopeOf(request.scope),
      sort: request.sort,
      ...(request.sort === 'METRIC' && request.sortMetric ? { sortMetric: request.sortMetric } : {}),
      direction: request.direction,
      ...(request.metrics.length > 0 ? { metrics: request.metrics } : {}),
      first: request.first,
      ...(request.after ? { after: request.after } : {}),
    },
    signal,
  )
  return CompanyAnalysisRecordsZ.parse(present(data.companyAnalysisRecords, 'companyAnalysisRecords'))
}
