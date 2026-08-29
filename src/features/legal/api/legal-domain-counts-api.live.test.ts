import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { legislationDomainCountsFixture } from '../mocks/fixtures/legislation-domain-counts'
import { fetchDomainActCountsLive } from './legal-domain-counts-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/**
 * These tests pin the contract that keeps a cell's number honest: the
 * aggregate is asked UNFILTERED and without topN, so each bucket equals the
 * `legalActs(filter: { domain })` totalCount behind the cell's click
 * (verified live 2026-08-26) — and the 0-vs-unknown split: a COMPLETE
 * response proves an absent slug is a true zero, a truncated one proves
 * nothing, and the grid renders nothing for "unknown".
 */
const response = (
  buckets: unknown[],
  flags: Record<string, unknown> = { bucketsTruncated: false, otherCount: 0 },
) => ({ legalActCounts: { ...flags, buckets } })

const fullBuckets = Object.entries(legislationDomainCountsFixture).map(
  ([key, count]) => ({ key, count }),
)

describe('fetchDomainActCountsLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('asks the one unfiltered aggregate — groupBy DOMAIN, no filter, no topN, no label', async () => {
    graphqlQueryMock.mockResolvedValue(response(fullBuckets) as never)

    await fetchDomainActCountsLive()

    const [query, variables, options] = graphqlQueryMock.mock.calls[0]
    expect(query).toMatch(/legalActCounts\(groupBy: DOMAIN\)/)
    // No filter and no topN: the unfiltered bucket is what equals the acts
    // list a cell opens, and the default topN already covers all 16 values.
    expect(query).not.toMatch(/filter/)
    expect(query).not.toMatch(/topN/)
    // label is null for DOMAIN — display labels are the client's.
    expect(query).not.toMatch(/label/)
    expect(variables).toBeUndefined()
    expect(options).toMatchObject({
      operationName: 'legislationDomainCounts',
      auth: 'none',
    })
  })

  it('maps served buckets to a slug → count record', async () => {
    graphqlQueryMock.mockResolvedValue(
      response(
        [
          { key: 'mediu', count: 18126 },
          { key: 'energie', count: 13532 },
        ],
        { bucketsTruncated: true, otherCount: 0 },
      ) as never,
    )

    await expect(fetchDomainActCountsLive()).resolves.toEqual({
      mediu: 18126,
      energie: 13532,
    })
  })

  it('serves the full measured shape untouched — 16 slugs, no invention', async () => {
    graphqlQueryMock.mockResolvedValue(response(fullBuckets) as never)

    await expect(fetchDomainActCountsLive()).resolves.toEqual(
      legislationDomainCountsFixture,
    )
  })

  it('fills a true zero for a slug a COMPLETE response omits', async () => {
    const withoutMediu = fullBuckets.filter((bucket) => bucket.key !== 'mediu')
    graphqlQueryMock.mockResolvedValue(response(withoutMediu) as never)

    const counts = await fetchDomainActCountsLive()

    // GROUP BY with nothing truncated and nothing folded into "other": an
    // absent slug provably has zero acts.
    expect(counts.mediu).toBe(0)
    expect(counts.administratie).toBe(109969)
  })

  it('leaves an omitted slug UNKNOWN when buckets were truncated — 0 and unknown are different claims', async () => {
    const withoutMediu = fullBuckets.filter((bucket) => bucket.key !== 'mediu')
    graphqlQueryMock.mockResolvedValue(
      response(withoutMediu, { bucketsTruncated: true, otherCount: 0 }) as never,
    )

    const counts = await fetchDomainActCountsLive()

    expect(counts.mediu).toBeUndefined()
    expect(Object.values(counts)).not.toContain(0)
  })

  it('leaves an omitted slug UNKNOWN when otherCount folded rows away', async () => {
    const withoutMediu = fullBuckets.filter((bucket) => bucket.key !== 'mediu')
    graphqlQueryMock.mockResolvedValue(
      response(withoutMediu, { bucketsTruncated: false, otherCount: 7 }) as never,
    )

    const counts = await fetchDomainActCountsLive()

    expect(counts.mediu).toBeUndefined()
  })

  it('ignores an unknown slug instead of failing the grid', async () => {
    graphqlQueryMock.mockResolvedValue(
      response([...fullBuckets, { key: 'spatiu-cosmic', count: 12 }]) as never,
    )

    await expect(fetchDomainActCountsLive()).resolves.toEqual(
      legislationDomainCountsFixture,
    )
  })

  it('drops a malformed count without zero-filling it — the slug WAS served', async () => {
    const malformed = fullBuckets.map((bucket) =>
      bucket.key === 'mediu' ? { key: 'mediu', count: 'many' } : bucket,
    )
    graphqlQueryMock.mockResolvedValue(response(malformed) as never)

    const counts = await fetchDomainActCountsLive()

    expect(counts.mediu).toBeUndefined()
  })

  it('propagates a transport failure — React Query owns retries, and a swallowed error would cache as "no counts"', async () => {
    graphqlQueryMock.mockRejectedValue(new Error('aggregate timed out'))

    await expect(fetchDomainActCountsLive()).rejects.toThrow(
      /aggregate timed out/,
    )
  })
})
