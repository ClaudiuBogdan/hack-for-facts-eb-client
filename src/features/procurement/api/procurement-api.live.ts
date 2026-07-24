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
  ContractRecord,
  CpvCategoryPage,
  DirectAcquisitionRecord,
  ProcedureRecord,
  ProcurementLanding,
  ProcurementRecordDetail,
  ProcurementRecordSummary,
  ProcurementSearchPage,
  SupplierProcurementSlice,
  SupplierRecordsPage,
} from '@/schemas/procurement'
import { procurementSourceSystemSchema } from '@/schemas/procurement'
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
  procurementModificationsResponseSchema,
  procurementPartyNamesResponseSchema,
  procurementProcedureDetailResponseSchema,
  procurementProceduresResponseSchema,
  procurementSupplierRecordsResponseSchema,
  type RawProcurementCpvDivision,
  type RawProcurementAggregates,
} from './graphql/procurement-queries'
import {
  mapAuthoritySlice,
  mapContract,
  mapCpvCategoryPage,
  mapDirectAcquisition,
  mapLanding,
  mapModification,
  mapModificationTrailEntry,
  mapProcedure,
  mapSearchPage,
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
    for (const edge of parsed.authorities?.edges ?? []) {
      partyNameCache.set(`authority:${edge.node.cui}`, edge.node.name)
    }
    for (const edge of parsed.suppliers?.edges ?? []) {
      partyNameCache.set(`supplier:${edge.node.cui}`, edge.node.name)
    }
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

async function fetchSearchRecords(
  params: ProcurementSearchState,
): Promise<{ records: ProcurementRecordSummary[]; total: number | null }> {
  const variables = {
    sort: buildProcurementSort(params),
    page: params.page,
    pageSize: params.pageSize,
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
      return { records: page.items.map(mapProcedure), total: page.total }
    }
    case 'contracts': {
      const data = await graphqlQuery<unknown>(
        PROCUREMENT_CONTRACTS_QUERY,
        { ...variables, filter: buildContractsFilter(params) },
        { operationName: 'ProcurementContracts' },
      )
      const page =
        procurementContractsResponseSchema.parse(data).procurementContracts
      return { records: page.items.map(mapContract), total: page.total }
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
      return { records: page.items.map(mapModification), total: page.total }
    }
  }
}

export async function fetchProcurementSearchLive(
  params: ProcurementSearchState,
): Promise<ProcurementSearchPage> {
  const { records, total } = await fetchSearchRecords(params)
  return mapSearchPage({
    grain: params.grain,
    records,
    total,
    page: params.page,
    pageSize: params.pageSize,
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
): Promise<SupplierProcurementSlice> {
  const [aggregates, divisions, recentRecords] = await Promise.all([
    loadAggregates(buildScopeFilter({ supplierCui: cui }), {
      includeSuppliers: false,
    }),
    loadCpvDivisions(),
    fetchSupplierRecordsLive(cui),
  ])
  const partyNames = await loadPartyNames(aggregates)
  return mapSupplierSlice({
    supplierCui: cui,
    aggregates,
    divisions,
    recentRecords,
    partyNames,
  })
}

/** Recent contracts for an authority (first page) — used on institution pages. */
const AUTHORITY_RECENT_PAGE_SIZE = 10

export async function fetchAuthorityProcurementSliceLive(
  cui: string,
): Promise<AuthorityProcurementSlice> {
  const authorityCui = cui.trim()
  const [aggregates, divisions, recentPage, authorityName] = await Promise.all([
    loadAggregates(buildScopeFilter({ authorityCui }), {
      includeAuthorities: false,
    }),
    loadCpvDivisions(),
    fetchProcurementSearchLive(
      withProcurementSearchDefaults({
        grain: 'contracts',
        authority_cui: authorityCui,
        sort: 'date_desc',
        page: 1,
        pageSize: AUTHORITY_RECENT_PAGE_SIZE,
      }),
    ),
    resolveAuthorityName(authorityCui),
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

async function resolveAuthorityName(cui: string): Promise<string | null> {
  const cacheKey = `authority:${cui}`
  if (partyNameCache.has(cacheKey)) {
    return partyNameCache.get(cacheKey) ?? null
  }
  const raw = await graphqlQuery<unknown>(
    PROCUREMENT_PARTY_NAMES_QUERY,
    {
      authorityCuis: [cui],
      supplierCuis: [],
      includeAuthorities: true,
      includeSuppliers: false,
    },
    { operationName: 'ProcurementPartyNames' },
  )
  const parsed = procurementPartyNamesResponseSchema.parse(raw)
  const name = parsed.authorities?.edges?.[0]?.node.name ?? null
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
