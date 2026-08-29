import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  fetchGazetteIssueContentsLive,
  fetchGazetteIssuesPageLive,
} from './legal-gazette-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/**
 * These tests exist because the Mo* connections do not speak the acts
 * dialect: `MoIssueConnection` is `total` + `edges`, while `legalActs` is
 * `totalCount` + `edges` — the module is genuinely inconsistent, so a future
 * edit porting the acts mapping here would silently read nothing. And the
 * year filter is mandatory server-side ("mo issue browse requires a year
 * filter"): a request without one is the likeliest way to break this page.
 */
const issueNode = (overrides: Record<string, unknown> = {}) => ({
  moIssueId: '621458',
  partCode: 'PI',
  issueLabel: '566',
  issueNumber: 566,
  issueYear: 2026,
  issueDate: '2026-07-09',
  pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PI--566--2026.html',
  hasArchiveIndex: true,
  hasEmonitorLink: false,
  ...overrides,
})

describe('fetchGazetteIssuesPageLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('always sends a year bound, plus the part as a partCode `in` filter', async () => {
    graphqlQueryMock.mockResolvedValue({
      moIssues: { total: 113, pageInfo: { hasNextPage: true }, edges: [] },
    } as never)

    await fetchGazetteIssuesPageLive(
      { year: 2010, part: 'PIM' },
      { page: 2, pageSize: 20 },
    )

    const [, variables] = graphqlQueryMock.mock.calls[0]
    expect(variables).toEqual({
      filter: { year: { eq: 2010 }, partCode: { in: ['PIM'] } },
      page: 2,
      pageSize: 20,
    })
  })

  it('omits the partCode filter entirely when no part is chosen', async () => {
    graphqlQueryMock.mockResolvedValue({
      moIssues: { total: 9, pageInfo: { hasNextPage: false }, edges: [] },
    } as never)

    await fetchGazetteIssuesPageLive({ year: 1989 })

    const [, variables] = graphqlQueryMock.mock.calls[0]
    // `toEqual` pins the ABSENCE of a partCode key, and that the year bound
    // is present even with every option defaulted.
    expect(variables).toEqual({
      filter: { year: { eq: 1989 } },
      page: 1,
      pageSize: 20,
    })
  })

  it('asks the connection for `total`, never the acts-dialect `totalCount`', async () => {
    graphqlQueryMock.mockResolvedValue({
      moIssues: { total: 0, pageInfo: { hasNextPage: false }, edges: [] },
    } as never)

    await fetchGazetteIssuesPageLive({ year: 2026 })

    const [query] = graphqlQueryMock.mock.calls[0]
    expect(query).toMatch(/\btotal\b/)
    expect(query).not.toMatch(/totalCount/)
  })

  it('maps the real connection shape (total + edges of nodes)', async () => {
    graphqlQueryMock.mockResolvedValue({
      moIssues: {
        total: 1065,
        pageInfo: { hasNextPage: true },
        edges: [{ node: issueNode() }],
      },
    } as never)

    const page = await fetchGazetteIssuesPageLive({ year: 2026 })

    expect(page.total).toBe(1065)
    expect(page.hasNextPage).toBe(true)
    expect(page.items).toEqual([
      {
        moIssueId: '621458',
        partCode: 'PI',
        issueLabel: '566',
        issueNumber: 566,
        issueYear: 2026,
        issueDate: '2026-07-09',
        pdfUrl:
          'https://monitoruloficial.ro/Monitorul-Oficial--PI--566--2026.html',
        hasArchiveIndex: true,
        hasEmonitorLink: false,
      },
    ])
  })

  it('reads nothing from an acts-shaped response instead of inventing rows', async () => {
    // A future edit could port `totalCount` + `items` from the acts adapter;
    // the honest failure is an unknown total and zero rows, never a crash or
    // a fabricated count.
    graphqlQueryMock.mockResolvedValue({
      moIssues: { totalCount: 7, items: [issueNode()] },
    } as never)

    const page = await fetchGazetteIssuesPageLive({ year: 2026 })

    expect(page.total).toBeNull()
    expect(page.items).toEqual([])
    expect(page.hasNextPage).toBe(false)
  })

  it('passes a past-the-end page through as empty with total 0', async () => {
    // Verified live 2026-08-26: page 55 of 54 answers `total: 0` with empty
    // edges rather than erroring — interpreting that is the component's job.
    graphqlQueryMock.mockResolvedValue({
      moIssues: { total: 0, pageInfo: { hasNextPage: false }, edges: [] },
    } as never)

    const page = await fetchGazetteIssuesPageLive({ year: 2026 }, { page: 55 })

    expect(page).toEqual({ items: [], total: 0, hasNextPage: false })
  })
})

describe('fetchGazetteIssueContentsLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('maps publications and folds the act-status enum to the kebab vocabulary', async () => {
    graphqlQueryMock.mockResolvedValue({
      moIssue: {
        moIssueId: '5150',
        contents: {
          pageInfo: { hasNextPage: true },
          edges: [
            {
              node: {
                moActKey: 'k1',
                title: 'Lege privind ceva',
                actType: 'lege',
                actNumberNorm: '358',
                actYear: 2015,
                issuerSlug: 'parlamentul',
                actDate: '2015-12-31',
                resolution: 'unique',
                act: {
                  actId: '68686',
                  displayCitation: 'Legea nr. 358/2015',
                  status: 'ABROGAT_PARTIAL',
                },
              },
            },
            {
              node: {
                moActKey: 'k2',
                title: 'Ordin fără act',
                actType: 'ordin',
                actNumberNorm: null,
                actYear: null,
                issuerSlug: null,
                actDate: null,
                resolution: 'unmatched',
                act: null,
              },
            },
          ],
        },
      },
    } as never)

    const contents = await fetchGazetteIssueContentsLive('5150')

    expect(contents.hasMore).toBe(true)
    expect(contents.items).toHaveLength(2)
    expect(contents.items[0].act).toEqual({
      actId: '68686',
      displayCitation: 'Legea nr. 358/2015',
      status: 'abrogat-partial',
    })
    expect(contents.items[1].act).toBeNull()
    expect(contents.items[1].resolution).toBe('unmatched')
  })

  it('treats a vanished issue as an error, never as an empty contents list', async () => {
    graphqlQueryMock.mockResolvedValue({ moIssue: null } as never)

    await expect(fetchGazetteIssueContentsLive('999999')).rejects.toThrow(
      /not found/,
    )
  })

  it('sends the issue id as a string (BigInt scalar travels as text)', async () => {
    graphqlQueryMock.mockResolvedValue({
      moIssue: {
        moIssueId: '621458',
        contents: { pageInfo: { hasNextPage: false }, edges: [] },
      },
    } as never)

    await fetchGazetteIssueContentsLive('621458')

    const [, variables] = graphqlQueryMock.mock.calls[0]
    expect(variables).toEqual({ moIssueId: '621458', first: 50 })
  })
})
