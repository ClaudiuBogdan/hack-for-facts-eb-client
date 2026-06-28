import {
  capabilityGateSchema,
  categoryRowSchema,
  contractModificationRecordSchema,
  contractModificationSchema,
  contractRecordSchema,
  contractRecordSummarySchema,
  cpvCategoryPageSchema,
  directAcquisitionRecordSchema,
  directAcquisitionRecordSummarySchema,
  monthlyPointSchema,
  procedureRecordSchema,
  procedureRecordSummarySchema,
  procurementLandingSchema,
  procurementSearchPageSchema,
  supplierProcurementSliceSchema,
  topPartyRowSchema,
  type CapabilityGate,
  type CategoryRow,
  type ContractModification,
  type ContractRecordSummary,
  type CpvCategoryPage,
  type DirectAcquisitionRecordSummary,
  type MonthlyPoint,
  type ProcedureRecordSummary,
  type ProcurementGrain,
  type ProcurementLanding,
  type ProcurementRecordDetail,
  type ProcurementRecordSummary,
  type ProcurementSearchPage,
  type SupplierProcurementSlice,
  type TopPartyRow,
} from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'

// ---------------------------------------------------------------------------
// Capability gates (prod shape: coverage rates + boolean flags + blockers).
// Two realistic gates exercise both states — direct acquisitions clear the
// thresholds (spend allowed) while contracts are blocked (amount/date coverage
// below threshold). Values mirror the live gate snapshot in
// docs/procurement-prod-schema-reference.md §6.
// ---------------------------------------------------------------------------

const DA_GATE: CapabilityGate = capabilityGateSchema.parse({
  sourceGrain: 'direct_acquisition',
  rowsCount: '15822708',
  authorityCuiCoverageRate: '0.990941',
  supplierCuiCoverageRate: '0.996412',
  amountCoverageRate: '0.998035',
  cpvCoverageRate: '0.993010',
  dateCoverageRate: '0.966098',
  filterAnswersAllowed: true,
  spendRankingsAllowed: true,
  supplierRegionFiltersAllowed: false,
  blockers: ['supplier_region_filters_allowed=false'],
  dataAsOf: '2026-06-25',
  cadence: 'zilnic (suspendat)',
})

const CONTRACT_GATE: CapabilityGate = capabilityGateSchema.parse({
  sourceGrain: 'procurement_contract',
  rowsCount: '895584',
  authorityCuiCoverageRate: '0.943160',
  supplierCuiCoverageRate: '0.934006',
  amountCoverageRate: '0.800835',
  cpvCoverageRate: '0.878314',
  dateCoverageRate: '0.827897',
  filterAnswersAllowed: false,
  spendRankingsAllowed: false,
  supplierRegionFiltersAllowed: false,
  blockers: [
    'authority_cui_coverage_rate<0.95',
    'supplier_cui_coverage_rate<0.95',
    'amount_coverage_rate<0.95',
    'date_coverage_rate<0.85',
    'supplier_region_filters_allowed=false',
  ],
  dataAsOf: '2026-06-25',
  cadence: 'zilnic (suspendat)',
})

function gateForGrain(grain: ProcurementGrain): CapabilityGate {
  return grain === 'direct_acquisitions' ? DA_GATE : CONTRACT_GATE
}

// ---------------------------------------------------------------------------
// Parties (CUI-first; names cleaned of own-CUI prefix + pipes).
// ---------------------------------------------------------------------------

const primariaCluj = {
  cui: '2939237',
  name: 'Primăria Municipiului Cluj-Napoca',
  displayName: 'Primăria Municipiului Cluj-Napoca',
}
const spitalulCluj = {
  cui: '4263240',
  name: 'Spitalul Clinic de Urgență Cluj-Napoca',
  displayName: 'Spitalul Clinic de Urgență Cluj-Napoca',
}
const samsaCluj = {
  cui: '14399840',
  name: 'DANTE INTERNATIONAL SA',
  displayName: 'DANTE INTERNATIONAL SA',
}
const constructSrl = {
  cui: '12345678',
  name: 'CONSTRUCT CLUJ SRL',
  displayName: 'CONSTRUCT CLUJ SRL',
}
const youngSupplier = {
  cui: '45678901',
  name: 'INOVATE SOLUTIONS SRL',
  displayName: 'INOVATE SOLUTIONS SRL',
}
const emptyParty = { cui: null, name: null, displayName: null }

// ---------------------------------------------------------------------------
// Money helpers — flat fields, RON as decimal strings (mirror the DTO).
// ---------------------------------------------------------------------------

function ronStr(value: number): string {
  return value.toFixed(2)
}

/** A clean RON money slice. */
function ronMoney(value: number) {
  return {
    valueRon: ronStr(value),
    currency: 'RON',
    isRon: true,
    valueSuspect: false,
  }
}

/** A non-RON money slice: no RON amount available (prod nulls value_ron).
 * Non-RON is not "suspect" — the currency code conveys it, not the outlier flag. */
function nonRonMoney(currency: string) {
  return { valueRon: null, currency, isRon: false, valueSuspect: false }
}

/** A suspect, guarded-out amount: prod nulls value_ron and keeps the flag. */
function suspectMoney() {
  return { valueRon: null, currency: 'RON', isRon: true, valueSuspect: true }
}

// ---------------------------------------------------------------------------
// Procedure / contract / DA / modification summaries
// ---------------------------------------------------------------------------

const procedureSummary: ProcedureRecordSummary =
  procedureRecordSummarySchema.parse({
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
    estimatedValueRon: ronStr(48_000_000),
    awardedValueRon: ronStr(47_200_000),
    currency: 'RON',
    isRon: true,
    valueSuspect: false,
    status: 'awarded',
    countyName: 'Cluj',
    publicationDate: '2025-09-12',
    stateDate: '2025-10-30',
    sourceSystem: 'elicitatie',
    sourceUrl:
      'https://www.e-licitatie.ro/pub/notices/procedure/proc-2025-cluj-48000',
    isCanonical: true,
    dupGroupId: null,
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
    cpvDivisionCode: '45',
    ...ronMoney(47_200_000),
    estimatedValueRon: ronStr(48_000_000),
    status: 'awarded',
    sourceSystem: 'elicitatie_ca_award',
    sourceUrl: 'https://www.e-licitatie.ro/pub/notices/contract/contract-key-001',
    isCanonical: true,
    dupGroupId: null,
    modifications: [],
  }),
  // Non-RON contract: value_ron is null, currency disclosed, flagged suspect.
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
    cpvDivisionCode: '30',
    ...nonRonMoney('EUR'),
    estimatedValueRon: ronStr(2_100_000),
    status: 'awarded',
    sourceSystem: 'seap_contracts',
    sourceUrl: 'https://www.e-licitatie.ro/pub/notices/contract/contract-key-002',
    isCanonical: true,
    dupGroupId: null,
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
    supplier: youngSupplier,
    cpvCode: '90910000',
    cpvDivisionCode: '90',
    ...ronMoney(180_000),
    estimatedValueRon: ronStr(190_000),
    // 'unknown' is first-class.
    status: 'unknown',
    sourceSystem: 'seap_contracts',
    sourceUrl: 'https://www.e-licitatie.ro/pub/notices/contract/contract-key-003',
    isCanonical: true,
    dupGroupId: null,
    modifications: [],
  }),
]

const directAcquisitionSummaries: DirectAcquisitionRecordSummary[] = [
  directAcquisitionRecordSummarySchema.parse({
    id: 'da-key-001',
    grain: 'direct_acquisition',
    uniqueCode: 'DA-2025-0001-CL',
    title: 'Materiale de construcții',
    authority: primariaCluj,
    supplier: constructSrl,
    cpvCode: '45233140',
    cpvDivisionCode: '45',
    ...ronMoney(98_000),
    estimatedValueRon: ronStr(100_000),
    status: 'finalized',
    stateId: 'RO-DA-0001',
    countyName: 'Cluj',
    publicationDate: '2025-12-10',
    finalizationDate: '2025-12-15',
    sourceSystem: 'elicitatie_da',
    sourceUrl: 'https://www.e-licitatie.ro/pub/notices/da/da-key-001',
    isCanonical: true,
    dupGroupId: null,
  }),
  directAcquisitionRecordSummarySchema.parse({
    id: 'da-key-002',
    grain: 'direct_acquisition',
    uniqueCode: 'DA-2025-0002-CL',
    title: 'Materiale de construcții',
    authority: primariaCluj,
    supplier: constructSrl,
    cpvCode: '45233140',
    cpvDivisionCode: '45',
    ...ronMoney(95_000),
    estimatedValueRon: ronStr(95_000),
    status: 'finalized',
    stateId: 'RO-DA-0002',
    countyName: 'Cluj',
    publicationDate: '2025-12-10',
    finalizationDate: '2025-12-15',
    sourceSystem: 'elicitatie_da',
    sourceUrl: 'https://www.e-licitatie.ro/pub/notices/da/da-key-002',
    isCanonical: true,
    dupGroupId: null,
  }),
  // Outlier value — guarded out (value ≫ estimated): prod nulls value_ron and
  // keeps the suspect flag, so the amount never sorts/filters/exports.
  directAcquisitionRecordSummarySchema.parse({
    id: 'da-key-003',
    grain: 'direct_acquisition',
    uniqueCode: 'DA-2025-0003-CL',
    title: 'Echipamente medicale',
    authority: spitalulCluj,
    supplier: samsaCluj,
    cpvCode: '30200000',
    cpvDivisionCode: '30',
    ...suspectMoney(),
    estimatedValueRon: ronStr(120_000),
    status: 'finalized',
    stateId: 'RO-DA-0003',
    countyName: 'Cluj',
    publicationDate: '2025-12-11',
    finalizationDate: '2025-12-16',
    sourceSystem: 'seap_da',
    sourceUrl: 'https://www.e-licitatie.ro/pub/notices/da/da-key-003',
    isCanonical: true,
    dupGroupId: null,
  }),
  // Sparse seap_dan row — nulls across parties/cpv/value/dates.
  directAcquisitionRecordSummarySchema.parse({
    id: 'da-key-004',
    grain: 'direct_acquisition',
    uniqueCode: null,
    title: null,
    authority: emptyParty,
    supplier: emptyParty,
    cpvCode: null,
    cpvDivisionCode: null,
    valueRon: null,
    currency: null,
    isRon: true,
    valueSuspect: false,
    estimatedValueRon: null,
    status: 'unknown',
    stateId: null,
    countyName: null,
    publicationDate: null,
    finalizationDate: null,
    sourceSystem: 'seap_dan',
    sourceUrl: 'https://data.gov.ro/seap/dan/2025',
    isCanonical: true,
    dupGroupId: null,
  }),
]

const modificationRows: ContractModification[] = [
  contractModificationSchema.parse({
    id: 'mod-001',
    contractId: 'contract-key-001',
    linkMethod: 'notice_no',
    linkConfidence: 0.99,
    modificationDate: '2026-02-10',
    valueBeforeRon: ronStr(47_200_000),
    valueAfterRon: ronStr(51_900_000),
    valueDeltaRon: ronStr(4_700_000),
    modificationType: 'ACT ADITIONAL',
  }),
  // Unlinked modification (~40% of rows link; the rest are kept, not hidden).
  contractModificationSchema.parse({
    id: 'mod-002',
    contractId: null,
    linkMethod: null,
    linkConfidence: null,
    modificationDate: '2026-03-01',
    valueBeforeRon: ronStr(120_000),
    valueAfterRon: ronStr(240_000),
    valueDeltaRon: ronStr(120_000),
    modificationType: 'ACT ADITIONAL',
  }),
]

const modificationSearchRows = [
  contractModificationRecordSchema.parse({
    id: 'mod-001',
    grain: 'modification',
    contractId: 'contract-key-001',
    linkMethod: 'notice_no',
    linkConfidence: 0.99,
    modificationDate: '2026-02-10',
    valueBeforeRon: ronStr(47_200_000),
    valueAfterRon: ronStr(51_900_000),
    valueDeltaRon: ronStr(4_700_000),
    modificationType: 'ACT ADITIONAL',
    authority: primariaCluj,
    supplier: constructSrl,
    contractNo: '38912/2025',
    noticeNo: '614650/2025',
    sourceUrl: 'https://www.e-licitatie.ro/pub/notices/mod/mod-001',
    parentContract: {
      contractNo: '38912/2025',
      authority: primariaCluj,
      supplier: constructSrl,
    },
  }),
  contractModificationRecordSchema.parse({
    id: 'mod-002',
    grain: 'modification',
    contractId: null,
    linkMethod: null,
    linkConfidence: null,
    modificationDate: '2026-03-01',
    valueBeforeRon: ronStr(120_000),
    valueAfterRon: ronStr(240_000),
    valueDeltaRon: ronStr(120_000),
    modificationType: 'ACT ADITIONAL',
    authority: spitalulCluj,
    supplier: emptyParty,
    contractNo: '304',
    noticeNo: 'CAN1131954',
    sourceUrl: 'https://data.gov.ro/seap/modificari/2026',
    parentContract: null,
  }),
]

// ---------------------------------------------------------------------------
// Aggregate rollup rows (counts as bigint decimal strings)
// ---------------------------------------------------------------------------

const topAuthorities: TopPartyRow[] = [
  topPartyRowSchema.parse({
    authority: primariaCluj,
    supplier: null,
    sourceGrain: 'procurement_contract',
    flowCount: '1240',
    amountRonSum: ronStr(380_000_000),
    amountPresentCount: '1202',
    amountMissingCount: '38',
    firstFlowDate: '2024-01-15',
    lastFlowDate: '2025-12-10',
    evidenceRefsSample: ['contract:contract-key-001', 'da:da-key-001'],
  }),
  topPartyRowSchema.parse({
    authority: spitalulCluj,
    supplier: null,
    sourceGrain: 'procurement_contract',
    flowCount: '642',
    amountRonSum: ronStr(95_000_000),
    amountPresentCount: '628',
    amountMissingCount: '14',
    firstFlowDate: '2024-03-02',
    lastFlowDate: '2025-12-01',
    evidenceRefsSample: ['contract:contract-key-002', 'contract:contract-key-003'],
  }),
]

const topSuppliers: TopPartyRow[] = [
  topPartyRowSchema.parse({
    authority: null,
    supplier: constructSrl,
    sourceGrain: 'procurement_contract',
    flowCount: '980',
    amountRonSum: ronStr(210_000_000),
    amountPresentCount: '959',
    amountMissingCount: '21',
    firstFlowDate: '2024-02-01',
    lastFlowDate: '2025-12-15',
    evidenceRefsSample: [
      'contract:contract-key-001',
      'da:da-key-001',
      'da:da-key-002',
    ],
  }),
  // Non-RON-heavy supplier → amount not summable (null).
  topPartyRowSchema.parse({
    authority: null,
    supplier: samsaCluj,
    sourceGrain: 'procurement_contract',
    flowCount: '410',
    amountRonSum: null,
    amountPresentCount: '0',
    amountMissingCount: '410',
    firstFlowDate: '2024-05-10',
    lastFlowDate: '2025-11-15',
    evidenceRefsSample: ['contract:contract-key-002'],
  }),
]

const topCategories: CategoryRow[] = [
  categoryRowSchema.parse({
    cpvDivisionCode: '45',
    cpvDivisionLabelEn: 'Construction work',
    cpvDivisionLabelRo: 'Lucrări de construcții',
    sourceGrain: 'direct_acquisition',
    flowCount: '1240',
    amountRonSum: ronStr(280_000_000),
    amountPresentCount: '1212',
    amountMissingCount: '28',
  }),
  categoryRowSchema.parse({
    cpvDivisionCode: '30',
    cpvDivisionLabelEn: 'Computer equipment',
    cpvDivisionLabelRo: null,
    sourceGrain: 'direct_acquisition',
    flowCount: '312',
    amountRonSum: ronStr(38_000_000),
    amountPresentCount: '300',
    amountMissingCount: '12',
  }),
  categoryRowSchema.parse({
    cpvDivisionCode: '90',
    cpvDivisionLabelEn: 'Cleaning services',
    cpvDivisionLabelRo: null,
    sourceGrain: 'direct_acquisition',
    flowCount: '198',
    amountRonSum: ronStr(12_000_000),
    amountPresentCount: '198',
    amountMissingCount: '0',
  }),
]

const monthlyPoints: MonthlyPoint[] = [
  monthlyPointSchema.parse({ month: '2025-01', flowCount: '142', amountRonSum: ronStr(21_000_000), amountPresentCount: '140', amountMissingCount: '2' }),
  monthlyPointSchema.parse({ month: '2025-02', flowCount: '128', amountRonSum: ronStr(18_400_000), amountPresentCount: '127', amountMissingCount: '1' }),
  monthlyPointSchema.parse({ month: '2025-03', flowCount: '151', amountRonSum: ronStr(24_900_000), amountPresentCount: '151', amountMissingCount: '0' }),
  monthlyPointSchema.parse({ month: '2025-04', flowCount: '137', amountRonSum: ronStr(19_600_000), amountPresentCount: '134', amountMissingCount: '3' }),
  monthlyPointSchema.parse({ month: '2025-05', flowCount: '162', amountRonSum: ronStr(27_300_000), amountPresentCount: '161', amountMissingCount: '1' }),
  monthlyPointSchema.parse({ month: '2025-06', flowCount: '144', amountRonSum: ronStr(22_100_000), amountPresentCount: '144', amountMissingCount: '0' }),
]

// ---------------------------------------------------------------------------
// Page bundles
// ---------------------------------------------------------------------------

const landing: ProcurementLanding = procurementLandingSchema.parse({
  headline: {
    totalValueRon: ronStr(475_000_000),
    buyersCount: 4_120,
    suppliersCount: 11_860,
    recordsCount: 21_566_426,
  },
  topAuthorities,
  topSuppliers,
  topCategories,
  gate: DA_GATE,
})

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function recordAuthority(record: ProcurementRecordSummary) {
  switch (record.grain) {
    case 'procedure':
    case 'contract':
    case 'direct_acquisition':
    case 'modification':
      return record.authority
  }
}

function recordSupplier(record: ProcurementRecordSummary) {
  switch (record.grain) {
    case 'contract':
    case 'direct_acquisition':
    case 'modification':
      return record.supplier
    case 'procedure':
      return null
  }
}

function recordCpv(record: ProcurementRecordSummary): string | null {
  return 'cpvCode' in record ? record.cpvCode : null
}

function recordSourceSystem(record: ProcurementRecordSummary): string | null {
  return 'sourceSystem' in record ? record.sourceSystem : null
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
  const raw =
    record.grain === 'procedure'
      ? record.awardedValueRon
      : record.grain === 'modification'
        ? record.valueDeltaRon
        : record.valueRon
  if (raw === null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
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
  const sourceSystem = recordSourceSystem(record)
  if (sourceSystem === null) return true
  if (source === 'seap') return sourceSystem.startsWith('seap')
  return sourceSystem.startsWith('elicitatie')
}

function matchesSearchParams(
  record: ProcurementRecordSummary,
  params: ProcurementSearchState,
  spendAllowed: boolean,
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
  // Value-range is a spend answer — only authoritative when the gate allows it.
  if (spendAllowed) {
    const valueRon = recordValueRon(record)
    if (
      params.valueMin !== undefined &&
      (valueRon === null || valueRon < params.valueMin)
    ) {
      return false
    }
    if (
      params.valueMax !== undefined &&
      (valueRon === null || valueRon > params.valueMax)
    ) {
      return false
    }
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
  const gate = gateForGrain(grain)
  const spendAllowed = gate.spendRankingsAllowed
  const pageSize = params.pageSize
  const page = params.page
  const start = (page - 1) * pageSize

  const recordsByGrain = {
    procedures: [procedureSummary],
    contracts: contractSummaries,
    direct_acquisitions: directAcquisitionSummaries,
    modifications: modificationSearchRows,
  } as const

  // Gate enforcement (mirrors the server): when spend rankings are not allowed
  // for this grain, a value sort degrades to date and value-range filters are
  // ignored — a URL-only request cannot produce a value-ranked/filtered answer.
  const effectiveSort: ProcurementSearchState['sort'] =
    !spendAllowed &&
    (params.sort === 'value_desc' || params.sort === 'value_asc')
      ? 'date_desc'
      : params.sort

  const all = [...recordsByGrain[grain]]
    .filter((record) => matchesSearchParams(record, params, spendAllowed))
    .sort((a, b) => compareSearchRecords(a, b, effectiveSort))
  const sliced = all.slice(start, start + pageSize)

  return procurementSearchPageSchema.parse({
    grain,
    records: sliced,
    page: { page, pageSize, total: all.length },
    gate,
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
          ? [{ sourceSystem: 'seap_contracts', id: 'contract-key-001-seap-mirror' }]
          : [],
      perLotWinners: null, // not served (gated)
      ted: null, // not served (gated)
    },
    gate: CONTRACT_GATE,
  }
}

function buildDirectAcquisitionDetail(
  summary: DirectAcquisitionRecordSummary,
): ProcurementRecordDetail<
  ReturnType<typeof directAcquisitionRecordSchema.parse>
> {
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
    gate: DA_GATE,
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

const procedureDetail: ProcurementRecordDetail<
  ReturnType<typeof procedureRecordSchema.parse>
> = {
  record: procedureRecordSchema.parse(procedureSummary),
  related: {
    procedure: null,
    contracts: contractSummaries.filter(
      (c) => c.procedureId === procedureSummary.id,
    ),
    modifications: [],
    moneyFlowId: 'flow-001',
    duplicates: [],
    perLotWinners: null, // gated (lane not served)
    ted: null, // gated (lane not served)
  },
  gate: CONTRACT_GATE,
}

function optionalMockDetail<T>(detail: T | undefined): T | null {
  return detail ?? null
}

const cpvPage = (code: string): CpvCategoryPage => {
  const isDivision = code.length === 2
  const divisionCode = isDivision ? code : code.slice(0, 2)
  const category =
    topCategories.find((c) => c.cpvDivisionCode === divisionCode) ??
    topCategories[0]

  return cpvCategoryPageSchema.parse({
    code,
    level: isDivision ? 'division' : 'code',
    labelRo: category.cpvDivisionLabelRo,
    labelEn: category.cpvDivisionLabelEn ?? 'Categorie CPV',
    divisionCode: category.cpvDivisionCode ?? divisionCode,
    parentCode: null,
    summary: {
      totalValueRon: category.amountRonSum,
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
      .filter((c) => c.cpvDivisionCode !== category.cpvDivisionCode)
      .slice(0, 3)
      .map((c) => ({
        code: c.cpvDivisionCode ?? '',
        labelRo: c.cpvDivisionLabelRo,
        labelEn: c.cpvDivisionLabelEn ?? 'Categorie CPV',
      })),
    // Contract-grain gate (spend below threshold) so the category page
    // exercises the count-first / partial-coverage guardrails.
    gate: CONTRACT_GATE,
  })
}

const supplierSlice = (cui: string): SupplierProcurementSlice => {
  const supplier = {
    cui,
    name: `Furnizor ${cui}`,
    displayName: `Furnizor ${cui}`,
  }
  return supplierProcurementSliceSchema.parse({
    supplierCui: cui,
    summary: {
      window: { from: '2025-01-01', to: '2025-12-31' },
      totalPublicRevenueRon: ronStr(210_000_000),
      buyersCount: 14,
      contractsCount: 38,
      directAcquisitionsCount: 942,
      firstSeen: '2024-08-01',
      lastSeen: '2025-12-15',
    },
    topBuyers: topAuthorities,
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
    gate: DA_GATE,
  })
}

// ---------------------------------------------------------------------------
// Public mock fixture API
// ---------------------------------------------------------------------------

export const procurementMockFixtures = {
  landing,
  gate: DA_GATE,
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
