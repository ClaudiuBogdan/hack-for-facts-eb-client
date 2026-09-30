import type { NgoFinanceSummary } from '../finance-summary-types'

/**
 * A small finance summary for the hub's tests: 100 statements and 1 bn lei
 * of revenue, round numbers every test works out by hand. The sources, the
 * classes and the domains each add up to the year's totals.
 */
export function financeFixture(overrides: Partial<NgoFinanceSummary> = {}): NgoFinanceSummary {
  return {
    year: 2025,
    source: {
      dataset: 'https://data.gov.ro/dataset/situatii_financiare_2025',
      file: 'https://data.gov.ro/dataset/x/resource/y/download/web_ong_an2025.txt',
      published: '2026-06-11',
    },
    statements: 100,
    withRevenue: 80,
    revenue: 1_000_000_000,
    sources: { nonProfit: 800_000_000, economic: 150_000_000, special: 50_000_000 },
    sizes: [
      { key: 'negative', statements: 2, revenue: -1_000 },
      { key: 'none', statements: 18, revenue: 0 },
      { key: 'under10k', statements: 10, revenue: 50_000 },
      { key: 'under100k', statements: 30, revenue: 1_950_000 },
      { key: 'under1m', statements: 30, revenue: 98_000_000 },
      { key: 'over1m', statements: 10, revenue: 900_001_000 },
    ],
    domains: [
      { key: 'general', statements: 45, revenue: 300_000_000 },
      { key: 'sport', statements: 20, revenue: 100_000_000 },
      { key: 'social', statements: 15, revenue: 150_000_000 },
      { key: 'education', statements: 10, revenue: 400_000_000 },
      { key: 'other', statements: 5, revenue: 20_000_000 },
      { key: 'religion', statements: 5, revenue: 30_000_000 },
    ],
    years: [
      { year: 2023, statements: 90, revenue: 800_000_000, published: '2025-07-27', firstRelease: false },
      { year: 2024, statements: 95, revenue: 900_000_000, published: '2026-06-24', firstRelease: false },
      { year: 2025, statements: 100, revenue: 1_000_000_000, published: '2026-06-11', firstRelease: true },
    ],
    excluded: [{ year: 2023, cui: '1', revenue: 5_000_000_000 }],
    leaders: [
      { cui: '100', name: 'ASOCIATIA A', county: 'CJ', domain: 'social', revenue: 200_000_000, previous: 100_000_000, status: null },
      { cui: '200', name: 'FUNDATIA B', county: null, domain: 'general', revenue: 150_000_000, previous: null, status: 'dissolved' },
      { cui: '300', name: 'ASOCIATIA C', county: 'B', domain: 'sport', revenue: 100_000_000, previous: 125_000_000, status: null },
    ],
    ...overrides,
  }
}
