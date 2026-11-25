import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))
const analytics = vi.hoisted(() => ({ fetchProcurementSupplierDirectAnalytics: vi.fn() }))
vi.mock('./procurement-api', () => analytics)
const winner = vi.hoisted(() => ({ fetchWinnerContractAwards: vi.fn() }))
vi.mock('./procurement-contract-award-api', () => winner)

const { fetchCompanyProcurement, readCompanyNewestDirect, COMPANY_NEWEST } = await import('./procurement-company-read')
const { noteKey, resetNewestKeyForTests } = await import('@/lib/disclosure-key')

/**
 * The company profile's band (PROC-001): the direct purchases (analysis and
 * the release's newest) and the contract awards by winner, each read on its
 * own and failing on its own; no legacy read.
 */

const ANALYTICS = { grain: 'direct_acquisition', topAuthorities: [] }
const purchase = (id: string, buyer: { fiscalCode: string | null; displayKind: string; name: string | null } | null) => ({
  purchaseId: id,
  code: 'DA37709621',
  outcome: 'accepted',
  publicationDay: '2026-09-01',
  finalizationDay: '2026-09-03',
  reportedValue: '300.14',
  counted: true,
  countedValue: '300.14',
  notCountedReason: null,
  valueCorrected: false,
  correctedValue: null,
  reviewRule: null,
  symbolicPrice: false,
  title: 'BENZINA',
  titleWithheld: null,
  categoryLabel: 'Benzină',
  buyer: buyer ? { partyId: null, ...buyer } : null,
})
const NEWEST = { newest: { dataAsOf: '2026-11-25T01:00:00Z', items: [purchase('a'.repeat(64), { fiscalCode: '4305849', displayKind: 'authority', name: 'MUNICIPIUL EXEMPLU' }), purchase('b'.repeat(64), null)] } }

const operation = (call: readonly unknown[]) => (call[2] as { readonly operationName: string }).operationName

beforeEach(() => {
  graphqlQuery.mockReset().mockResolvedValue(NEWEST)
  analytics.fetchProcurementSupplierDirectAnalytics.mockReset().mockResolvedValue(ANALYTICS)
  winner.fetchWinnerContractAwards.mockReset().mockResolvedValue({ kind: 'missing' })
  resetNewestKeyForTests()
})

describe('fetchCompanyProcurement', () => {
  it('reads both parts, and the contract awards for every year published, newest first', async () => {
    const read = await fetchCompanyProcurement('22202108')
    expect(read.direct.status).toBe('ready')
    expect(read.contracts).toEqual({ status: 'ready', value: { kind: 'missing' } })
    expect(analytics.fetchProcurementSupplierDirectAnalytics).toHaveBeenCalledWith('22202108', undefined, undefined)
    expect(winner.fetchWinnerContractAwards).toHaveBeenCalledWith({ code: '22202108', year: null, sort: 'awardDayDesc', page: 1 }, undefined)
    // Only the release's newest is asked through GraphQL here: no legacy read.
    expect(graphqlQuery.mock.calls.map(operation)).toEqual(['ProcurementDaSupplierNewest'])
  })

  it('fails the contract awards alone: the direct purchases stand', async () => {
    winner.fetchWinnerContractAwards.mockRejectedValue(new Error('down'))
    const read = await fetchCompanyProcurement('22202108')
    expect(read.contracts).toEqual({ status: 'failed' })
    expect(read.direct.status).toBe('ready')
  })

  it('fails the direct purchases alone, the analysis or the newest: the contract awards stand', async () => {
    analytics.fetchProcurementSupplierDirectAnalytics.mockRejectedValue(new Error('down'))
    expect(await fetchCompanyProcurement('22202108')).toMatchObject({ direct: { status: 'failed' }, contracts: { status: 'ready' } })
    analytics.fetchProcurementSupplierDirectAnalytics.mockResolvedValue(ANALYTICS)
    graphqlQuery.mockRejectedValue(new Error('down'))
    expect(await fetchCompanyProcurement('22202108')).toMatchObject({ direct: { status: 'failed' }, contracts: { status: 'ready' } })
  })

  it('sends every direct-purchase read under the publication seen when the read began (D6)', async () => {
    noteKey('2026-11-19T03:10:00.123456Z')
    await fetchCompanyProcurement('22202108')
    expect(analytics.fetchProcurementSupplierDirectAnalytics).toHaveBeenCalledWith('22202108', undefined, '2026-11-19T03:10:00.123456Z')
    expect((graphqlQuery.mock.calls[0]?.[2] as { readonly disclosureSeen?: string | null }).disclosureSeen).toBe('2026-11-19T03:10:00.123456Z')
  })

  it('guards nothing on a cold start: no publication seen, the firm’s own code, and one answer must not fail the other', async () => {
    await fetchCompanyProcurement('22202108')
    expect(graphqlQuery.mock.calls[0]?.[2]).not.toHaveProperty('disclosureSeen')
  })

  it('gives a reader who left after both parts answered nothing, answered parts included', async () => {
    const left = new AbortController()
    winner.fetchWinnerContractAwards.mockImplementation(() => {
      left.abort()
      return Promise.resolve({ kind: 'missing' })
    })
    await expect(fetchCompanyProcurement('22202108', left.signal)).rejects.toThrow()
    expect(analytics.fetchProcurementSupplierDirectAnalytics).toHaveBeenCalledWith('22202108', left.signal, undefined)
  })

  it('fails whole for a reader who left: nothing is said of a read it did not wait for', async () => {
    const left = new AbortController()
    winner.fetchWinnerContractAwards.mockImplementation(() => {
      left.abort()
      return Promise.reject(new Error('aborted'))
    })
    await expect(fetchCompanyProcurement('22202108', left.signal)).rejects.toThrow('aborted')
  })
})

describe('readCompanyNewestDirect', () => {
  it('asks the release for the firm’s newest purchases by finalization, under the publication seen', async () => {
    noteKey('2026-11-19T03:10:00.123456Z')
    const rows = await readCompanyNewestDirect('22202108')
    const [query, variables, options] = graphqlQuery.mock.calls[0] as [string, unknown, { readonly operationName: string; readonly disclosureSeen?: string | null }]
    expect(query).toContain('sort: finalizationDesc')
    expect(query).toContain('meta { disclosureKey }')
    expect(variables).toEqual({ filter: { supplierFiscalCode: '22202108', outcomes: ['accepted'] }, pageSize: COMPANY_NEWEST })
    expect(options).toMatchObject({ operationName: 'ProcurementDaSupplierNewest', disclosureSeen: '2026-11-19T03:10:00.123456Z' })
    expect(options).not.toHaveProperty('legacy')
    // The buyer as served, its code kept for its page; no buyer served, none named.
    expect(rows.map((row) => [row.id.slice(0, 1), row.buyer.cui, row.done, row.value])).toEqual([
      ['a', '4305849', true, 300.14],
      ['b', null, true, 300.14],
    ])
    expect(rows[0]?.buyer.name).toBe('Municipiul Exemplu')
  })
})
