import { beforeEach, describe, expect, it, vi } from 'vitest'

const { graphqlQuery, isGraphQLInvalidInput } = vi.hoisted(() => ({ graphqlQuery: vi.fn(), isGraphQLInvalidInput: vi.fn((error: unknown) => error instanceof Error && error.message === 'INVALID_INPUT') }))
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery, isGraphQLInvalidInput }))

import { TURSIB_AUTHORITIES, TURSIB_INDICATORS, TURSIB_PROFILE } from '../lib/test/enterprise-fixture'
import { PUBLIC_ENTERPRISE_INDICATORS_QUERY, PUBLIC_ENTERPRISE_PROFILE_QUERY, fetchPublicEnterprise, publicEnterpriseAuthoritiesQuery } from './public-enterprise-api'

const page = (cells: readonly unknown[], next: string | null, snapshotId = 'amepip-core-1') => ({
  snapshotId,
  pageInfo: { hasNextPage: next !== null, endCursor: next },
  edges: cells.map((node) => ({ node })),
})

const authoritiesAnswer = {
  e0: TURSIB_AUTHORITIES['45699112']!.entity,
  p0: TURSIB_AUTHORITIES['45699112']!.peers,
  e1: TURSIB_AUTHORITIES['4270740']!.entity,
  p1: TURSIB_AUTHORITIES['4270740']!.peers,
}

/** Answers each operation in turn; the indicator pages from `pages`. */
function answer(pages: readonly ReturnType<typeof page>[], authorities: unknown = authoritiesAnswer) {
  let indicatorPage = 1
  graphqlQuery.mockImplementation(async (_query: string, _variables: unknown, options: { operationName: string }) => {
    if (options.operationName === 'PublicEnterpriseProfile') return { publicEnterprise: { ...TURSIB_PROFILE, indicators: pages[0] } }
    if (options.operationName === 'PublicEnterpriseIndicators') {
      const next = pages[indicatorPage]
      indicatorPage += 1
      if (!next) throw new Error('no such page')
      return { publicEnterprise: { indicators: next } }
    }
    if (options.operationName === 'PublicEnterpriseAuthorities') {
      if (authorities instanceof Error) throw authorities
      return authorities
    }
    throw new Error(`unexpected ${options.operationName}`)
  })
}

// A block, not an arrow's value: Vitest runs a function `beforeEach` returns as the test's teardown.
beforeEach(() => {
  graphqlQuery.mockReset()
})

describe('the enterprise read', () => {
  it('reads every indicator page and each authority, passing CUIs as variables, never in the query', async () => {
    answer([page(TURSIB_INDICATORS.slice(0, 8), 'c1'), page(TURSIB_INDICATORS.slice(8), null)])
    const read = await fetchPublicEnterprise('789401')
    expect(read.partial).toBe(false)
    expect(read.indicators).toHaveLength(TURSIB_INDICATORS.length)
    expect(Object.keys(read.authorities!).sort()).toEqual(['4270740', '45699112'])
    expect(read.authorities!['4270740']!.peers.total).toBe(4)
    expect(graphqlQuery).toHaveBeenCalledWith(PUBLIC_ENTERPRISE_PROFILE_QUERY, { cui: '789401' }, expect.objectContaining({ auth: 'none' }))
    expect(graphqlQuery).toHaveBeenCalledWith(PUBLIC_ENTERPRISE_INDICATORS_QUERY, { cui: '789401', after: 'c1' }, expect.anything())
    expect(graphqlQuery).toHaveBeenCalledWith(publicEnterpriseAuthoritiesQuery(2), { a0: '45699112', p0: ['45699112'], a1: '4270740', p1: ['4270740'] }, expect.anything())
    expect(publicEnterpriseAuthoritiesQuery(2)).not.toMatch(/\d{4,}/u)
  })

  it('answers a CUI the API refuses as malformed as no anchor, the page’s 404', async () => {
    graphqlQuery.mockRejectedValueOnce(new Error('INVALID_INPUT'))
    expect(await fetchPublicEnterprise('10')).toMatchObject({ profile: null, partial: false })
    graphqlQuery.mockRejectedValueOnce(new Error('down'))
    await expect(fetchPublicEnterprise('10')).rejects.toThrow('down')
  })

  it('answers a CUI no list holds with no profile', async () => {
    graphqlQuery.mockResolvedValueOnce({ publicEnterprise: null })
    expect(await fetchPublicEnterprise('1')).toEqual({ cui: '1', profile: null, indicators: null, authorities: null, partial: false })
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
  })

  it('leaves the indicators unknown when a page fails or the snapshot changes under the cursor', async () => {
    answer([page(TURSIB_INDICATORS.slice(0, 8), 'c1')])
    expect(await fetchPublicEnterprise('789401')).toMatchObject({ indicators: null, partial: true })
    answer([page(TURSIB_INDICATORS.slice(0, 8), 'c1'), page(TURSIB_INDICATORS.slice(8), null, 'amepip-core-2')])
    expect(await fetchPublicEnterprise('789401')).toMatchObject({ indicators: null, partial: true })
  })

  it('leaves the authorities unknown when their read fails, the rest standing', async () => {
    answer([page(TURSIB_INDICATORS, null)], new Error('down'))
    const read = await fetchPublicEnterprise('789401')
    expect(read).toMatchObject({ authorities: null, partial: true })
    expect(read.indicators).toHaveLength(TURSIB_INDICATORS.length)
  })

  it('keeps the profile when a deadline cuts a later page, the part unknown', async () => {
    const controller = new AbortController()
    graphqlQuery.mockImplementation(async (_query: string, _variables: unknown, options: { operationName: string }) => {
      if (options.operationName === 'PublicEnterpriseProfile') return { publicEnterprise: { ...TURSIB_PROFILE, indicators: page(TURSIB_INDICATORS.slice(0, 8), 'c1') } }
      // The transport wraps a deadline in its own error; the signal's reason says it was the deadline.
      controller.abort(new DOMException('Deadline of 6000 ms passed', 'TimeoutError'))
      throw new Error('GraphQL request timed out: Deadline of 6000 ms passed')
    })
    const read = await fetchPublicEnterprise('789401', { signal: controller.signal })
    expect(read.profile?.cui).toBe('789401')
    expect(read).toMatchObject({ indicators: null, authorities: null, partial: true })
  })

  it('reads a lane the API reports unavailable as partial, so the render is not cached', async () => {
    graphqlQuery.mockImplementation(async (_query: string, _variables: unknown, options: { operationName: string }) => {
      if (options.operationName === 'PublicEnterpriseProfile') {
        const sources = TURSIB_PROFILE.sources.map((source) => (source.family === 'amepip' ? { ...source, laneStatus: 'unavailable' } : source))
        return { publicEnterprise: { ...TURSIB_PROFILE, sources, indicators: page([], null, null as never) } }
      }
      return authoritiesAnswer
    })
    expect(await fetchPublicEnterprise('789401')).toMatchObject({ indicators: [], partial: true })
  })

  it('lets the caller’s abort through rather than calling the part unknown', async () => {
    const controller = new AbortController()
    graphqlQuery.mockImplementation(async (_query: string, _variables: unknown, options: { operationName: string }) => {
      if (options.operationName === 'PublicEnterpriseProfile') return { publicEnterprise: { ...TURSIB_PROFILE, indicators: page(TURSIB_INDICATORS, null) } }
      controller.abort()
      throw new DOMException('aborted', 'AbortError')
    })
    await expect(fetchPublicEnterprise('789401', { signal: controller.signal })).rejects.toThrow('aborted')
  })

  it('rejects a profile the API did not shape as promised', async () => {
    graphqlQuery.mockResolvedValueOnce({ publicEnterprise: { cui: '789401' } })
    await expect(fetchPublicEnterprise('789401')).rejects.toThrow()
  })
})
