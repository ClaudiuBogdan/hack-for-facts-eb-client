import type { BuyerProfile, BuyerRecords, SupplierYears } from './buyer-model'
import { READER_CATEGORIES, type CategoryFigure } from './home-categories'
import type { RecentRecord } from './home-model'
import { yearPeriod } from './profile-period.fixture'

/**
 * Builders for a buyer page's reads, shaped like the dev API's answer for
 * Orașul Otopeni in 2025 (measured 2026-09-27) and trimmed to what a test
 * reads.
 */

const category = (key: string) => READER_CATEGORIES.find((entry) => entry.key === key)!

function figure(key: string, value: number | null, count: number, share: number | null): CategoryFigure {
  return { category: category(key), value, count, share }
}

function years(values: Readonly<Record<number, number | null>>): SupplierYears['years'] {
  return [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => ({ year, value: values[year] ?? null }))
}

export function buyerProfile(overrides: Partial<BuyerProfile> = {}): BuyerProfile {
  return {
    identity: {
      cui: '4364446',
      name: 'Orașul Otopeni',
      entityType: 'uat',
      isTownHall: true,
      place: { kind: 'town', name: 'ORAȘ OTOPENI', countyCode: 'IF', countyName: 'ILFOV' },
      population: { year: 2025, value: 22_660 },
      address: 'Orasul Otopeni, Str. 23 August, nr. 10, 75100',
      hasBudget: true,
    },
    period: yearPeriod(2025),
    latest: 2025,
    county: 'IF',
    direct: { count: 293, valued: 293, value: 36_404_737, suppliers: 72 },
    directPrev: { count: 207, valued: 207, value: 25_300_000, suppliers: 60 },
    awards: { count: 12, valued: 5, value: 15_067_226, suppliers: 10 },
    frameworks: 1,
    directYears: [
      { year: 2019, value: 28_400_000, count: 270 },
      { year: 2024, value: 25_300_000, count: 207 },
      { year: 2025, value: 36_404_737, count: 293 },
      { year: 2026, value: 2_600_000, count: 46 },
    ],
    awardYears: [
      { year: 2019, value: null, count: 9 },
      { year: 2024, value: null, count: 7 },
      { year: 2025, value: null, count: 12 },
    ],
    partYear: 2026,
    cutoff: { direct: '2026-05', contract: '2026-04' },
    directMonths: [0.4, 0.3, 1.5, 6.6, 9.2, 2.7, 2.0, 1.5, 2.0, 1.5, 4.1, 6.1].map((millions, index) => ({
      month: `2025-${String(index + 1).padStart(2, '0')}`,
      value: millions * 1_000_000,
      count: 20,
    })),
    directSuppliers: {
      rankedBy: 'value',
      rows: [
        { cui: '30153499', count: 14, value: 4_590_000, share: 0.126 },
        { cui: '17046193', count: 8, value: 3_900_000, share: 0.107 },
        { cui: '9813902', count: 6, value: 2_960_000, share: 0.081 },
        { cui: '15712457', count: 4, value: 2_430_000, share: 0.067 },
        { cui: '35873865', count: 3, value: 2_030_000, share: 0.056 },
      ],
    },
    awardSuppliers: {
      rankedBy: 'count',
      rows: [{ cui: '16634489', count: 2, value: 12_220_000, share: 0.167 }],
    },
    categories: {
      direct: [figure('constructii', 8_200_000, 13, 0.225), figure('proiectare', 5_600_000, 54, 0.154), figure('retele', 5_600_000, 13, 0.153)],
      contract: [figure('constructii', 9_610_000, 2, 0.64)],
    },
    supplierCounties: [
      { code: 'IF', count: 97, value: 18_500_000, share: 0.51 },
      { code: 'B', count: 137, value: 12_380_000, share: 0.34 },
      { code: 'PH', count: 18, value: 1_830_000, share: 0.05 },
    ],
    supplierCountiesRankedBy: 'value',
    procedures: [{ key: 'Procedura simplificata', count: 12 }],
    proceduresUnlisted: 0,
    names: new Map([
      ['30153499', 'Upper Level SRL'],
      ['17046193', 'East Point Energy S.R.L.'],
      ['9813902', 'Costalex Construct SRL'],
      ['15712457', 'Inndesign Mobilier SRL'],
      ['35873865', 'Fast Ecotrans SRL'],
      ['16634489', 'Construct & Acting SRL'],
    ]),
    supplierYears: [
      { cui: '9813902', total: 21_600_000, years: years({ 2019: 8e6, 2020: 3e6, 2021: 1e5, 2022: 2e5, 2023: 1e6, 2024: 3e6, 2025: 2.96e6 }) },
      { cui: '17046193', total: 11_900_000, years: years({ 2021: 1e6, 2022: 2e6, 2023: 2e6, 2024: 3e6, 2025: 3.9e6 }) },
    ],
    countyShare: { county: 'IF', share: 0.065 },
    partial: false,
    namesUnread: false,
    ...overrides,
  }
}

export function buyerContract(overrides: Partial<RecentRecord> = {}): RecentRecord {
  return {
    id: 'c1',
    grain: 'contract',
    date: '2025-04-15',
    title: 'Construcția și renovarea clădirilor',
    cpvCode: '45214200',
    buyer: { cui: '4364446', name: 'Orașul Otopeni' },
    winners: [{ cui: '16634489', name: 'Construct & Acting SRL' }],
    value: 9_610_000,
    ...overrides,
  }
}

export function buyerRecords(overrides: Partial<BuyerRecords> = {}): BuyerRecords {
  return {
    contracts: [buyerContract()],
    direct: [
      {
        id: 'd1',
        grain: 'direct',
        date: '2025-06-02',
        title: 'Lucrări de amenajare parc',
        cpvCode: '45112711',
        buyer: { cui: '4364446', name: 'Orașul Otopeni' },
        winners: [{ cui: '30153499', name: 'Upper Level SRL' }],
        value: 899_000,
      },
    ],
    ...overrides,
  }
}
