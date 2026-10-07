import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_CASE, FIXTURE_COURT, FIXTURE_YEAR, rawCasePage, rawCaseRelated, rawCourtChildren, rawCourtPage } from '../fixtures/judicial-fixtures'
import { fetchCaseSheet } from './judicial-case-api'
import { fetchCourtCases, fetchCourtSheet } from './judicial-court-api'
import { CASE_QUERY, CASES_QUERY, CHILDREN_QUERY, COURT_QUERY, relatedCasesQuery } from './judicial-queries'

const graphql = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: graphql.query }))

beforeEach(() => graphql.query.mockReset())

describe('the documents', () => {
  it('never ask for a party’s name or a hearing’s solution, and a court’s list never for what a case is about', () => {
    for (const document of [COURT_QUERY, CHILDREN_QUERY, CASES_QUERY, CASE_QUERY, relatedCasesQuery(['1', '2'])]) {
      expect(document).not.toMatch(/\b(name|displayName|companyName|solution|solutionSummary|nameKeyId)\b/)
    }
    expect(COURT_QUERY).not.toMatch(/\bobject\b/)
    expect(CASES_QUERY).not.toMatch(/\bobject\b/)
  })
})

describe('fetchCourtSheet', () => {
  it('reads the court bounded to itself and the year, then its children’s year', async () => {
    graphql.query.mockResolvedValueOnce(rawCourtPage).mockResolvedValueOnce(rawCourtChildren)
    const sheet = await fetchCourtSheet(FIXTURE_COURT, FIXTURE_YEAR)
    expect(sheet?.children.map((child) => child.count)).toEqual([4365, 2684, 2617])
    const [first, second] = graphql.query.mock.calls
    expect(first?.[1]).toMatchObject({
      code: FIXTURE_COURT,
      court: { institutionCode: { in: [FIXTURE_COURT] } },
      year: { institutionCode: { in: [FIXTURE_COURT] }, year: { eq: FIXTURE_YEAR } },
      stage1: { institutionCode: { in: [FIXTURE_COURT] }, year: { eq: FIXTURE_YEAR }, stage: { in: ['Apel'] } },
    })
    expect(second?.[1]).toEqual({
      filter: { institutionCode: { in: ['JudecatoriaSIMLEULSILVANIEI', 'JudecatoriaZALAU', 'JudecatoriaJIBOU'] }, year: { eq: FIXTURE_YEAR } },
    })
  })

  it('serves the sheet partial when the children’s read fails', async () => {
    graphql.query.mockResolvedValueOnce(rawCourtPage).mockRejectedValueOnce(new Error('down'))
    const sheet = await fetchCourtSheet(FIXTURE_COURT, FIXTURE_YEAR)
    expect(sheet?.partial).toBe(true)
  })

  it('answers null for a court the API does not know, reading nothing more', async () => {
    graphql.query.mockResolvedValueOnce({ ...rawCourtPage, court: null })
    await expect(fetchCourtSheet('TribunalulNICIUNUL', FIXTURE_YEAR)).resolves.toBeNull()
    expect(graphql.query).toHaveBeenCalledTimes(1)
  })

  it('reads the next page of cases after a cursor', async () => {
    graphql.query.mockResolvedValueOnce({ judicialCases: rawCourtPage.cases })
    const page = await fetchCourtCases(FIXTURE_COURT, 'cursor')
    expect(page.rows).toHaveLength(20)
    expect(graphql.query.mock.calls[0]?.[1]).toMatchObject({ after: 'cursor', court: { institutionCode: { in: [FIXTURE_COURT] } } })
  })
})

describe('fetchCaseSheet', () => {
  it('reads the case by its court and number, then the other end of its links', async () => {
    graphql.query.mockResolvedValueOnce(rawCasePage).mockResolvedValueOnce(rawCaseRelated)
    const sheet = await fetchCaseSheet(FIXTURE_CASE.code, FIXTURE_CASE.number)
    expect(graphql.query.mock.calls[0]?.[1]).toEqual(FIXTURE_CASE)
    expect(graphql.query.mock.calls[1]?.[1]).toEqual({ id0: '2776390' })
    expect(sheet?.related.map((other) => other.institutionCode)).toEqual(['TribunalulCONSTANTA'])
  })

  it('serves the case partial when its links’ read fails, and null for a number the court does not have', async () => {
    graphql.query.mockResolvedValueOnce(rawCasePage).mockRejectedValueOnce(new Error('down'))
    await expect(fetchCaseSheet(FIXTURE_CASE.code, FIXTURE_CASE.number)).resolves.toMatchObject({ partial: true, related: [] })
    graphql.query.mockResolvedValueOnce({ judicialCase: null })
    await expect(fetchCaseSheet(FIXTURE_CASE.code, '1/1/1999')).resolves.toBeNull()
  })
})
