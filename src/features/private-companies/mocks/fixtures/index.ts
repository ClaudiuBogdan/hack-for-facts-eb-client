import type { PrivateCompanyProfile } from '@/schemas/private-company'

/** Dante International SA — active private, full bilant, VAT, UAT safe match. */
export const danteInternationalProfile: PrivateCompanyProfile = {
  organizationId: 'cui:14399840',
  cui: '14399840',
  codInmatriculare: 'J40/1234/2020',
  legalName: 'DANTE INTERNATIONAL SA',
  legalForm: 'SA',
  registrationDate: '2002-06-15',
  status: { code: '1048', label: 'funcțiune' },
  address: {
    display:
      'Splaiul Unirii nr. 165, Timpuri Noi, Sector 3, București',
    county: 'MUNICIPIUL BUCUREŞTI',
    locality: 'București',
  },
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
    },
  ],
  representatives: [
    {
      name: 'Ionescu Maria',
      role: 'administrator',
    },
  ],
  euBranches: [],
  fiscal: {
    vatPayer: true,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4791', rev: 'rev2' },
  },
  financials: [
    {
      fiscalYear: 2024,
      turnover: 12_450_000_000,
      netProfit: 890_000_000,
      netLoss: null,
      employees: 4_200,
      currency: 'RON',
      summary: null,
    },
    {
      fiscalYear: 2022,
      turnover: 9_800_000_000,
      netProfit: 620_000_000,
      netLoss: null,
      employees: 3_900,
      currency: 'RON',
      summary: null,
    },
  ],
  financialTrajectory: {
    fromYear: 2022,
    toYear: 2024,
    turnoverDelta: 2_650_000_000,
    netResultDelta: -1_477_503,
    // A stable headcount is common; it must render as "no change", not "0".
    employeesDelta: 0,
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
    { id: 'onrc', snapshotDate: '2026-05-06', label: 'firme-06-05-2026' },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
}

/** Invalid CUI — ANAF notFound; used for 404 in mock registry. */
export const invalidCuiProfile: PrivateCompanyProfile | null = null

/** RegCult sample CUI — ANAF not found, empty bilant. */
export const anafNotFoundProfile: PrivateCompanyProfile = {
  organizationId: 'cui:9718383',
  cui: '9718383',
  codInmatriculare: 'J12/999/1990',
  legalName: 'EXEMPLU REGISTRU CULTURAL',
  legalForm: 'SRL',
  registrationDate: '1990-01-10',
  status: { code: '1048', label: 'funcțiune' },
  address: {
    display: 'Str. Exemplu nr. 1, Cluj-Napoca, Cluj',
    county: 'CLUJ',
    locality: 'Cluj-Napoca',
  },
  geography: null,
  caenActivities: [
    {
      code: '9001',
      rev: 'rev2',
      label: 'Activități de interpretare artistică',
      source: 'onrc',
    },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: null,
    inactive: null,
    anafFound: false,
    asOfDate: '2026-05-16',
    fiscalCaen: null,
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [{ id: 'onrc', snapshotDate: '2026-05-06' }],
}

/** Antibiotice SA — sparse bilant years (2020 and 2023 only). */
export const sparseBilantProfile: PrivateCompanyProfile = {
  organizationId: 'cui:1973096',
  cui: '1973096',
  codInmatriculare: 'J35/1234/1998',
  legalName: 'ANTIBIOTICE SA',
  legalForm: 'SA',
  registrationDate: '1998-03-20',
  status: { code: '1048', label: 'funcțiune' },
  address: {
    display: 'Str. Valea Lupului nr. 1, Iași',
    county: 'IAŞI',
    locality: 'Iași',
  },
  geography: {
    uatSirutaCode: '95060',
    uatName: 'Municipiul Iași',
    countyName: 'Iași',
    matchConfidence: 'manual-review',
  },
  caenActivities: [
    {
      code: '2120',
      rev: 'rev2',
      label: 'Fabricarea preparatelor farmaceutice',
      source: 'onrc',
    },
  ],
  representatives: [
    { name: 'Popescu Andrei', role: 'administrator' },
    { name: 'Ionescu Elena', role: 'administrator' },
  ],
  euBranches: [
    {
      name: 'Antibiotice Berlin GmbH',
      country: 'DE',
      type: 'sucursală',
    },
  ],
  fiscal: {
    vatPayer: true,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '2120', rev: 'rev2' },
  },
  financials: [
    {
      fiscalYear: 2023,
      turnover: 580_000_000,
      netProfit: 42_000_000,
      netLoss: null,
      employees: 1_850,
      currency: 'RON',
      summary: null,
    },
    {
      fiscalYear: 2020,
      turnover: 410_000_000,
      netProfit: null,
      netLoss: 12_000_000,
      employees: 1_720,
      currency: 'RON',
      summary: null,
    },
  ],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: '2026-05-06' },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
}

/**
 * The four fixtures below exist so the directory filters visibly change the
 * result set under `VITE_MOCK_DATASETS=private-companies`: between them they
 * cover four counties, four registry statuses, four legal forms, four CAEN
 * divisions and both fiscal switches.
 */

/** Radiată SRL, declared fiscally inactive, no VAT — Timiş, retail (47). */
export const struckOffProfile: PrivateCompanyProfile = {
  organizationId: 'cui:6553492',
  cui: '6553492',
  codInmatriculare: 'J35/210/1994',
  legalName: 'MAGAZINUL VECHI SRL',
  legalForm: 'SRL',
  registrationDate: '1994-11-02',
  status: { code: '1084', label: 'radiată' },
  address: {
    display: 'Str. Piața Unirii nr. 4, Timișoara, Timiș',
    county: 'TIMIŞ',
    locality: 'Timișoara',
  },
  geography: null,
  caenActivities: [
    {
      code: '4711',
      rev: 'rev2',
      label: 'Comerț cu amănuntul în magazine nespecializate',
      source: 'onrc',
    },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: false,
    inactive: true,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4711', rev: 'rev2' },
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: '2026-05-06' },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
}

/** Insolvență SA — Braşov, construction (41). */
export const insolventProfile: PrivateCompanyProfile = {
  organizationId: 'cui:11223344',
  cui: '11223344',
  codInmatriculare: 'J08/77/2005',
  legalName: 'CONSTRUCT BRASOV SA',
  legalForm: 'SA',
  registrationDate: '2005-07-19',
  status: { code: '1107', label: 'insolvență' },
  address: {
    display: 'Bd. Griviței nr. 12, Brașov',
    county: 'BRAŞOV',
    locality: 'Brașov',
  },
  geography: null,
  caenActivities: [
    {
      code: '4120',
      rev: 'rev2',
      label: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale',
      source: 'onrc',
    },
  ],
  representatives: [{ name: 'Marin Vasile', role: 'administrator judiciar' }],
  euBranches: [],
  fiscal: {
    vatPayer: true,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4120', rev: 'rev2' },
  },
  financials: [
    {
      fiscalYear: 2023,
      turnover: 18_400_000,
      netProfit: null,
      netLoss: 3_100_000,
      employees: 96,
      currency: 'RON',
      summary: null,
    },
  ],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: '2026-05-06' },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
}

/** Active PFA — Cluj, software (62). Recent registration, not a VAT payer. */
export const pfaProfile: PrivateCompanyProfile = {
  organizationId: 'cui:44556677',
  cui: '44556677',
  codInmatriculare: 'F12/501/2021',
  legalName: 'POPA IOANA PFA',
  legalForm: 'PFA',
  registrationDate: '2021-04-05',
  status: { code: '1048', label: 'funcțiune' },
  address: {
    display: 'Str. Memorandumului nr. 9, Cluj-Napoca, Cluj',
    county: 'CLUJ',
    locality: 'Cluj-Napoca',
  },
  geography: null,
  caenActivities: [
    {
      code: '6201',
      rev: 'rev2',
      label: 'Activități de realizare a soft-ului la comandă',
      source: 'onrc',
    },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: false,
    inactive: false,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '6201', rev: 'rev2' },
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: '2026-05-06' },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
}

/** Faliment SNC — Dolj, freight transport (49). */
export const bankruptProfile: PrivateCompanyProfile = {
  organizationId: 'cui:8877665',
  cui: '8877665',
  codInmatriculare: 'J16/44/1996',
  legalName: 'TRANSPORT OLTENIA SNC',
  legalForm: 'SNC',
  registrationDate: '1996-02-28',
  status: { code: '1070', label: 'faliment' },
  address: {
    display: 'Calea București nr. 121, Craiova, Dolj',
    county: 'DOLJ',
    locality: 'Craiova',
  },
  geography: null,
  caenActivities: [
    {
      code: '4941',
      rev: 'rev2',
      label: 'Transporturi rutiere de mărfuri',
      source: 'onrc',
    },
  ],
  representatives: [],
  euBranches: [],
  fiscal: {
    vatPayer: true,
    inactive: true,
    anafFound: true,
    asOfDate: '2026-05-16',
    fiscalCaen: { code: '4941', rev: 'rev2' },
  },
  financials: [],
  financialTrajectory: null,
  publicMoney: null,
  sources: [
    { id: 'onrc', snapshotDate: '2026-05-06' },
    { id: 'anaf', snapshotDate: '2026-05-16' },
  ],
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
