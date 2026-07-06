/**
 * Live procurement data via the redesign GraphQL API. Mirrors the parliament
 * module: every request goes through the shared `graphqlQuery` transport, raw
 * responses are Zod-parsed, then mapped onto the UI's procurement types.
 *
 * Contract: docs/design/procurement/graphql-api-spec.md. The server module is
 * not deployed yet — this adapter is exercised by unit tests (mocked
 * transport) and by `VITE_PROCUREMENT_FORCE_LIVE=true` against a server
 * branch; production stays mock-forced until `PROCUREMENT_LIVE_API_READY`
 * flips in `../lib/mock-mode`.
 *
 * Fields with no live backing are served as clearly-empty values by the
 * mappers (`crossDomain: null`, `perLotWinners`/`ted` only when the server
 * sends them) — documented gaps, never fabrication.
 */
import type {
  CapabilityGate,
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
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_AGGREGATES_QUERY,
  PROCUREMENT_CONTRACT_DETAIL_QUERY,
  PROCUREMENT_CONTRACTS_QUERY,
  PROCUREMENT_CPV_DIVISIONS_QUERY,
  PROCUREMENT_DA_DETAIL_QUERY,
  PROCUREMENT_DIRECT_ACQUISITIONS_QUERY,
  PROCUREMENT_GRAIN_QUALITY_QUERY,
  PROCUREMENT_MODIFICATIONS_QUERY,
  PROCUREMENT_PROCEDURE_DETAIL_QUERY,
  PROCUREMENT_PROCEDURES_QUERY,
  PROCUREMENT_SUPPLIER_RECORDS_QUERY,
  procurementAggregatesResponseSchema,
  procurementContractDetailResponseSchema,
  procurementContractsResponseSchema,
  procurementCpvDivisionsResponseSchema,
  procurementDaDetailResponseSchema,
  procurementDirectAcquisitionsResponseSchema,
  procurementGrainQualityResponseSchema,
  procurementModificationsResponseSchema,
  procurementProcedureDetailResponseSchema,
  procurementProceduresResponseSchema,
  procurementSupplierRecordsResponseSchema,
  type RawProcurementCpvDivision,
} from './graphql/procurement-queries'
import {
  gateForUiGrain,
  gateForSourceGrain,
  mapContract,
  mapCpvCategoryPage,
  mapDirectAcquisition,
  mapGate,
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

/** Rows per aggregate ranking (server default 10, capped at 50). */
const TOP_N = 10
/** Supplier "load more" connection page size. */
const SUPPLIER_RECORDS_PAGE_SIZE = 20

// ── shared meta (module-level caches: gates + CPV taxonomy are stable) ──────

let gatesCache: Promise<CapabilityGate[]> | null = null
let cpvDivisionsCache: Promise<RawProcurementCpvDivision[]> | null = null

async function loadGates(): Promise<CapabilityGate[]> {
  if (!gatesCache) {
    gatesCache = graphqlQuery<unknown>(
      PROCUREMENT_GRAIN_QUALITY_QUERY,
      {},
      { operationName: 'ProcurementGrainQuality' },
    )
      .then((data) =>
        procurementGrainQualityResponseSchema
          .parse(data)
          .procurementGrainQuality.map(mapGate),
      )
      .catch((error: unknown) => {
        gatesCache = null
        throw error
      })
  }
  return gatesCache
}

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

async function loadAggregates(scope: ProcurementScopeFilterInput) {
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_AGGREGATES_QUERY,
    { scope, grain: null, topN: TOP_N },
    { operationName: 'ProcurementAggregates' },
  )
  return procurementAggregatesResponseSchema.parse(data)
}

// ── landing ─────────────────────────────────────────────────────────────────

export async function fetchProcurementLandingLive(): Promise<ProcurementLanding> {
  const [aggregates, gates] = await Promise.all([
    loadAggregates(buildScopeFilter({})),
    loadGates(),
  ])
  return mapLanding({ aggregates, gates })
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
  const [{ records, total }, gates] = await Promise.all([
    fetchSearchRecords(params),
    loadGates(),
  ])
  return mapSearchPage({
    grain: params.grain,
    records,
    total,
    page: params.page,
    pageSize: params.pageSize,
    gate: gateForUiGrain(gates, params.grain),
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
    gate: mapGate(detail.gate),
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
    gate: mapGate(detail.gate),
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
    gate: mapGate(detail.gate),
  }
}

// ── CPV category page ───────────────────────────────────────────────────────

export async function fetchCpvCategoryPageLive(
  code: string,
): Promise<CpvCategoryPage | null> {
  const scope = buildScopeFilter(
    code.length === 2 ? { cpvDivision: code } : { cpvCode: code },
  )
  const [aggregates, divisions, gates] = await Promise.all([
    loadAggregates(scope),
    loadCpvDivisions(),
    loadGates(),
  ])
  return mapCpvCategoryPage({ code, divisions, aggregates, gates })
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
  const [aggregates, gates, recentRecords] = await Promise.all([
    loadAggregates(buildScopeFilter({ supplierCui: cui })),
    loadGates(),
    fetchSupplierRecordsLive(cui),
  ])
  return mapSupplierSlice({
    supplierCui: cui,
    aggregates,
    gates,
    recentRecords,
  })
}

// ── test hooks ──────────────────────────────────────────────────────────────

/** Reset the module-level caches (unit tests only). */
export function resetProcurementLiveCachesForTests(): void {
  gatesCache = null
  cpvDivisionsCache = null
}

// Re-exported so gate selection stays in one place for facade consumers.
export { gateForSourceGrain }
