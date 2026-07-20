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
  categoryRowSchema,
  procurementSourceSystemSchema,
  procurementAnalysisGrainSchema,
  procurementAnswerMetaSchema,
  procurementStatsBlockSchema,
  procurementStatusSchema,
  contractKindSchema,
  topPartyRowSchema,
  type AuthorityProcurementSlice,
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
  type ProcurementGrainAnalytics,
  type ProcurementLanding,
  type ProcurementRecordSummary,
  type ProcurementSearchPage,
  type SupplierProcurementSlice,
  type SupplierRecordsPage,
  type TopPartyRow,
} from '@/schemas/procurement'
import type {
  RawProcurementAggregates,
  RawProcurementAnswerMeta,
  RawProcurementBreakdownBucket,
  RawProcurementContract,
  RawProcurementCpvDivision,
  RawProcurementDirectAcquisition,
  RawProcurementFlowRecord,
  RawProcurementModification,
  RawProcurementModificationTrailEntry,
  RawProcurementParty,
  RawProcurementProcedure,
  RawProcurementSupplierRecordsConnection,
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
    value: raw.value,
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
    value: raw.value,
    status: mapStatus(raw.status),
    sourceSystem: procurementSourceSystemSchema.parse(raw.sourceSystem),
    sourceUrl: raw.sourceUrl,
    isCanonical: raw.isCanonical,
    dupGroupId: raw.dupGroupId,
    canonicalValueSource: raw.canonicalValueSource,
    valueDisagreement: raw.valueDisagreement,
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
    value: raw.value,
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
// Unified analysis
// ---------------------------------------------------------------------------

export function mapAnswerMeta(raw: RawProcurementAnswerMeta) {
  return procurementAnswerMetaSchema.parse(raw)
}

function requiredCount(value: string | null, context: string): string {
  if (value === null) throw new Error(`${context} is unexpectedly null`)
  return value
}

function addIntegerStrings(left: string | null, right: string | null) {
  if (left === null || right === null) return null
  return (BigInt(left) + BigInt(right)).toString()
}

function subtractIntegerStrings(total: string, present: string): string {
  const result = BigInt(total) - BigInt(present)
  if (result < 0n) throw new Error('procurement withValueCount exceeds recordCount')
  return result.toString()
}

/** Exact decimal addition without converting money to IEEE-754 numbers. */
export function addDecimalStrings(
  left: string | null,
  right: string | null,
): string | null {
  if (left === null || right === null) return null
  const split = (value: string) => {
    const [integer = '0', fraction = ''] = value.split('.')
    return { integer, fraction }
  }
  const a = split(left)
  const b = split(right)
  const scale = Math.max(a.fraction.length, b.fraction.length)
  const scaled = (value: ReturnType<typeof split>) =>
    BigInt(`${value.integer}${value.fraction.padEnd(scale, '0')}`)
  const sum = (scaled(a) + scaled(b)).toString().padStart(scale + 1, '0')
  if (scale === 0) return sum
  return `${sum.slice(0, -scale)}.${sum.slice(-scale)}`
}

function blockForGrain<T extends { grain: string }>(
  blocks: readonly T[],
  grain: ProcurementGrainAnalytics['grain'],
  label: string,
): T {
  const block = blocks.find((entry) => entry.grain === grain)
  if (!block) throw new Error(`${label} is missing the ${grain} block`)
  return block
}

function optionalBlockForGrain<T extends { grain: string }>(
  blocks: readonly T[],
  grain: ProcurementGrainAnalytics['grain'],
): T | undefined {
  return blocks.find((entry) => entry.grain === grain)
}

function mapStats(raw: RawProcurementAggregates['procurementStats']['blocks'][number]) {
  return procurementStatsBlockSchema.parse({ ...raw, meta: mapAnswerMeta(raw.meta) })
}

function mapPartyBucket(
  bucket: RawProcurementBreakdownBucket,
  grain: ProcurementGrainAnalytics['grain'],
  dimension: 'authority' | 'supplier',
  partyNames?: ReadonlyMap<string, string>,
): TopPartyRow {
  const flowCount = requiredCount(bucket.recordCount, `${dimension}.recordCount`)
  const amountPresentCount = requiredCount(
    bucket.withValueCount,
    `${dimension}.withValueCount`,
  )
  const party = bucket.key
    ? {
        cui: bucket.key,
        name: partyNames?.get(`${dimension}:${bucket.key}`) ?? null,
        displayName: null,
      }
    : null
  return topPartyRowSchema.parse({
    authority: dimension === 'authority' ? party : null,
    supplier: dimension === 'supplier' ? party : null,
    grain,
    bucketKind: bucket.kind,
    flowCount,
    amountRonSum: bucket.valueAwardedSum,
    amountPresentCount,
    amountMissingCount: subtractIntegerStrings(flowCount, amountPresentCount),
    firstFlowDate: null,
    lastFlowDate: null,
    evidenceRefsSample: [],
    shareOfScope: bucket.shareOfScope,
  })
}

function mapCategoryBucket(
  bucket: RawProcurementBreakdownBucket,
  grain: ProcurementGrainAnalytics['grain'],
  divisions: readonly RawProcurementCpvDivision[],
): CategoryRow {
  const flowCount = requiredCount(bucket.recordCount, 'category.recordCount')
  const amountPresentCount = requiredCount(
    bucket.withValueCount,
    'category.withValueCount',
  )
  const division = bucket.key
    ? divisions.find((entry) => entry.divisionCode === bucket.key)
    : undefined
  return categoryRowSchema.parse({
    cpvDivisionCode: bucket.key,
    cpvDivisionLabelEn: division?.labelEn ?? null,
    cpvDivisionLabelRo: division?.labelRo ?? null,
    grain,
    bucketKind: bucket.kind,
    flowCount,
    amountRonSum: bucket.valueAwardedSum,
    amountPresentCount,
    amountMissingCount: subtractIntegerStrings(flowCount, amountPresentCount),
    shareOfScope: bucket.shareOfScope,
  })
}

function mapMonthly(
  countBlock: RawProcurementAggregates['recordSeries'][number],
  valueBlock: RawProcurementAggregates['valueSeries'][number],
): MonthlyPoint[] {
  const values = new Map(
    (valueBlock.points ?? []).map((point) => [point.bucket, point.value]),
  )
  return (countBlock.points ?? []).map((point) => ({
    month: point.bucket,
    flowCount: requiredCount(point.value, 'record series point'),
    amountRonSum: values.get(point.bucket) ?? null,
    amountPresentCount: null,
    amountMissingCount: null,
  }))
}

function mapGrainAnalytics(
  aggregates: RawProcurementAggregates,
  divisions: readonly RawProcurementCpvDivision[],
  grain: ProcurementGrainAnalytics['grain'],
  partyNames?: ReadonlyMap<string, string>,
): ProcurementGrainAnalytics {
  const stats = mapStats(
    blockForGrain(aggregates.procurementStats.blocks, grain, 'procurementStats'),
  )
  const authorities = optionalBlockForGrain(aggregates.authorities, grain)
  const suppliers = optionalBlockForGrain(aggregates.suppliers, grain)
  const categories = optionalBlockForGrain(aggregates.categories, grain)
  const recordSeries = blockForGrain(
    aggregates.recordSeries,
    grain,
    'recordSeries',
  )
  const valueSeries = blockForGrain(
    aggregates.valueSeries,
    grain,
    'valueSeries',
  )
  return {
    grain: procurementAnalysisGrainSchema.parse(grain),
    stats,
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
      authorities: authorities ? mapAnswerMeta(authorities.meta) : null,
      suppliers: suppliers ? mapAnswerMeta(suppliers.meta) : null,
      categories: categories ? mapAnswerMeta(categories.meta) : null,
      recordSeries: mapAnswerMeta(recordSeries.meta),
      valueSeries: mapAnswerMeta(valueSeries.meta),
    },
  }
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
}): ProcurementSearchPage {
  return {
    grain: options.grain,
    records: [...options.records],
    page: {
      page: options.page,
      pageSize: options.pageSize,
      total: options.total,
    },
  }
}

export function mapLanding(parts: {
  aggregates: RawProcurementAggregates
  divisions: readonly RawProcurementCpvDivision[]
  partyNames?: ReadonlyMap<string, string>
}): ProcurementLanding {
  const procedure = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'procedure',
    parts.partyNames,
  )
  const contract = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'contract',
    parts.partyNames,
  )
  const directAcquisition = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'direct_acquisition',
    parts.partyNames,
  )
  return {
    headline: {
      totalValueRon: addDecimalStrings(
        contract.stats.valueAwardedSum,
        directAcquisition.stats.valueAwardedSum,
      ),
      proceduresCount: procedure.stats.recordCount,
      directAcquisitionsCount: directAcquisition.stats.recordCount,
      contractsCount: contract.stats.recordCount,
      buyersCount: null,
      suppliersCount: null,
      recordsCount: addIntegerStrings(
        contract.stats.recordCount,
        directAcquisition.stats.recordCount,
      ),
    },
    analysisByGrain: { procedure, contract, directAcquisition },
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
  partyNames?: ReadonlyMap<string, string>
}): CpvCategoryPage | null {
  const { code, divisions } = parts
  const level = code.length === 2 ? 'division' : 'code'
  const divisionCode = code.slice(0, 2)
  const division = divisions.find((d) => d.divisionCode === divisionCode)
  if (!division) return null

  const procedure = mapGrainAnalytics(
    parts.aggregates,
    divisions,
    'procedure',
    parts.partyNames,
  )
  const contract = mapGrainAnalytics(
    parts.aggregates,
    divisions,
    'contract',
    parts.partyNames,
  )
  const directAcquisition = mapGrainAnalytics(
    parts.aggregates,
    divisions,
    'direct_acquisition',
    parts.partyNames,
  )
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
      totalValueRon: addDecimalStrings(
        contract.stats.valueAwardedSum,
        directAcquisition.stats.valueAwardedSum,
      ),
      recordCounts: {
        contracts: contract.stats.recordCount,
        directAcquisitions: directAcquisition.stats.recordCount,
        procedures: procedure.stats.recordCount,
      },
    },
    analysisByGrain: { procedure, contract, directAcquisition },
    relatedCategories,
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

export function mapAuthoritySlice(parts: {
  authorityCui: string
  aggregates: RawProcurementAggregates
  divisions: readonly RawProcurementCpvDivision[]
  recentRecords: readonly ProcurementRecordSummary[]
  partyNames?: ReadonlyMap<string, string>
}): AuthorityProcurementSlice {
  const procedure = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'procedure',
    parts.partyNames,
  )
  const contract = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'contract',
    parts.partyNames,
  )
  const directAcquisition = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'direct_acquisition',
    parts.partyNames,
  )
  const minMonths = [
    contract.stats.minMonth,
    directAcquisition.stats.minMonth,
    procedure.stats.minMonth,
  ]
    .filter((value): value is string => value !== null)
    .sort()
  const maxMonths = [
    contract.stats.maxMonth,
    directAcquisition.stats.maxMonth,
    procedure.stats.maxMonth,
  ]
    .filter((value): value is string => value !== null)
    .sort()
  const authorityName =
    parts.partyNames?.get(`authority:${parts.authorityCui}`) ?? null
  return {
    authorityCui: parts.authorityCui,
    authorityName,
    summary: {
      window: {
        from: minMonths[0] ?? null,
        to: maxMonths[maxMonths.length - 1] ?? null,
      },
      totalSpendRon: addDecimalStrings(
        contract.stats.valueAwardedSum,
        directAcquisition.stats.valueAwardedSum,
      ),
      suppliersCount: null,
      contractsCount: contract.stats.recordCount,
      directAcquisitionsCount: directAcquisition.stats.recordCount,
      proceduresCount: procedure.stats.recordCount,
      firstSeen: minMonths[0] ?? null,
      lastSeen: maxMonths[maxMonths.length - 1] ?? null,
    },
    analysisByGrain: { contract, directAcquisition },
    recentRecords: [...parts.recentRecords],
  }
}

export function mapSupplierSlice(parts: {
  supplierCui: string
  aggregates: RawProcurementAggregates
  divisions: readonly RawProcurementCpvDivision[]
  recentRecords: SupplierRecordsPage
  partyNames?: ReadonlyMap<string, string>
}): SupplierProcurementSlice {
  const contract = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'contract',
    parts.partyNames,
  )
  const directAcquisition = mapGrainAnalytics(
    parts.aggregates,
    parts.divisions,
    'direct_acquisition',
    parts.partyNames,
  )
  const minMonths = [contract.stats.minMonth, directAcquisition.stats.minMonth]
    .filter((value): value is string => value !== null)
    .sort()
  const maxMonths = [contract.stats.maxMonth, directAcquisition.stats.maxMonth]
    .filter((value): value is string => value !== null)
    .sort()
  return {
    supplierCui: parts.supplierCui,
    summary: {
      // Window falls back to the rollup month bounds when the stats dates are
      // absent (the schema requires strings; empty = nothing observed).
      window: {
        from: minMonths[0] ?? null,
        to: maxMonths[maxMonths.length - 1] ?? null,
      },
      totalPublicRevenueRon: addDecimalStrings(
        contract.stats.valueAwardedSum,
        directAcquisition.stats.valueAwardedSum,
      ),
      buyersCount: null,
      contractsCount: contract.stats.recordCount,
      directAcquisitionsCount: directAcquisition.stats.recordCount,
      firstSeen: minMonths[0] ?? null,
      lastSeen: maxMonths[maxMonths.length - 1] ?? null,
    },
    analysisByGrain: { contract, directAcquisition },
    recentRecords: parts.recentRecords.records,
    // No procurement-API backing for cross-domain presence — unknown, not false.
    crossDomain: null,
  }
}
