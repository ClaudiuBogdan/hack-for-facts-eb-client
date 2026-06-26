import {
  capabilityGateSchema,
  contractRecordSummarySchema,
  contractRecordSchema,
  contractModificationSchema,
  contractModificationRecordSchema,
  cpvCategoryPageSchema,
  directAcquisitionRecordSummarySchema,
  directAcquisitionRecordSchema,
  monthlyPointSchema,
  procedureRecordSummarySchema,
  procedureRecordSchema,
  procurementLandingSchema,
  procurementSearchPageSchema,
  supplierProcurementSliceSchema,
  topPartyRowSchema,
  type CapabilityGate,
  type ContractModification,
  type ContractRecordSummary,
  type DirectAcquisitionRecordSummary,
  type MonthlyPoint,
  type ProcedureRecordSummary,
  type ProcurementLanding,
  type ProcurementProvenance,
  type ProcurementRecordDetail,
  type ProcurementRecordSummary,
  type ProcurementSearchPage,
  type SupplierProcurementSlice,
  type TopPartyRow,
} from '@/schemas/procurement'
import type { CpvCategoryPage } from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'

// ---------------------------------------------------------------------------
// Shared capability gate / coverage (mock: partial amount coverage,
// suspended sync → "data as of" with cadence note).
// ---------------------------------------------------------------------------

const MOCK_GATE: CapabilityGate = capabilityGateSchema.parse({
  grain: 'contracts',
  allowed: [
    'filter_count',
    'count_ranked_top_n',
    'spend_ranked_top_n',
    'buyer_region_filter',
    'cpv_category_filter',
    'same_day_direct_acquisition_signal',
  ],
  blocked: ['supplier_region_filter', 'llm_generated_filter'],
  coverage: [
    { metric: 'authority_cui', rate: 0.96, threshold: 0.95, meetsThreshold: true },
    { metric: 'supplier_cui', rate: 0.97, threshold: 0.95, meetsThreshold: true },
    // Partial amount coverage — spend answers downgrade to count-ranked.
    { metric: 'amount', rate: 0.91, threshold: 0.95, meetsThreshold: false },
    { metric: 'cpv', rate: 0.88, threshold: 0.85, meetsThreshold: true },
    { metric: 'flow_date', rate: 0.86, threshold: 0.85, meetsThreshold: true },
    { metric: 'authority_territory', rate: 0.74, threshold: 0.7, meetsThreshold: true },
  ],
  dataAsOf: '2026-06-25',
  cadence: 'zilnic (suspendat)',
})

const MOCK_GATE_PARTIAL: CapabilityGate = {
  ...MOCK_GATE,
  coverage: MOCK_GATE.coverage.map((c) =>
    c.metric === 'amount' ? { ...c, meetsThreshold: false } : c,
  ),
}

function gateForGrain(grain: string): CapabilityGate {
  return { ...MOCK_GATE_PARTIAL, grain }
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

const primariaCluj = {
  cui: '2939237',
  name: 'Primăria Municipiului Cluj-Napoca',
  displayName: 'Primăria Municipiului Cluj-Napoca',
  matchConfidence: 'high' as const,
}
const spitalulCluj = {
  cui: '4263240',
  name: 'Spitalul Clinic de Urgență Cluj-Napoca',
  displayName: 'Spitalul Clinic de Urgență Cluj-Napoca',
  matchConfidence: 'high' as const,
}
const samsaCluj = {
  // Cleaned name; raw DA name would carry own-CUI prefix + |...| pipes.
  cui: '14399840',
  name: 'DANTE INTERNATIONAL SA',
  displayName: 'DANTE INTERNATIONAL SA',
  matchConfidence: 'high' as const,
}
const constructSrl = {
  cui: '12345678',
  name: 'CONSTRUCT CLUJ SRL',
  displayName: 'CONSTRUCT CLUJ SRL',
  matchConfidence: 'medium' as const,
}
const YoungSupplier = {
  cui: '45678901',
  name: 'INOVATE SOLUTIONS SRL',
  displayName: 'INOVATE SOLUTIONS SRL',
  matchConfidence: 'low' as const,
}

// ---------------------------------------------------------------------------
// Money helpers
// ---------------------------------------------------------------------------

function ron(value: number, isOutlier = false) {
  return { ron: value, nativeValue: value, currency: 'RON', isOutlier }
}
function native(value: number, currency: string) {
  // Non-RON rows keep value_ron null; native value+currency disclosed.
  return { ron: null, nativeValue: value, currency, isOutlier: false }
}

function provenance(
  sourceSystem: ProcurementProvenance['sourceSystem'],
  sourceUrl: string,
  publishedAt: string,
): ProcurementProvenance {
  return {
    sourceSystem,
    sourceUrl,
    retrievedAt: '2026-06-25T08:00:00Z',
    publishedAt,
    isCanonical: true,
    dupGroupId: null,
  }
}

// ---------------------------------------------------------------------------
// Procedure / contract / DA / modification summaries
// ---------------------------------------------------------------------------

const procedureSummary: ProcedureRecordSummary = procedureRecordSummarySchema.parse({
  id: 'proc-2025-cluj-48000',
  grain: 'procedure',
  noticeNo: '614650/2025',
  noticeKind: 'licitatie deschisa',
  procedureType: 'licitatie deschisa',
  contractKind: 'works',
  title: 'Reabilitare infrastructură rutieră — sector central',
  authority: primariaCluj,
  cpvCode: '45233140',
  cpvDivisionCode: '45',
  estimatedValue: ron(48_000_000),
  awardedValue: ron(47_200_000),
  status: 'awarded',
  countyName: 'Cluj',
  publicationDate: '2025-09-12',
  stateDate: '2025-10-30',
  provenance: provenance(
    'elicitatie',
    'https://www.e-licitatie.ro/pub/notices/procedure/proc-2025-cluj-48000',
    '2025-09-12T00:00:00Z',
  ),
})

const contractSummaries: ContractRecordSummary[] = [
  contractRecordSummarySchema.parse({
    id: 'contract-key-001',
    grain: 'contract',
    contractNo: '38912/2025',
    contractDate: '2025-11-04',
    procedureId: 'proc-2025-cluj-48000',
    noticeNo: '614650/2025',
    title: 'Reabilitare infrastructură rutieră — sector central',
    authority: primariaCluj,
    supplier: constructSrl,
    cpvCode: '45233140',
    value: ron(47_200_000),
    estimatedValue: ron(48_000_000),
    status: 'finalized',
    provenance: provenance(
      'elicitatie',
      'https://www.e-licitatie.ro/pub/notices/contract/contract-key-001',
      '2025-11-04T00:00:00Z',
    ),
    modifications: [],
  }),
  contractRecordSummarySchema.parse({
    id: 'contract-key-002',
    grain: 'contract',
    contractNo: '38913/2025',
    contractDate: '2025-11-15',
    procedureId: 'proc-2025-cluj-48000',
    noticeNo: '614650/2025',
    title: 'Achiziție echipamente IT pentru spital',
    authority: spitalulCluj,
    supplier: samsaCluj,
    cpvCode: '30200000',
    value: native(420_000, 'EUR'),
    estimatedValue: ron(2_100_000),
    status: 'awarded',
    provenance: provenance(
      'seap',
      'https://www.e-licitatie.ro/pub/notices/contract/contract-key-002',
      '2025-11-15T00:00:00Z',
    ),
    modifications: [],
  }),
  contractRecordSummarySchema.parse({
    id: 'contract-key-003',
    grain: 'contract',
    contractNo: '38914/2025',
    contractDate: '2025-12-01',
    procedureId: null,
    noticeNo: '614651/2025',
    title: 'Servicii de curățenie',
    authority: spitalulCluj,
    supplier: YoungSupplier,
    cpvCode: '90910000',
    value: ron(180_000),
    estimatedValue: ron(190_000),
    // 'unknown' is first-class.
    status: 'unknown',
    provenance: provenance(
      'seap_notice',
      'https://www.e-licitatie.ro/pub/notices/contract/contract-key-003',
      '2025-12-01T00:00:00Z',
    ),
    modifications: [],
  }),
]

const directAcquisitionSummaries: DirectAcquisitionRecordSummary[] = [
  directAcquisitionRecordSummarySchema.parse({
    id: 'da-key-001',
    grain: 'direct_acquisition',
    uniqueCode: 'DA-2025-0001-CL',
    authority: primariaCluj,
    supplier: constructSrl,
    cpvCode: '45233140',
    value: ron(98_000),
    estimatedValue: ron(100_000),
    status: 'finalized',
    stateId: 'RO-DA-0001',
    countyName: 'Cluj',
    publicationDate: '2025-12-10',
    finalizationDate: '2025-12-15',
    provenance: provenance(
      'elicitatie_da',
      'https://www.e-licitatie.ro/pub/notices/da/da-key-001',
      '2025-12-10T00:00:00Z',
    ),
  }),
  directAcquisitionRecordSummarySchema.parse({
    id: 'da-key-002',
    grain: 'direct_acquisition',
    uniqueCode: 'DA-2025-0002-CL',
    authority: primariaCluj,
    supplier: constructSrl,
    cpvCode: '45233140',
    value: ron(95_000),
    estimatedValue: ron(95_000),
    status: 'finalized',
    stateId: 'RO-DA-0002',
    countyName: 'Cluj',
    publicationDate: '2025-12-10',
    finalizationDate: '2025-12-15',
    provenance: provenance(
      'elicitatie_da',
      'https://www.e-licitatie.ro/pub/notices/da/da-key-002',
      '2025-12-10T00:00:00Z',
    ),
  }),
  // Outlier value — garbage-flagged per UX §6.3.
  directAcquisitionRecordSummarySchema.parse({
    id: 'da-key-003',
    grain: 'direct_acquisition',
    uniqueCode: 'DA-2025-0003-CL',
    authority: spitalulCluj,
    supplier: samsaCluj,
    cpvCode: '30200000',
    value: { ron: 9_800_000_000, nativeValue: 9_800_000_000, currency: 'RON', isOutlier: true },
    estimatedValue: ron(120_000),
    status: 'finalized',
    stateId: 'RO-DA-0003',
    countyName: 'Cluj',
    publicationDate: '2025-12-11',
    finalizationDate: '2025-12-16',
    provenance: provenance(
      'seap_da',
      'https://www.e-licitatie.ro/pub/notices/da/da-key-003',
      '2025-12-11T00:00:00Z',
    ),
  }),
]

const modificationRows: ContractModification[] = [
  contractModificationSchema.parse({
    id: 'mod-001',
    contractId: 'contract-key-001',
    linkMethod: 'contract_no',
    modificationDate: '2026-02-10',
    valueBefore: ron(47_200_000),
    valueAfter: ron(51_900_000),
    valueDelta: ron(4_700_000),
    modificationType: 'valoare',
  }),
  // Unlinked modification (~12-20% per UX §6.3).
  contractModificationSchema.parse({
    id: 'mod-002',
    contractId: null,
    linkMethod: null,
    modificationDate: '2026-03-01',
    valueBefore: ron(120_000),
    valueAfter: ron(240_000),
    valueDelta: ron(120_000),
    modificationType: 'valoare',
  }),
]

const modificationSearchRows = [
  contractModificationRecordSchema.parse({
    id: 'mod-001',
    grain: 'modification',
    contractId: 'contract-key-001',
    linkMethod: 'contract_no',
    modificationDate: '2026-02-10',
    valueBefore: ron(47_200_000),
    valueAfter: ron(51_900_000),
    valueDelta: ron(4_700_000),
    modificationType: 'valoare',
    parentContract: {
      contractNo: '38912/2025',
      authority: primariaCluj,
      supplier: constructSrl,
    },
    provenance: {
      sourceSystem: 'elicitatie',
      sourceUrl: 'https://www.e-licitatie.ro/pub/notices/mod/mod-001',
      retrievedAt: '2026-06-25T08:00:00Z',
      publishedAt: '2026-02-10T00:00:00Z',
      isCanonical: true,
      dupGroupId: null,
    },
  }),
  contractModificationRecordSchema.parse({
    id: 'mod-002',
    grain: 'modification',
    contractId: null,
    linkMethod: null,
    modificationDate: '2026-03-01',
    valueBefore: ron(120_000),
    valueAfter: ron(240_000),
    valueDelta: ron(120_000),
    modificationType: 'valoare',
    parentContract: null,
    provenance: provenance(
      'elicitatie',
      'https://www.e-licitatie.ro/pub/notices/mod/mod-002',
      '2026-03-01T00:00:00Z',
    ),
  }),
]

// ---------------------------------------------------------------------------
// Top parties / categories / monthly points
// ---------------------------------------------------------------------------

const topAuthorities: TopPartyRow[] = [
  topPartyRowSchema.parse({
    party: primariaCluj,
    flowCount: 1240,
    amount: ron(380_000_000),
    amountMissingCount: 38,
    shareOfTotal: null, // amount coverage below threshold → share suppressed
    evidenceRefs: ['contract-key-001', 'da-key-001'],
  }),
  topPartyRowSchema.parse({
    party: spitalulCluj,
    flowCount: 642,
    amount: ron(95_000_000),
    amountMissingCount: 14,
    shareOfTotal: null,
    evidenceRefs: ['contract-key-002', 'contract-key-003'],
  }),
]

const topSuppliers: TopPartyRow[] = [
  topPartyRowSchema.parse({
    party: constructSrl,
    flowCount: 980,
    amount: ron(210_000_000),
    amountMissingCount: 21,
    shareOfTotal: null,
    evidenceRefs: ['contract-key-001', 'da-key-001', 'da-key-002'],
  }),
  topPartyRowSchema.parse({
    party: samsaCluj,
    flowCount: 410,
    amount: native(820_000, 'EUR'),
    amountMissingCount: 0,
    shareOfTotal: null,
    evidenceRefs: ['contract-key-002'],
  }),
]

const topCategories = [
  { divisionCode: '45', labelRo: 'Lucrări de construcții', labelEn: 'Construction work', flowCount: 1_240, amount: ron(280_000_000) },
  { divisionCode: '30', labelRo: null, labelEn: 'Computer equipment', flowCount: 312, amount: ron(38_000_000) },
  { divisionCode: '90', labelRo: null, labelEn: 'Cleaning services', flowCount: 198, amount: ron(12_000_000) },
]

const monthlyPoints: MonthlyPoint[] = [
  monthlyPointSchema.parse({ month: '2025-01', amountPresent: 21_000_000, amountMissingCount: 2, flowCount: 142 }),
  monthlyPointSchema.parse({ month: '2025-02', amountPresent: 18_400_000, amountMissingCount: 1, flowCount: 128 }),
  monthlyPointSchema.parse({ month: '2025-03', amountPresent: 24_900_000, amountMissingCount: 0, flowCount: 151 }),
  monthlyPointSchema.parse({ month: '2025-04', amountPresent: 19_600_000, amountMissingCount: 3, flowCount: 137 }),
  monthlyPointSchema.parse({ month: '2025-05', amountPresent: 27_300_000, amountMissingCount: 1, flowCount: 162 }),
  monthlyPointSchema.parse({ month: '2025-06', amountPresent: 22_100_000, amountMissingCount: 0, flowCount: 144 }),
]

// ---------------------------------------------------------------------------
// Page bundles
// ---------------------------------------------------------------------------

const landing: ProcurementLanding = procurementLandingSchema.parse({
  headline: {
    totalVolume: ron(475_000_000),
    buyersCount: 4_120,
    suppliersCount: 11_860,
    recordsCount: 21_566_426,
  },
  topAuthorities,
  topCategories,
  gate: MOCK_GATE_PARTIAL,
})

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function recordAuthority(record: ProcurementRecordSummary) {
  switch (record.grain) {
    case 'procedure':
    case 'contract':
    case 'direct_acquisition':
      return record.authority
    case 'modification':
      return record.parentContract?.authority ?? null
  }
}

function recordSupplier(record: ProcurementRecordSummary) {
  switch (record.grain) {
    case 'contract':
    case 'direct_acquisition':
      return record.supplier
    case 'modification':
      return record.parentContract?.supplier ?? null
    case 'procedure':
      return null
  }
}

function recordCpv(record: ProcurementRecordSummary): string | null {
  return 'cpvCode' in record ? record.cpvCode : null
}

function recordDate(record: ProcurementRecordSummary): string | null {
  switch (record.grain) {
    case 'procedure':
      return record.publicationDate ?? record.stateDate
    case 'contract':
      return record.contractDate
    case 'direct_acquisition':
      return record.publicationDate ?? record.finalizationDate
    case 'modification':
      return record.modificationDate
  }
}

function recordValueRon(record: ProcurementRecordSummary): number | null {
  if ('value' in record) return record.value.ron
  if ('awardedValue' in record) return record.awardedValue.ron
  if ('valueDelta' in record) return record.valueDelta.ron
  return null
}

function recordSearchText(record: ProcurementRecordSummary): string {
  const authority = recordAuthority(record)
  const supplier = recordSupplier(record)
  const title =
    'title' in record
      ? record.title
      : record.grain === 'modification'
        ? record.modificationType
        : null
  const identifier =
    record.grain === 'procedure'
      ? record.noticeNo
      : record.grain === 'contract'
        ? record.contractNo
        : record.grain === 'direct_acquisition'
          ? record.uniqueCode
          : record.id
  return normalizeText(
    [
      record.id,
      title,
      identifier,
      recordCpv(record),
      authority?.cui,
      authority?.displayName,
      authority?.name,
      supplier?.cui,
      supplier?.displayName,
      supplier?.name,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function recordSourceMatches(
  record: ProcurementRecordSummary,
  source: ProcurementSearchState['source'],
): boolean {
  if (!source) return true
  const sourceSystem = record.provenance.sourceSystem
  if (source === 'ted') return sourceSystem === 'ted'
  if (source === 'seap') return sourceSystem.startsWith('seap')
  return sourceSystem.startsWith('elicitatie')
}

function matchesSearchParams(
  record: ProcurementRecordSummary,
  params: ProcurementSearchState,
): boolean {
  if (params.q && !recordSearchText(record).includes(normalizeText(params.q))) {
    return false
  }
  if (params.authority_cui && recordAuthority(record)?.cui !== params.authority_cui) {
    return false
  }
  if (params.supplier_cui && recordSupplier(record)?.cui !== params.supplier_cui) {
    return false
  }
  const cpv = recordCpv(record)
  if (params.cpv && cpv !== params.cpv) {
    return false
  }
  if (params.cpv_division && !cpv?.startsWith(params.cpv_division)) {
    return false
  }
  if (params.status?.length && (!('status' in record) || !params.status.includes(record.status))) {
    return false
  }
  if (!recordSourceMatches(record, params.source)) {
    return false
  }
  const date = recordDate(record)
  if (params.year && date?.slice(0, 4) !== String(params.year)) {
    return false
  }
  if (params.dateFrom && (!date || date < params.dateFrom)) {
    return false
  }
  if (params.dateTo && (!date || date > params.dateTo)) {
    return false
  }
  const valueRon = recordValueRon(record)
  if (params.valueMin !== undefined && (valueRon === null || valueRon < params.valueMin)) {
    return false
  }
  if (params.valueMax !== undefined && (valueRon === null || valueRon > params.valueMax)) {
    return false
  }
  if (params.signal === 'same_day') {
    return record.id === 'da-key-001' || record.id === 'da-key-002'
  }
  if (params.signal) {
    return false
  }
  return true
}

function compareSearchRecords(
  a: ProcurementRecordSummary,
  b: ProcurementRecordSummary,
  sort: ProcurementSearchState['sort'],
): number {
  if (sort === 'date_asc' || sort === 'date_desc') {
    const av = recordDate(a) ?? ''
    const bv = recordDate(b) ?? ''
    return sort === 'date_asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  }
  const av = recordValueRon(a) ?? Number.NEGATIVE_INFINITY
  const bv = recordValueRon(b) ?? Number.NEGATIVE_INFINITY
  return sort === 'value_asc' ? av - bv : bv - av
}

function searchForParams(params: ProcurementSearchState): ProcurementSearchPage {
  const grain = params.grain
  const pageSize = params.pageSize
  const page = params.page
  const start = (page - 1) * pageSize

  const recordsByGrain = {
    procedures: [procedureSummary],
    contracts: contractSummaries,
    direct_acquisitions: directAcquisitionSummaries,
    modifications: modificationSearchRows,
  } as const

  const all = [...recordsByGrain[grain]]
    .filter((record) => matchesSearchParams(record, params))
    .sort((a, b) => compareSearchRecords(a, b, params.sort))
  const sliced = all.slice(start, start + pageSize)

  return procurementSearchPageSchema.parse({
    grain,
    records: sliced,
    page: { page, pageSize, total: all.length },
    gate: gateForGrain(grain),
  })
}

function buildContractDetail(
  summary: ContractRecordSummary,
): ProcurementRecordDetail<ReturnType<typeof contractRecordSchema.parse>> {
  const modifications =
    summary.id === 'contract-key-001' ? [modificationRows[0]] : []
  return {
    record: contractRecordSchema.parse({
      ...summary,
      modifications,
    }),
    related: {
      procedure:
        summary.procedureId === procedureSummary.id ? procedureSummary : null,
      contracts: [],
      modifications,
      moneyFlowId: summary.id === 'contract-key-001' ? 'flow-001' : null,
      duplicates:
        summary.id === 'contract-key-001'
          ? [{ sourceSystem: 'seap', id: 'contract-key-001-seap-mirror' }]
          : [],
      perLotWinners: null, // not served (gated)
      ted: null, // not served (gated)
    },
    gate: gateForGrain('contracts'),
  }
}

function buildDirectAcquisitionDetail(
  summary: DirectAcquisitionRecordSummary,
): ProcurementRecordDetail<ReturnType<typeof directAcquisitionRecordSchema.parse>> {
  return {
    record: directAcquisitionRecordSchema.parse(summary),
    related: {
      procedure: null,
      contracts: [],
      modifications: [],
      moneyFlowId: null,
      duplicates: [],
      perLotWinners: null,
      ted: null,
    },
    gate: gateForGrain('direct_acquisitions'),
  }
}

const contractDetailsById = new Map(
  contractSummaries.map((summary) => [summary.id, buildContractDetail(summary)]),
)

const directAcquisitionDetailsById = new Map(
  directAcquisitionSummaries.map((summary) => [
    summary.id,
    buildDirectAcquisitionDetail(summary),
  ]),
)

const procedureDetail: ProcurementRecordDetail<ReturnType<typeof procedureRecordSchema.parse>> = {
  record: procedureRecordSchema.parse(procedureSummary),
  related: {
    procedure: null,
    contracts: contractSummaries.filter((c) => c.procedureId === procedureSummary.id),
    modifications: [],
    moneyFlowId: 'flow-001',
    duplicates: [],
    perLotWinners: null, // gated (lane not served)
    ted: null, // gated (lane not served)
  },
  gate: gateForGrain('procedures'),
}

function optionalMockDetail<T>(detail: T | undefined): T | null {
  return detail ?? null
}

const cpvPage = (code: string): CpvCategoryPage => {
  const isDivision = code.length === 2
  const divisionCode = isDivision ? code : code.slice(0, 2)
  const category = topCategories.find((c) => c.divisionCode === divisionCode) ?? topCategories[0]

  return cpvCategoryPageSchema.parse({
    code,
    level: isDivision ? 'division' : 'code',
    labelRo: category.labelRo,
    labelEn: category.labelEn,
    divisionCode: category.divisionCode,
    parentCode: null,
    summary: {
      totalSpend: category.amount,
      recordCounts: {
        contracts: 312,
        directAcquisitions: 1_240,
        procedures: 64,
      },
    },
    spendOverTime: monthlyPoints,
    topAuthorities,
    topSuppliers,
    relatedCategories: topCategories
      .filter((c) => c.divisionCode !== category.divisionCode)
      .slice(0, 3)
      .map((c) => ({ code: c.divisionCode, labelRo: c.labelRo, labelEn: c.labelEn })),
    gate: { ...MOCK_GATE_PARTIAL, grain: 'cpv' },
  })
}

const supplierSlice = (cui: string): SupplierProcurementSlice => {
  const supplier = {
    ...constructSrl,
    cui,
    name: `Furnizor ${cui}`,
    displayName: `Furnizor ${cui}`,
  }
  return supplierProcurementSliceSchema.parse({
    supplierCui: cui,
    summary: {
      window: { from: '2025-01-01', to: '2025-12-31' },
      totalPublicRevenue: ron(210_000_000),
      buyersCount: 14,
      contractsCount: 38,
      directAcquisitionsCount: 942,
      firstSeen: '2024-08-01',
      lastSeen: '2025-12-15',
    },
    topBuyers: topAuthorities.map((row) => ({
      ...row,
      party: row.party,
    })),
    categoryBreakdown: topCategories,
    revenueOverTime: monthlyPoints,
    recentRecords: contractSummaries.map((c) => ({
      ...c,
      supplier,
    })),
    crossDomain: {
      pnrr: true,
      publicInvestments: false,
      litigation: true,
      moneyFlows: true,
    },
    gate: { ...MOCK_GATE_PARTIAL, grain: 'supplier' },
  })
}

// ---------------------------------------------------------------------------
// Public mock fixture API
// ---------------------------------------------------------------------------

export const procurementMockFixtures = {
  landing,
  gate: MOCK_GATE_PARTIAL,
  searchForParams,
  procedureDetail(id: string) {
    return id === procedureSummary.id ? procedureDetail : null
  },
  contractDetail(id: string) {
    return optionalMockDetail(contractDetailsById.get(id))
  },
  directAcquisitionDetail(id: string) {
    return optionalMockDetail(directAcquisitionDetailsById.get(id))
  },
  cpvPage,
  supplierSlice,
} as const
