import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { legislationStatusCountsFixture } from '../mocks/fixtures/legislation-status-counts'
import { fetchStatusActCountsLive } from './legal-status-counts-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/**
 * These tests pin the contract that keeps the strip's numbers honest: STATUS
 * partitions the corpus exactly (verified live 2026-08-26 — 7 buckets
 * summing to 224 539 = `legalActs.totalCount`), so each derived number
 * equals the aliased `totalCount` filter it retired — and the 0-vs-unknown
 * split: a COMPLETE response proves an absent status is a true zero, a
 * truncated one proves nothing, and the strip renders nothing for "unknown".
 */
const response = (
  buckets: unknown[],
  flags: Record<string, unknown> = { bucketsTruncated: false, otherCount: 0 },
) => ({ legalActCounts: { ...flags, buckets } })

/** The 7 buckets exactly as the live API served them on 2026-08-26. */
const measuredBuckets = [
  { key: 'in-vigoare', count: 194_924 },
  { key: 'abrogat', count: 22_125 },
  { key: 'modificat', count: 6_542 },
  { key: 'abrogat-partial', count: 762 },
  { key: 'iesit-din-vigoare', count: 124 },
  { key: 'suspendat', count: 55 },
  { key: 'necunoscut', count: 7 },
]

describe('fetchStatusActCountsLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('asks the one unfiltered aggregate — groupBy STATUS, no filter, no topN, no label', async () => {
    graphqlQueryMock.mockResolvedValue(response(measuredBuckets) as never)

    await fetchStatusActCountsLive()

    const [query, variables, options] = graphqlQueryMock.mock.calls[0]
    expect(query).toMatch(/legalActCounts\(groupBy: STATUS\)/)
    // No filter and no topN: the unfiltered buckets are what equal the four
    // retired per-status totalCounts, and the default topN already covers
    // the whole 7-value vocabulary.
    expect(query).not.toMatch(/filter/)
    expect(query).not.toMatch(/topN/)
    expect(query).not.toMatch(/label/)
    expect(variables).toBeUndefined()
    expect(options).toMatchObject({
      operationName: 'legislationStatusCounts',
      auth: 'none',
    })
  })

  it('derives the exact numbers the four retired filters returned — abrogat folds abrogat-partial, total sums the partition', async () => {
    graphqlQueryMock.mockResolvedValue(response(measuredBuckets) as never)

    // 224 539 / 194 924 / 6 542 / 22 887 (= 22 125 + 762) — the BEFORE
    // numbers of the four aliased totalCount queries, verified live.
    await expect(fetchStatusActCountsLive()).resolves.toEqual(
      legislationStatusCountsFixture,
    )
  })

  it('counts an unrecognized status into total but into no named number', async () => {
    graphqlQueryMock.mockResolvedValue(
      response([...measuredBuckets, { key: 'in-limbo', count: 11 }]) as never,
    )

    const counts = await fetchStatusActCountsLive()

    // The partition is over the WHOLE corpus: an 8th status still counts
    // acts, so total grows while the four named numbers stand.
    expect(counts.total).toBe(legislationStatusCountsFixture.total + 11)
    expect(counts.inVigoare).toBe(legislationStatusCountsFixture.inVigoare)
    expect(counts.abrogat).toBe(legislationStatusCountsFixture.abrogat)
  })

  it('serves a true zero for a status a COMPLETE response omits', async () => {
    const withoutModificat = measuredBuckets.filter(
      (bucket) => bucket.key !== 'modificat',
    )
    graphqlQueryMock.mockResolvedValue(response(withoutModificat) as never)

    const counts = await fetchStatusActCountsLive()

    // GROUP BY with nothing truncated and nothing folded into "other": an
    // absent status provably has zero acts — and total shrinks with it.
    expect(counts.modificat).toBe(0)
    expect(counts.total).toBe(legislationStatusCountsFixture.total - 6_542)
  })

  it('leaves an omitted status AND total unknown when buckets were truncated — 0 and unknown are different claims', async () => {
    const withoutModificat = measuredBuckets.filter(
      (bucket) => bucket.key !== 'modificat',
    )
    graphqlQueryMock.mockResolvedValue(
      response(withoutModificat, {
        bucketsTruncated: true,
        otherCount: 0,
      }) as never,
    )

    const counts = await fetchStatusActCountsLive()

    expect(counts.modificat).toBeUndefined()
    // A truncated bucket list cannot sum to the corpus.
    expect(counts.total).toBeUndefined()
    // Present buckets stay exact under truncation.
    expect(counts.inVigoare).toBe(194_924)
    expect(counts.abrogat).toBe(22_887)
  })

  it('leaves total unknown when otherCount folded rows away', async () => {
    graphqlQueryMock.mockResolvedValue(
      response(measuredBuckets, {
        bucketsTruncated: false,
        otherCount: 9,
      }) as never,
    )

    const counts = await fetchStatusActCountsLive()

    expect(counts.total).toBeUndefined()
    expect(counts.inVigoare).toBe(194_924)
  })

  it('leaves abrogat unknown when a constituent bucket is missing under truncation', async () => {
    const withoutPartial = measuredBuckets.filter(
      (bucket) => bucket.key !== 'abrogat-partial',
    )
    graphqlQueryMock.mockResolvedValue(
      response(withoutPartial, {
        bucketsTruncated: true,
        otherCount: 0,
      }) as never,
    )

    const counts = await fetchStatusActCountsLive()

    // 22 125 alone would be a DIFFERENT number than the retired
    // `in: ["abrogat", "abrogat-partial"]` filter — absent beats wrong.
    expect(counts.abrogat).toBeUndefined()
  })

  it('drops a malformed bucket without zero-filling it, and voids every sum over it', async () => {
    const malformed = measuredBuckets.map((bucket) =>
      bucket.key === 'abrogat-partial'
        ? { key: 'abrogat-partial', count: 'many' }
        : bucket,
    )
    graphqlQueryMock.mockResolvedValue(response(malformed) as never)

    const counts = await fetchStatusActCountsLive()

    // The status WAS served, so it is not a provable zero — and both numbers
    // that sum over it (abrogat, total) are unknowable with it.
    expect(counts.abrogat).toBeUndefined()
    expect(counts.total).toBeUndefined()
    // Untouched buckets keep their exact values.
    expect(counts.inVigoare).toBe(194_924)
    expect(counts.modificat).toBe(6_542)
  })

  it('propagates a transport failure — React Query owns retries, and a swallowed error would cache as "no counts"', async () => {
    graphqlQueryMock.mockRejectedValue(new Error('aggregate timed out'))

    await expect(fetchStatusActCountsLive()).rejects.toThrow(
      /aggregate timed out/,
    )
  })
})
