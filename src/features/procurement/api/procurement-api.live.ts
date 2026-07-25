/**
 * Live procurement data via the redesign GraphQL API. Mirrors the parliament
 * module: every request goes through the shared `graphqlQuery` transport, raw
 * responses are Zod-parsed, then mapped onto the UI's procurement types.
 *
 * Contract: the running redesign endpoint at `/api/v1/graphql`. Procurement is
 * live-only: failures surface to the caller and are never replaced by fixtures.
 *
 * Fields with no live backing are served as clearly-empty values by the
 * mappers (`crossDomain: null`, `perLotWinners`/`ted` only when the server
 * sends them) — documented gaps, never fabrication.
 */
import type {
  AuthorityProcurementSlice,
  CategoryRow,
  ContractRecord,
  CpvCategoryPage,
  DirectAcquisitionRecord,
  MonthlyPoint,
  ProcedureRecord,
  ProcurementAnswerMeta,
  ProcurementInstitutionOverview,
  ProcurementInstitutionPopulation,
  ProcurementLanding,
  ProcurementRecordDetail,
  ProcurementRecordSummary,
  ProcurementSearchPage,
  ProcurementStatsBlock,
  SupplierProcurementSlice,
  SupplierRecordsPage,
  TopPartyRow,
} from '@/schemas/procurement'
import {
  procurementInstitutionOverviewSchema,
  procurementSourceSystemSchema,
} from '@/schemas/procurement'
import {
  withProcurementSearchDefaults,
  type ProcurementSearchState,
} from '@/schemas/procurement-search'
import {
  buildProcurementOverviewMonthScope,
  type ProcurementLandingFilters,
} from '@/schemas/procurement-overview'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_AGGREGATES_QUERY,
  PROCUREMENT_CONTRACT_DETAIL_QUERY,
  PROCUREMENT_CONTRACTS_QUERY,
  PROCUREMENT_CPV_DIVISIONS_QUERY,
  PROCUREMENT_DA_DETAIL_QUERY,
  PROCUREMENT_DIRECT_ACQUISITIONS_QUERY,
  PROCUREMENT_INSTITUTION_SPINE_QUERY,
  PROCUREMENT_MODIFICATIONS_QUERY,
  PROCUREMENT_PARTY_NAMES_QUERY,
  PROCUREMENT_PROCEDURE_DETAIL_QUERY,
  PROCUREMENT_PROCEDURES_QUERY,
  PROCUREMENT_SUPPLIER_RECORDS_QUERY,
  procurementAggregatesResponseSchema,
  procurementContractDetailResponseSchema,
  procurementContractsResponseSchema,
  procurementCpvDivisionsResponseSchema,
  procurementDaDetailResponseSchema,
  procurementDirectAcquisitionsResponseSchema,
  procurementInstitutionSpineResponseSchema,
  procurementModificationsResponseSchema,
  procurementPartyNamesResponseSchema,
  procurementProcedureDetailResponseSchema,
  procurementProceduresResponseSchema,
  procurementSupplierRecordsResponseSchema,
  type RawProcurementCpvDivision,
  type RawProcurementAggregates,
  type RawProcurementStatsBlock,
} from './graphql/procurement-queries'
import {
  mapAnswerMeta,
  mapAuthoritySlice,
  mapCategoryBucket,
  mapContract,
  mapCpvCategoryPage,
  mapDirectAcquisition,
  mapLanding,
  mapModification,
  mapModificationTrailEntry,
  mapMonthly,
  mapPartyBucket,
  mapProcedure,
  mapSearchPage,
  mapStats,
  mapSupplierRecords,
  mapSupplierSlice,
} from './graphql/procurement-mappers'
import {
  buildContractsFilter,
  buildDirectAcquisitionsFilter,
  buildModificationsFilter,
  buildProceduresFilter,
  buildProcurementSort,
  buildScopeFilter,
  type ProcurementScopeFilterInput,
} from './graphql/procurement-filters'
import {
  resetProcurementReferenceCacheForTests,
} from './procurement-reference-api'

/**
 * Rows per aggregate ranking on overview/landing surfaces (server cap is 100).
 * Deeper, value-sorted leaderboards live on the Rankings hub (rankBy + top-100);
 * landing keeps a compact top-10 and never pads with mock rows (B1, 2026-07).
 */
const TOP_N = 10
/** Procedure types are a short closed vocabulary (11 tokens observed live). */
const INSTITUTION_PROCEDURE_MIX_TOP_N = 12
/** Supplier "load more" connection page size. */
const SUPPLIER_RECORDS_PAGE_SIZE = 20

// ── shared CPV taxonomy cache ───────────────────────────────────────────────

let cpvDivisionsCache: Promise<RawProcurementCpvDivision[]> | null = null
const partyNameCache = new Map<string, string | null>()

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

async function loadAggregates(
  scope: ProcurementScopeFilterInput,
  options: {
    readonly includeAuthorities?: boolean
    readonly includeSuppliers?: boolean
    readonly includeCategories?: boolean
    readonly rankBy?: 'count' | 'value'
  } = {},
) {
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_AGGREGATES_QUERY,
    {
      scope,
      topN: TOP_N,
      rankBy: options.rankBy ?? 'count',
      includeAuthorities: options.includeAuthorities ?? true,
      includeSuppliers: options.includeSuppliers ?? true,
      includeCategories: options.includeCategories ?? true,
    },
    { operationName: 'ProcurementAggregates' },
  )
  return procurementAggregatesResponseSchema.parse(data)
}

type PartyDimension = 'authority' | 'supplier'

/**
 * Breakdown buckets intentionally carry stable dimension keys only. Resolve
 * those keys through procurement's own bounded resolver in one GraphQL
 * operation. This keeps the procurement page independent of the unrelated
 * reference/company profile databases and avoids an N+1 request pattern.
 */
async function loadPartyNames(
  aggregates: RawProcurementAggregates,
): Promise<ReadonlyMap<string, string>> {
  const requested = new Map<string, { readonly dimension: PartyDimension; readonly cui: string }>()

  for (const [dimension, blocks] of [
    ['authority', aggregates.authorities],
    ['supplier', aggregates.suppliers],
  ] as const) {
    for (const block of blocks) {
      for (const bucket of block.buckets ?? []) {
        if (bucket.key === null) continue
        const cacheKey = `${dimension}:${bucket.key}`
        if (!partyNameCache.has(cacheKey)) {
          requested.set(cacheKey, { dimension, cui: bucket.key })
        }
      }
    }
  }

  if (requested.size > 0) {
    const authorityCuis = [...requested.values()]
      .filter((request) => request.dimension === 'authority')
      .map((request) => request.cui)
    const supplierCuis = [...requested.values()]
      .filter((request) => request.dimension === 'supplier')
      .map((request) => request.cui)
    const raw = await graphqlQuery<unknown>(
      PROCUREMENT_PARTY_NAMES_QUERY,
      {
        authorityCuis,
        supplierCuis,
        includeAuthorities: authorityCuis.length > 0,
        includeSuppliers: supplierCuis.length > 0,
      },
      {
      operationName: 'ProcurementPartyNames',
      },
    )
    const parsed = procurementPartyNamesResponseSchema.parse(raw)
    for (const cacheKey of requested.keys()) partyNameCache.set(cacheKey, null)
    // Positional correlation, per role: the server returns the NORMALIZED
    // identifier (null when unavailable), so the response cui is not a safe
    // cache key for an input that was formatted differently.
    //
    // `named` only — a spine `placeholder` stores the CUI as its name, and
    // caching that would print a number where a name belongs.
    const cacheNames = (
      labels: ReadonlyArray<{
        readonly canonicalName: string | null
        readonly status: string
      }>,
      sent: readonly string[],
      dimension: 'authority' | 'supplier',
    ): void => {
      labels.forEach((label, index) => {
        const requestedCui = sent[index]
        if (requestedCui === undefined) return
        if (label.status === 'named' && label.canonicalName !== null) {
          partyNameCache.set(`${dimension}:${requestedCui}`, label.canonicalName)
        }
      })
    }
    cacheNames(parsed.authorities ?? [], authorityCuis, 'authority')
    cacheNames(parsed.suppliers ?? [], supplierCuis, 'supplier')
  }

  return new Map(
    [...partyNameCache].filter(
      (entry): entry is [string, string] => entry[1] !== null,
    ),
  )
}

// ── landing ─────────────────────────────────────────────────────────────────

/**
 * A facet breakdown over a dimension the scope already fixes is a single
 * bucket the server rejects — skip exactly those dimensions (C1, 2026-07-24).
 */
function landingFacetFlags(filters: ProcurementLandingFilters): {
  readonly includeAuthorities: boolean
  readonly includeSuppliers: boolean
  readonly includeCategories: boolean
} {
  const cpvFixed = Boolean(
    filters.cpvDivision ||
      filters.cpvGroup ||
      filters.cpvClass ||
      filters.cpvCategory ||
      filters.cpvCode,
  )
  return {
    includeAuthorities: !filters.authorityCui,
    includeSuppliers: !filters.supplierCui,
    includeCategories: !cpvFixed,
  }
}

function landingScope(
  filters: ProcurementLandingFilters,
): ProcurementScopeFilterInput {
  return buildScopeFilter({
    ...buildProcurementOverviewMonthScope(filters),
    buyerRegion: filters.buyerRegion,
    buyerCounty: filters.buyerCounty,
    buyerSiruta: filters.buyerSiruta,
    supplierCounty: filters.supplierCounty,
    supplierRegion: filters.supplierRegion,
    supplierSiruta: filters.supplierSiruta,
    q: filters.q,
    valueMin: filters.valueMin,
    valueMax: filters.valueMax,
    authorityCui: filters.authorityCui,
    supplierCui: filters.supplierCui,
    cpvDivision: filters.cpvDivision,
    cpvGroup: filters.cpvGroup,
    cpvClass: filters.cpvClass,
    cpvCategory: filters.cpvCategory,
    cpvCode: filters.cpvCode,
    grain: filters.grain,
  })
}

// ── value-basis overview (design v1.1) ──────────────────────────────────────

/**
 * One analytics bundle for a NON-default value logic: stats + the population's
 * allowed breakdowns + count/value series, all on ONE explicit grain. The
 * default awarded state stays on the untouched landing pipeline.
 */
export type ProcurementBasisOverviewRequest = {
  /** Explicit server population (already resolved by the value-basis plan). */
  readonly analysisGrain:
    | 'procedure'
    | 'contract'
    | 'direct_acquisition'
    | 'framework'
    | 'calloff'
    | 'modification'
  /** Value measure for tiles + the value series; null = counts-only. */
  readonly valueMeasure:
    | 'valueAwardedSum'
    | 'valueEstimatedSum'
    | 'valueCeilingSum'
    | 'valueModAdjustedSum'
    | null
  readonly breakdowns: 'anchor' | 'counts-only' | 'withheld'
  readonly supplierDimension: boolean
  /** Hub scope input — ALREADY scrubbed for this population (never raw state). */
  readonly scope: Parameters<typeof buildScopeFilter>[0]
  readonly rankBy?: 'count' | 'value'
}

export type ProcurementBasisAnalytics = {
  readonly grain: ProcurementBasisOverviewRequest['analysisGrain']
  readonly stats: ProcurementStatsBlock
  readonly topAuthorities: readonly TopPartyRow[]
  readonly topSuppliers: readonly TopPartyRow[]
  readonly topCategories: readonly CategoryRow[]
  readonly monthly: readonly MonthlyPoint[]
  readonly meta: {
    readonly authoritiesRankedBy: 'count' | 'value' | null
    readonly suppliersRankedBy: 'count' | 'value' | null
    readonly categoriesRankedBy: 'count' | 'value' | null
    readonly authorities: ProcurementAnswerMeta | null
    readonly suppliers: ProcurementAnswerMeta | null
    readonly categories: ProcurementAnswerMeta | null
    readonly recordSeries: ProcurementAnswerMeta
    /** Null on counts-only populations (no value series requested). */
    readonly valueSeries: ProcurementAnswerMeta | null
  }
}

export async function fetchProcurementBasisOverviewLive(
  request: ProcurementBasisOverviewRequest,
): Promise<ProcurementBasisAnalytics> {
  const scope = buildScopeFilter({ ...request.scope, grain: request.analysisGrain })
  const cpvFixed = Boolean(
    scope.cpvDivision ||
      scope.cpvGroup ||
      scope.cpvClass ||
      scope.cpvCategory ||
      scope.cpvCode,
  )
  const includeBreakdowns = request.breakdowns !== 'withheld'
  const includeAuthorities = includeBreakdowns && !scope.authorityCui
  const includeSuppliers =
    includeBreakdowns && request.supplierDimension && !scope.supplierCui
  const includeCategories = includeBreakdowns && !cpvFixed
  const includeValueSeries = request.valueMeasure !== null

  const data = await graphqlQuery<unknown>(
    PROCUREMENT_AGGREGATES_QUERY,
    {
      scope,
      topN: TOP_N,
      // Counts-only populations have no money to rank on.
      rankBy:
        request.breakdowns === 'counts-only' ? 'count' : (request.rankBy ?? 'count'),
      includeAuthorities,
      includeSuppliers,
      includeCategories,
      // $valueMeasure is non-null; any legal token works when the series is off.
      valueMeasure: request.valueMeasure ?? 'recordCount',
      includeValueSeries,
    },
    { operationName: 'ProcurementAggregates' },
  )
  const aggregates = procurementAggregatesResponseSchema.parse(data)
  const [divisions, partyNames] = await Promise.all([
    includeCategories
      ? loadCpvDivisions()
      : Promise.resolve([] as RawProcurementCpvDivision[]),
    loadPartyNames(aggregates),
  ])

  const grain = request.analysisGrain
  const statsRaw = aggregates.procurementStats.blocks.find(
    (block) => block.grain === grain,
  )
  const recordSeries = aggregates.recordSeries.find(
    (block) => block.grain === grain,
  )
  if (!statsRaw || !recordSeries) {
    throw new Error(`procurement basis overview is missing the ${grain} block`)
  }
  const valueSeries = includeValueSeries
    ? aggregates.valueSeries.find((block) => block.grain === grain)
    : undefined
  const authorities = aggregates.authorities.find((block) => block.grain === grain)
  const suppliers = aggregates.suppliers.find((block) => block.grain === grain)
  const categories = aggregates.categories.find((block) => block.grain === grain)
  const rankedBy = (value: string | null | undefined) =>
    value === 'count' || value === 'value' ? value : null

  return {
    grain,
    stats: mapStats(statsRaw),
    topAuthorities: (authorities?.buckets ?? []).map((bucket) =>
      mapPartyBucket(bucket, grain, 'authority', partyNames),
    ),
    topSuppliers: (suppliers?.buckets ?? []).map((bucket) =>
      mapPartyBucket(bucket, grain, 'supplier', partyNames),
    ),
    topCategories: (categories?.buckets ?? []).map((bucket) =>
      mapCategoryBucket(bucket, grain, divisions),
    ),
    monthly: mapMonthly(recordSeries, valueSeries),
    meta: {
      authoritiesRankedBy: rankedBy(authorities?.rankedBy),
      suppliersRankedBy: rankedBy(suppliers?.rankedBy),
      categoriesRankedBy: rankedBy(categories?.rankedBy),
      authorities: authorities ? mapAnswerMeta(authorities.meta) : null,
      suppliers: suppliers ? mapAnswerMeta(suppliers.meta) : null,
      categories: categories ? mapAnswerMeta(categories.meta) : null,
      recordSeries: mapAnswerMeta(recordSeries.meta),
      valueSeries: valueSeries ? mapAnswerMeta(valueSeries.meta) : null,
    },
  }
}

export async function fetchProcurementLandingLive(
  filters: ProcurementLandingFilters = {},
): Promise<ProcurementLanding> {
  // Buyer county/UAT + party/CPV scope natively (ClickHouse analytics) —
  // scope-fixed facet dimensions are skipped, never re-requested.
  const scope = landingScope(filters)
  const facetFlags = landingFacetFlags(filters)
  const [aggregates, divisions] = await Promise.all([
    loadAggregates(scope, {
      ...facetFlags,
      rankBy: filters.rankBy,
    }),
    loadCpvDivisions(),
  ])
  const partyNames = await loadPartyNames(aggregates)
  return mapLanding({ aggregates, divisions, partyNames })
}

/**
 * Map territory drawer overview — same landing payload shape, but requests
 * party rankings under geography as if the serving API retains keys.
 *
 * Party rankings under geography are served by the ClickHouse analytics
 * backend (dev, 2026-07-22).
 */
export async function fetchProcurementTerritoryOverviewLive(
  filters: ProcurementLandingFilters = {},
): Promise<ProcurementLanding> {
  const scope = landingScope(filters)
  const facetFlags = landingFacetFlags(filters)
  const [aggregates, divisions] = await Promise.all([
    loadAggregates(scope, {
      ...facetFlags,
      rankBy: filters.rankBy,
    }),
    loadCpvDivisions(),
  ])
  const partyNames = await loadPartyNames(aggregates)
  return mapLanding({ aggregates, divisions, partyNames })
}

// ── search ──────────────────────────────────────────────────────────────────

type SearchPageResult = {
  records: ProcurementRecordSummary[]
  total: number | null
  provenance?: { engine: string; asOf: string | null } | null
  facets?: ReadonlyArray<{
    dimension: string
    otherCount: number
    buckets: ReadonlyArray<{ key: string; count: number }>
  }>
  highlights?: ReadonlyArray<{
    id: string
    title?: string | null
    authorityName?: string | null
    supplierName?: string | null
  }>
}

/**
 * Result-set facets requested with every engine-served page: how the CURRENT
 * result set splits by territory, status and value quality. Cheap (one
 * aggregation pass over the same filtered set) and per-grain validated by the
 * server, which rejects a dimension the grain does not carry.
 */
const SEARCH_FACETS_BY_GRAIN: Readonly<Record<string, readonly string[]>> = {
  procedures: ['buyerCounty', 'status', 'valueState'],
  contracts: ['buyerCounty', 'supplierCounty', 'status', 'valueState'],
  direct_acquisitions: ['buyerCounty', 'supplierCounty', 'status', 'valueState'],
}

async function fetchSearchRecords(
  params: ProcurementSearchState,
): Promise<SearchPageResult> {
  const variables = {
    sort: buildProcurementSort(params),
    page: params.page,
    pageSize: params.pageSize,
    facets: SEARCH_FACETS_BY_GRAIN[params.grain] ?? [],
  }
  switch (params.grain) {
    case 'procedures': {
      const data = await graphqlQuery<unknown>(
        PROCUREMENT_PROCEDURES_QUERY,
        { ...variables, filter: buildProceduresFilter(params) },
        { operationName: 'ProcurementProcedures' },
      )
      const page =
        procurementProceduresResponseSchema.parse(data).procurementProcedures
      return {
        records: page.items.map(mapProcedure),
        total: page.total,
        provenance: page.provenance ?? null,
        ...(page.facets ? { facets: page.facets } : {}),
        ...(page.highlights ? { highlights: page.highlights } : {}),
      }
    }
    case 'contracts': {
      const data = await graphqlQuery<unknown>(
        PROCUREMENT_CONTRACTS_QUERY,
        { ...variables, filter: buildContractsFilter(params) },
        { operationName: 'ProcurementContracts' },
      )
      const page =
        procurementContractsResponseSchema.parse(data).procurementContracts
      return {
        records: page.items.map(mapContract),
        total: page.total,
        provenance: page.provenance ?? null,
        ...(page.facets ? { facets: page.facets } : {}),
        ...(page.highlights ? { highlights: page.highlights } : {}),
      }
    }
    case 'direct_acquisitions': {
      const data = await graphqlQuery<unknown>(
        PROCUREMENT_DIRECT_ACQUISITIONS_QUERY,
        { ...variables, filter: buildDirectAcquisitionsFilter(params) },
        { operationName: 'ProcurementDirectAcquisitions' },
      )
      const page = procurementDirectAcquisitionsResponseSchema.parse(data)
        .procurementDirectAcquisitions
      return {
        records: page.items.map(mapDirectAcquisition),
        total: page.total,
        provenance: page.provenance ?? null,
        ...(page.facets ? { facets: page.facets } : {}),
        ...(page.highlights ? { highlights: page.highlights } : {}),
      }
    }
    case 'modifications': {
      const data = await graphqlQuery<unknown>(
        PROCUREMENT_MODIFICATIONS_QUERY,
        { ...variables, filter: buildModificationsFilter(params) },
        { operationName: 'ProcurementModifications' },
      )
      const page =
        procurementModificationsResponseSchema.parse(data)
          .procurementModifications
      return {
        records: page.items.map(mapModification),
        total: page.total,
        provenance: page.provenance ?? null,
      }
    }
  }
}

export async function fetchProcurementSearchLive(
  params: ProcurementSearchState,
): Promise<ProcurementSearchPage> {
  const { records, total, provenance, facets, highlights } =
    await fetchSearchRecords(params)
  return mapSearchPage({
    grain: params.grain,
    records,
    total,
    page: params.page,
    pageSize: params.pageSize,
    provenance,
    ...(facets !== undefined && { facets }),
    ...(highlights !== undefined && { highlights }),
  })
}

// ── detail ──────────────────────────────────────────────────────────────────

function mapDuplicates(
  duplicates: ReadonlyArray<{ sourceSystem: string; id: string }>,
) {
  return duplicates.map((ref) => ({
    sourceSystem: procurementSourceSystemSchema.parse(ref.sourceSystem),
    id: ref.id,
  }))
}

export async function fetchProcedureDetailLive(
  id: string,
): Promise<ProcurementRecordDetail<ProcedureRecord> | null> {
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_PROCEDURE_DETAIL_QUERY,
    { id },
    { operationName: 'ProcurementProcedureDetail' },
  )
  const detail =
    procurementProcedureDetailResponseSchema.parse(data).procurementProcedure
  if (detail === null) return null
  return {
    record: mapProcedure(detail.procedure),
    related: {
      procedure: null,
      contracts: detail.contracts.map(mapContract),
      modifications: [],
      duplicates: mapDuplicates(detail.duplicates),
      perLotWinners: detail.perLotWinners,
      ted: detail.ted,
    },
  }
}

export async function fetchContractDetailLive(
  id: string,
): Promise<ProcurementRecordDetail<ContractRecord> | null> {
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_CONTRACT_DETAIL_QUERY,
    { id },
    { operationName: 'ProcurementContractDetail' },
  )
  const detail =
    procurementContractDetailResponseSchema.parse(data).procurementContract
  if (detail === null) return null
  return {
    record: mapContract(detail.contract),
    related: {
      procedure: detail.procedure ? mapProcedure(detail.procedure) : null,
      contracts: [],
      modifications: (detail.contract.modifications ?? []).map(
        mapModificationTrailEntry,
      ),
      duplicates: mapDuplicates(detail.duplicates),
      perLotWinners: null,
      ted: detail.ted,
    },
  }
}

export async function fetchDirectAcquisitionDetailLive(
  id: string,
): Promise<ProcurementRecordDetail<DirectAcquisitionRecord> | null> {
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_DA_DETAIL_QUERY,
    { id },
    { operationName: 'ProcurementDirectAcquisitionDetail' },
  )
  const detail = procurementDaDetailResponseSchema.parse(data)
    .procurementDirectAcquisition
  if (detail === null) return null
  return {
    record: mapDirectAcquisition(detail.directAcquisition),
    related: {
      procedure: null,
      contracts: [],
      modifications: [],
      duplicates: mapDuplicates(detail.duplicates),
      perLotWinners: null,
      ted: null,
    },
  }
}

// ── CPV category page ───────────────────────────────────────────────────────

export async function fetchCpvCategoryPageLive(
  code: string,
): Promise<CpvCategoryPage | null> {
  const scope = buildScopeFilter(
    code.length === 2 ? { cpvDivision: code } : { cpvCode: code },
  )
  const [aggregates, divisions] = await Promise.all([
    loadAggregates(scope, { includeCategories: false }),
    loadCpvDivisions(),
  ])
  const partyNames = await loadPartyNames(aggregates)
  return mapCpvCategoryPage({ code, divisions, aggregates, partyNames })
}

// ── supplier slice + records ────────────────────────────────────────────────

export async function fetchSupplierRecordsLive(
  cui: string,
  after?: string,
): Promise<SupplierRecordsPage> {
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_SUPPLIER_RECORDS_QUERY,
    {
      supplierCui: cui,
      first: SUPPLIER_RECORDS_PAGE_SIZE,
      after: after ?? null,
    },
    { operationName: 'ProcurementSupplierRecords' },
  )
  return mapSupplierRecords(
    procurementSupplierRecordsResponseSchema.parse(data)
      .procurementSupplierRecords,
  )
}

export async function fetchSupplierProcurementSliceLive(
  cui: string,
  scope: ProcurementSliceScope = {},
): Promise<SupplierProcurementSlice> {
  const [aggregates, divisions, recentRecords, supplierName] =
    await Promise.all([
      loadAggregates(buildScopeFilter({ supplierCui: cui, ...scope }), {
        includeSuppliers: false,
        // A dimension the scope already pins is not a breakdown; the server
        // rejects `breakdown(cpvDivision)` under a cpvDivision scope.
        includeCategories: scope.cpvDivision === undefined,
        // Money order; the gate reports what it could actually serve.
        rankBy: 'value',
      }),
      loadCpvDivisions(),
      fetchSupplierRecordsLive(cui),
      resolvePartyName(cui, 'supplier'),
    ])
  const partyNames = new Map(await loadPartyNames(aggregates))
  if (supplierName) {
    partyNames.set(`supplier:${cui}`, supplierName)
  }
  return mapSupplierSlice({
    supplierCui: cui,
    supplierName,
    aggregates,
    divisions,
    recentRecords,
    partyNames,
  })
}

/** Recent contracts for an authority (first page) — used on institution pages. */
const AUTHORITY_RECENT_PAGE_SIZE = 10

/** Anchor money measure per population — never borrowed across populations. */
const INSTITUTION_ANCHOR_MEASURE: Record<
  ProcurementInstitutionPopulation['grain'],
  keyof ProcurementStatsBlock | null
> = {
  procedure: 'valueAwardedSum',
  contract: 'valueAwardedSum',
  direct_acquisition: 'valueAwardedSum',
  framework: 'valueCeilingSum',
  calloff: 'valueAwardedSum',
  // Counts-only: raw amendment deltas are quality-relabeled, not servable money.
  modification: null,
}

/** Exact RON decimal subtraction over the server's fixed 2-decimal strings. */
function subtractRon(a: string, b: string): string {
  const toBani = (value: string): bigint => {
    const [whole, fraction = ''] = value.split('.')
    const cents = `${fraction}00`.slice(0, 2)
    const magnitude = BigInt(`${whole.replace('-', '')}${cents}`)
    return whole.startsWith('-') ? -magnitude : magnitude
  }
  const delta = toBani(a) - toBani(b)
  const sign = delta < 0n ? '-' : ''
  const abs = delta < 0n ? -delta : delta
  return `${sign}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`
}

/**
 * The buyer profile's spine: all six populations plus the four signals, in one
 * round trip. `scopes` carries a per-grain scrubbed scope (the caller applies
 * `scrubScopeForAnalysisGrain`) because populations reject dimensions they do
 * not carry.
 */
export type ProcurementInstitutionScopes = Record<
  ProcurementInstitutionPopulation['grain'],
  Record<string, unknown>
>

export async function fetchProcurementInstitutionOverviewLive(request: {
  readonly authorityCui: string
  readonly scopes: ProcurementInstitutionScopes
}): Promise<ProcurementInstitutionOverview> {
  const authorityCui = request.authorityCui.trim()
  const scopeFor = (grain: ProcurementInstitutionPopulation['grain']) =>
    buildScopeFilter({ ...request.scopes[grain], authorityCui, grain })

  const [raw, authorityName] = await Promise.all([
    graphqlQuery<unknown>(
      PROCUREMENT_INSTITUTION_SPINE_QUERY,
      {
        procedureScope: scopeFor('procedure'),
        contractScope: scopeFor('contract'),
        daScope: scopeFor('direct_acquisition'),
        modificationScope: scopeFor('modification'),
        frameworkScope: scopeFor('framework'),
        calloffScope: scopeFor('calloff'),
        procedureMixTopN: INSTITUTION_PROCEDURE_MIX_TOP_N,
      },
      { operationName: 'ProcurementInstitutionSpine' },
    ),
    resolvePartyName(authorityCui, 'authority'),
  ])
  const spine = procurementInstitutionSpineResponseSchema.parse(raw)

  const blockFor = (
    grain: ProcurementInstitutionPopulation['grain'],
    holder: { blocks: readonly RawProcurementStatsBlock[] },
  ): ProcurementInstitutionPopulation | null => {
    const found = holder.blocks.find((block) => block.grain === grain)
    if (!found) return null
    const stats = mapStats(found)
    const anchorMeasure = INSTITUTION_ANCHOR_MEASURE[grain]
    const anchorValue =
      anchorMeasure === null
        ? null
        : ((stats[anchorMeasure] as string | null | undefined) ?? null)
    return {
      grain,
      recordCount: stats.recordCount,
      anchorMeasure,
      anchorValueRon: anchorValue,
      stats,
    }
  }

  const populations = [
    blockFor('procedure', spine.procedures),
    blockFor('contract', spine.contracts),
    blockFor('direct_acquisition', spine.directAcquisitions),
    blockFor('modification', spine.modifications),
    blockFor('framework', spine.frameworks),
    blockFor('calloff', spine.calloffs),
  ].filter((entry): entry is ProcurementInstitutionPopulation => entry !== null)

  const contract = populations.find((entry) => entry.grain === 'contract')
  const framework = populations.find((entry) => entry.grain === 'framework')
  const calloff = populations.find((entry) => entry.grain === 'calloff')

  const concentrationBlock = spine.concentration[0]
  const matched = contract?.stats.valueAwardedMatchedSum ?? null
  const adjusted = contract?.stats.valueModAdjustedSum ?? null
  const amendmentVerdict = contract?.stats.moneyVerdicts.find(
    (entry) => entry.measure === 'valueModAdjustedSum',
  )

  return procurementInstitutionOverviewSchema.parse({
    authorityCui,
    authorityName,
    populations,
    signals: {
      concentration: concentrationBlock
        ? {
            supplierCount: concentrationBlock.supplierCount,
            top1Share: concentrationBlock.top1Share,
            top5Share: concentrationBlock.top5Share,
            hhi: concentrationBlock.hhi,
            totalRon: concentrationBlock.totalRon,
            meta: mapAnswerMeta(concentrationBlock.meta),
          }
        : null,
      procedureMix: (spine.procedureMix[0]?.buckets ?? []).map((bucket) => ({
        key: bucket.key,
        kind: bucket.kind,
        recordCount: bucket.recordCount,
        valueRon: bucket.valueSum,
      })),
      // Both legs come from ONE population, so the difference is the amendment
      // effect and nothing else; withheld together when the basis abstains.
      amendment:
        matched !== null && adjusted !== null
          ? {
              matchedRon: matched,
              adjustedRon: adjusted,
              deltaRon: subtractRon(adjusted, matched),
              answerability: amendmentVerdict?.answerability ?? 'served',
            }
          : null,
      frameworkExposure:
        framework || calloff
          ? {
              frameworkCount: framework?.recordCount ?? null,
              ceilingRon: framework?.stats.valueCeilingSum ?? null,
              calloffCount: calloff?.recordCount ?? null,
              calloffRon: calloff?.stats.valueAwardedSum ?? null,
            }
          : null,
    },
  })
}

/** Optional slice scope — the institution page's year/CPV quick filters. */
/**
 * Quick-filter scope shared by the buyer and supplier profiles: a calendar
 * period and one CPV division, the two filters both pages expose in the URL.
 */
export type ProcurementSliceScope = {
  readonly monthFrom?: string
  readonly monthTo?: string
  readonly cpvDivision?: string
}

export type ProcurementAuthoritySliceScope = ProcurementSliceScope

/** 'YYYY-MM' → the month's last day as 'YYYY-MM-DD' (search dates are inclusive). */
function monthToEndDate(month: string): string {
  const [year, mm] = month.split('-').map(Number)
  return new Date(Date.UTC(year, mm, 0)).toISOString().slice(0, 10)
}

export async function fetchAuthorityProcurementSliceLive(
  cui: string,
  scope: ProcurementAuthoritySliceScope = {},
): Promise<AuthorityProcurementSlice> {
  const authorityCui = cui.trim()
  const [aggregates, divisions, recentPage, authorityName] = await Promise.all([
    loadAggregates(buildScopeFilter({ authorityCui, ...scope }), {
      includeAuthorities: false,
      // A dimension the scope already pins is not a breakdown — the server
      // rejects `breakdown(cpvDivision)` under a cpvDivision scope outright,
      // which failed the whole slice the moment a category filter was applied.
      includeCategories: scope.cpvDivision === undefined,
      // Ask for money order; the gate answers with what it could actually
      // serve (`rankedBy`), and the cards label themselves from that rather
      // than assuming the request was honoured.
      rankBy: 'value',
    }),
    loadCpvDivisions(),
    fetchProcurementSearchLive(
      withProcurementSearchDefaults({
        grain: 'contracts',
        authority_cui: authorityCui,
        ...(scope.monthFrom ? { dateFrom: `${scope.monthFrom}-01` } : {}),
        ...(scope.monthTo ? { dateTo: monthToEndDate(scope.monthTo) } : {}),
        ...(scope.cpvDivision ? { cpv_division: scope.cpvDivision } : {}),
        sort: 'date_desc',
        page: 1,
        pageSize: AUTHORITY_RECENT_PAGE_SIZE,
      }),
    ),
    resolvePartyName(authorityCui, 'authority'),
  ])
  const partyNames = new Map(await loadPartyNames(aggregates))
  if (authorityName) {
    partyNames.set(`authority:${authorityCui}`, authorityName)
  }
  return mapAuthoritySlice({
    authorityCui,
    aggregates,
    divisions,
    recentRecords: recentPage.records,
    partyNames,
  })
}

/**
 * Canonical name for one party from the identity spine. Only a `named` status
 * yields a label — an unresolved CUI stays a CUI rather than borrowing a
 * candidate name.
 */
async function resolvePartyName(
  cui: string,
  dimension: PartyDimension,
): Promise<string | null> {
  const cacheKey = `${dimension}:${cui}`
  if (partyNameCache.has(cacheKey)) {
    return partyNameCache.get(cacheKey) ?? null
  }
  const isAuthority = dimension === 'authority'
  const raw = await graphqlQuery<unknown>(
    PROCUREMENT_PARTY_NAMES_QUERY,
    {
      authorityCuis: isAuthority ? [cui] : [],
      supplierCuis: isAuthority ? [] : [cui],
      includeAuthorities: isAuthority,
      includeSuppliers: !isAuthority,
    },
    { operationName: 'ProcurementPartyNames' },
  )
  const parsed = procurementPartyNamesResponseSchema.parse(raw)
  const label = (isAuthority ? parsed.authorities : parsed.suppliers)?.[0]
  const name = label?.status === 'named' ? (label.canonicalName ?? null) : null
  partyNameCache.set(cacheKey, name)
  return name
}

// ── test hooks ──────────────────────────────────────────────────────────────

/** Reset the module-level caches (unit tests only). */
export function resetProcurementLiveCachesForTests(): void {
  cpvDivisionsCache = null
  partyNameCache.clear()
  resetProcurementReferenceCacheForTests()
}
