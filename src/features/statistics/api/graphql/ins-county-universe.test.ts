import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: vi.fn() }))
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { fetchLandingCountyUniverse } from './ins-county-universe'
const rows: { code: string; level: string; name_ro: string }[] =
  ROMANIA_COUNTIES.map((c) => ({
    code: c.code,
    level: 'NUTS3',
    name_ro: c.nameRo,
  }))
function page(
  offset: number,
  nodes = rows.slice(offset, offset + 20),
  overrides = {},
) {
  return {
    insTerritories: {
      nodes,
      pageInfo: {
        totalCount: 42,
        hasPreviousPage: offset > 0,
        hasNextPage: offset + nodes.length < 42,
        ...overrides,
      },
    },
  }
}
describe('independent native landing county universe', () => {
  beforeEach(() => vi.resetAllMocks())
  it('collects every canonical county anonymously with offset progress before validation', async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(page(0))
      .mockResolvedValueOnce(page(20))
      .mockResolvedValueOnce(page(40))
    const signal = new AbortController().signal
    const result = await fetchLandingCountyUniverse(signal)
    expect(result.map((r) => r.code)).toEqual(rows.map((r) => r.code))
    expect(result.some((r) => r.code === 'B')).toBe(true)
    expect(vi.mocked(graphqlQuery).mock.calls.map((call) => call[1])).toEqual(
      [0, 20, 40].map((offset) => ({
        filter: { levels: ['NUTS3'] },
        limit: 20,
        offset,
      })),
    )
    for (const call of vi.mocked(graphqlQuery).mock.calls)
      expect(call[2]).toEqual({ auth: 'none', signal })
  })
  it.each([
    page(0, [], { hasNextPage: true }),
    page(0, undefined, { totalCount: 41 }),
    page(0, undefined, { hasNextPage: false }),
    page(0, [...rows.slice(0, 19), rows[0]]),
    page(
      0,
      rows.slice(0, 20).map((r, i) => (i === 0 ? { ...r, level: 'LAU' } : r)),
    ),
    page(0, undefined, { hasPreviousPage: true }),
  ])('rejects incomplete or malformed catalog page %#', async (response) => {
    vi.mocked(graphqlQuery).mockResolvedValue(response)
    await expect(fetchLandingCountyUniverse()).rejects.toThrow()
  })
  it('rejects changed counts across pages and never returns the earlier prefix', async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(page(0))
      .mockResolvedValueOnce(page(20, undefined, { totalCount: 43 }))
    await expect(fetchLandingCountyUniverse()).rejects.toThrow()
  })
  it('requires the final page to terminate and exact expected membership', async () => {
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(page(0))
      .mockResolvedValueOnce(page(20))
      .mockResolvedValueOnce(page(40, undefined, { hasNextPage: true }))
    await expect(fetchLandingCountyUniverse()).rejects.toThrow('terminate')
    vi.mocked(graphqlQuery)
      .mockResolvedValueOnce(
        page(
          0,
          rows.slice(0, 20).map((r, i) => (i === 0 ? { ...r, code: 'ZZ' } : r)),
        ),
      )
      .mockResolvedValueOnce(page(20))
      .mockResolvedValueOnce(page(40))
    await expect(fetchLandingCountyUniverse()).rejects.toThrow('unexpected')
  })
  it('does not start reads after cancellation and does not convert transport failure to empty coverage', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      fetchLandingCountyUniverse(controller.signal),
    ).rejects.toThrow()
    expect(graphqlQuery).not.toHaveBeenCalled()
    vi.mocked(graphqlQuery).mockRejectedValue(new Error('unavailable'))
    await expect(fetchLandingCountyUniverse()).rejects.toThrow('unavailable')
  })
})
