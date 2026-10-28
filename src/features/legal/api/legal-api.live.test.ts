import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchLegislationFrontDoorLive, fetchLegislationOverviewLive } from './legal-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

const issue = (moIssueId: string, issueYear: number) => ({
  moIssueId,
  partCode: 'I',
  issueLabel: `MO ${moIssueId}`,
  issueNumber: 1,
  issueYear,
  issueDate: `${issueYear}-07-09`,
  pdfUrl: null,
  hasEmonitorLink: false,
})

const issues = (...nodes: ReturnType<typeof issue>[]) => ({ edges: nodes.map((node) => ({ node })) })

describe('fetchLegislationFrontDoorLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('asks for the latest gazette issues alone, not the citation ranking', async () => {
    const year = new Date().getFullYear()
    graphqlQueryMock.mockResolvedValueOnce({ moIssues: issues(issue('a', year)) })

    const frontDoor = await fetchLegislationFrontDoorLive()

    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
    const [query, variables, options] = graphqlQueryMock.mock.calls[0]!
    expect(query).toContain('moIssues(')
    expect(query).not.toContain('legalActs')
    expect(query).not.toContain('IN_DEGREE')
    expect(variables).toEqual({ moYear: year })
    expect(options).toMatchObject({ auth: 'none' })
    expect(frontDoor.latestGazetteIssues.map((row) => row.moIssueId)).toEqual(['a'])
    expect(frontDoor).not.toHaveProperty('mostCitedActs')
    expect(frontDoor.coverage.dataStatus).toBe('live')
  })

  it('reads the previous year’s issues when this year has none yet', async () => {
    const year = new Date().getFullYear()
    graphqlQueryMock.mockResolvedValueOnce({ moIssues: issues() }).mockResolvedValueOnce({ moIssues: issues(issue('b', year - 1)) })

    const frontDoor = await fetchLegislationFrontDoorLive()

    expect(graphqlQueryMock.mock.calls.map((call) => call[1])).toEqual([{ moYear: year }, { moYear: year - 1 }])
    expect(frontDoor.latestGazetteIssues.map((row) => row.moIssueId)).toEqual(['b'])
  })

  it('passes the caller’s signal on', async () => {
    const year = new Date().getFullYear()
    graphqlQueryMock.mockResolvedValueOnce({ moIssues: issues(issue('a', year)) })
    const signal = new AbortController().signal

    await fetchLegislationFrontDoorLive(signal)

    expect(graphqlQueryMock.mock.calls[0]![2]).toMatchObject({ signal })
  })
})

describe('fetchLegislationOverviewLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('still asks for the ranking and the issues in one request, for the analytics tab', async () => {
    const year = new Date().getFullYear()
    graphqlQueryMock.mockResolvedValueOnce({
      mostCited: { edges: [{ node: { actId: 'lege-1', displayCitation: 'Legea 1', actType: 'LEGE', actNumber: '1', actYear: 2000, issuerSlug: null, status: 'IN_VIGOARE', inDegree: 9 } }] },
      moIssues: issues(issue('a', year)),
    })

    const overview = await fetchLegislationOverviewLive()

    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
    const [query] = graphqlQueryMock.mock.calls[0]!
    expect(query).toContain('legalActs(sort: IN_DEGREE')
    expect(query).toContain('moIssues(')
    expect(overview.mostCitedActs.map((act) => act.actId)).toEqual(['lege-1'])
    expect(overview.latestGazetteIssues.map((row) => row.moIssueId)).toEqual(['a'])
  })
})
