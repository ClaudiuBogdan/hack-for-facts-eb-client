import type { RawCaRow, RawContractAward, RawContractAwardTotal, RawContractAwards, RawWinnerContractAwards } from '../api/graphql/procurement-contract-award-queries'

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

/** A buyer's contract-award money as `procurementTotals` answers it (server `totals-schema.ts`); labels as the label table might serve them. */
export function rawTotals(overrides: { readonly totals?: RawContractAwardTotal['totals']; readonly id?: string } = {}): { readonly totals: RawContractAwardTotal[] } {
  return {
    totals: [
      {
        id: overrides.id ?? 'buyer-contract-awards',
        totals: overrides.totals ?? [
          { valueKind: 'framework_ceiling', sumLei: '45000000.00', recordCount: '2' },
          { valueKind: 'awarded', sumLei: '12345678.90', recordCount: '118' },
          { valueKind: 'modification_change', sumLei: '-350000.00', recordCount: '4' },
        ],
        included: {
          valueKinds: [
            { key: 'awarded', labelRo: 'Valoare atribuită', labelEn: 'Awarded value' },
            { key: 'modification_change', labelRo: 'Modificări de preț', labelEn: 'Price changes' },
            { key: 'framework_ceiling', labelRo: 'Plafoane ale acordurilor-cadru', labelEn: 'Framework ceilings' },
          ],
        },
        explanation: { textRo: 'Include contractele atribuite din 2025; 3 fără dată sunt lăsate deoparte.', textEn: 'Includes contracts awarded in 2025; 3 undated are left out.' },
      },
    ],
  }
}

export const WINNER_CODE = '14837428'

/** A winner code's counts and one page, as the two winner fields answer them (server 09610b12): an off-gate registry-named company by default. */
export function rawWinnerAwards(
  overrides: {
    readonly summary?: Partial<RawWinnerContractAwards['summary']>
    readonly records?: Partial<RawWinnerContractAwards['records']>
    readonly rows?: RawWinnerContractAwards['records']['items']
  } = {},
): RawWinnerContractAwards {
  const window = { floor: '2021-01-01', from: '2021-01-01', to: null }
  return {
    summary: {
      dataAsOf: '2026-11-25T01:00:00Z',
      disclosureKey: '2026-11-25T01:00:00Z',
      window,
      winner: { order: null, displayKind: 'company', fiscalCode: WINNER_CODE, name: 'CONSTRUCT TEST SRL', disclosed: false },
      recordCount: 2,
      valuedCount: 2,
      identityReviewCount: 0,
      undatedCount: 0,
      ...overrides.summary,
    },
    records: {
      dataAsOf: '2026-11-25T01:00:00Z',
      disclosureKey: '2026-11-25T01:00:00Z',
      window,
      items: overrides.rows ?? [
        { ...rawRow(), buyer: { fiscalCode: '4364446', displayKind: 'authority', name: 'ORAȘUL OTOPENI' } },
        { ...rawRow({ recordId: 'e_licitatie:ca:100240:550020', title: 'Servicii de deszăpezire', flags: ['joint_win'] }), buyer: { fiscalCode: '30111299', displayKind: 'person_masked', name: 'Maria I***' } },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
      hasMore: false,
      depthLimited: false,
      ...overrides.records,
    },
  }
}
