import { companyProfile, financialYear } from '@/features/private-companies/lib/company-profile.fixture'
import { READER_CATEGORIES, type CategoryFigure } from './home-categories'
import type { RecentRecord } from './home-model'
import type { PartyYears } from './profile-model'
import type { ContractPicture, SupplierProfile } from './supplier-model'
import { yearPeriod } from './profile-period.fixture'

/**
 * Builders for a firm's page's reads, shaped like the dev API's answers for
 * Costalex Construct SRL in 2025 (a small Ilfov builder in insolvency, sold
 * mostly directly) and — through `consortiumContracts` — for a road and
 * water builder that wins with partners, trimmed to what a test reads
 * (measured 2026-09-27/28).
 */

const category = (key: string) => READER_CATEGORIES.find((entry) => entry.key === key)!

function figure(key: string, value: number | null, count: number, share: number | null): CategoryFigure {
  return { category: category(key), value, count, share }
}

function years(values: Readonly<Record<number, number | null>>): PartyYears['years'] {
  return [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => ({ year, value: values[year] ?? null }))
}

export function supplierContracts(overrides: Partial<ContractPicture> = {}): ContractPicture {
  return {
    count: 1,
    scanned: 1,
    together: 0,
    togetherContracts: 0,
    togetherValued: 0,
    togetherValue: null,
    unresolved: 0,
    partners: [],
    clients: { rankedBy: 'count', rows: [{ cui: '4364446', count: 1, value: null, share: 1 }] },
    buyers: 1,
    largest: [],
    categories: [],
    counties: null,
    ...overrides,
  }
}

/** Sixteen award rows, fourteen won with partners, in four counties. */
export function consortiumContracts(): ContractPicture {
  const largest: RecentRecord[] = [
    {
      id: 'c1',
      grain: 'contract',
      date: '2024-11-06',
      title: null,
      cpvCode: '45233120',
      buyer: { cui: '16054368', name: 'Compania Națională de Administrare a Infrastructurii Rutiere SA' },
      winners: [
        { cui: '103029862', name: 'Hydrostroy AD' },
        { cui: '206474936', name: '„Patstroy VDH" EAD' },
      ],
      value: 451_166_312,
    },
  ]
  return {
    count: 16,
    scanned: 16,
    together: 14,
    togetherContracts: 13,
    togetherValued: 13,
    togetherValue: 979_100_000,
    unresolved: 0,
    partners: [
      { key: '15993042', cui: '15993042', name: 'Dexamart', contracts: 6, buyers: ['SC Compania Regionala de Apa Bacau SA'] },
      { key: 'patstroy', cui: null, name: '„Patstroy VDH" EAD', contracts: 1, buyers: ['Compania Națională de Administrare a Infrastructurii Rutiere SA'] },
    ],
    clients: {
      rankedBy: 'count',
      rows: [
        { cui: '2665900', count: 11, value: null, share: 0.69 },
        { cui: '16054368', count: 1, value: null, share: 0.06 },
      ],
    },
    buyers: 4,
    largest,
    categories: [figure('retele', 593_600_000, 14, 0.57), figure('drumuri', 451_166_312, 1, 0.43)],
    counties: [
      { code: 'BC', count: 11, value: null, share: 0.69 },
      { code: 'B', count: 1, value: null, share: 0.06 },
    ],
  }
}

export function supplierProfile(overrides: Partial<SupplierProfile> = {}): SupplierProfile {
  return {
    cui: '9813902',
    period: yearPeriod(2025),
    latest: 2025,
    name: 'Costalex Construct SRL',
    registryFailed: false,
    registry: companyProfile({
      organizationId: 'cui:9813902',
      cui: '9813902',
      codInmatriculare: 'J23/1596/2002',
      legalName: 'COSTALEX CONSTRUCT SRL',
      registrationDate: '2002-05-14',
      status: { code: '1107', label: 'insolvență' },
      address: { display: '', county: 'Ilfov', locality: 'Oraș Otopeni' },
      geography: { uatSirutaCode: '179230', uatName: 'Oraș Otopeni', countyName: 'Ilfov', matchConfidence: 'safe' },
      caenActivities: [{ code: '4120', rev: 'rev2', label: 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale', source: 'onrc' }],
      financials: [financialYear(2025, { turnover: 13_400_000, employees: 44 })],
    }),
    direct: { count: 11, valued: 11, value: 4_835_000, clients: 5, clientsAtLeast: false },
    directPrev: { count: 12, valued: 12, value: 4_740_000 },
    awards: { count: 1, valued: 0, value: null },
    contracts: supplierContracts(),
    directYears: [
      { year: 2019, value: 8_400_000, count: 30 },
      { year: 2024, value: 4_740_000, count: 12 },
      { year: 2025, value: 4_835_000, count: 11 },
    ],
    contractYears: [
      { year: 2019, value: null, count: 0 },
      { year: 2024, value: null, count: 4 },
      { year: 2025, value: null, count: 1 },
    ],
    partYear: null,
    cutoff: { direct: '2026-06', contract: '2026-05' },
    directClients: {
      rankedBy: 'value',
      rows: [
        { cui: '4364446', count: 6, value: 2_960_000, share: 0.61 },
        { cui: '4420465', count: 1, value: 704_950, share: 0.15 },
        { cui: '4540054', count: 2, value: 663_935, share: 0.13 },
        { cui: '4540313', count: 1, value: 491_597, share: 0.1 },
      ],
    },
    analysisClients: { rankedBy: 'count', rows: [{ cui: '4364446', count: 1, value: null, share: 1 }] },
    weights: new Map([
      ['4364446', { share: 0.08, first: false }],
      ['4540313', { share: 0.29, first: true }],
    ]),
    clientYears: [
      { cui: '4364446', years: years({ 2019: 3_100_000, 2020: 2_900_000, 2021: 400_000, 2022: 600_000, 2023: 1_500_000, 2024: 2_400_000, 2025: 2_960_000 }), total: 13_860_000 },
      { cui: '4420465', years: years({ 2025: 704_950 }), total: 704_950 },
    ],
    categories: {
      direct: [figure('drumuri', 1_800_000, 5, 0.38), figure('retele', 1_800_000, 4, 0.37), figure('cladiri', 1_200_000, 2, 0.25)],
      contract: [],
    },
    counties: [
      { code: 'IF', count: 10, value: 4_110_000, share: 0.85 },
      { code: 'DB', count: 1, value: 704_950, share: 0.15 },
    ],
    countiesRankedBy: 'value',
    countiesOf: 'direct',
    procedures: [{ key: 'procedura simplificata', count: 1 }],
    proceduresUnlisted: 0,
    firstYear: 2019,
    names: new Map([
      ['4364446', 'Orasul Otopeni'],
      ['4420465', 'Comuna Dragodana'],
      ['4540054', 'Liceul Teoretic Ioan Petrus Otopeni'],
      ['4540313', 'Gradinita Nr 1 Otopeni'],
      ['2665900', 'Compania Regională de Apă Bacău SA'],
      ['16054368', 'Compania Națională de Administrare a Infrastructurii Rutiere SA'],
    ]),
    partial: false,
    ...overrides,
  }
}

export function supplierDirect(): readonly RecentRecord[] {
  return [
    {
      id: 'd1',
      grain: 'direct',
      date: '2025-12-16',
      title: 'Stație pompare ape pluviale Aleea Tuberozelor',
      cpvCode: '45232150',
      buyer: { cui: '4364446', name: 'Orasul Otopeni' },
      winners: [{ cui: '9813902', name: 'Costalex Construct SRL' }],
      value: 899_122,
    },
  ]
}
