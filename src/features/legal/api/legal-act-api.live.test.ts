import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
  GraphQLRequestError: class GraphQLRequestError extends Error {},
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchLegalActDetailLive } from './legal-act-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/**
 * These tests exist because `LegalReferenceConnection.totalCount` is the page
 * size, not a total (`docs/design/legal/act-detail.md` §9.1). Every case below
 * is a way the page could print a number it cannot support.
 */
const edge = (actId: string) => ({
  relation: 'MODIFICA',
  resolution: 'unique',
  confidence: 1,
  targetRaw: `Legea ${actId}`,
  targetAct: {
    actId,
    displayCitation: `Legea nr. ${actId}/2020`,
    actType: 'lege',
    actNumber: actId,
    actYear: 2020,
    issuerSlug: 'parlamentul',
    status: 'IN_VIGOARE',
    inDegree: 0,
  },
  sourceAct: {
    actId,
    displayCitation: `Legea nr. ${actId}/2020`,
    actType: 'lege',
    actNumber: actId,
    actYear: 2020,
    issuerSlug: 'parlamentul',
    status: 'IN_VIGOARE',
    inDegree: 0,
  },
})

function respond(overrides: Record<string, unknown> = {}) {
  graphqlQueryMock.mockResolvedValue({
    legalAct: {
      actId: '1',
      displayCitation: 'Legea nr. 1/2020',
      actType: 'lege',
      actNumber: '1',
      actYear: 2020,
      issuerSlug: 'parlamentul',
      status: 'IN_VIGOARE',
      statusEvidence: {},
      entryIntoForce: '2020-01-01',
      inDegree: 0,
      aliases: [],
      amendedAfterPublication: 0,
      canonicalDocumentId: '999',
      canonical: null,
      summary: null,
      timeline: [],
      gazettePublications: [],
      outLinks: { totalCount: 0, edges: [] },
      inLinks: { totalCount: 0, edges: [] },
      incomingAnchors: { totalCount: 0, edges: [] },
      documents: [],
      ...overrides,
    },
  } as never)
}

describe('fetchLegalActDetailLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('keeps a totalCount that came back below the page size', async () => {
    respond({ outLinks: { totalCount: 3, edges: [edge('2'), edge('3')] } })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.outLinks.totalCount).toBe(3)
    expect(act?.outLinks.hasMore).toBe(false)
  })

  it('treats a saturated totalCount as unknown rather than exact', async () => {
    // 60 back on a `first: 60` request tells us nothing about the real total.
    respond({
      outLinks: {
        totalCount: 60,
        edges: Array.from({ length: 60 }, (_, i) => edge(String(i))),
      },
    })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.outLinks.totalCount).toBeNull()
    expect(act?.outLinks.hasMore).toBe(true)
  })

  it('does not turn an absent totalCount into a confident zero', async () => {
    respond({ outLinks: { edges: [edge('2')] } })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.outLinks.totalCount).toBeNull()
    expect(act?.outLinks.hasMore).toBe(true)
  })

  it('prefers inDegree over the saturating incoming count', async () => {
    respond({
      inDegree: 2621,
      inLinks: {
        totalCount: 12,
        edges: Array.from({ length: 12 }, (_, i) => edge(String(i))),
      },
    })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.inLinks.totalCount).toBe(2621)
    expect(act?.inLinks.hasMore).toBe(true)
  })

  it('distrusts an inDegree that is smaller than the rows it returned', async () => {
    // The stored column can lag the edge table. Believing it here would print
    // "1 trimitere" above three of them.
    respond({
      inDegree: 1,
      inLinks: { totalCount: 3, edges: [edge('2'), edge('3'), edge('4')] },
    })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.inLinks.totalCount).toBeNull()
    expect(act?.inLinks.hasMore).toBe(true)
  })

  it('reports an exact incoming total when inDegree matches the rows', async () => {
    respond({
      inDegree: 2,
      inLinks: { totalCount: 2, edges: [edge('2'), edge('3')] },
    })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.inLinks.totalCount).toBe(2)
    expect(act?.inLinks.hasMore).toBe(false)
  })

  it('drops a confidence that is not on the 0–1 scale', async () => {
    // `formatLegalPercent` multiplies by 100, so 95 would render "9.500%".
    respond({ summary: { plainLanguageSummary: 'Rezumat.', confidence: 95 } })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.summary?.confidence).toBeNull()
  })

  it('keeps a null gazette issue id instead of fabricating one', async () => {
    respond({
      gazettePublications: [
        { moIssueId: null, resolution: 'cluster', sourcePdfUrl: null, issue: null },
      ],
    })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.gazettePublications[0]?.moIssueId).toBeNull()
  })

  it('derives the official text link from the canonical document id', async () => {
    respond({ canonicalDocumentId: '171282' })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.officialTextUrl).toBe(
      'https://legislatie.just.ro/Public/DetaliiDocument/171282',
    )
  })

  it('no longer requests the tree field the server SDL never shipped', async () => {
    respond()

    await fetchLegalActDetailLive('1')

    const [query] = graphqlQueryMock.mock.calls[0] as unknown as [string]
    expect(query).not.toContain('tree(')
    expect(query).toContain('incomingAnchors')
    expect(query).toContain('documents')
    // The live lane serves no structure labels until the outline transport lands.
    expect(graphqlQueryMock.mock.calls).toHaveLength(1)
  })

  it('maps document versions with their render availability', async () => {
    respond({
      documents: [
        {
          documentId: '171282',
          versionKind: 'corp',
          versionDate: '2015-09-10',
          isCanonical: true,
          title: 'COD FISCAL',
          firstPublicationDate: '2015-09-10',
          render: { renderStatus: 'served', chunkCount: 4 },
        },
        {
          documentId: 'c-1',
          versionKind: 'consolidare',
          versionDate: '2026-07-01',
          isCanonical: false,
          title: null,
          firstPublicationDate: null,
          render: null,
        },
      ],
    })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.documents).toHaveLength(2)
    expect(act?.documents[0]?.render?.chunkCount).toBe(4)
    // A never-compiled expression keeps render null — "text indisponibil încă".
    expect(act?.documents[1]?.render).toBeNull()
  })

  it('trusts the anchors totalCount only when it covers the returned rows', async () => {
    respond({
      incomingAnchors: {
        totalCount: 395,
        edges: [
          {
            node: {
              sourceDocumentId: '279811',
              linkText: 'art. 291 din Codul fiscal',
              targetFragment: 'art. 291',
              targetResolution: 'held_fragment_resolved',
              sourceAct: edge('7').sourceAct,
            },
          },
        ],
      },
    })

    const act = await fetchLegalActDetailLive('1')

    expect(act?.incomingAnchors.totalCount).toBe(395)
    expect(act?.incomingAnchors.items[0]?.targetFragment).toBe('art. 291')

    respond({
      incomingAnchors: {
        totalCount: 0,
        edges: [{ node: { sourceDocumentId: 'x', sourceAct: null } }],
      },
    })
    const inconsistent = await fetchLegalActDetailLive('1')
    // A count below the rows it came with is not a count.
    expect(inconsistent?.incomingAnchors.totalCount).toBe(1)
  })

  it('returns null for an act the server does not have', async () => {
    graphqlQueryMock.mockResolvedValue({ legalAct: null } as never)

    expect(await fetchLegalActDetailLive('999999999')).toBeNull()
  })
})
