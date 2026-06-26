import type {
  EnterpriseIndicators,
  IndicatorDictEntry,
  IndicatorValueRow,
  LaneAvailability,
  PublicEnterpriseLandingSummary,
  PublicEnterpriseProfile,
  PublicEnterpriseSearchHit,
  PublicEnterpriseSearch,
  PublicEnterpriseSearchResult,
  PublicEnterpriseFacets,
  SourceLineage,
} from '@/schemas/public-enterprise'

/**
 * Single source of truth for public enterprise mock data.
 *
 * Mock-first only: the AMEPIP core scraper is live but the client API is not
 * connected yet, and the supplemental lanes are deploy-gated. Every fixture
 * carries an explicit `dataStatus: 'sample'`/`'mock'` and a `sourceLineage`
 * with `mode: 'sample'` so the UI never implies live data.
 *
 * Canonical sample fact: CUI 10020943, ADMINISTRAREA DOMENIULUI PUBLIC
 * BUCURESTI (A.D.P.B.) SA, registration J1997009601400, status funcţiune,
 * CAEN 8130, year 2019, indicator "Cota de piață", kpi MS, measureUnit %,
 * numeric value 0.0425 (rendered as 0,0425 % — never scaled).
 */

// ---------------------------------------------------------------------------
// Shared lineage
// ---------------------------------------------------------------------------

const AMEPIP_SNAPSHOT_ID = 'amepip-core-3a44f2c099fb711c'
const AMEPIP_WORKBOOK_SHA =
  '3a44f2c099fb711c3d0a83ddcd26941bac160f465680638fa2bc6dd8a52bbe27'
const AMEPIP_WORKBOOK_DATE = '2026-01-13T14:23:50.041841Z'
const AMEPIP_ACCEPTED_AT = '2026-06-18T19:51:53.488459Z'
const AMEPIP_SOURCE_URL =
  'https://data.gov.ro/dataset/5a4d4fdb-1e06-4ea6-a3b5-aef01ebba168/resource/8865d8b1-e5db-4a14-8721-9048af14cafe/download/datecompanii_ind-finnefin.xlsx'
const AMEPIP_LICENSE = 'CC-BY-4.0'
const AMEPIP_LOADED_AT = '2026-06-26T00:00:00.000Z'

const amepipLineage: SourceLineage = {
  sourceName: 'AMEPIP core',
  sourceLabel: 'OUG 109 public enterprise indicators (data.gov.ro)',
  snapshotId: AMEPIP_SNAPSHOT_ID,
  workbookSha256: AMEPIP_WORKBOOK_SHA,
  workbookDate: AMEPIP_WORKBOOK_DATE,
  acceptedAt: AMEPIP_ACCEPTED_AT,
  loadedAt: AMEPIP_LOADED_AT,
  sourceUrl: AMEPIP_SOURCE_URL,
  license: AMEPIP_LICENSE,
  mode: 'sample',
  rowCount: 6,
}

// ---------------------------------------------------------------------------
// Indicator dictionary (shared)
// ---------------------------------------------------------------------------

const indicatorDictionary: IndicatorDictEntry[] = [
  {
    indicator: 'Cota de piață',
    label: 'Market share',
    kpiCode: 'MS',
    measureUnit: '%',
    description: 'Estimated market share for the enterprise main activity.',
    headlinePriority: 1,
  },
  {
    indicator: 'Rentabilitatea capitalului propriu (ROE)',
    label: 'Return on equity',
    kpiCode: 'ROE',
    measureUnit: '%',
    description: 'Net profit over equity.',
    headlinePriority: 2,
  },
  {
    indicator: 'Rentabilitatea activelor (ROA)',
    label: 'Return on assets',
    kpiCode: 'ROA',
    measureUnit: '%',
    description: 'Net profit over total assets.',
    headlinePriority: 3,
  },
  {
    indicator: 'Cifra de afaceri netă',
    label: 'Net turnover',
    kpiCode: 'CA',
    measureUnit: 'mii RON',
    description: 'Net turnover in thousands of RON.',
    headlinePriority: 4,
  },
  {
    indicator: 'Profit net',
    label: 'Net profit',
    kpiCode: 'PN',
    measureUnit: 'mii RON',
    description: 'Net profit in thousands of RON.',
    headlinePriority: 5,
  },
  {
    indicator: 'Număr mediu de salariați',
    label: 'Average number of employees',
    kpiCode: 'NB',
    measureUnit: 'persoane',
    description: 'Average headcount for the reporting year.',
    headlinePriority: null,
  },
  {
    indicator: 'Eliberează factură electronică',
    label: 'Issues e-invoice',
    kpiCode: null,
    measureUnit: null,
    description: 'Boolean flag: whether the enterprise issues e-invoices.',
    headlinePriority: null,
  },
  {
    indicator: 'Sediu social',
    label: 'Registered office',
    kpiCode: null,
    measureUnit: null,
    description: 'Registered office address (text value).',
    headlinePriority: null,
  },
]

export function getMockIndicatorDictionary(): IndicatorDictEntry[] {
  return indicatorDictionary
}

// ---------------------------------------------------------------------------
// Indicator row builders
// ---------------------------------------------------------------------------

type NumberRowInput = {
  cui: string
  year: string
  indicator: string
  indicatorLabel: string | null
  kpiCode: string | null
  measureUnit: string | null
  sourceSheet: 'calculated' | 'form'
  numericValue: number
  warnings?: string[]
  rawValue?: string | null
}

function numberRow(input: NumberRowInput): IndicatorValueRow {
  return {
    valueKind: 'number',
    cui: input.cui,
    year: input.year,
    indicator: input.indicator,
    indicatorLabel: input.indicatorLabel,
    kpiCode: input.kpiCode,
    measureUnit: input.measureUnit,
    sourceSheet: input.sourceSheet,
    numericValue: input.numericValue,
    booleanValue: null,
    rawValue: input.rawValue ?? null,
    warnings: input.warnings ?? [],
  }
}

type BooleanRowInput = {
  cui: string
  year: string
  indicator: string
  indicatorLabel: string | null
  kpiCode: string | null
  sourceSheet: 'calculated' | 'form'
  booleanValue: boolean
  warnings?: string[]
}

function booleanRow(input: BooleanRowInput): IndicatorValueRow {
  return {
    valueKind: 'boolean',
    cui: input.cui,
    year: input.year,
    indicator: input.indicator,
    indicatorLabel: input.indicatorLabel,
    kpiCode: input.kpiCode,
    measureUnit: null,
    sourceSheet: input.sourceSheet,
    numericValue: null,
    booleanValue: input.booleanValue,
    rawValue: null,
    warnings: input.warnings ?? [],
  }
}

type TextRowInput = {
  cui: string
  year: string
  indicator: string
  indicatorLabel: string | null
  kpiCode: string | null
  sourceSheet: 'calculated' | 'form'
  rawValue: string
  warnings?: string[]
}

function textRow(input: TextRowInput): IndicatorValueRow {
  return {
    valueKind: 'text',
    cui: input.cui,
    year: input.year,
    indicator: input.indicator,
    indicatorLabel: input.indicatorLabel,
    kpiCode: input.kpiCode,
    measureUnit: null,
    sourceSheet: input.sourceSheet,
    numericValue: null,
    booleanValue: null,
    rawValue: input.rawValue,
    warnings: input.warnings ?? [],
  }
}

type EmptyRowInput = {
  cui: string
  year: string
  indicator: string
  indicatorLabel: string | null
  kpiCode: string | null
  measureUnit: string | null
  sourceSheet: 'calculated' | 'form'
  warnings?: string[]
}

function emptyRow(input: EmptyRowInput): IndicatorValueRow {
  return {
    valueKind: 'empty',
    cui: input.cui,
    year: input.year,
    indicator: input.indicator,
    indicatorLabel: input.indicatorLabel,
    kpiCode: input.kpiCode,
    measureUnit: input.measureUnit,
    sourceSheet: input.sourceSheet,
    numericValue: null,
    booleanValue: null,
    rawValue: null,
    warnings: input.warnings ?? [],
  }
}

function yearsFromRows(rows: readonly IndicatorValueRow[]): string[] {
  return Array.from(new Set(rows.map((row) => row.year))).sort()
}

// ---------------------------------------------------------------------------
// Lane availability (deploy-gated supplemental lanes)
// ---------------------------------------------------------------------------

const GATED_LANES: LaneAvailability[] = [
  {
    laneId: 'amepip-core',
    available: true,
    dataStatus: 'sample',
    datasetId: 'soe-amepip',
  },
  {
    laneId: 'controlling-authority',
    available: false,
    dataStatus: 'gated',
    datasetId: 'soe-controlling-authority',
    reason: 'Controlling authority lane is deploy-gated.',
  },
  {
    laneId: 'regas-state-aid',
    available: false,
    dataStatus: 'gated',
    datasetId: 'soe-regas-state-aid',
    reason: 'RegAS state aid lane is deploy-gated.',
  },
  {
    laneId: 'bvb-market',
    available: false,
    dataStatus: 'gated',
    datasetId: 'soe-bvb-market',
    reason: 'BVB market lane is deploy-gated.',
  },
  {
    laneId: 'sanctions',
    available: false,
    dataStatus: 'gated',
    datasetId: 'soe-sanctions',
    reason: 'Sanctions lane is deploy-gated.',
  },
  {
    laneId: 'governance-docs',
    available: false,
    dataStatus: 'gated',
    datasetId: 'soe-governance-docs',
    reason: 'Governance documents lane is deploy-gated.',
  },
]

// ---------------------------------------------------------------------------
// Profile fixtures — single source of truth, shared with listing hits
// ---------------------------------------------------------------------------

type ProfileSeed = {
  readonly cui: string
  readonly registration: string
  readonly legalName: string
  readonly legalForm: string
  readonly status: { code: string; label: string }
  readonly caen: { code: string; label: string }
  readonly county: string
  readonly locality: string
  readonly listed: boolean
  readonly ticker: string | null
  readonly isin: string | null
  readonly subordination: 'central' | 'local'
  readonly aptType: string
  readonly rows: IndicatorValueRow[]
}

function buildProfile(seed: ProfileSeed): PublicEnterpriseProfile {
  const years = yearsFromRows(seed.rows)
  const indicators: EnterpriseIndicators = {
    cui: seed.cui,
    dataStatus: 'sample',
    lineage: amepipLineage,
    rows: seed.rows,
    dictionary: indicatorDictionary,
    years,
  }
  return {
    cui: seed.cui,
    dataStatus: 'sample',
    lineage: amepipLineage,
    identity: {
      cui: seed.cui,
      registration: seed.registration,
      legalName: seed.legalName,
      legalForm: seed.legalForm,
      status: seed.status,
      caen: seed.caen,
      // AMEPIP identity is source-labelled evidence; ONRC/ANAF links are separate.
      onrcLinkStatus: 'partial',
      anafLinkStatus: 'unknown',
      county: seed.county,
      locality: seed.locality,
      listed: seed.listed,
      ticker: seed.ticker,
      isin: seed.isin,
    },
    lanes: GATED_LANES,
    indicators,
    stateAidSummary: { dataStatus: 'gated', count: null },
    bvbSummary: { dataStatus: 'gated', ticker: seed.ticker },
    sanctionsSummary: { dataStatus: 'gated', hasSanctions: null },
    governanceSummary: { dataStatus: 'gated', documentsCount: null },
    authoritySummary: {
      dataStatus: 'gated',
      controllingAuthority: null,
      subordination: seed.subordination,
      aptType: seed.aptType,
    },
  }
}

// ADPB — canonical sample fact + a boolean row, a text row, an empty row,
// a warning, a null kpiCode row, and a year gap (2020 missing for MS).
const adpbProfile = buildProfile({
  cui: '10020943',
  registration: 'J1997009601400',
  legalName: 'ADMINISTRAREA DOMENIULUI PUBLIC BUCURESTI (A.D.P.B.) SA',
  legalForm: 'SA',
  status: { code: 'functiune', label: 'funcţiune' },
  caen: { code: '8130', label: 'Activități de servicii peisagistice' },
  county: 'București',
  locality: 'București',
  listed: false,
  ticker: null,
  isin: null,
  subordination: 'local',
  aptType: '3',
  rows: [
    // Canonical sample fact — 0.0425 % rendered as 0,0425 % (no scaling).
    numberRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.0425,
    }),
    // Year gap: 2020 missing for MS, 2021 present.
    numberRow({
      cui: '10020943',
      year: '2021',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.051,
    }),
    numberRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Rentabilitatea capitalului propriu (ROE)',
      indicatorLabel: 'Return on equity',
      kpiCode: 'ROE',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.032,
    }),
    numberRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Rentabilitatea activelor (ROA)',
      indicatorLabel: 'Return on assets',
      kpiCode: 'ROA',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.018,
    }),
    numberRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Cifra de afaceri netă',
      indicatorLabel: 'Net turnover',
      kpiCode: 'CA',
      measureUnit: 'mii RON',
      sourceSheet: 'form',
      numericValue: 482_500,
      // One explicit warning to exercise the warnings UI path.
      warnings: ['Valoare preluată din formular nerecalculată.'],
    }),
    numberRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Profit net',
      indicatorLabel: 'Net profit',
      kpiCode: 'PN',
      measureUnit: 'mii RON',
      sourceSheet: 'form',
      numericValue: 12_300,
    }),
    numberRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Număr mediu de salariați',
      indicatorLabel: 'Average number of employees',
      kpiCode: 'NB',
      measureUnit: 'persoane',
      sourceSheet: 'form',
      numericValue: 1280,
    }),
    // Boolean row.
    booleanRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Eliberează factură electronică',
      indicatorLabel: 'Issues e-invoice',
      // null kpiCode row.
      kpiCode: null,
      sourceSheet: 'form',
      booleanValue: true,
    }),
    // Text row.
    textRow({
      cui: '10020943',
      year: '2019',
      indicator: 'Sediu social',
      indicatorLabel: 'Registered office',
      kpiCode: null,
      sourceSheet: 'form',
      rawValue: 'Splaiul Independenței nr. 8, București',
    }),
    // Empty row (missing value for ROE in 2021).
    emptyRow({
      cui: '10020943',
      year: '2021',
      indicator: 'Rentabilitatea capitalului propriu (ROE)',
      indicatorLabel: 'Return on equity',
      kpiCode: 'ROE',
      measureUnit: '%',
      sourceSheet: 'calculated',
    }),
  ],
})

const hidroelectricaProfile = buildProfile({
  cui: '10231484',
  registration: 'J40/7248/2000',
  legalName: 'HIDROELECTRICA SA',
  legalForm: 'SA',
  status: { code: 'functiune', label: 'funcţiune' },
  caen: { code: '3511', label: 'Producerea energiei electrice prin centrale hidroelectrice' },
  county: 'Gorj',
  locality: 'Sebeși',
  listed: true,
  ticker: 'H2O',
  isin: 'ROH2OACNDOR6',
  subordination: 'central',
  aptType: '1',
  rows: [
    numberRow({
      cui: '10231484',
      year: '2019',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.284,
    }),
    numberRow({
      cui: '10231484',
      year: '2021',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.301,
    }),
    numberRow({
      cui: '10231484',
      year: '2019',
      indicator: 'Rentabilitatea capitalului propriu (ROE)',
      indicatorLabel: 'Return on equity',
      kpiCode: 'ROE',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.186,
    }),
    numberRow({
      cui: '10231484',
      year: '2019',
      indicator: 'Cifra de afaceri netă',
      indicatorLabel: 'Net turnover',
      kpiCode: 'CA',
      measureUnit: 'mii RON',
      sourceSheet: 'form',
      numericValue: 4_120_000,
    }),
    numberRow({
      cui: '10231484',
      year: '2019',
      indicator: 'Număr mediu de salariați',
      indicatorLabel: 'Average number of employees',
      kpiCode: 'NB',
      measureUnit: 'persoane',
      sourceSheet: 'form',
      numericValue: 6500,
    }),
  ],
})

const romgazProfile = buildProfile({
  cui: '4344000',
  registration: 'J15/117/2001',
  legalName: 'SNGN ROMGAZ SA',
  legalForm: 'SA',
  status: { code: 'functiune', label: 'funcţiune' },
  caen: { code: '0620', label: 'Extragerea țițeiului și gazelor naturale' },
  county: 'Mureș',
  locality: 'Mediaș',
  listed: true,
  ticker: 'SNG',
  isin: 'ROSNGAACNOR0',
  subordination: 'central',
  aptType: '1',
  rows: [
    numberRow({
      cui: '4344000',
      year: '2019',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.452,
    }),
    numberRow({
      cui: '4344000',
      year: '2021',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.478,
    }),
    numberRow({
      cui: '4344000',
      year: '2019',
      indicator: 'Rentabilitatea capitalului propriu (ROE)',
      indicatorLabel: 'Return on equity',
      kpiCode: 'ROE',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.221,
    }),
    numberRow({
      cui: '4344000',
      year: '2019',
      indicator: 'Cifra de afaceri netă',
      indicatorLabel: 'Net turnover',
      kpiCode: 'CA',
      measureUnit: 'mii RON',
      sourceSheet: 'form',
      numericValue: 5_300_000,
    }),
  ],
})

const nuclearelectricaProfile = buildProfile({
  cui: '10874824',
  registration: 'J40/10454/1998',
  legalName: 'SOCIETATEA NATIONALA NUCLEARELECTRICA SA',
  legalForm: 'SA',
  status: { code: 'functiune', label: 'funcţiune' },
  caen: { code: '3511', label: 'Producerea energiei electrice prin centrale hidroelectrice' },
  county: 'Constanța',
  locality: 'Cernavodă',
  listed: true,
  ticker: 'SNN',
  isin: 'ROSNNAACNOR0',
  subordination: 'central',
  aptType: '1',
  rows: [
    numberRow({
      cui: '10874824',
      year: '2019',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.183,
    }),
    numberRow({
      cui: '10874824',
      year: '2021',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.196,
    }),
    numberRow({
      cui: '10874824',
      year: '2019',
      indicator: 'Rentabilitatea capitalului propriu (ROE)',
      indicatorLabel: 'Return on equity',
      kpiCode: 'ROE',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.147,
    }),
    numberRow({
      cui: '10874824',
      year: '2019',
      indicator: 'Cifra de afaceri netă',
      indicatorLabel: 'Net turnover',
      kpiCode: 'CA',
      measureUnit: 'mii RON',
      sourceSheet: 'form',
      numericValue: 1_950_000,
    }),
  ],
})

const transgazProfile = buildProfile({
  cui: '1179292',
  registration: 'J15/108/2000',
  legalName: 'SNTGN TRANSGAZ SA',
  legalForm: 'SA',
  status: { code: 'functiune', label: 'funcţiune' },
  caen: { code: '3522', label: 'Transportul prin conducte al gazelor naturale' },
  county: 'Mureș',
  locality: 'Mediaș',
  listed: true,
  ticker: 'TGN',
  isin: 'ROTGNACNOR0',
  subordination: 'central',
  aptType: '1',
  rows: [
    numberRow({
      cui: '1179292',
      year: '2019',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 1,
    }),
    numberRow({
      cui: '1179292',
      year: '2021',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 1,
    }),
    numberRow({
      cui: '1179292',
      year: '2019',
      indicator: 'Rentabilitatea capitalului propriu (ROE)',
      indicatorLabel: 'Return on equity',
      kpiCode: 'ROE',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.194,
    }),
    numberRow({
      cui: '1179292',
      year: '2019',
      indicator: 'Cifra de afaceri netă',
      indicatorLabel: 'Net turnover',
      kpiCode: 'CA',
      measureUnit: 'mii RON',
      sourceSheet: 'form',
      numericValue: 1_320_000,
    }),
  ],
})

const transelectricaProfile = buildProfile({
  cui: '1025942',
  registration: 'J40/7002/2000',
  legalName: 'CNTEE TRANSELECTRICA SA',
  legalForm: 'SA',
  status: { code: 'functiune', label: 'funcţiune' },
  caen: { code: '3513', label: 'Transportul energiei electrice' },
  county: 'București',
  locality: 'București',
  listed: true,
  ticker: 'TEL',
  isin: 'ROTELAACNOR0',
  subordination: 'central',
  aptType: '1',
  rows: [
    numberRow({
      cui: '1025942',
      year: '2019',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 1,
    }),
    numberRow({
      cui: '1025942',
      year: '2021',
      indicator: 'Cota de piață',
      indicatorLabel: 'Market share',
      kpiCode: 'MS',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 1,
    }),
    numberRow({
      cui: '1025942',
      year: '2019',
      indicator: 'Rentabilitatea capitalului propriu (ROE)',
      indicatorLabel: 'Return on equity',
      kpiCode: 'ROE',
      measureUnit: '%',
      sourceSheet: 'calculated',
      numericValue: 0.096,
    }),
    numberRow({
      cui: '1025942',
      year: '2019',
      indicator: 'Cifra de afaceri netă',
      indicatorLabel: 'Net turnover',
      kpiCode: 'CA',
      measureUnit: 'mii RON',
      sourceSheet: 'form',
      numericValue: 2_010_000,
    }),
  ],
})

const mockProfilesByCui: Readonly<Record<string, PublicEnterpriseProfile>> = {
  '10020943': adpbProfile,
  '10231484': hidroelectricaProfile,
  '4344000': romgazProfile,
  '10874824': nuclearelectricaProfile,
  '1179292': transgazProfile,
  '1025942': transelectricaProfile,
}

export function getMockPublicEnterpriseProfile(
  cui: string,
): PublicEnterpriseProfile | null {
  return mockProfilesByCui[cui] ?? null
}

export function getMockEnterpriseIndicators(
  cui: string,
): EnterpriseIndicators | null {
  const profile = mockProfilesByCui[cui]
  return profile ? profile.indicators : null
}

export const mockPublicEnterpriseCuis: readonly string[] = Object.keys(
  mockProfilesByCui,
)

// ---------------------------------------------------------------------------
// Listing hits — derived from the same profile dataset (every row has a profile)
// ---------------------------------------------------------------------------

function hitFromProfile(profile: PublicEnterpriseProfile): PublicEnterpriseSearchHit {
  const identity = profile.identity
  const statusCode =
    identity.status?.code === 'functiune' ||
    identity.status?.code === 'dizolvare' ||
    identity.status?.code === 'radiere' ||
    identity.status?.code === 'faliment' ||
    identity.status?.code === 'suspendare'
      ? identity.status.code
      : null
  return {
    cui: identity.cui,
    legalName: identity.legalName,
    registration: identity.registration,
    status: identity.status?.label ?? null,
    statusCode,
    caen: identity.caen?.code ?? null,
    county: identity.county,
    subordination:
      profile.authoritySummary?.subordination === 'central' ||
      profile.authoritySummary?.subordination === 'local'
        ? profile.authoritySummary.subordination
        : null,
    aptType: profile.authoritySummary?.aptType ?? null,
    listed: identity.listed,
    ticker: identity.ticker,
    hasSanctions: profile.sanctionsSummary?.hasSanctions ?? null,
    hasStateAid:
      profile.stateAidSummary?.count !== null &&
      profile.stateAidSummary?.count !== undefined &&
      profile.stateAidSummary.count > 0
        ? true
        : null,
    linkStatus: identity.onrcLinkStatus,
  }
}

const allHits: PublicEnterpriseSearchHit[] = Object.values(
  mockProfilesByCui,
).map(hitFromProfile)

// ---------------------------------------------------------------------------
// Landing summary
// ---------------------------------------------------------------------------

function countBy(values: string[]): { status: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
}

function countByCounty(
  profiles: PublicEnterpriseProfile[],
): { county: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const profile of profiles) {
    const county = profile.identity.county ?? 'Necunoscut'
    counts.set(county, (counts.get(county) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count)
}

export function getMockPublicEnterpriseLandingSummary(): PublicEnterpriseLandingSummary {
  const profiles = Object.values(mockProfilesByCui)
  const headlineKpis = [
    {
      kpiCode: 'MS',
      label: 'Market share',
      value: adpbProfile.indicators.rows.find(
        (row) => row.valueKind === 'number' && row.kpiCode === 'MS' && row.year === '2019',
      )?.numericValue ?? null,
      measureUnit: '%',
    },
    {
      kpiCode: 'ROE',
      label: 'Return on equity',
      value: adpbProfile.indicators.rows.find(
        (row) => row.valueKind === 'number' && row.kpiCode === 'ROE',
      )?.numericValue ?? null,
      measureUnit: '%',
    },
  ]
  return {
    dataStatus: 'sample',
    lineage: amepipLineage,
    totalEnterprises: profiles.length,
    listedCount: profiles.filter((profile) => profile.identity.listed === true).length,
    byStatus: countBy(
      profiles.map((profile) => profile.identity.status?.label ?? 'necunoscut'),
    ),
    byCounty: countByCounty(profiles),
    headlineKpis,
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function matchesQuery(
  hit: PublicEnterpriseSearchHit,
  query: PublicEnterpriseSearch,
): boolean {
  if (query.q && query.q.trim().length > 0) {
    const needle = query.q.trim().toLowerCase()
    const haystack = [
      hit.legalName,
      hit.cui,
      hit.registration ?? '',
      hit.ticker ?? '',
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(needle)) {
      return false
    }
  }
  if (query.county && query.county.length > 0) {
    if (!query.county.includes(hit.county ?? '')) {
      return false
    }
  }
  if (query.status && query.status.length > 0) {
    if (!hit.statusCode || !query.status.includes(hit.statusCode)) {
      return false
    }
  }
  if (query.caen && query.caen.length > 0) {
    if (!query.caen.includes(hit.caen ?? '')) {
      return false
    }
  }
  if (query.listed !== undefined && hit.listed !== query.listed) {
    return false
  }
  if (query.linkStatus && query.linkStatus.length > 0) {
    if (!query.linkStatus.includes(hit.linkStatus)) {
      return false
    }
  }
  if (query.subordination && query.subordination.length > 0) {
    if (!hit.subordination || !query.subordination.includes(hit.subordination)) {
      return false
    }
  }
  if (query.aptType && query.aptType.length > 0) {
    if (!hit.aptType || !query.aptType.includes(hit.aptType)) {
      return false
    }
  }
  if (
    query.hasSanctions !== undefined &&
    hit.hasSanctions !== null &&
    hit.hasSanctions !== query.hasSanctions
  ) {
    return false
  }
  if (
    query.hasStateAid !== undefined &&
    hit.hasStateAid !== null &&
    hit.hasStateAid !== query.hasStateAid
  ) {
    return false
  }
  if (query.includeS1001 === true) {
    return false
  }
  return true
}

function sortHits(
  hits: PublicEnterpriseSearchHit[],
  sort: PublicEnterpriseSearch['sort'],
): PublicEnterpriseSearchHit[] {
  const sorted = [...hits]
  switch (sort) {
    case 'cui':
      sorted.sort((a, b) => a.cui.localeCompare(b.cui))
      break
    case 'county':
      sorted.sort((a, b) => (a.county ?? '').localeCompare(b.county ?? ''))
      break
    case 'status':
      sorted.sort((a, b) => (a.status ?? '').localeCompare(b.status ?? ''))
      break
    case 'legalName':
    default:
      sorted.sort((a, b) => a.legalName.localeCompare(b.legalName))
      break
  }
  return sorted
}

function buildFacets(hits: PublicEnterpriseSearchHit[]): PublicEnterpriseFacets {
  const bucket = (values: string[], labels: Record<string, string | null> = {}) => {
    const counts = new Map<string, number>()
    for (const value of values) {
      if (value.length === 0) continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: labels[value] ?? null,
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }
  const statusLabels = Object.fromEntries(
    hits
      .filter((hit) => hit.statusCode !== null)
      .map((hit) => [hit.statusCode as string, hit.status]),
  )
  return {
    status: bucket(hits.map((hit) => hit.statusCode ?? ''), statusLabels),
    county: bucket(hits.map((hit) => hit.county ?? '')),
    caen: bucket(hits.map((hit) => hit.caen ?? '')),
    subordination: bucket(hits.map((hit) => hit.subordination ?? '')),
    aptType: bucket(hits.map((hit) => hit.aptType ?? '')),
    linkStatus: bucket(hits.map((hit) => hit.linkStatus)),
  }
}

export function searchMockPublicEnterprises(
  query: PublicEnterpriseSearch,
): PublicEnterpriseSearchResult {
  const filtered = allHits.filter((hit) => matchesQuery(hit, query))
  const sorted = sortHits(filtered, query.sort)
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 20
  const start = (page - 1) * pageSize
  const paged = sorted.slice(start, start + pageSize)
  return {
    dataStatus: 'sample',
    lineage: amepipLineage,
    query,
    total: sorted.length,
    page,
    pageSize,
    hits: paged,
    facets: buildFacets(sorted),
  }
}
