/**
 * Rankings leaderboard fetch — top-50 breakdown + concentration summary.
 *
 * TODO(ClickHouse / server offset pagination): replace client slice over
 * topN=50 with a real paginated leaderboard query (page/pageSize → server).
 * Until then, UI pagination only windows the honest top-50 payload.
 */
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_RANKINGS_TOP_N,
  type ProcurementCpvLevel,
  type ProcurementRankDim,
} from '@/schemas/procurement-hub'
import {
  PROCUREMENT_ANALYSIS_QUERY,
  PROCUREMENT_CPV_DIVISIONS_QUERY,
  PROCUREMENT_PARTY_NAMES_QUERY,
  procurementAnalysisResponseSchema,
  procurementCpvDivisionsResponseSchema,
  procurementPartyNamesResponseSchema,
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
}

export type ProcurementLeaderboardRequest = {
  readonly scope: Parameters<typeof buildScopeFilter>[0]
  readonly rankDim: ProcurementRankDim
  readonly cpvLevel: ProcurementCpvLevel
  /**
   * When true, skip party-dimension fetches (buyer geo honesty). Caller still
   * may request CPV.
   */
  readonly partyRankingsUnavailable?: boolean
}

function analysisDimension(
  rankDim: ProcurementRankDim,
  cpvLevel: ProcurementCpvLevel,
): ProcurementAnalysisDimension {
  if (rankDim === 'buyer') return 'authority'
  if (rankDim === 'supplier') return 'supplier'
  return cpvLevel === 'code' ? 'cpvCode' : 'cpvDivision'
}

function rowLabel(
  bucket: RawProcurementBreakdownBucket,
  dimension: ProcurementAnalysisDimension,
  partyNames: ReadonlyMap<string, string>,
  divisions: readonly RawProcurementCpvDivision[],
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

  return { label: bucket.key, secondaryLabel: null }
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
 * Fetch count-sorted leaderboard rows (≤50) for the Rankings tab.
 *
 * TODO(ClickHouse analytics): deeper rankings, value sort, and server offset
 * pagination are not served here — keep topN API-honest.
 */
export async function fetchProcurementLeaderboard(
  request: ProcurementLeaderboardRequest,
): Promise<ProcurementLeaderboardResult> {
  const dimension = analysisDimension(request.rankDim, request.cpvLevel)
  const partyUnavailable =
    Boolean(request.partyRankingsUnavailable) &&
    (dimension === 'authority' || dimension === 'supplier')

  if (partyUnavailable) {
    return {
      rows: [],
      distinctSuppliers: null,
      distinctAuthorities: null,
      topN: PROCUREMENT_RANKINGS_TOP_N,
    }
  }

  const scope: ProcurementScopeFilterInput = buildScopeFilter(request.scope)

  // TODO(ClickHouse / server offset pagination): topN is capped at 50 by the
  // GraphQL analysis layer. Do not invent rows past the payload.
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_ANALYSIS_QUERY,
    {
      scope,
      dimensions: [dimension],
      topN: PROCUREMENT_RANKINGS_TOP_N,
      bucket: 'year',
      measure: 'recordCount',
      basis: 'count',
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

  const [partyNames, divisions] = await Promise.all([
    dimension === 'authority' || dimension === 'supplier'
      ? loadPartyNamesForBuckets(dimension, buckets)
      : Promise.resolve(new Map<string, string>()),
    dimension === 'cpvDivision' || dimension === 'cpvCode'
      ? loadCpvDivisions()
      : Promise.resolve([] as RawProcurementCpvDivision[]),
  ])

  const rows: ProcurementLeaderboardRow[] = buckets.map((bucket) => {
    const { label, secondaryLabel } = rowLabel(
      bucket,
      dimension,
      partyNames,
      divisions,
    )
    return {
      key: bucket.key,
      label,
      secondaryLabel,
      bucketKind: bucket.kind,
      recordCount: bucket.recordCount ?? '0',
      valueAwardedSum: bucket.valueAwardedSum,
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
  }
}
