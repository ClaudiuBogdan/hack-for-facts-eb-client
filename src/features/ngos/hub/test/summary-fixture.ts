import type { NgoRegistrySummary } from '../registry-summary-types'

/**
 * A small registry summary for the hub's tests: three counties, round
 * numbers, every figure worked out by hand in the tests that use it.
 * 900 registered NGOs over 120,000 residents is a national density of 75.
 */
export function summaryFixture(overrides: Partial<NgoRegistrySummary> = {}): NgoRegistrySummary {
  return {
    snapshotId: 'ngos:mj_rnong:registry_export:test',
    sourceUrl: 'https://rnong.just.ro/registru-ong',
    capturedAt: '2026-09-20',
    lastRegistration: '2026-09-19',
    entries: 1_010,
    repeated: 10,
    status: { registered: 900, deregistered: 60, inLiquidation: 25, dissolved: 15 },
    categories: { association: 780, foundation: 100, federation: 15, religious_association: 4, foreign_legal_person: 1 },
    publicUtility: 17,
    noCounty: 50,
    year: 2025,
    registrations: [
      { year: 2023, count: 90 },
      { year: 2024, count: 100 },
      { year: 2025, count: 120 },
    ],
    counties: [
      { code: 'CJ', source: 'CLUJ', registered: 500, added: 70, residents: 50_000 },
      { code: 'DB', source: 'DÂMBOVITA', registered: 200, added: 30, residents: 40_000 },
      { code: 'AB', source: 'ALBA', registered: 150, added: 15, residents: 30_000 },
    ],
    ...overrides,
  }
}
