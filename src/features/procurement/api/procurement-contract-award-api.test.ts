import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQuery = vi.hoisted(() => vi.fn())
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const { GraphQLRequestError } = await import('@/lib/graphql/graphql-client')
const { CaReadSpentError, CaRecordsOffError, CaSnapshotMismatchError, CaTotalsOffError, fetchBuyerContractAwards, fetchBuyerContractAwardTotals, fetchContractAward } = await import('./procurement-contract-award-api')
const { rawAward, rawAwards, rawTotals, RECORD_ID } = await import('../lib/contract-award.fixture')

const refused = (code: string, reason?: string, message: string = code) =>
  new GraphQLRequestError(`GraphQL errors: ${message}`, { graphQLErrors: [{ message, path: ['award'], extensions: { code, ...(reason ? { reason } : {}) } }] })
const REPUBLISHED = 'contract-award data was republished during this request; repeat the request'


const REQUEST = { cui: '4364446', from: '2024-01-01', to: '2024-12-31', sort: 'amountDesc', page: 2 } as const

/** PROC-KB0Z step 1: a buyer's contract awards and one award, as the API answers them. */
describe('fetchBuyerContractAwards', () => {
  beforeEach(() => graphqlQuery.mockReset())

  it('asks for the counts and one page in one request, twenty a page', async () => {
    graphqlQuery.mockResolvedValueOnce(rawAwards())
    const read = await fetchBuyerContractAwards(REQUEST)
    expect(read.recordCount).toBe(3)
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
    expect(graphqlQuery.mock.calls[0]?.[1]).toEqual({ buyerFiscalCode: '4364446', from: '2024-01-01', to: '2024-12-31', sort: 'amountDesc', page: 2, pageSize: 20 })
  })

  it('reads the pair again when its two halves stood on different snapshots, and fails on a second mismatch', async () => {
    const split = rawAwards({ records: { dataAsOf: '2026-11-25T02:00:00Z' } })
    graphqlQuery.mockResolvedValueOnce(split).mockResolvedValueOnce(rawAwards())
    await expect(fetchBuyerContractAwards(REQUEST)).resolves.toMatchObject({ dataAsOf: '2026-11-25T01:00:00Z' })
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
    graphqlQuery.mockReset()
    graphqlQuery.mockResolvedValue(split)
    await expect(fetchBuyerContractAwards(REQUEST)).rejects.toBeInstanceOf(CaSnapshotMismatchError)
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
  })

  it('reads again at once when the data was republished under the read, which is not the switch off', async () => {
    graphqlQuery.mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE', undefined, REPUBLISHED)).mockResolvedValueOnce(rawAwards())
    await expect(fetchBuyerContractAwards(REQUEST)).resolves.toMatchObject({ recordCount: 3 })
    graphqlQuery.mockReset()
    graphqlQuery.mockRejectedValue(refused('SERVICE_UNAVAILABLE', undefined, REPUBLISHED))
    // Republished twice: the read is spent (no third read anywhere), and never said as the switch off.
    const failed = fetchBuyerContractAwards(REQUEST)
    await expect(failed).rejects.toBeInstanceOf(CaReadSpentError)
    await expect(failed).rejects.not.toBeInstanceOf(CaRecordsOffError)
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
    graphqlQuery.mockReset()
    graphqlQuery.mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE', undefined, REPUBLISHED)).mockResolvedValueOnce(rawAward())
    await expect(fetchContractAward(RECORD_ID)).resolves.toMatchObject({ kind: 'found' })
  })

  it('makes no third read: a failure after its own second read is spent, and the switch off still said as such', async () => {
    const timeout = new GraphQLRequestError('GraphQL request timed out', { timedOut: true })
    graphqlQuery.mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE', undefined, REPUBLISHED)).mockRejectedValueOnce(timeout)
    await expect(fetchBuyerContractAwards(REQUEST)).rejects.toBeInstanceOf(CaReadSpentError)
    graphqlQuery.mockReset()
    graphqlQuery.mockResolvedValueOnce(rawAwards({ records: { dataAsOf: '2026-11-25T02:00:00Z' } })).mockRejectedValueOnce(timeout)
    await expect(fetchBuyerContractAwards(REQUEST)).rejects.toBeInstanceOf(CaReadSpentError)
    graphqlQuery.mockReset()
    graphqlQuery.mockResolvedValueOnce(rawAwards({ records: { dataAsOf: '2026-11-25T02:00:00Z' } })).mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE'))
    await expect(fetchBuyerContractAwards(REQUEST)).rejects.toBeInstanceOf(CaRecordsOffError)
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
    graphqlQuery.mockReset()
    graphqlQuery.mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE', undefined, REPUBLISHED)).mockRejectedValueOnce(timeout)
    await expect(fetchContractAward(RECORD_ID)).rejects.toBeInstanceOf(CaReadSpentError)
  })

  it('says the switch off as such, and lets any other failure through', async () => {
    graphqlQuery.mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE'))
    await expect(fetchBuyerContractAwards(REQUEST)).rejects.toBeInstanceOf(CaRecordsOffError)
    graphqlQuery.mockRejectedValueOnce(refused('INTERNAL_ERROR'))
    await expect(fetchBuyerContractAwards(REQUEST)).rejects.toBeInstanceOf(GraphQLRequestError)
  })
})

describe('fetchContractAward', () => {
  beforeEach(() => graphqlQuery.mockReset())

  it('reads an award, and says when the API resolved an earlier build’s id', async () => {
    graphqlQuery.mockResolvedValueOnce(rawAward())
    await expect(fetchContractAward(RECORD_ID)).resolves.toMatchObject({ kind: 'found', reanchored: false, award: { recordId: RECORD_ID } })
    graphqlQuery.mockResolvedValueOnce(rawAward({ reanchored: true }))
    const old = 'e_licitatie:ca:99:11'
    await expect(fetchContractAward(old)).resolves.toMatchObject({ kind: 'found', reanchored: true, award: { recordId: RECORD_ID } })
  })

  it('keeps an award before 2021, a missing one and the switch off apart', async () => {
    graphqlQuery.mockRejectedValueOnce(refused('NOT_FOUND', 'OUTSIDE_PUBLISHED_WINDOW'))
    await expect(fetchContractAward(RECORD_ID)).resolves.toEqual({ kind: 'outside' })
    graphqlQuery.mockRejectedValueOnce(refused('NOT_FOUND'))
    await expect(fetchContractAward(RECORD_ID)).resolves.toEqual({ kind: 'missing' })
    graphqlQuery.mockRejectedValueOnce(refused('INVALID_INPUT'))
    await expect(fetchContractAward(RECORD_ID)).resolves.toEqual({ kind: 'missing' })
    graphqlQuery.mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE'))
    await expect(fetchContractAward(RECORD_ID)).rejects.toBeInstanceOf(CaRecordsOffError)
  })

  it('asks nothing for an id that is no award’s', async () => {
    await expect(fetchContractAward('123456')).resolves.toEqual({ kind: 'missing' })
    expect(graphqlQuery).not.toHaveBeenCalled()
  })
})

describe('fetchBuyerContractAwardTotals', () => {
  beforeEach(() => graphqlQuery.mockReset())
  const WINDOW = { cui: '4364446', from: '2025-01-01', to: '2025-12-31' }

  it('asks the money build for the buyer’s contract awards in the window, one figure per kind, and keeps them apart', async () => {
    graphqlQuery.mockResolvedValueOnce(rawTotals())
    const read = await fetchBuyerContractAwardTotals(WINDOW)
    expect(graphqlQuery.mock.calls[0]?.[1]).toEqual({
      requests: [
        {
          id: 'buyer-contract-awards',
          filters: { procurementKinds: ['contract_award'], buyerCode: '4364446', from: '2025-01-01', to: '2025-12-31' },
          valueKinds: ['awarded', 'modification_change', 'framework_ceiling'],
        },
      ],
    })
    // In the band's order, whatever order the API answered in; no figure sums another.
    expect(read.figures.map((figure) => [figure.valueKind, figure.sumLei, figure.label.ro])).toEqual([
      ['awarded', 12345678.9, 'Valoare atribuită'],
      ['modification_change', -350000, 'Modificări de preț'],
      ['framework_ceiling', 45000000, 'Plafoane ale acordurilor-cadru'],
    ])
    expect(read.explanation.ro).toBe('Include contractele atribuite din 2025; 3 fără dată sunt lăsate deoparte.')
  })

  it('leaves out a kind the answer lacks rather than say it as zero', async () => {
    graphqlQuery.mockResolvedValueOnce(rawTotals({ totals: [{ valueKind: 'awarded', sumLei: '100.00', recordCount: '1' }] }))
    await expect(fetchBuyerContractAwardTotals(WINDOW)).resolves.toMatchObject({ figures: [{ valueKind: 'awarded', sumLei: 100 }] })
  })

  it('says the money unavailable when totals are off, the field is null, or the answer is for no request of ours', async () => {
    graphqlQuery.mockRejectedValueOnce(refused('SERVICE_UNAVAILABLE', undefined, 'procurement totals v2 is not enabled on this server'))
    await expect(fetchBuyerContractAwardTotals(WINDOW)).rejects.toBeInstanceOf(CaTotalsOffError)
    graphqlQuery.mockResolvedValueOnce({ totals: null })
    await expect(fetchBuyerContractAwardTotals(WINDOW)).rejects.toBeInstanceOf(CaTotalsOffError)
    graphqlQuery.mockResolvedValueOnce(rawTotals({ id: 'other' }))
    await expect(fetchBuyerContractAwardTotals(WINDOW)).rejects.toBeInstanceOf(CaTotalsOffError)
    // Any other failure stays itself: not the switch.
    graphqlQuery.mockRejectedValueOnce(refused('INTERNAL_ERROR'))
    await expect(fetchBuyerContractAwardTotals(WINDOW)).rejects.not.toBeInstanceOf(CaTotalsOffError)
  })
})

describe('the totals read’s document', () => {
  beforeEach(() => graphqlQuery.mockReset())

  it('selects the figures, labels and explanation under one aliased root, and passes the read’s signal on', async () => {
    const { PROCUREMENT_CONTRACT_AWARD_TOTALS_QUERY } = await import('./graphql/procurement-contract-award-queries')
    graphqlQuery.mockResolvedValueOnce(rawTotals())
    const signal = new AbortController().signal
    await fetchBuyerContractAwardTotals({ cui: '4364446', from: '2025-01-01', to: '2025-12-31' }, signal)
    const [document, , options] = graphqlQuery.mock.calls[0] as [string, unknown, { readonly signal?: AbortSignal; readonly operationName?: string }]
    expect(document).toBe(PROCUREMENT_CONTRACT_AWARD_TOTALS_QUERY)
    const compact = document.replace(/\s+/gu, ' ')
    expect(compact).toContain('query ProcurementContractAwardTotals($requests: [ProcurementTotalRequestInput!]!)')
    expect(compact).toContain('totals: procurementTotals(requests: $requests)')
    expect(compact).toContain('totals { valueKind sumLei recordCount }')
    expect(compact).toContain('included { valueKinds { key labelRo labelEn } }')
    expect(compact).toContain('explanation { textRo textEn }')
    expect(options).toMatchObject({ operationName: 'ProcurementContractAwardTotals', signal })
  })
})
