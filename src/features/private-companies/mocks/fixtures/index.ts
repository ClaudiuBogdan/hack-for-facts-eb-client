import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { qualifiedStatement } from './qualification'
import { MOCK_REGISTRY_ENVELOPE, mockRegistryEvidence, registryStateEvidence } from './registry'

/*
 * MOCK companies, shaped like the live API (API19): the ONRC fields are the
 * mock edition's qualified values with the evidence under `registry` (labelled
 * `mode: 'mock'`), ANAF publishes no CAEN revision for the main activity
 * (`fiscalCaen.rev` null), every statement names its publisher, and source
 * dates are the source's own. No address, representative or branch is
 * served by the API, so none is invented here.
 */

const ONRC_DATE = MOCK_REGISTRY_ENVELOPE.sourcePublishedAt ?? '2026-05-06'

/** Dante International SA — active private, full bilant, VAT, UAT safe match. */
export const danteInternationalProfile: PrivateCompanyProfile = {
  organizationId: 'cui:14399840',
  cui: '14399840',
  codInmatriculare: 'J40/1234/2020',
  legalName: 'DANTE INTERNATIONAL SA',
  nameSource: 'onrc_edition',
  legalForm: 'SA',
  registrationDate: '2002-06-15',
  status: { code: '1048', label: 'funcțiune', labelSource: 'api_nomenclature' },
  address: { display: '', county: 'București', locality: null },
  geography: {
    uatSirutaCode: '179141',
    uatName: 'Municipiul București',
    countyName: 'București',
    matchConfidence: 'safe',
  },
  caenActivities: [
    {
      code: '4791',
      rev: 'rev2',
      label: 'Comerț cu amănuntul prin intermediul caselor de comenzi sau prin Internet',
      source: 'onrc',
      labelSource: 'current_db_catalog',
    },
    { code: '4791', rev: null, label: null, source: 'anaf', labelSource: null },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: true,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4791', rev: null },
  },
  financials: [
    qualifiedStatement({
      fiscalYear: 2024,
      sourceSystem: 'anaf',
      turnover: 12_450_000_000,
      netProfit: 890_000_000,
      netLoss: null,
      employees: 4_200,
      currency: 'RON',
      summary: null,
    }),
    qualifiedStatement({
      fiscalYear: 2022,
      sourceSystem: 'anaf',
      turnover: 9_800_000_000,
      netProfit: 620_000_000,
      netLoss: null,
      employees: 3_900,
      currency: 'RON',
      summary: null,
    }),
  ],
  financialTrajectory: {
    fromYear: 2022,
    toYear: 2024,
    turnoverDelta: 2_650_000_000,
    netResultDelta: -1_477_503,
    // A stable headcount is common; it must render as "no change", not "0".
    employeesDelta: 0,
    turnoverDeltaReason: null,
    netResultDeltaReason: null,
    employeesDeltaReason: null,
  },
  publicMoney: {
    totalRon: 424_468_235.41,
    flowCount: 406_119,
    byFlowType: [
      { flowType: 'direct_acquisition', totalRon: 415_603_318.47, count: 405_912 },
      { flowType: 'procurement_contract', totalRon: 8_766_606.32, count: 172 },
      // An obligation, not money received — must never read as a receipt.
      { flowType: 'pnrr_commitment', totalRon: 4_100_000, count: 3 },
      // An amount the server sent unreadably: unknown, never rendered as 0.
      { flowType: 'pnrr_subcontract', totalRon: null, count: 35 },
    ],
    // Exercises both coverage holes: a gap year inside the contract interval,
    // and direct-acquisition money the source never dated.
    byYear: [
      { year: 2023, flowType: 'direct_acquisition', totalRon: 200_000_000, count: 200_000 },
      { year: 2024, flowType: 'direct_acquisition', totalRon: 183_868_129, count: 205_912 },
      { year: null, flowType: 'direct_acquisition', totalRon: 31_735_189, count: 31_000 },
      { year: 2022, flowType: 'procurement_contract', totalRon: 5_000_000, count: 100 },
      { year: 2024, flowType: 'procurement_contract', totalRon: 3_766_606, count: 72 },
      { year: 2024, flowType: 'pnrr_commitment', totalRon: 4_100_000, count: 3 },
      { year: 2025, flowType: 'pnrr_subcontract', totalRon: null, count: 35 },
    ],
  },
  sources: [
    { id: 'onrc', snapshotDate: ONRC_DATE },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
  registry: mockRegistryEvidence({
    identifier: 'J40/1234/2020',
    name: 'DANTE INTERNATIONAL SA',
    legalForm: 'SA',
    recordedDate: '2002-06-15',
    countyCode: 'B',
    countyName: 'București',
    uatSirutaCode: '179141',
    uatName: 'Municipiul București',
    statusCodes: ['1048'],
    caen: [{ code: '4791', revision: 'rev2', label: 'Comerț cu amănuntul prin intermediul caselor de comenzi sau prin Internet' }],
  }),
}

/** Invalid CUI — ANAF notFound; used for 404 in mock registry. */
export const invalidCuiProfile: PrivateCompanyProfile | null = null

/** A directory company the mock edition holds no qualified profile for: its name is the directory's. */
export const anafNotFoundProfile: PrivateCompanyProfile = {
  organizationId: 'cui:9718383',
  cui: '9718383',
  codInmatriculare: null,
  legalName: 'EXEMPLU REGISTRU CULTURAL',
  nameSource: 'core_organization',
  legalForm: null,
  registrationDate: null,
  status: null,
  address: { display: '', county: null, locality: null },
  geography: null,
  caenActivities: [],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: null,
    inactive: null,
    anafFound: false,
    asOfDate: null,
    fiscalCaen: null,
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [],
  registry: registryStateEvidence(MOCK_REGISTRY_ENVELOPE, 'not_in_edition'),
}

/** Antibiotice SA — sparse bilant years (2020 and 2023 only). */
export const sparseBilantProfile: PrivateCompanyProfile = {
  organizationId: 'cui:1973096',
  cui: '1973096',
  codInmatriculare: 'J35/1234/1998',
  legalName: 'ANTIBIOTICE SA',
  nameSource: 'onrc_edition',
  legalForm: 'SA',
  registrationDate: '1998-03-20',
  status: { code: '1048', label: 'funcțiune', labelSource: 'api_nomenclature' },
  address: { display: '', county: 'Iași', locality: null },
  geography: {
    uatSirutaCode: '95060',
    uatName: 'Municipiul Iași',
    countyName: 'Iași',
    matchConfidence: 'safe',
  },
  caenActivities: [
    { code: '2120', rev: 'rev2', label: 'Fabricarea preparatelor farmaceutice', source: 'onrc', labelSource: 'current_db_catalog' },
    // The same digits in Rev.1, as the registry lists them: its own label, never Rev.2's.
    { code: '2442', rev: 'rev1', label: 'Fabricarea preparatelor farmaceutice (Rev.1)', source: 'onrc', labelSource: 'current_db_catalog' },
    { code: '2120', rev: null, label: null, source: 'anaf', labelSource: null },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: true,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '2120', rev: null },
  },
  financials: [
    qualifiedStatement({
      fiscalYear: 2023,
      sourceSystem: 'anaf',
      turnover: 580_000_000,
      netProfit: 42_000_000,
      netLoss: null,
      employees: 1_850,
      currency: 'RON',
      summary: null,
    }),
    qualifiedStatement({
      fiscalYear: 2020,
      sourceSystem: 'anaf',
      turnover: 410_000_000,
      netProfit: null,
      netLoss: 12_000_000,
      employees: 1_720,
      currency: 'RON',
      summary: null,
    }),
  ],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: ONRC_DATE },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
  registry: mockRegistryEvidence({
    identifier: 'J22/1234/1998',
    name: 'ANTIBIOTICE SA',
    legalForm: 'SA',
    recordedDate: '1998-03-20',
    countyCode: 'IS',
    countyName: 'Iași',
    uatSirutaCode: '95060',
    uatName: 'Municipiul Iași',
    statusCodes: ['1048'],
    caen: [
      { code: '2120', revision: 'rev2', label: 'Fabricarea preparatelor farmaceutice' },
      { code: '2442', revision: 'rev1', label: 'Fabricarea preparatelor farmaceutice (Rev.1)' },
    ],
  }),
}

/**
 * The fixtures below exist so the directory filters visibly change the
 * result set under `VITE_MOCK_DATASETS=private-companies`: between them they
 * cover several counties, statuses (one conflict), legal forms, CAEN
 * revisions and both fiscal switches.
 */

/** Radiată SRL, declared fiscally inactive, no VAT — Timiş, retail (47), a Rev.0 row and one with no revision. */
export const struckOffProfile: PrivateCompanyProfile = {
  organizationId: 'cui:6553492',
  cui: '6553492',
  codInmatriculare: 'J35/210/1994',
  legalName: 'MAGAZINUL VECHI SRL',
  nameSource: 'onrc_edition',
  legalForm: 'SRL',
  registrationDate: '1994-11-02',
  status: { code: '1084', label: 'radiată', labelSource: 'api_nomenclature' },
  address: { display: '', county: 'Timiș', locality: null },
  geography: null,
  caenActivities: [
    { code: '4711', rev: 'rev2', label: 'Comerț cu amănuntul în magazine nespecializate', source: 'onrc', labelSource: 'current_db_catalog' },
    { code: '5211', rev: 'rev0', label: 'Comerț cu amănuntul în magazine nespecializate (Rev.0)', source: 'onrc', labelSource: 'current_db_catalog' },
    { code: '4711', rev: null, label: null, source: 'onrc', labelSource: null },
    { code: '4711', rev: null, label: null, source: 'anaf', labelSource: null },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: false,
    inactive: true,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4711', rev: null },
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: ONRC_DATE },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
  registry: mockRegistryEvidence({
    identifier: 'J35/210/1994',
    name: 'MAGAZINUL VECHI SRL',
    legalForm: 'SRL',
    recordedDate: '1994-11-02',
    countyCode: 'TM',
    countyName: 'Timiș',
    statusCodes: ['1084'],
    caen: [
      { code: '4711', revision: 'rev2', label: 'Comerț cu amănuntul în magazine nespecializate' },
      { code: '5211', revision: 'rev0', label: 'Comerț cu amănuntul în magazine nespecializate (Rev.0)' },
      { code: '4711', revision: null, label: null },
    ],
  }),
}

/** Insolvență SA — Braşov, construction (41). */
export const insolventProfile: PrivateCompanyProfile = {
  organizationId: 'cui:11223344',
  cui: '11223344',
  codInmatriculare: 'J08/77/2005',
  legalName: 'CONSTRUCT BRASOV SA',
  nameSource: 'onrc_edition',
  legalForm: 'SA',
  registrationDate: '2005-07-19',
  status: { code: '1107', label: 'insolvență', labelSource: 'api_nomenclature' },
  address: { display: '', county: 'Brașov', locality: null },
  geography: null,
  caenActivities: [
    {
      code: '4120',
      rev: 'rev2',
      label: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale',
      source: 'onrc',
      labelSource: 'current_db_catalog',
    },
    { code: '4120', rev: null, label: null, source: 'anaf', labelSource: null },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: true,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4120', rev: null },
  },
  financials: [
    qualifiedStatement({
      fiscalYear: 2023,
      sourceSystem: 'anaf',
      turnover: 18_400_000,
      netProfit: null,
      netLoss: 3_100_000,
      employees: 96,
      currency: 'RON',
      summary: null,
    }),
  ],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: ONRC_DATE },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
  registry: mockRegistryEvidence({
    identifier: 'J08/77/2005',
    name: 'CONSTRUCT BRASOV SA',
    legalForm: 'SA',
    recordedDate: '2005-07-19',
    countyCode: 'BV',
    countyName: 'Brașov',
    statusCodes: ['1107'],
    caen: [{ code: '4120', revision: 'rev2', label: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale' }],
  }),
}

/** Active PFA — Cluj, software (62). Recent registration, not a VAT payer. */
export const pfaProfile: PrivateCompanyProfile = {
  organizationId: 'cui:44556677',
  cui: '44556677',
  codInmatriculare: 'F12/501/2021',
  legalName: 'POPA IOANA PFA',
  nameSource: 'onrc_edition',
  legalForm: 'PFA',
  registrationDate: '2021-04-05',
  status: { code: '1048', label: 'funcțiune', labelSource: 'api_nomenclature' },
  address: { display: '', county: 'Cluj', locality: null },
  geography: null,
  caenActivities: [
    { code: '6201', rev: 'rev2', label: 'Activități de realizare a soft-ului la comandă', source: 'onrc', labelSource: 'current_db_catalog' },
    { code: '6201', rev: null, label: null, source: 'anaf', labelSource: null },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: false,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '6201', rev: null },
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: ONRC_DATE },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
  registry: mockRegistryEvidence({
    identifier: 'F12/501/2021',
    name: 'POPA IOANA PFA',
    legalForm: 'PFA',
    recordedDate: '2021-04-05',
    countyCode: 'CJ',
    countyName: 'Cluj',
    statusCodes: ['1048'],
    caen: [{ code: '6201', revision: 'rev2', label: 'Activități de realizare a soft-ului la comandă' }],
  }),
}

/**
 * SNC — Dolj, freight transport (49): ONE identifier with an „în funcțiune"
 * (1048) observation beside a „faliment" (1070) one. No status consensus, so
 * no headline status; it is active for the directory's status filter.
 */
export const bankruptProfile: PrivateCompanyProfile = {
  organizationId: 'cui:8877665',
  cui: '8877665',
  codInmatriculare: 'J16/44/1996',
  legalName: 'TRANSPORT OLTENIA SNC',
  nameSource: 'onrc_edition',
  legalForm: 'SNC',
  registrationDate: '1996-02-28',
  status: null,
  address: { display: '', county: 'Dolj', locality: null },
  geography: null,
  caenActivities: [
    { code: '4941', rev: 'rev2', label: 'Transporturi rutiere de mărfuri', source: 'onrc', labelSource: 'current_db_catalog' },
    { code: '4941', rev: null, label: null, source: 'anaf', labelSource: null },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: true,
    inactive: true,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4941', rev: null },
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: ONRC_DATE },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
  registry: mockRegistryEvidence({
    identifier: 'J16/44/1996',
    name: 'TRANSPORT OLTENIA SNC',
    legalForm: 'SNC',
    recordedDate: '1996-02-28',
    countyCode: 'DJ',
    countyName: 'Dolj',
    statusCodes: ['1048', '1070'],
    caen: [{ code: '4941', revision: 'rev2', label: 'Transporturi rutiere de mărfuri' }],
  }),
}

const mockProfilesByCui: Readonly<Record<string, PrivateCompanyProfile | null>> =
  {
    '14399840': danteInternationalProfile,
    '9718383': anafNotFoundProfile,
    '1973096': sparseBilantProfile,
    '6553492': struckOffProfile,
    '11223344': insolventProfile,
    '44556677': pfaProfile,
    '8877665': bankruptProfile,
    '12345678': invalidCuiProfile,
  }

export function getMockPrivateCompanyProfile(
  cui: string,
): PrivateCompanyProfile | null {
  return mockProfilesByCui[cui] ?? null
}

export const mockPrivateCompanyCuis = Object.keys(mockProfilesByCui).filter(
  (cui) => mockProfilesByCui[cui] !== null,
) as string[]
