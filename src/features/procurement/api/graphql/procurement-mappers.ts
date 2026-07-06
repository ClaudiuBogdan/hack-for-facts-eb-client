/**
 * Map raw procurement GraphQL shapes onto the UI's Zod types
 * (`@/schemas/procurement`).
 *
 * Honesty principle (same as parliament-mappers): a mapped field is either
 * taken from the server, derived deterministically, or defaulted to a
 * clearly-empty value (`null` / `[]` / `'unknown'`) — we never fabricate data
 * that would mislead. Unknown enum tokens normalize to their explicit
 * "unknown" representation instead of guessing; malformed identifiers or
 * source systems fail loud at the Zod boundary rather than becoming a wrong
 * record.
 */
import {
  procurementSourceSystemSchema,
  procurementSourceGrainSchema,
  procurementStatusSchema,
  contractKindSchema,
  type CapabilityGate,
  type CategoryRow,
  type ContractModification,
  type ContractModificationRecord,
  type ContractRecord,
  type CpvCategoryPage,
  type DirectAcquisitionRecord,
  type MonthlyPoint,
  type Party,
  type ProcedureRecord,
  type ProcurementGrain,
  type ProcurementLanding,
  type ProcurementRecordSummary,
  type ProcurementSearchPage,
  type SupplierProcurementSlice,
  type SupplierRecordsPage,
  type TopPartyRow,
} from '@/schemas/procurement'
import type {
  RawProcurementAggregates,
  RawProcurementCategoryRow,
  RawProcurementContract,
  RawProcurementCpvDivision,
  RawProcurementDirectAcquisition,
  RawProcurementFlowRecord,
  RawProcurementGate,
  RawProcurementModification,
  RawProcurementModificationTrailEntry,
  RawProcurementMonthlyPoint,
  RawProcurementParty,
  RawProcurementProcedure,
  RawProcurementSupplierRecordsConnection,
  RawProcurementTopPartyRow,
} from './procurement-queries'

// ---------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------

const STATUS_TOKENS = new Set<string>(procurementStatusSchema.options)
const LINK_METHODS = new Set(['notice_no', 'authority_cui+contract_no'])

/** Unknown status tokens normalize to the first-class `'unknown'` — never a guess. */
function mapStatus(raw: string): ProcedureRecord['status'] {
  return STATUS_TOKENS.has(raw)
    ? (raw as ProcedureRecord['status'])
    : 'unknown'
}

function mapLinkMethod(
  raw: string | null,
): ContractModification['linkMethod'] {
  return raw !== null && LINK_METHODS.has(raw)
    ? (raw as NonNullable<ContractModification['linkMethod']>)
    : null
}

/** Unknown contract kinds are dropped to null (absent), not guessed. */
function mapContractKind(raw: string | null): ProcedureRecord['contractKind'] {
  const parsed = contractKindSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/**
 * Bigint count string → JS number. Rollup counts fit a double today (max
 * ~15.8M rows); an unsafe value means a contract violation, so fail loud
 * rather than render a rounded figure.
 */
function toCount(raw: string): number {
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) {
    throw new Error(`procurement count overflows a safe integer: ${raw}`)
  }
  return value
}

/** Nullable variant for headline tiles ("unknown" stays representable). */
function toNullableCount(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) ? value : null
}

export function mapParty(raw: RawProcurementParty | null): Party {
  return {
    cui: raw?.cui ?? null,
    name: raw?.name ?? null,
    displayName: raw?.displayName ?? null,
  }
}

// ---------------------------------------------------------------------------
// Grain records
// ---------------------------------------------------------------------------

export function mapProcedure(raw: RawProcurementProcedure): ProcedureRecord {
  return {
    id: raw.id,
    grain: 'procedure',
    noticeNo: raw.noticeNo,
    noticeKind: raw.noticeKind,
    procedureType: raw.procedureType,
    contractKind: mapContractKind(raw.contractKind),
    title: raw.title,
    authority: mapParty(raw.authority),
    cpvCode: raw.cpvCode,
    cpvDivisionCode: raw.cpvDivisionCode,
    estimatedValueRon: raw.estimatedValueRon,
    awardedValueRon: raw.awardedValueRon,
    currency: raw.currency,
    isRon: raw.isRon,
    valueSuspect: raw.valueSuspect,
    status: mapStatus(raw.status),
    countyName: raw.countyName,
    publicationDate: raw.publicationDate,
    stateDate: raw.stateDate,
    sourceSystem: procurementSourceSystemSchema.parse(raw.sourceSystem),
    sourceUrl: raw.sourceUrl,
    isCanonical: raw.isCanonical,
    dupGroupId: raw.dupGroupId,
  }
}

export function mapModificationTrailEntry(
  raw: RawProcurementModificationTrailEntry,
): ContractModification {
  return {
    id: raw.id,
    contractId: raw.contractId,
    linkMethod: mapLinkMethod(raw.linkMethod),
    linkConfidence: raw.linkConfidence,
    modificationDate: raw.modificationDate,
    valueBeforeRon: raw.valueBeforeRon,
    valueAfterRon: raw.valueAfterRon,
    valueDeltaRon: raw.valueDeltaRon,
    modificationType: raw.modificationType,
  }
}

export function mapContract(raw: RawProcurementContract): ContractRecord {
  return {
    id: raw.id,
    grain: 'contract',
    contractNo: raw.contractNo,
    contractDate: raw.contractDate,
    procedureId: raw.procedureId,
    noticeNo: raw.noticeNo,
    title: raw.title,
    authority: mapParty(raw.authority),
    supplier: mapParty(raw.supplier),
    cpvCode: raw.cpvCode,
    cpvDivisionCode: raw.cpvDivisionCode,
    valueRon: raw.valueRon,
    estimatedValueRon: raw.estimatedValueRon,
    currency: raw.currency,
    isRon: raw.isRon,
    valueSuspect: raw.valueSuspect,
    status: mapStatus(raw.status),
    sourceSystem: procurementSourceSystemSchema.parse(raw.sourceSystem),
    sourceUrl: raw.sourceUrl,
    isCanonical: raw.isCanonical,
    dupGroupId: raw.dupGroupId,
    modifications: (raw.modifications ?? []).map(mapModificationTrailEntry),
  }
}

export function mapDirectAcquisition(
  raw: RawProcurementDirectAcquisition,
): DirectAcquisitionRecord {
  return {
    id: raw.id,
    grain: 'direct_acquisition',
    uniqueCode: raw.uniqueCode,
    title: raw.title,
    authority: mapParty(raw.authority),
    supplier: mapParty(raw.supplier),
    cpvCode: raw.cpvCode,
    cpvDivisionCode: raw.cpvDivisionCode,
    valueRon: raw.valueRon,
    estimatedValueRon: raw.estimatedValueRon,
    currency: raw.currency,
    isRon: raw.isRon,
    valueSuspect: raw.valueSuspect,
    status: mapStatus(raw.status),
    // The DTO carries no stateId; absent, not derived.
    stateId: null,
    countyName: raw.countyName,
    publicationDate: raw.publicationDate,
    finalizationDate: raw.finalizationDate,
    sourceSystem: procurementSourceSystemSchema.parse(raw.sourceSystem),
    sourceUrl: raw.sourceUrl,
    isCanonical: raw.isCanonical,
    dupGroupId: raw.dupGroupId,
  }
}

export function mapModification(
  raw: RawProcurementModification,
): ContractModificationRecord {
  return {
    ...mapModificationTrailEntry(raw),
    grain: 'modification',
    authority: mapParty(raw.authority),
    supplier: mapParty(raw.supplier),
    contractNo: raw.contractNo,
    noticeNo: raw.noticeNo,
    sourceUrl: raw.sourceUrl,
    parentContract: raw.parentContract
      ? {
          contractNo: raw.parentContract.contractNo,
          authority: mapParty(raw.parentContract.authority),
          supplier: mapParty(raw.parentContract.supplier),
        }
      : null,
  }
}

/** Dispatch a supplier-connection union node on `__typename`. */
export function mapFlowRecord(
  raw: RawProcurementFlowRecord,
): ContractRecord | DirectAcquisitionRecord {
  return raw.__typename === 'ProcurementContract'
    ? mapContract(raw)
    : mapDirectAcquisition(raw)
}

// ---------------------------------------------------------------------------
// Gate + rollups
// ---------------------------------------------------------------------------

export function mapGate(raw: RawProcurementGate): CapabilityGate {
  return {
    sourceGrain: procurementSourceGrainSchema.parse(raw.sourceGrain),
    rowsCount: raw.rowsCount,
    authorityCuiCoverageRate: raw.authorityCuiCoverageRate,
    supplierCuiCoverageRate: raw.supplierCuiCoverageRate,
    amountCoverageRate: raw.amountCoverageRate,
    cpvCoverageRate: raw.cpvCoverageRate,
    dateCoverageRate: raw.dateCoverageRate,
    filterAnswersAllowed: raw.filterAnswersAllowed,
    spendRankingsAllowed: raw.spendRankingsAllowed,
    supplierRegionFiltersAllowed: raw.supplierRegionFiltersAllowed,
    blockers: raw.blockers,
    dataAsOf: raw.dataAsOf,
    cadence: raw.cadence,
  }
}

export function mapTopPartyRow(raw: RawProcurementTopPartyRow): TopPartyRow {
  return {
    authority: raw.authority ? mapParty(raw.authority) : null,
    supplier: raw.supplier ? mapParty(raw.supplier) : null,
    sourceGrain: procurementSourceGrainSchema.parse(raw.sourceGrain),
    flowCount: raw.flowCount,
    amountRonSum: raw.amountRonSum,
    amountPresentCount: raw.amountPresentCount,
    amountMissingCount: raw.amountMissingCount,
    firstFlowDate: raw.firstFlowDate,
    lastFlowDate: raw.lastFlowDate,
    evidenceRefsSample: raw.evidenceRefsSample,
  }
}

export function mapCategoryRow(raw: RawProcurementCategoryRow): CategoryRow {
  return {
    cpvDivisionCode: raw.cpvDivisionCode,
    cpvDivisionLabelEn: raw.cpvDivisionLabelEn,
    cpvDivisionLabelRo: raw.cpvDivisionLabelRo,
    sourceGrain: procurementSourceGrainSchema.parse(raw.sourceGrain),
    flowCount: raw.flowCount,
    amountRonSum: raw.amountRonSum,
    amountPresentCount: raw.amountPresentCount,
    amountMissingCount: raw.amountMissingCount,
  }
}

export function mapMonthlyPoint(raw: RawProcurementMonthlyPoint): MonthlyPoint {
  return {
    month: raw.month,
    flowCount: raw.flowCount,
    amountRonSum: raw.amountRonSum,
    amountPresentCount: raw.amountPresentCount,
    amountMissingCount: raw.amountMissingCount,
  }
}

/** The DA gate anchors flow aggregates (contracts are gate-blocked for spend). */
export function gateForSourceGrain(
  gates: readonly CapabilityGate[],
  sourceGrain: CapabilityGate['sourceGrain'],
): CapabilityGate {
  const gate = gates.find((entry) => entry.sourceGrain === sourceGrain)
  if (!gate) {
    throw new Error(`procurementGrainQuality is missing the ${sourceGrain} gate`)
  }
  return gate
}

/** Which capability gate annotates a UI search grain. */
export function gateForUiGrain(
  gates: readonly CapabilityGate[],
  grain: ProcurementGrain,
): CapabilityGate {
  return gateForSourceGrain(
    gates,
    grain === 'direct_acquisitions' ? 'direct_acquisition' : 'procurement_contract',
  )
}

// ---------------------------------------------------------------------------
// Page bundles
// ---------------------------------------------------------------------------

export function mapSearchPage(options: {
  grain: ProcurementGrain
  records: readonly ProcurementRecordSummary[]
  total: number | null
  page: number
  pageSize: number
  gate: CapabilityGate
}): ProcurementSearchPage {
  return {
    grain: options.grain,
    records: [...options.records],
    page: {
      page: options.page,
      pageSize: options.pageSize,
      total: options.total,
    },
    gate: options.gate,
  }
}

/**
 * `totalValueRon` is only surfaced when the anchoring gate allows spend
 * rankings — a blocked grain's sum is never shown, even if the server sent
 * one by mistake.
 */
function gatedTotal(
  totalValueRon: string | null,
  gate: CapabilityGate,
): string | null {
  return gate.spendRankingsAllowed ? totalValueRon : null
}

export function mapLanding(parts: {
  aggregates: RawProcurementAggregates
  gates: readonly CapabilityGate[]
}): ProcurementLanding {
  const gate = gateForSourceGrain(parts.gates, 'direct_acquisition')
  const stats = parts.aggregates.procurementStats
  const contractsCount = toNullableCount(stats.contractsCount)
  const directAcquisitionsCount = toNullableCount(
    stats.directAcquisitionsCount,
  )
  return {
    headline: {
      totalValueRon: gatedTotal(stats.totalValueRon, gate),
      directAcquisitionsCount,
      contractsCount,
      buyersCount: toNullableCount(stats.buyersCount),
      suppliersCount: toNullableCount(stats.suppliersCount),
      recordsCount:
        contractsCount !== null && directAcquisitionsCount !== null
          ? contractsCount + directAcquisitionsCount
          : null,
    },
    topAuthorities: parts.aggregates.procurementTopAuthorities.map(mapTopPartyRow),
    topSuppliers: parts.aggregates.procurementTopSuppliers.map(mapTopPartyRow),
    topCategories: parts.aggregates.procurementCategoryBreakdown.map(mapCategoryRow),
    spendOverTime: parts.aggregates.procurementSpendOverTime.map(mapMonthlyPoint),
    gate,
  }
}

/**
 * CPV taxonomy is authoritative at division level only. A 2-digit code with
 * no division row returns `null` (unknown category). Longer codes are served
 * best-effort: aggregates are scoped by the exact code, labels fall back to
 * the parent division's.
 */
export function mapCpvCategoryPage(parts: {
  code: string
  divisions: readonly RawProcurementCpvDivision[]
  aggregates: RawProcurementAggregates
  gates: readonly CapabilityGate[]
}): CpvCategoryPage | null {
  const { code, divisions } = parts
  const level = code.length === 2 ? 'division' : 'code'
  const divisionCode = code.slice(0, 2)
  const division = divisions.find((d) => d.divisionCode === divisionCode)
  if (!division) return null

  const gate = gateForSourceGrain(parts.gates, 'direct_acquisition')
  const stats = parts.aggregates.procurementStats
  const relatedCategories = divisions
    .filter(
      (d) =>
        d.divisionCode !== divisionCode &&
        d.divisionCode[0] === divisionCode[0],
    )
    .slice(0, 6)
    .map((d) => ({
      code: d.divisionCode,
      labelRo: d.labelRo,
      labelEn: d.labelEn,
    }))

  return {
    code,
    level,
    labelRo: division.labelRo,
    labelEn: division.labelEn,
    divisionCode,
    parentCode: level === 'code' ? divisionCode : null,
    summary: {
      totalValueRon: gatedTotal(stats.totalValueRon, gate),
      recordCounts: {
        contracts: toCount(stats.contractsCount),
        directAcquisitions: toCount(stats.directAcquisitionsCount),
        procedures: toCount(stats.proceduresCount),
      },
    },
    spendOverTime: parts.aggregates.procurementSpendOverTime.map(mapMonthlyPoint),
    topAuthorities: parts.aggregates.procurementTopAuthorities.map(mapTopPartyRow),
    topSuppliers: parts.aggregates.procurementTopSuppliers.map(mapTopPartyRow),
    relatedCategories,
    gate,
  }
}

export function mapSupplierRecords(
  raw: RawProcurementSupplierRecordsConnection,
): SupplierRecordsPage {
  return {
    records: raw.edges.map((edge) => mapFlowRecord(edge.node)),
    total: raw.total,
    hasNextPage: raw.pageInfo.hasNextPage,
    endCursor: raw.pageInfo.endCursor,
  }
}

export function mapSupplierSlice(parts: {
  supplierCui: string
  aggregates: RawProcurementAggregates
  gates: readonly CapabilityGate[]
  recentRecords: SupplierRecordsPage
}): SupplierProcurementSlice {
  const gate = gateForSourceGrain(parts.gates, 'direct_acquisition')
  const stats = parts.aggregates.procurementStats
  const months = parts.aggregates.procurementSpendOverTime.map((p) => p.month)
  const firstMonth = months.length > 0 ? `${months[0]}-01` : ''
  const lastMonth = months.length > 0 ? `${months[months.length - 1]}-01` : ''
  return {
    supplierCui: parts.supplierCui,
    summary: {
      // Window falls back to the rollup month bounds when the stats dates are
      // absent (the schema requires strings; empty = nothing observed).
      window: {
        from: stats.firstFlowDate ?? firstMonth,
        to: stats.lastFlowDate ?? lastMonth,
      },
      totalPublicRevenueRon: gatedTotal(stats.totalValueRon, gate),
      buyersCount: toCount(stats.buyersCount),
      contractsCount: toCount(stats.contractsCount),
      directAcquisitionsCount: toCount(stats.directAcquisitionsCount),
      firstSeen: stats.firstFlowDate,
      lastSeen: stats.lastFlowDate,
    },
    topBuyers: parts.aggregates.procurementTopAuthorities.map(mapTopPartyRow),
    categoryBreakdown: parts.aggregates.procurementCategoryBreakdown.map(mapCategoryRow),
    revenueOverTime: parts.aggregates.procurementSpendOverTime.map(mapMonthlyPoint),
    recentRecords: parts.recentRecords.records,
    // No procurement-API backing for cross-domain presence — unknown, not false.
    crossDomain: null,
    gate,
  }
}
