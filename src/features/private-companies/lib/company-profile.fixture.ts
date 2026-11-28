import type {
  CategoryRow,
  ContractRecordSummary,
  DirectAcquisitionRecordSummary,
  ProcurementAnswerMeta,
  ProcurementGrainAnalytics,
  TopPartyRow,
  ValueResolution,
} from '@/schemas/procurement'
import type { RawWinnerContractAwards } from '@/features/procurement/api/graphql/procurement-contract-award-queries'
import type { CompanyDirectRow, CompanyProcurement } from '@/features/procurement/api/procurement-company-read'
import { mapWinnerContractAwards } from '@/features/procurement/lib/contract-award-model'
import type { PrivateCompanyFinancialYear, PrivateCompanyProfile } from '@/schemas/private-company'
import { admittedQualification, originalsOf } from '../mocks/fixtures/qualification'
import { mockRegistryEvidence } from '../mocks/fixtures/registry'

/**
 * Builders for the company profile's tests: a record shaped like the live
 * API's, with nothing in it but what a test says. The shapes follow what the
 * dev API answered on 24 September 2026 for OMV Petrom, ABC-CON, Profi, 66
 * Jack and A & B Ideatica — the companies the page was designed against.
 */

/**
 * A statement year; its publisher follows the source seam (MFP through FY2018,
 * ANAF from FY2019) unless a test says otherwise. Unless a test passes its own,
 * the exact texts follow the values and the qualification is the evaluator's
 * for an admitted, unheld statement (every present value reported).
 */
export function financialYear(fiscalYear: number, fields: Partial<Omit<PrivateCompanyFinancialYear, 'fiscalYear'>> = {}): PrivateCompanyFinancialYear {
  const { originals, source, qualification, ...values } = fields
  const year = {
    fiscalYear,
    sourceSystem: fiscalYear >= 2019 ? ('anaf' as const) : ('mfp' as const),
    turnover: null,
    netProfit: null,
    netLoss: null,
    employees: null,
    currency: 'RON' as const,
    summary: null,
    ...values,
  }
  return {
    ...year,
    originals: originals ?? originalsOf(year),
    source: source ?? null,
    qualification: qualification ?? admittedQualification(year),
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

/**
 * An active SRL in Gherla, Cluj, with a main activity and nothing else: no
 * statements, no public money. As live, ANAF's main activity carries no CAEN
 * revision (so no name of its own) and the sources carry the source's dates:
 * the ONRC edition published on 8 July, ANAF's state on 4 July. Its registry
 * evidence is a MOCK edition's (one identifier, one status) agreeing with the
 * qualified fields; a test that overrides those fields passes its own
 * `registry` when the evidence matters to it.
 */
export function companyProfile(overrides: Partial<PrivateCompanyProfile> = {}): PrivateCompanyProfile {
  return {
    organizationId: 'cui:22202108',
    cui: '22202108',
    codInmatriculare: 'J12/3094/2007',
    legalName: '66 JACK SRL',
    nameSource: 'onrc_edition',
    legalForm: 'SRL',
    registrationDate: '2007-11-26',
    status: { code: '1048', label: 'funcțiune' },
    address: { display: '', county: 'Cluj', locality: 'Municipiul Gherla' },
    geography: { uatSirutaCode: '55384', uatName: 'Municipiul Gherla', countyName: 'Cluj', matchConfidence: 'safe' },
    caenActivities: [
      { code: '5610', rev: 'rev2', label: 'Restaurante', source: 'onrc', classState: 'class' },
      { code: '5630', rev: 'rev2', label: 'Baruri și alte activități de servire a băuturilor', source: 'onrc', classState: 'class' },
      { code: '5610', rev: null, label: null, source: 'anaf' },
    ],
    registry: mockRegistryEvidence({
      identifier: 'J12/3094/2007',
      legalForm: 'SRL',
      recordedDate: '2007-11-26',
      countyCode: 'CJ',
      uatSirutaCode: '55384',
      statusCodes: ['1048'],
    }),
    fiscal: { vatPayer: false, inactive: false, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '5610', rev: null } },
    financials: [],
    financialTrajectory: null,
    publicMoney: null,
    sources: [
      { id: 'onrc', snapshotDate: '2026-07-08' },
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

/** One of the firm's newest release purchases, as the band's read maps it (a counted purchase in lei by default). */
export function newestPurchase(id: string, fields: Partial<CompanyDirectRow> = {}): CompanyDirectRow {
  return {
    id,
    code: `DA${id.slice(0, 8)}`,
    title: 'Benzină',
    titlePublic: true,
    value: 300.14,
    inLei: true,
    date: '2026-09-03',
    done: true,
    buyer: { cui: '10755066', name: 'SC Locativ SA' },
    ...fields,
  }
}

/**
 * The band's two reads (PROC-001): the direct purchases (the analysis and the
 * release's newest) and the contract awards by winner, each answered or
 * failed on its own. By default: no direct purchase, and no contract award
 * listed for the code.
 */
export function companyProcurement(
  fields: {
    readonly directAcquisition?: ProcurementGrainAnalytics
    readonly newest?: readonly CompanyDirectRow[]
    readonly direct?: 'failed'
    /** A winner answer (`rawWinnerAwards`), `missing`, or `failed`. */
    readonly contracts?: RawWinnerContractAwards | 'missing' | 'failed'
  } = {},
): CompanyProcurement {
  const contracts = fields.contracts ?? 'missing'
  return {
    direct: fields.direct === 'failed' ? { status: 'failed' } : { status: 'ready', value: { analytics: fields.directAcquisition ?? grainAnalytics('direct_acquisition'), newest: [...(fields.newest ?? [])] } },
    contracts:
      contracts === 'failed'
        ? { status: 'failed' }
        : { status: 'ready', value: contracts === 'missing' ? { kind: 'missing' } : { kind: 'found', awards: mapWinnerContractAwards(contracts) } },
  }
}
