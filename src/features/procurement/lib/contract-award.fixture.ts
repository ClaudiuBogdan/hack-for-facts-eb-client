import type { RawCaRow, RawContractAward, RawContractAwards } from '../api/graphql/procurement-contract-award-queries'

/** Contract-award answers as the API serves them (server `ca-records-schema.ts`, 1503dd2c), for tests. */

export const RECORD_ID = 'e_licitatie:ca:100234:550011'

export function rawRow(overrides: Partial<RawCaRow> = {}): RawCaRow {
  return {
    recordId: RECORD_ID,
    contractKind: 'ordinary',
    valueKind: 'awarded',
    additive: true,
    status: 'awarded',
    amountLei: '1250000.50',
    nativeAmount: '1250000.50',
    currency: 'RON',
    flags: ['list_value'],
    awardDay: '2024-03-08',
    title: 'Reabilitare școala gimnazială nr. 2',
    cpvCode: '45214200-2',
    winnerCount: 1,
    winners: [{ order: 1, displayKind: 'company', fiscalCode: '14837428', name: 'CONSTRUCT TEST SRL', disclosed: true }],
    ...overrides,
  }
}

export function rawAwards(overrides: { readonly rows?: readonly RawCaRow[]; readonly summary?: Partial<RawContractAwards['summary']>; readonly records?: Partial<RawContractAwards['records']> } = {}): RawContractAwards {
  const window = { floor: '2021-01-01', from: '2024-01-01', to: '2024-12-31' }
  const rows = overrides.rows ?? [rawRow()]
  return {
    summary: {
      dataAsOf: '2026-11-25T01:00:00Z',
      disclosureKey: '2026-11-25T01:00:00Z',
      window,
      buyer: { fiscalCode: '4364446', displayKind: 'authority', name: 'ORAȘUL OTOPENI' },
      recordCount: 3,
      valuedCount: 2,
      identityReviewCount: 1,
      undatedCount: 0,
      ...overrides.summary,
    },
    records: {
      dataAsOf: '2026-11-25T01:00:00Z',
      disclosureKey: '2026-11-25T01:00:00Z',
      window,
      items: [...rows],
      page: 1,
      pageSize: 20,
      total: rows.length,
      hasMore: false,
      depthLimited: false,
      ...overrides.records,
    },
  }
}

export function rawAward(overrides: { readonly record?: Partial<RawContractAward['record']>; readonly lots?: RawContractAward['lots']; readonly reanchored?: boolean } = {}): { readonly award: RawContractAward } {
  return {
    award: {
      dataAsOf: '2026-11-25T01:00:00Z',
      disclosureKey: '2026-11-25T01:00:00Z',
      reanchored: overrides.reanchored ?? false,
      record: {
        ...rawRow(),
        headStatus: 'confirmed',
        fxSource: null,
        vatBasis: 'unknown',
        amountOrigin: 'list',
        changeLei: null,
        changePublicationDay: null,
        publicationDay: '2024-03-12',
        buyer: { fiscalCode: '4364446', displayKind: 'authority', name: 'ORAȘUL OTOPENI' },
        cpvDivision: '45',
        procedureId: '9012345',
        noticeNo: 'CAN1123456',
        sourceUrl: 'https://www.e-licitatie.ro/pub/notices/contract-award-notices/view/100234',
        lotCount: 1,
        ...overrides.record,
      },
      lots: overrides.lots ?? [{ lotOrder: 1, lotNumber: '1', title: 'Lucrări de reabilitare', cpvCode: '45214200-2', estimatedValue: '1300000', currency: 'RON', isEuFunded: true, cancelledStatus: null }],
    },
  }
}
