import type {
  CategoryRow,
  ContractRecordSummary,
  DirectAcquisitionRecordSummary,
  ProcurementAnswerMeta,
  ProcurementGrainAnalytics,
  SupplierProcurementSlice,
  TopPartyRow,
  ValueResolution,
} from '@/schemas/procurement'
import type { PrivateCompanyFinancialYear, PrivateCompanyProfile } from '@/schemas/private-company'

/**
 * Builders for the company profile's tests: a record shaped like the live
 * API's, with nothing in it but what a test says. The shapes follow what the
 * dev API answered on 24 September 2026 for OMV Petrom, ABC-CON, Profi, 66
 * Jack and A & B Ideatica — the companies the page was designed against.
 */

export function financialYear(fiscalYear: number, fields: Partial<Omit<PrivateCompanyFinancialYear, 'fiscalYear'>> = {}): PrivateCompanyFinancialYear {
  return {
    fiscalYear,
    turnover: null,
    netProfit: null,
    netLoss: null,
    employees: null,
    currency: 'RON',
    summary: null,
    ...fields,
  }
}

export function balanceSummary(fields: Partial<NonNullable<PrivateCompanyFinancialYear['summary']>> = {}): NonNullable<PrivateCompanyFinancialYear['summary']> {
  return {
    totalRevenue: null,
    totalExpenses: null,
    grossProfit: null,
    grossLoss: null,
    receivables: null,
    currentAssets: null,
    fixedAssets: null,
    cashAndBank: null,
    prepaidExpenses: null,
    deferredIncome: null,
    subscribedCapital: null,
    inventories: null,
    debts: null,
    provisions: null,
    totalEquity: null,
    patrimonyRegie: null,
    ...fields,
  }
}

/** An active SRL in Gherla, Cluj, with a main activity and nothing else: no statements, no public money. */
export function companyProfile(overrides: Partial<PrivateCompanyProfile> = {}): PrivateCompanyProfile {
  return {
    organizationId: 'cui:22202108',
    cui: '22202108',
    codInmatriculare: 'J12/3094/2007',
    legalName: '66 JACK SRL',
    legalForm: 'SRL',
    registrationDate: '2007-11-26',
    status: { code: '1048', label: 'funcțiune' },
    address: { display: '', county: 'Cluj', locality: 'Municipiul Gherla' },
    geography: { uatSirutaCode: '55384', uatName: 'Municipiul Gherla', countyName: 'Cluj', matchConfidence: 'safe' },
    caenActivities: [
      { code: '5610', rev: 'rev2', label: 'Restaurante', source: 'onrc' },
      { code: '5630', rev: 'rev2', label: 'Baruri și alte activități de servire a băuturilor', source: 'onrc' },
      { code: '5610', rev: null, label: 'Restaurante', source: 'anaf' },
    ],
    representatives: [],
    euBranches: [],
    fiscal: { vatPayer: false, inactive: false, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '5610', rev: null } },
    financials: [],
    financialTrajectory: null,
    publicMoney: null,
    sources: [
      { id: 'onrc', snapshotDate: '2026-07-18' },
      { id: 'anaf', snapshotDate: '2026-07-04' },
    ],
    ...overrides,
  }
}

// ──────────────────────────────────────────────────── SEAP ──

function answerMeta(grain: ProcurementAnswerMeta['grain']): ProcurementAnswerMeta {
  return {
    answerability: 'served',
    reason: null,
    policyKey: `${grain}.valueAwardedSum`,
    grain,
    valueBasis: 'awarded',
    dateBasis: 'contract_date',
    population: 'canonical-only',
    buildId: '8',
    counts: null,
    undatedInScope: null,
    provisional: false,
    caveats: [],
    canonicalScope: 'canonical',
  }
}

export function authorityRow(cui: string | null, name: string | null, flowCount: number, amountRonSum: string | null, bucketKind: TopPartyRow['bucketKind'] = 'top'): TopPartyRow {
  return {
    authority: cui === null && name === null ? null : { cui, name, displayName: null },
    supplier: null,
    grain: 'contract',
    bucketKind,
    flowCount: String(flowCount),
    amountRonSum,
    amountPresentCount: String(flowCount),
    amountMissingCount: '0',
    firstFlowDate: null,
    lastFlowDate: null,
    evidenceRefsSample: [],
    shareOfScope: null,
  }
}

export function categoryRow(code: string | null, labelRo: string | null, flowCount: number, share: string | null, bucketKind: CategoryRow['bucketKind'] = 'top'): CategoryRow {
  return {
    cpvDivisionCode: code,
    cpvDivisionLabelEn: labelRo ? `${labelRo} (en)` : null,
    cpvDivisionLabelRo: labelRo,
    grain: 'contract',
    bucketKind,
    flowCount: String(flowCount),
    amountRonSum: null,
    amountPresentCount: String(flowCount),
    amountMissingCount: '0',
    shareOfScope: share,
  }
}

export function grainAnalytics(
  grain: 'contract' | 'direct_acquisition',
  fields: {
    readonly records?: number
    readonly withValue?: number
    readonly months?: readonly [string, string]
    readonly rankedBy?: 'value' | 'count' | null
    readonly authorities?: readonly TopPartyRow[]
    readonly categories?: readonly CategoryRow[]
  } = {},
): ProcurementGrainAnalytics {
  const records = fields.records ?? 0
  return {
    grain,
    stats: {
      grain,
      recordCount: String(records),
      withValueCount: String(fields.withValue ?? records),
      withEstimatedCount: null,
      valueAwardedSum: null,
      valueEstimatedSum: null,
      valueCeilingSum: null,
      valueModAdjustedSum: null,
      valueAwardedMatchedSum: null,
      avgValueAwarded: null,
      minMonth: fields.months?.[0] ?? null,
      maxMonth: fields.months?.[1] ?? null,
      moneyVerdicts: [],
      meta: answerMeta(grain),
    },
    topAuthorities: [...(fields.authorities ?? [])],
    topSuppliers: [],
    topCategories: [...(fields.categories ?? [])],
    monthly: [],
    meta: {
      authoritiesRankedBy: fields.rankedBy ?? 'value',
      suppliersRankedBy: null,
      categoriesRankedBy: fields.rankedBy ?? 'value',
      authorities: answerMeta(grain),
      suppliers: null,
      categories: answerMeta(grain),
      recordSeries: answerMeta(grain),
      valueSeries: answerMeta(grain),
    },
  }
}

export function acceptedValue(ron: string): ValueResolution {
  return {
    valueState: 'official_exact',
    valueStateRule: 'own_value',
    valueAccepted: true,
    valueRonComparable: ron,
    valueComparableBasis: 'official',
    valueRulesVersion: 5,
    valueResolvedAt: null,
  }
}

const PARTY = { cui: '10755066', name: 'SC "LOCATIV"SA', displayName: null }
const SUPPLIER = { cui: '22202108', name: '66 JACK SRL', displayName: null }

export function directAcquisition(id: string, fields: Partial<DirectAcquisitionRecordSummary> = {}): DirectAcquisitionRecordSummary {
  return {
    id,
    grain: 'direct_acquisition',
    uniqueCode: `DAN${id}`,
    title: 'benzina',
    authority: PARTY,
    supplier: SUPPLIER,
    cpvCode: '09132000',
    cpvDivisionCode: '09',
    estimatedValueRon: null,
    status: 'unknown',
    stateId: null,
    countyName: null,
    publicationDate: '2026-09-03',
    finalizationDate: '2026-09-03',
    sourceSystem: 'seap_dan',
    sourceUrl: null,
    isCanonical: true,
    dupGroupId: null,
    valueRon: '300.14',
    currency: null,
    value: acceptedValue('300.14'),
    ...fields,
  }
}

export function contract(id: string, fields: Partial<ContractRecordSummary> = {}): ContractRecordSummary {
  return {
    id,
    grain: 'contract',
    contractNo: null,
    contractDate: '2026-09-02',
    procedureId: null,
    noticeNo: null,
    title: 'ACORD CADRU produse petroliere',
    displayTitle: null,
    authority: PARTY,
    supplier: SUPPLIER,
    cpvCode: '09100000',
    cpvDivisionCode: '09',
    estimatedValueRon: null,
    status: 'awarded',
    sourceSystem: 'seap_contracts',
    sourceUrl: null,
    isCanonical: true,
    dupGroupId: null,
    canonicalValueSource: null,
    valueDisagreement: false,
    modifications: [],
    valueRon: '1000000.00',
    currency: 'RON',
    value: acceptedValue('1000000.00'),
    ...fields,
  }
}

export function supplierSlice(fields: {
  readonly window?: { readonly from: string | null; readonly to: string | null }
  readonly contract?: ProcurementGrainAnalytics
  readonly directAcquisition?: ProcurementGrainAnalytics
  readonly recentRecords?: SupplierProcurementSlice['recentRecords']
} = {}): SupplierProcurementSlice {
  return {
    supplierCui: '22202108',
    supplierName: null,
    summary: {
      window: { from: fields.window?.from ?? null, to: fields.window?.to ?? null },
      totalPublicRevenueRon: null,
      buyersCount: null,
      contractsCount: fields.contract?.stats.recordCount ?? '0',
      directAcquisitionsCount: fields.directAcquisition?.stats.recordCount ?? '0',
      firstSeen: null,
      lastSeen: null,
    },
    analysisByGrain: {
      contract: fields.contract ?? grainAnalytics('contract'),
      directAcquisition: fields.directAcquisition ?? grainAnalytics('direct_acquisition'),
    },
    recentRecords: [...(fields.recentRecords ?? [])],
    crossDomain: null,
  }
}
