import { beforeEach, describe, expect, it, vi } from 'vitest'
import { homeYear } from '../lib/home-model'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const { fetchContract, fetchContractContext } = await import('./procurement-contract-api')

/**
 * The page's reads: a missing record is `null`, never an error; the notice
 * and the names fail soft (the contract stands alone, on its own names, and
 * is `partial`); every context read fails soft and says so.
 */

type Handler = (variables: Record<string, unknown>) => unknown
const LATEST = homeYear()
const PART = LATEST + 1

function answer(handlers: Readonly<Record<string, Handler>>) {
  graphqlQuery.mockImplementation((_query: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
    const handler = handlers[options.operationName]
    if (!handler) return Promise.reject(new Error(`unexpected ${options.operationName}`))
    try {
      return Promise.resolve(handler(variables))
    } catch (error) {
      return Promise.reject(error)
    }
  })
}

const variablesOf = (operationName: string) => graphqlQuery.mock.calls.find((call) => (call[2] as { readonly operationName: string }).operationName === operationName)?.[1] as Record<string, unknown> | undefined

const value = { valueState: 'official_exact', valueStateRule: 'own_value', valueAccepted: true, valueRonComparable: null }

/** A row as the API answers it. */
function row(id: string, supplier: { readonly cui: string | null; readonly name: string }, valueRon: string, fields: Record<string, unknown> = {}) {
  return { id, contractNo: '191', contractDate: '2025-12-10', noticeNo: 'SCNA1128809', title: null, recordKind: 'contract_award', supplier, valueRon, currency: null, value, ...fields }
}

const DOMINO = { cui: '27843529', name: 'DOMINO CONSTRUCT EXPERT' }
const DECORINT = { cui: '21179945', name: 'DECORINT S.R.L.' }

const PAGE = {
  procurementContract: {
    contract: {
      ...row('2533825', DOMINO, '7664195.00'),
      value: { ...value, valueRonComparable: '7664195.00' },
      displayTitle: { text: 'INTERVENTII DE REABILITARE LA TURNUL SFATULUI', source: 'matched_award', sourceUrl: null },
      authority: { cui: '4270740', name: 'MUNICIPIUL SIBIU', displayName: 'MUNICIPIUL SIBIU' },
      cpvCode: '45453000-7',
      estimatedValueRon: null,
      sourceSystem: 'seap_contracts',
      sourceUrl: 'https://data.gov.ro/download/datagov-raport-contracte-publicate-t4-2025.xlsx',
      modifications: [],
    },
    procedure: { id: '999', procedureType: 'procedura simplificata', awardedValueRon: '7664195.00', authority: { cui: '4270740' } },
    ted: null,
    duplicates: [],
  },
}

const NAMES = {
  labels: [
    { cui: '4270740', canonicalName: 'MUNICIPIUL SIBIU', status: 'named' },
    { cui: '27843529', canonicalName: 'DOMINO CONSTRUCT EXPERT SRL', status: 'named' },
  ],
  cpv: [{ cpvCode: '45453000', labelRo: 'Lucrări de reparaţii generale şi de renovare', labelEn: 'Overhaul and refurbishment work' }],
}

beforeEach(() => {
  graphqlQuery.mockReset()
})

describe('the contract', () => {
  it('reads the record, its notice, then everyone’s names in it', async () => {
    answer({
      ProcurementContractPage: () => PAGE,
      ProcurementContractNotice: (variables) => {
        expect(variables).toEqual({ authorityCui: '4270740', noticeNo: 'SCNA1128809', pageSize: 100 })
        // The search is by text: a row of another notice may come back, and is left out.
        return { procurementContracts: { total: 3, items: [row('2533826', DECORINT, '7664195.00'), row('2533825', DOMINO, '7664195.00'), row('1', { cui: '555', name: 'ALTA' }, '10.00', { noticeNo: 'SCNA0000001' })] } }
      },
      ProcurementDirectPurchaseNames: (variables) => {
        expect(variables).toMatchObject({ cuis: ['4270740', '27843529', '21179945'], codes: ['45453000'], entityCui: '4270740', withEntity: true })
        return { ...NAMES, entity: null }
      },
    })
    const sheet = await fetchContract('2533825')
    // Two rows of this notice, the stray one left out; a page not full holds the whole notice.
    expect(sheet).toMatchObject({ id: '2533825', title: 'Interventii de reabilitare la turnul sfatului', partial: false, noticeMore: false })
    expect(sheet?.contract.association).toBe(true)
    expect(sheet?.contract.firms.map((firm) => firm.name)).toEqual(['Domino Construct Expert SRL', 'Decorint S.R.L.'])
    expect(sheet?.cpv?.label).toEqual({ ro: 'Lucrări de reparaţii generale şi de renovare', en: 'Overhaul and refurbishment work' })
    expect(sheet?.value).toEqual({ kind: 'accepted', value: 7664195 })
  })

  it('reads a full page of the notice as a floor: the notice may hold more', async () => {
    answer({
      ProcurementContractPage: () => PAGE,
      ProcurementContractNotice: () => ({
        procurementContracts: { total: 110, items: Array.from({ length: 100 }, (_, index) => row(`r${index}`, { cui: String(1000 + index), name: `FIRMA ${index}` }, '100.00', { contractNo: String(index) })) },
      }),
      ProcurementDirectPurchaseNames: () => ({ ...NAMES, entity: null }),
    })
    const sheet = await fetchContract('2533825')
    expect(sheet?.noticeMore).toBe(true)
    expect(sheet?.others).toHaveLength(100)
  })

  it('answers null for a record SEAP does not have, reading nothing more', async () => {
    answer({ ProcurementContractPage: () => ({ procurementContract: null }) })
    await expect(fetchContract('missing')).resolves.toBeNull()
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
  })

  it('stands alone on its own names when the notice and the names fail, and says so', async () => {
    answer({
      ProcurementContractPage: () => PAGE,
      ProcurementContractNotice: () => {
        throw new Error('down')
      },
      ProcurementDirectPurchaseNames: () => {
        throw new Error('down')
      },
    })
    const sheet = await fetchContract('2533825')
    expect(sheet).toMatchObject({ partial: true, noticeUnread: true })
    expect(sheet?.contract.firms).toHaveLength(1)
    expect(sheet?.authority.name).toBe('Municipiul Sibiu')
  })

  it('fails when the record itself does not read', async () => {
    answer({
      ProcurementContractPage: () => {
        throw new Error('down')
      },
    })
    await expect(fetchContract('2533825')).rejects.toThrow('down')
  })
})

describe('the context', () => {
  const stats = (count: string) => ({ blocks: [{ recordCount: count, withValueCount: count, valueAwardedSum: null }] })
  const series = (points: readonly (readonly [string, string])[]) => [{ points: points.map(([bucket, point]) => ({ bucket, value: point })) }]
  const month = (index: number) => `${PART}-${String(index).padStart(2, '0')}`

  const handlers: Record<string, Handler> = {
    // The national months: the year in progress full through May, a trickle in June.
    ProcurementCutoff: () => {
      const months = [...Array.from({ length: 12 }, (_, index) => [`${LATEST}-${String(index + 1).padStart(2, '0')}`, '1000'] as const), ...[1, 2, 3, 4, 5].map((index) => [month(index), '1000'] as const), [month(6), '10'] as const]
      return { nationalDirectMonths: series(months), nationalAwardMonths: series(months) }
    },
    ProcurementContractPair: () => ({
      pairAwards: series([['2021', '5'], [`${LATEST}`, '1']]),
      pairFrameworks: series([['2022', '2']]),
      pairDirect: series([['2023', '3']]),
      pairDirectValue: series([['2023', '4500']]),
    }),
    // The year in progress by month: two through May, one after the cutoff.
    ProcurementContractPairPart: () => ({
      partAwards: series([[month(2), '2'], [month(7), '1']]),
      partFrameworks: series([]),
      partDirect: series([[month(3), '1']]),
      partDirectValue: series([[month(3), '250']]),
    }),
    ProcurementContractBuyer: () => ({ pairAwardsYear: stats('1'), pairFrameworksYear: stats('0'), buyerAwards: stats('65'), buyerFrameworks: stats('9') }),
    ProcurementContractSeller: () => ({ sellerAwards: stats('3') }),
    ProcurementContractAround: () => ({
      all: { total: 7, totalEstimated: false },
      newer: { items: [row('2533826', DECORINT, '7664195.00'), row('n1', DOMINO, '100.00', { contractNo: '200', contractDate: `${LATEST}-12-20` })] },
      older: { items: [row('o1', DOMINO, '50.00', { contractNo: '150', contractDate: `${LATEST}-03-01` })] },
    }),
  }

  async function sheetOf(day: string) {
    answer({
      ProcurementContractPage: () => ({ procurementContract: { ...PAGE.procurementContract, contract: { ...PAGE.procurementContract.contract, contractDate: day } } }),
      ProcurementContractNotice: () => ({ procurementContracts: { total: 2, items: [row('2533826', DECORINT, '7664195.00', { contractDate: day }), row('2533825', DOMINO, '7664195.00', { contractDate: day })] } }),
      ProcurementDirectPurchaseNames: () => ({ ...NAMES, entity: null }),
    })
    const sheet = await fetchContract('2533825')
    graphqlQuery.mockReset()
    return sheet!
  }

  it('counts the pair since 2019, each side’s year, and the contracts around', async () => {
    const sheet = await sheetOf(`${LATEST}-12-10`)
    answer(handlers)
    const context = await fetchContractContext({ id: sheet.id, authorityCui: '4270740', supplierCui: '27843529', day: `${LATEST}-12-10` }, sheet)
    expect(context).toMatchObject({ year: LATEST, through: null, pair: { awards: 1, frameworks: 0 }, buyer: { awards: 65, frameworks: 9 }, seller: { awards: 3 }, records: 7, partial: false })
    expect(context.years?.find((year) => year.year === 2021)).toEqual({ year: 2021, awards: 5, frameworks: 0, direct: 0, directLei: null })
    expect(context.years?.find((year) => year.year === 2023)).toEqual({ year: 2023, awards: 0, frameworks: 0, direct: 3, directLei: 4500 })
    // SEAP has the year in progress through May: the chart runs to it, counted through May, dashed.
    expect(context.years?.[context.years.length - 1]).toEqual({ year: PART, awards: 2, frameworks: 0, direct: 1, directLei: 250 })
    expect(context.inProgress).toEqual({ year: PART, through: month(5) })
    expect(variablesOf('ProcurementContractPair')?.pairAwards).toMatchObject({ from: '2019-01', to: `${LATEST}-12` })
    expect(variablesOf('ProcurementContractPairPart')?.partAwards).toMatchObject({ year: PART })
    // The association's other row is this contract, collapsed into this page's own.
    expect(context.around.map((other) => other.id)).toEqual(['n1', '2533825', 'o1'])
    expect(variablesOf('ProcurementContractBuyer')?.buyerAwards).toMatchObject({ authorityCui: '4270740', grain: 'contract', recordKind: 'contract_award', from: `${LATEST}-01`, to: `${LATEST}-12` })
    expect(variablesOf('ProcurementContractAround')?.all).toMatchObject({ contractDate: { gte: '2019-01-01' } })
  })

  it('reads the year in progress through the contracts’ cutoff month', async () => {
    const sheet = await sheetOf(month(2).concat('-10'))
    answer(handlers)
    const context = await fetchContractContext({ id: sheet.id, authorityCui: '4270740', supplierCui: '27843529', day: `${month(2)}-10` }, sheet)
    expect(context).toMatchObject({ year: PART, through: month(5) })
    expect(variablesOf('ProcurementContractSeller')?.sellerAwards).toMatchObject({ from: `${PART}-01`, to: month(5) })
  })

  it('leaves a failed part out — null, never a zero — and says so', async () => {
    const sheet = await sheetOf(`${LATEST}-12-10`)
    answer({
      ...handlers,
      ProcurementContractPair: () => {
        throw new Error('down')
      },
      ProcurementContractSeller: () => {
        throw new Error('down')
      },
    })
    const context = await fetchContractContext({ id: sheet.id, authorityCui: '4270740', supplierCui: '27843529', day: `${LATEST}-12-10` }, sheet)
    expect(context.partial).toBe(true)
    expect(context.years).toBeNull()
    expect(context.seller).toBeNull()
    expect(context.buyer).toEqual({ awards: 65, frameworks: 9 })
  })
})
