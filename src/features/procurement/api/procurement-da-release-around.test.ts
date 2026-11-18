import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RELEASE_CASES } from '../lib/direct-purchase-release.fixture'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const { fetchReleaseAround, releaseOtherOf } = await import('./procurement-da-release-around')

/**
 * A release purchase's neighbours come from the release: counted values (none
 * when not counted), a withheld title named by its category, finalization
 * days, and one snapshot — never a list mixed across a nightly publish.
 */

const item = (detail: ReturnType<(typeof RELEASE_CASES)[keyof typeof RELEASE_CASES]>) => detail.purchase
const page = (dataAsOf: string, items: readonly unknown[] = []) => ({ dataAsOf, items })

beforeEach(() => graphqlQuery.mockReset())

describe('releaseOtherOf', () => {
  it('a counted purchase: its counted value, its category as its name, its finalization day', () => {
    expect(releaseOtherOf(item(RELEASE_CASES.corrected()))).toEqual({ id: 'a'.repeat(64), code: 'DA37709621', title: 'Beton refractar', value: 3150, date: '2025-03-04', done: true, inLei: true, titlePublic: false })
  })

  it('a purchase out of totals has no value to list', () => {
    expect(releaseOtherOf(item(RELEASE_CASES.excludedApproximate())).value).toBeNull()
  })

  it('a refused attempt: its reported offer, dated by its request', () => {
    expect(releaseOtherOf(item(RELEASE_CASES.refused()))).toMatchObject({ value: 40000, date: '2025-06-01', done: false, inLei: false })
  })
})

describe('fetchReleaseAround', () => {
  const input = { authorityCui: '361684', supplierCui: '14837428', day: '2025-06-02' }

  it('asks the release for the two parties, by finalization, and counts accepted purchases since 2019', async () => {
    graphqlQuery.mockResolvedValue({
      all: { total: 17, totalCapped: false, dataAsOf: 't1' },
      newer: page('t1', [item(RELEASE_CASES.countedAsReported())]),
      older: page('t1'),
    })
    const around = await fetchReleaseAround(input, 4)
    expect(around.records).toEqual({ count: 17, estimated: false })
    expect(around.newer).toHaveLength(1)
    const [, variables] = graphqlQuery.mock.calls[0] as [string, Record<string, unknown>]
    expect(variables).toEqual({
      all: { buyerFiscalCode: '361684', supplierFiscalCode: '14837428', outcomes: ['accepted'], finalizationFrom: '2019-01-01' },
      newer: { buyerFiscalCode: '361684', supplierFiscalCode: '14837428', finalizationFrom: '2025-06-02' },
      older: { buyerFiscalCode: '361684', supplierFiscalCode: '14837428', finalizationTo: '2025-06-02' },
      perSide: 4,
    })
  })

  it('reads again across a publish, and fails rather than mix two', async () => {
    graphqlQuery.mockResolvedValueOnce({ all: { total: 1, totalCapped: false, dataAsOf: 't1' }, newer: page('t2'), older: page('t2') })
    graphqlQuery.mockResolvedValueOnce({ all: { total: 1, totalCapped: false, dataAsOf: 't2' }, newer: page('t2'), older: page('t2') })
    await expect(fetchReleaseAround(input, 4)).resolves.toMatchObject({ records: { count: 1 } })
    graphqlQuery.mockResolvedValue({ all: { total: 1, totalCapped: false, dataAsOf: 't1' }, newer: page('t2'), older: page('t2') })
    await expect(fetchReleaseAround(input, 4)).rejects.toThrow('published')
  })

  it('a list past 10,000 is said as estimated', async () => {
    graphqlQuery.mockResolvedValue({ all: { total: 10000, totalCapped: true, dataAsOf: 't1' }, newer: page('t1'), older: page('t1') })
    await expect(fetchReleaseAround(input, 4)).resolves.toMatchObject({ records: { count: 10000, estimated: true } })
  })
})
