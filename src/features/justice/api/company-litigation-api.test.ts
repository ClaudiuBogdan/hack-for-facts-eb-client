import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMPANY_LITIGATION_PAGE_SIZE,
  fetchCompanyLitigation,
  fetchCompanyLitigationCases,
  hasPublishedLitigation,
} from './company-litigation-api'

const graphql = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: graphql.query }))

const UNPUBLISHED = {
  cui: '1590082',
  companyName: null,
  caseCount: 0,
  courtLevels: [],
  years: [],
  coverage: 0,
  caveats: ['company-litigation links not yet published'],
}

describe('company litigation reads', () => {
  beforeEach(() => graphql.query.mockReset())

  it('reads the summary the API publishes and drops the company name it does not need', async () => {
    graphql.query.mockResolvedValue({ judicialCompanyLitigation: UNPUBLISHED })
    const litigation = await fetchCompanyLitigation('1590082')
    expect(litigation).toEqual({ cui: '1590082', caseCount: 0, courtLevels: [], years: [], coverage: 0, caveats: UNPUBLISHED.caveats })
    expect(graphql.query.mock.calls[0]?.[1]).toEqual({ cui: '1590082' })
  })

  it('reads a page of cases with its cursor', async () => {
    graphql.query.mockResolvedValue({
      judicialCompanyLitigationCases: {
        edges: [
          {
            node: { caseId: '193312', institutionCode: 'TribunalulBUCURESTI', caseNumber: '33517/3/2021/a85', category: 'Faliment', sourceOpenedAt: '2025-02-18' },
          },
        ],
        pageInfo: { hasNextPage: true, endCursor: 'abc' },
      },
    })
    const page = await fetchCompanyLitigationCases('123', null)
    expect(page.cases).toHaveLength(1)
    expect(page).toMatchObject({ endCursor: 'abc', hasNextPage: true })
    expect(graphql.query.mock.calls[0]?.[1]).toEqual({ cui: '123', first: COMPANY_LITIGATION_PAGE_SIZE, after: null })
  })

  it('never asks the API for a party name, a hearing solution or its summary', async () => {
    graphql.query.mockResolvedValueOnce({ judicialCompanyLitigation: UNPUBLISHED })
    graphql.query.mockResolvedValueOnce({ judicialCompanyLitigationCases: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } })
    await fetchCompanyLitigation('1')
    await fetchCompanyLitigationCases('1', null)
    for (const [query] of graphql.query.mock.calls as [string][]) {
      expect(query).not.toMatch(/\b(name|companyName|displayName|solution|solutionSummary|parties)\b/)
    }
  })
})

describe('hasPublishedLitigation', () => {
  it('shows nothing while no link is published: unknown is not „no cases"', () => {
    expect(hasPublishedLitigation(undefined)).toBe(false)
    expect(hasPublishedLitigation({ ...UNPUBLISHED })).toBe(false)
  })

  it('shows nothing when published links count no case', () => {
    expect(hasPublishedLitigation({ ...UNPUBLISHED, coverage: 0.4 })).toBe(false)
  })

  it('shows the published cases once links count one', () => {
    expect(hasPublishedLitigation({ ...UNPUBLISHED, coverage: 0.4, caseCount: 2 })).toBe(true)
  })
})
