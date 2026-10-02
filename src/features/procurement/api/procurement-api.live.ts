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
  ProcurementRecordSummary,
  ProcurementSearchPage,
  SupplierProcurementSlice,
  SupplierRecordsPage,
} from '@/schemas/procurement'
import {
  withProcurementSearchDefaults,
  type ProcurementSearchState,
} from '@/schemas/procurement-search'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_AGGREGATES_QUERY,
  PROCUREMENT_CONTRACTS_QUERY,
  PROCUREMENT_CPV_DIVISIONS_QUERY,
  PROCUREMENT_DIRECT_ACQUISITIONS_QUERY,
  PROCUREMENT_MODIFICATIONS_QUERY,
  PROCUREMENT_PARTY_NAMES_QUERY,
  PROCUREMENT_PROCEDURES_QUERY,
  PROCUREMENT_SUPPLIER_RECORDS_QUERY,
  procurementAggregatesResponseSchema,
  procurementContractsResponseSchema,
  procurementCpvDivisionsResponseSchema,
  procurementDirectAcquisitionsResponseSchema,
  procurementModificationsResponseSchema,
  procurementPartyNamesResponseSchema,
  procurementProceduresResponseSchema,
  procurementSupplierRecordsResponseSchema,
  type RawProcurementCpvDivision,
  type RawProcurementAggregates,
} from './graphql/procurement-queries'
import {
  mapAuthoritySlice,
  mapContract,
  mapDirectAcquisition,
  mapModification,
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
 * Rows per aggregate ranking on the category page and the institution and
 * firm slices (server cap is 100): a compact top-10, never padded with mock
 * rows (B1, 2026-07). Deeper rankings are the analytics page's.
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
