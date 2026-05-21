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
    },
    {
      fiscalYear: 2022,
      turnover: 9_800_000_000,
      netProfit: 620_000_000,
      netLoss: null,
      employees: 3_900,
      currency: 'RON',
    },
  ],
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
    },
    {
      fiscalYear: 2020,
      turnover: 410_000_000,
      netProfit: null,
      netLoss: 12_000_000,
      employees: 1_720,
      currency: 'RON',
    },
  ],
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
