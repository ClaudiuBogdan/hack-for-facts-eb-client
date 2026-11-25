import { beforeEach, describe, expect, it, vi } from 'vitest'
import { daDetail, daRecord, directPurchase } from '../lib/direct-purchase.fixture'
import { homeYear } from '../lib/home-model'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const { GraphQLRequestError } = await import('@/lib/graphql/graphql-client')
const { fetchDirectPurchase, fetchDirectPurchaseContext } = await import('./procurement-direct-purchase-api')

/**
 * The page's reads: a missing record is `null`, never an error; the names and
 * every context read fail soft and say so (`partial`); an error inside the
 * detail leaves the record standing.
 */

type Handler = (variables: Record<string, unknown>) => unknown
const LATEST = homeYear()

/** The raw record as the API answers it (the mapper's input, before the source URL is rewritten). */
function rawRecord(fields: Record<string, unknown> = {}) {
  const { grain: _grain, stateId: _stateId, ...record } = daRecord()
  return { ...record, ...fields }
}

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

const NAMES_ANSWER = {
  labels: [
    { cui: '361684', canonicalName: 'BANCA NATIONALA A ROMANIEI', status: 'named' },
    { cui: '9446547', canonicalName: 'FLORARIA IRIS SRL', status: 'named' },
  ],
  entity: null,
  cpv: [{ cpvCode: '03121210', labelRo: 'Aranjamente florale', labelEn: 'Floral arrangements' }],
}

beforeEach(() => {
  graphqlQuery.mockReset()
})

describe('the purchase', () => {
  it('reads the record, then its names, and maps them', async () => {
    answer({
      ProcurementDirectAcquisitionDetail: () => ({
        procurementDirectAcquisition: { directAcquisition: rawRecord(), detail: daDetail(), detailAvailability: 'AVAILABLE', duplicates: [{ sourceSystem: 'seap_da', id: '14942790' }] },
      }),
      ProcurementDirectPurchaseNames: (variables) => {
        expect(variables).toMatchObject({ cuis: ['361684', '9446547'], codes: ['03121210'], entityCui: '361684', withEntity: true })
        return NAMES_ANSWER
      },
    })
    const purchase = await fetchDirectPurchase('10120196')
    expect(purchase).toMatchObject({ title: 'Aranjamente florale', value: 98448, partial: false, cpv: { label: { ro: 'Aranjamente florale', en: 'Floral arrangements' } } })
    // SEAP publishes it again in its quarterly export; the page says so once.
    expect(purchase?.alsoIn).toEqual(['export'])
    expect(purchase?.supplier.name).toBe('Floraria Iris SRL')
    expect(purchase?.detail?.items).toHaveLength(3)
  })

  it('answers null for a record SEAP does not have, without reading names', async () => {
    answer({ ProcurementDirectAcquisitionDetail: () => ({ procurementDirectAcquisition: null }) })
    await expect(fetchDirectPurchase('missing')).resolves.toBeNull()
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
  })

  it('stands on the record’s own names when the names fail, and says so', async () => {
    answer({
      ProcurementDirectAcquisitionDetail: () => ({ procurementDirectAcquisition: { directAcquisition: rawRecord(), detail: null, detailAvailability: 'NOT_CAPTURED', duplicates: [] } }),
      ProcurementDirectPurchaseNames: () => {
        throw new Error('down')
      },
    })
    const purchase = await fetchDirectPurchase('10120196')
    expect(purchase).toMatchObject({ partial: true, detail: null, availability: 'NOT_CAPTURED' })
    expect(purchase?.authority.name).toBe('Banca Nationala a Romaniei')
  })

  it('reads the record alone when the API errors inside its detail, the detail said unavailable', async () => {
    answer({
      ProcurementDirectAcquisitionDetail: () => {
        throw new GraphQLRequestError('GraphQL errors', { graphQLErrors: [{ message: 'Internal server error', path: ['procurementDirectAcquisition', 'detail', 'items', 0, 'id'] }] })
      },
      ProcurementDirectAcquisitionRecord: () => ({ procurementDirectAcquisition: { directAcquisition: rawRecord() } }),
      ProcurementDirectPurchaseNames: () => NAMES_ANSWER,
    })
    const purchase = await fetchDirectPurchase('10120196')
    expect(purchase).toMatchObject({ availability: 'TEMPORARILY_UNAVAILABLE', detail: null, partial: true, value: 98448 })
  })

  it('fails on an error outside the detail: the record itself did not read', async () => {
    answer({
      ProcurementDirectAcquisitionDetail: () => {
        throw new GraphQLRequestError('GraphQL errors', { graphQLErrors: [{ message: 'boom', path: ['procurementDirectAcquisition', 'directAcquisition'] }] })
      },
    })
    await expect(fetchDirectPurchase('10120196')).rejects.toThrow('GraphQL errors')
  })
})

describe('the context', () => {
  const PART = LATEST + 1
  const stats = (count: string, value: string | null) => ({ blocks: [{ recordCount: count, withValueCount: count, valueAwardedSum: value }] })
  const top = (key: string) => ({ key, kind: 'top', recordCount: '1', withValueCount: '1', valueSum: '1', shareOfScope: null })
  const series = (points: readonly (readonly [string, string])[]) => [{ points: points.map(([bucket, value]) => ({ bucket, value })), meta: { buildId: '13' } }]
  const month = (index: number) => `${PART}-${String(index).padStart(2, '0')}`
  const complete = directPurchase({ publicationDate: `${LATEST}-06-01`, finalizationDate: `${LATEST}-06-02` })
  const input = { id: complete.id, authorityCui: '361684', supplierCui: '9446547', day: `${LATEST}-06-01`, yearDay: `${LATEST}-06-02` }
  const handlers: Record<string, Handler> = {
    // The national months: the year in progress full through May, a trickle in June.
    ProcurementCutoff: () => {
      const months = [...Array.from({ length: 12 }, (_, index) => [`${LATEST}-${String(index + 1).padStart(2, '0')}`, '1000'] as const), ...[1, 2, 3, 4, 5].map((index) => [month(index), '1000'] as const), [month(6), '10'] as const]
      return { nationalDirectMonths: series(months), nationalAwardMonths: series(months) }
    },
    ProcurementDirectPurchasePair: () => ({
      pairYearsCount: series([[`${LATEST - 1}`, '3'], [`${LATEST}`, '1'], [`${PART}`, '3']]),
      pairYearsValue: series([[`${LATEST - 1}`, '300'], [`${LATEST}`, '98448'], [`${PART}`, '30']]),
      // Two in the year in progress through May, one after the cutoff.
      pairPartCount: series([[month(2), '2'], [month(7), '1']]),
      pairPartValue: series([[month(2), '20'], [month(7), '10']]),
    }),
    ProcurementDirectPurchaseBuyer: () => ({
      pairYear: stats('1', '98448'),
      buyerYear: stats('142', '1764398'),
      buyerSellers: [{ rankedBy: 'value', buckets: [top('a'), top('b'), top('9446547'), { key: null, kind: 'other', recordCount: '12', withValueCount: '12', valueSum: '5', shareOfScope: null }] }],
    }),
    ProcurementDirectPurchaseSeller: () => ({
      sellerYear: stats('13', '352289'),
      sellerClients: [{ rankedBy: 'value', buckets: [top('x'), top('361684')] }],
    }),
  }

  const variablesOf = (operationName: string) => graphqlQuery.mock.calls.find((call) => (call[2] as { readonly operationName: string }).operationName === operationName)?.[1] as Record<string, Record<string, unknown>> | undefined

  it('composes the pair and each side’s year and place; a legacy purchase reads no records around (PROC-001)', async () => {
    answer(handlers)
    const context = await fetchDirectPurchaseContext(input, complete)
    // Not read is no failure: no count, no band, and the context is whole.
    expect(context).toMatchObject({ year: LATEST, through: null, records: null, others: [], pair: { count: 1, value: 98448 }, partial: false })
    // Third of three named firms, and more past them; second of two institutions.
    expect(context.buyer).toEqual({ count: 142, value: 1764398, sellers: 3, more: true, rank: 3 })
    expect(context.seller).toEqual({ count: 13, value: 352289, clients: 2, more: false, rank: 2 })
    const asked = graphqlQuery.mock.calls.map((call) => (call[2] as { readonly operationName: string }).operationName)
    expect(asked).not.toContain('ProcurementDirectPurchaseAround')
    expect(asked).not.toContain('ProcurementDaAround')
  })

  it('runs the pair’s years to the year in progress, cut at its cutoff', async () => {
    answer(handlers)
    const context = await fetchDirectPurchaseContext(input, complete)
    expect(context.last).toEqual({ year: PART, through: month(5) })
    expect(context.years).toEqual([
      { year: LATEST - 1, count: 3, value: 300 },
      { year: LATEST, count: 1, value: 98448 },
      { year: PART, count: 2, value: 20 },
    ])
    expect(variablesOf('ProcurementDirectPurchasePair')?.pairYearsCount).toMatchObject({ from: '2019-01', to: `${PART}-12` })
  })

  it('a release purchase reads its neighbours from the release, never the legacy list', async () => {
    const { mapReleasePurchase } = await import('../lib/direct-purchase-release')
    const { NO_NAMES } = await import('../lib/direct-purchase-model')
    const { RELEASE_CASES } = await import('../lib/direct-purchase-release.fixture')
    const release = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    const neighbour = { ...RELEASE_CASES.noLongerListed().purchase, purchaseId: 'b'.repeat(64) }
    answer({
      ...handlers,
      ProcurementDaAround: () => ({
        all: { total: 5, totalCapped: false, dataAsOf: 't1' },
        newer: { dataAsOf: 't1', items: [neighbour] },
        older: { dataAsOf: 't1', items: [] },
      }),
    })
    const context = await fetchDirectPurchaseContext({ ...input, id: release.id, yearDay: '2025-06-02' }, release)
    expect(context.records).toEqual({ count: 5, estimated: false })
    expect(context.others.map((other) => other.id)).toEqual(['b'.repeat(64), release.id])
    expect(context.partial).toBe(false)
    expect(variablesOf('ProcurementDaAround')?.newer).toMatchObject({ finalizationFrom: '2025-06-02' })
    expect(variablesOf('ProcurementDirectPurchaseAround')).toBeUndefined()
  })

  it('reads a complete year whole', async () => {
    answer(handlers)
    await fetchDirectPurchaseContext(input, complete)
    expect(variablesOf('ProcurementDirectPurchaseBuyer')?.buyerYear).toMatchObject({ from: `${LATEST}-01`, to: `${LATEST}-12` })
  })

  it('reads the year in progress through its cutoff, or the purchase’s month when later', async () => {
    answer(handlers)
    const july = directPurchase({ publicationDate: month(7).concat('-01'), finalizationDate: month(7).concat('-02') })
    const context = await fetchDirectPurchaseContext({ ...input, day: `${month(7)}-01`, yearDay: `${month(7)}-02` }, july)
    expect(variablesOf('ProcurementDirectPurchaseBuyer')?.buyerYear).toMatchObject({ from: `${PART}-01`, to: month(7) })
    expect(context).toMatchObject({ year: PART, through: month(7), last: { year: PART, through: month(7) } })
    expect(context.years?.find((point) => point.year === PART)).toEqual({ year: PART, count: 3, value: 30 })
  })

  it('leaves a failed part out — null, never a zero — and says so', async () => {
    answer({
      ...handlers,
      ProcurementDirectPurchaseSeller: () => {
        throw new Error('down')
      },
      ProcurementDirectPurchasePair: () => {
        throw new Error('down')
      },
    })
    const context = await fetchDirectPurchaseContext(input, complete)
    expect(context.partial).toBe(true)
    expect(context.seller).toBeNull()
    expect(context.years).toBeNull()
    expect(context.buyer?.rank).toBe(3)
    expect(context.pair).toEqual({ count: 1, value: 98448 })
  })

  it('draws no band for a release purchase the dated lists do not hold: the read stood, so the context is whole', async () => {
    const { mapReleasePurchase } = await import('../lib/direct-purchase-release')
    const { NO_NAMES } = await import('../lib/direct-purchase-model')
    const { RELEASE_CASES } = await import('../lib/direct-purchase-release.fixture')
    const release = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    answer({
      ...handlers,
      ProcurementDaAround: () => ({ all: { total: 0, totalCapped: false, dataAsOf: 't1' }, newer: { dataAsOf: 't1', items: [] }, older: { dataAsOf: 't1', items: [] } }),
    })
    const context = await fetchDirectPurchaseContext({ ...input, id: release.id, yearDay: '2025-06-02' }, release)
    expect(context.others).toEqual([])
    expect(context.records).toEqual({ count: 0, estimated: false })
    expect(context.partial).toBe(false)
  })

  it('sends a release purchase’s neighbours read under the publication seen when the context began (D6)', async () => {
    const { noteKey, resetNewestKeyForTests } = await import('@/lib/disclosure-key')
    const { mapReleasePurchase } = await import('../lib/direct-purchase-release')
    const { NO_NAMES } = await import('../lib/direct-purchase-model')
    const { RELEASE_CASES } = await import('../lib/direct-purchase-release.fixture')
    const release = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    resetNewestKeyForTests()
    noteKey('2026-11-19T03:10:00.123456Z')
    try {
      answer({
        ...handlers,
        ProcurementDaAround: () => ({ all: { total: 0, totalCapped: false, dataAsOf: 't1' }, newer: { dataAsOf: 't1', items: [] }, older: { dataAsOf: 't1', items: [] } }),
      })
      await fetchDirectPurchaseContext({ ...input, id: release.id, yearDay: '2025-06-02' }, release)
      const options = graphqlQuery.mock.calls.find((call) => (call[2] as { readonly operationName: string }).operationName === 'ProcurementDaAround')?.[2] as { readonly disclosureSeen?: string | null }
      expect(options.disclosureSeen).toBe('2026-11-19T03:10:00.123456Z')
    } finally {
      resetNewestKeyForTests()
    }
  })

  it('says a release purchase’s failed neighbours read: no band, and the context partial', async () => {
    const { mapReleasePurchase } = await import('../lib/direct-purchase-release')
    const { NO_NAMES } = await import('../lib/direct-purchase-model')
    const { RELEASE_CASES } = await import('../lib/direct-purchase-release.fixture')
    const release = mapReleasePurchase(RELEASE_CASES.countedAsReported(), NO_NAMES)
    answer({
      ...handlers,
      ProcurementDaAround: () => {
        throw new Error('down')
      },
    })
    const context = await fetchDirectPurchaseContext({ ...input, id: release.id, yearDay: '2025-06-02' }, release)
    expect(context.partial).toBe(true)
    expect(context.records).toBeNull()
    expect(context.others).toEqual([])
  })
})
