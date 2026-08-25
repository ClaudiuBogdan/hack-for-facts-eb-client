import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  fetchRecentChangesCountLive,
  fetchRecentChangesPageLive,
} from './legal-changes-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/**
 * These tests pin the two server rules a UI edit is likeliest to break:
 * `kinds: []` (and blank-only lists) are REJECTED as invalid input — "no kind
 * chosen" must mean the key is ABSENT, never an empty array — and
 * `undatedOnly` cannot travel with `since`/`until` (the intersection is empty
 * by construction; the server refuses it). They also pin the two-query split:
 * the feed query must never select `totalCount`, because the server resolves
 * it lazily and a count failure arrives as a field-level `errors[]` entry that
 * the shared transport treats as a failed request — one slow count would take
 * the whole feed down.
 */
const changeNode = (overrides: Record<string, unknown> = {}) => ({
  eventId: '38613',
  eventKind: 'completare',
  effectiveDate: '2027-01-05',
  eventSource: 'portal',
  sourceAct: { actId: '167442', displayCitation: 'Legea nr. 2/2026' },
  actId: '208259',
  displayCitation: 'Legea nr. 204/2006',
  status: 'MODIFICAT',
  ...overrides,
})

const connection = (
  edges: unknown[],
  pageInfo: Record<string, unknown> = { hasNextPage: false, endCursor: null },
) => ({ legalRecentChanges: { pageInfo, edges } })

describe('fetchRecentChangesPageLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('sends the full filter, with the single kind as a one-entry kinds array', async () => {
    graphqlQueryMock.mockResolvedValue(connection([]) as never)

    await fetchRecentChangesPageLive(
      {
        since: '2026-01-01',
        until: '2026-08-26',
        kind: 'modificare',
        source: 'portal',
      },
      { first: 20 },
    )

    const [, variables] = graphqlQueryMock.mock.calls[0]
    expect(variables).toEqual({
      since: '2026-01-01',
      until: '2026-08-26',
      kinds: ['modificare'],
      eventSource: 'portal',
      first: 20,
    })
  })

  it('omits every unset filter key — kinds is NEVER present as []', async () => {
    graphqlQueryMock.mockResolvedValue(connection([]) as never)

    await fetchRecentChangesPageLive({})

    const [, variables] = graphqlQueryMock.mock.calls[0]
    // `toEqual` pins the ABSENCE of kinds/since/until/eventSource/undatedOnly:
    // the server rejects `kinds: []` outright rather than reading it as "all".
    expect(variables).toEqual({ first: 20 })
    expect(Object.keys(variables as Record<string, unknown>)).not.toContain(
      'kinds',
    )
  })

  it('strips since/until whenever undated is set — the server refuses the combination', async () => {
    graphqlQueryMock.mockResolvedValue(connection([]) as never)

    await fetchRecentChangesPageLive({
      undated: true,
      since: '2026-01-01',
      until: '2026-08-26',
      source: 'monitorul-oficial',
    })

    const [, variables] = graphqlQueryMock.mock.calls[0]
    expect(variables).toEqual({
      undatedOnly: true,
      eventSource: 'monitorul-oficial',
      first: 20,
    })
  })

  it('passes the cursor through as after', async () => {
    graphqlQueryMock.mockResolvedValue(connection([]) as never)

    await fetchRecentChangesPageLive({}, { first: 20, after: 'cursor-1' })

    const [, variables] = graphqlQueryMock.mock.calls[0]
    expect(variables).toEqual({ first: 20, after: 'cursor-1' })
  })

  it('never selects totalCount in the feed query (a failed count would kill the feed)', async () => {
    graphqlQueryMock.mockResolvedValue(connection([]) as never)

    await fetchRecentChangesPageLive({})

    const [query] = graphqlQueryMock.mock.calls[0]
    expect(query).not.toMatch(/totalCount/)
  })

  it('maps the connection shape: BigInt ids as strings, status folded to kebab', async () => {
    graphqlQueryMock.mockResolvedValue(
      connection(
        [
          { node: changeNode() },
          {
            node: changeNode({
              eventId: '96433',
              eventKind: 'abrogare-totala',
              effectiveDate: null,
              sourceAct: null,
              actId: '867327',
              displayCitation: 'PROCEDURA din 21 decembrie 2004',
              status: 'ABROGAT',
            }),
          },
        ],
        { hasNextPage: true, endCursor: 'cursor-2' },
      ) as never,
    )

    const page = await fetchRecentChangesPageLive({})

    expect(page.endCursor).toBe('cursor-2')
    expect(page.items).toEqual([
      {
        eventId: '38613',
        eventKind: 'completare',
        effectiveDate: '2027-01-05',
        eventSource: 'portal',
        sourceAct: { actId: '167442', displayCitation: 'Legea nr. 2/2026' },
        actId: '208259',
        displayCitation: 'Legea nr. 204/2006',
        status: 'modificat',
      },
      {
        eventId: '96433',
        eventKind: 'abrogare-totala',
        effectiveDate: null,
        eventSource: 'portal',
        sourceAct: null,
        actId: '867327',
        displayCitation: 'PROCEDURA din 21 decembrie 2004',
        status: 'abrogat',
      },
    ])
  })

  it('reports an exhausted cursor as null even when the server minted one', async () => {
    graphqlQueryMock.mockResolvedValue(
      connection([{ node: changeNode() }], {
        hasNextPage: false,
        endCursor: 'stale-cursor',
      }) as never,
    )

    const page = await fetchRecentChangesPageLive({})

    expect(page.endCursor).toBeNull()
  })
})

describe('fetchRecentChangesCountLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('asks ONLY the count query for totalCount, under the same filter rules', async () => {
    graphqlQueryMock.mockResolvedValue({
      legalRecentChanges: { totalCount: 84484 },
    } as never)

    const count = await fetchRecentChangesCountLive({
      undated: true,
      since: '2026-01-01',
      kind: 'promulgare',
    })

    expect(count).toBe(84484)
    const [query, variables] = graphqlQueryMock.mock.calls[0]
    expect(query).toMatch(/totalCount/)
    // The strip-and-never-[] rules hold on the count lane too.
    expect(variables).toEqual({ undatedOnly: true, kinds: ['promulgare'] })
  })

  it('returns a real zero as 0, never null — 0 and "unknown" are different claims', async () => {
    graphqlQueryMock.mockResolvedValue({
      legalRecentChanges: { totalCount: 0 },
    } as never)

    await expect(fetchRecentChangesCountLive({})).resolves.toBe(0)
  })

  it('maps a null totalCount to null (the server could not assert a count)', async () => {
    graphqlQueryMock.mockResolvedValue({
      legalRecentChanges: { totalCount: null },
    } as never)

    await expect(fetchRecentChangesCountLive({})).resolves.toBeNull()
  })

  it('propagates a transport failure instead of caching it as "unknown"', async () => {
    // React Query owns retries/aborts; swallowing the rejection here would
    // cache an aborted request as a successful "unknown" count.
    graphqlQueryMock.mockRejectedValue(new Error('count timed out'))

    await expect(fetchRecentChangesCountLive({})).rejects.toThrow(
      /count timed out/,
    )
  })
})
