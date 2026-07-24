/**
 * Rankings leaderboard fetch — top-100 breakdown + concentration summary,
 * count- or value-ranked (ClickHouse analytics). UI pagination windows the
 * honest top-100 payload; server offset pagination remains a follow-up for
 * deeper walks.
 */
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_RANKINGS_TOP_N,
  type ProcurementCpvLevel,
  type ProcurementRankBy,
  type ProcurementRankDim,
} from '@/schemas/procurement-hub'
import {
  PROCUREMENT_ANALYSIS_QUERY,
  PROCUREMENT_CPV_DIVISIONS_QUERY,
  PROCUREMENT_PARTY_NAMES_QUERY,
  procurementAnalysisResponseSchema,
  procurementCpvDivisionsResponseSchema,
  procurementPartyNamesResponseSchema,
  PROCUREMENT_CPV_CODES_QUERY,
  procurementCpvCodesResponseSchema,
  type RawProcurementBreakdownBucket,
  type RawProcurementCpvDivision,
} from './graphql/procurement-queries'
import {
  buildScopeFilter,
  type ProcurementScopeFilterInput,
} from './graphql/procurement-filters'
import type { ProcurementAnalysisDimension } from './procurement-analysis-api'

export type ProcurementLeaderboardRow = {
  readonly key: string | null
  /** Resolved display name when known; null for other/unknown buckets. */
  readonly label: string | null
  readonly secondaryLabel: string | null
  readonly bucketKind: string
  readonly recordCount: string
  readonly valueAwardedSum: string | null
  readonly shareOfScope: string | null
}

export type ProcurementLeaderboardResult = {
  readonly rows: readonly ProcurementLeaderboardRow[]
  readonly distinctSuppliers: number | null
  readonly distinctAuthorities: number | null
  readonly topN: typeof PROCUREMENT_RANKINGS_TOP_N
  /** Server echo of the effective ranking basis ('value' may fall back to 'count' when spend is gated). */
  readonly rankedBy: string | null
}

export type ProcurementLeaderboardRequest = {
  readonly scope: Parameters<typeof buildScopeFilter>[0]
  readonly rankDim: ProcurementRankDim
  readonly cpvLevel: ProcurementCpvLevel
  /** Ranking basis; the server yields count when the spend gate suppresses value. */
  readonly rankBy?: ProcurementRankBy
  /** False for populations without supplier money (framework/modification). */
  readonly includeConcentration?: boolean
}

function analysisDimension(
  rankDim: ProcurementRankDim,
  cpvLevel: ProcurementCpvLevel,
): ProcurementAnalysisDimension {
  if (rankDim === 'buyer') return 'authority'
  if (rankDim === 'supplier') return 'supplier'
  switch (cpvLevel) {
    case 'code':
      return 'cpvCode'
    case 'group':
      return 'cpvGroup'
    case 'class':
      return 'cpvClass'
    case 'category':
      return 'cpvCategory'
    default:
      return 'cpvDivision'
  }
}

/** Levels whose bucket keys are canonical 8-digit codes → exact-label lookup. */
const CPV_CODE_LABELED_DIMENSIONS: ReadonlySet<ProcurementAnalysisDimension> =
  new Set(['cpvCode', 'cpvGroup', 'cpvClass', 'cpvCategory'])

function rowLabel(
  bucket: RawProcurementBreakdownBucket,
  dimension: ProcurementAnalysisDimension,
  partyNames: ReadonlyMap<string, string>,
  divisions: readonly RawProcurementCpvDivision[],
  codeLabels: ReadonlyMap<string, string>,
): { readonly label: string | null; readonly secondaryLabel: string | null } {
  // other / unknown labels are translated in the rankings table UI.
  if (bucket.kind === 'other' || bucket.kind === 'unknown' || !bucket.key) {
    return { label: null, secondaryLabel: null }
  }

  if (dimension === 'authority' || dimension === 'supplier') {
    const name = partyNames.get(`${dimension}:${bucket.key}`)
    return {
      label: name ?? bucket.key,
      secondaryLabel: name ? bucket.key : null,
    }
  }

  if (dimension === 'cpvDivision') {
    const division = divisions.find((entry) => entry.divisionCode === bucket.key)
    const label =
      division?.labelRo ?? division?.labelEn ?? bucket.key
    return {
      label,
      secondaryLabel: division ? bucket.key : null,
    }
  }

  if (CPV_CODE_LABELED_DIMENSIONS.has(dimension)) {
    const label = codeLabels.get(bucket.key)
    return {
      label: label ?? bucket.key,
      secondaryLabel: label ? bucket.key : null,
    }
  }

  return { label: bucket.key, secondaryLabel: null }
}

async function loadCpvCodeLabels(
  buckets: readonly RawProcurementBreakdownBucket[],
): Promise<ReadonlyMap<string, string>> {
  const codes = buckets
    .map((bucket) => bucket.key)
    .filter((key): key is string => Boolean(key))
  if (codes.length === 0) return new Map()
  const raw = await graphqlQuery<unknown>(
    PROCUREMENT_CPV_CODES_QUERY,
    { codes },
    { operationName: 'ProcurementCpvCodes' },
  )
  const parsed = procurementCpvCodesResponseSchema.parse(raw)
  const labels = new Map<string, string>()
  for (const entry of parsed.procurementCpvCodes) {
    const label = entry.labelRo ?? entry.labelEn
    if (label) labels.set(entry.cpvCode, label)
  }
  return labels
}

async function loadPartyNamesForBuckets(
  dimension: 'authority' | 'supplier',
  buckets: readonly RawProcurementBreakdownBucket[],
): Promise<ReadonlyMap<string, string>> {
  const cuis = buckets
    .map((bucket) => bucket.key)
    .filter((key): key is string => Boolean(key))
  if (cuis.length === 0) return new Map()

  const raw = await graphqlQuery<unknown>(
    PROCUREMENT_PARTY_NAMES_QUERY,
    {
      authorityCuis: dimension === 'authority' ? cuis : [],
      supplierCuis: dimension === 'supplier' ? cuis : [],
      includeAuthorities: dimension === 'authority',
      includeSuppliers: dimension === 'supplier',
    },
    { operationName: 'ProcurementPartyNames' },
  )
  const parsed = procurementPartyNamesResponseSchema.parse(raw)
  const names = new Map<string, string>()
  for (const edge of parsed.authorities?.edges ?? []) {
    names.set(`authority:${edge.node.cui}`, edge.node.name)
  }
  for (const edge of parsed.suppliers?.edges ?? []) {
    names.set(`supplier:${edge.node.cui}`, edge.node.name)
  }
  return names
}

let cpvDivisionsCache: Promise<RawProcurementCpvDivision[]> | null = null

async function loadCpvDivisions(): Promise<RawProcurementCpvDivision[]> {
  if (!cpvDivisionsCache) {
    cpvDivisionsCache = graphqlQuery<unknown>(
      PROCUREMENT_CPV_DIVISIONS_QUERY,
      {},
      { operationName: 'ProcurementCpvDivisions' },
    )
      .then(
        (data) =>
          procurementCpvDivisionsResponseSchema.parse(data)
            .procurementCpvDivisions,
      )
      .catch((error: unknown) => {
        cpvDivisionsCache = null
        throw error
      })
  }
  return cpvDivisionsCache
}

/**
 * Fetch leaderboard rows (≤100) for the Rankings tab, count- or value-ranked.
 */
export async function fetchProcurementLeaderboard(
  request: ProcurementLeaderboardRequest,
): Promise<ProcurementLeaderboardResult> {
  const dimension = analysisDimension(request.rankDim, request.cpvLevel)
  const scope: ProcurementScopeFilterInput = buildScopeFilter(request.scope)

  const data = await graphqlQuery<unknown>(
    PROCUREMENT_ANALYSIS_QUERY,
    {
      scope,
      dimensions: [dimension],
      topN: PROCUREMENT_RANKINGS_TOP_N,
      rankBy: request.rankBy ?? 'count',
      bucket: 'year',
      measure: 'recordCount',
      basis: 'count',
      includeConcentration: request.includeConcentration ?? true,
    },
    { operationName: 'ProcurementAnalysis' },
  )
  const parsed = procurementAnalysisResponseSchema.parse(data)
  const grain = scope.grain
  const facetBlock = parsed.facets.blocks.find(
    (block) =>
      block.dimension === dimension &&
      (grain ? block.grain === grain : true),
  )
  const buckets = facetBlock?.buckets ?? []

  const [partyNames, divisions, codeLabels] = await Promise.all([
    dimension === 'authority' || dimension === 'supplier'
      ? loadPartyNamesForBuckets(dimension, buckets)
      : Promise.resolve(new Map<string, string>()),
    dimension === 'cpvDivision'
      ? loadCpvDivisions()
      : Promise.resolve([] as RawProcurementCpvDivision[]),
    CPV_CODE_LABELED_DIMENSIONS.has(dimension)
      ? loadCpvCodeLabels(buckets)
      : Promise.resolve(new Map<string, string>()),
  ])

  const rows: ProcurementLeaderboardRow[] = buckets.map((bucket) => {
    const { label, secondaryLabel } = rowLabel(
      bucket,
      dimension,
      partyNames,
      divisions,
      codeLabels,
    )
    return {
      key: bucket.key,
      label,
      secondaryLabel,
      bucketKind: bucket.kind,
      recordCount: bucket.recordCount ?? '0',
      // The population's ANCHOR money — awarded on core grains, the call-off
      // value on the calloff population, null on counts-only ones.
      valueAwardedSum: bucket.valueSum ?? bucket.valueAwardedSum,
      shareOfScope: bucket.shareOfScope,
    }
  })

  const concentration = grain
    ? parsed.concentration.find((block) => block.grain === grain)
    : parsed.concentration[0]

  return {
    rows,
    distinctSuppliers: concentration?.supplierCount ?? null,
    // Distinct institutions are not on the concentration payload yet.
    distinctAuthorities: null,
    topN: PROCUREMENT_RANKINGS_TOP_N,
    rankedBy: facetBlock?.rankedBy ?? null,
  }
}
