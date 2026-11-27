import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchLegalActsPageLive } from './legal-acts-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

describe('fetchLegalActsPageLive: the act list behind the search with no term', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
    graphqlQueryMock.mockResolvedValue({ legalActs: { totalCount: 0, pageInfo: { endCursor: null, hasNextPage: false }, edges: [] } })
  })

  it('sends the search filter in LegalActsFilter form, with the cursor', async () => {
    await fetchLegalActsPageLive({ actType: ['lege', 'oug'], yearFrom: 2020, yearTo: 2024 }, { after: 'c1' })
    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
    const variables = graphqlQueryMock.mock.calls[0]?.[1]
    expect(variables).toEqual({ filter: { actType: { in: ['lege', 'oug'] }, yearFrom: { gte: 2020 }, yearTo: { lte: 2024 } }, first: 20, after: 'c1' })
  })

  it('reads the Portal name of an act, its den else its title, for a citation that names nothing (Codex review, round 2)', async () => {
    const node = (actId: string, canonical: unknown) => ({ node: { actId, displayCitation: `Doc nr. ${actId}`, actType: 'doc', canonical } })
    graphqlQueryMock.mockResolvedValue({
      legalActs: { totalCount: 3, pageInfo: { endCursor: null }, edges: [node('1', { den: 'CONSTITUȚIA ROMÂNIEI', title: 'CONSTITUTIE' }), node('2', { den: '  ', title: 'ORDIN 5' }), node('3', null)] },
    })
    const result = await fetchLegalActsPageLive({})
    expect(result.items.map((item) => item.name)).toEqual(['CONSTITUȚIA ROMÂNIEI', 'ORDIN 5', null])
    expect(String(graphqlQueryMock.mock.calls[0]?.[0])).toMatch(/canonical\s*\{\s*den\s+title\s*\}/)
  })

  it('sends several statuses and the summary filters as the search does', async () => {
    await fetchLegalActsPageLive({ status: ['in-vigoare', 'modificat'], domain: ['sanatate'], category: ['tratat'], penaltiesMentioned: true })
    const variables = graphqlQueryMock.mock.calls[0]?.[1] as { readonly filter: unknown }
    expect(variables.filter).toEqual({
      status: { in: ['in-vigoare', 'modificat'] },
      domain: { in: ['sanatate'] },
      category: { in: ['tratat'] },
      penaltiesMentioned: { eq: true },
    })
  })
})
