import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { apiScopeOf, isAnalyticsUnavailable, isCursorRefused, isReleaseRefused, readCompanyAnalysisRelease, readCompanyAnalysisStats } from './company-analytics-api'
import { releaseFixture, statsFixture } from './company-analytics.fixture'

/**
 * The adapter speaks the API's contract: the release as the `BigInt` string
 * the scalar takes, a scope without empty lists, refusals told apart by
 * their field — and the answers kept as the API's own strings.
 */

const api = vi.hoisted(() => ({ calls: [] as { readonly op: string; readonly variables: Record<string, unknown> }[], answer: null as unknown, error: null as unknown }))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      api.calls.push({ op: options.operationName, variables })
      return api.error ? Promise.reject(api.error) : Promise.resolve(api.answer)
    },
  }
})

const refusal = (field: string, code = 'INVALID_INPUT') => new GraphQLRequestError('refused', { graphQLErrors: [{ message: 'refused', extensions: { code, ...(field ? { field } : {}) } }] })

beforeEach(() => {
  api.calls = []
  api.answer = null
  api.error = null
})

describe('company analytics API adapter', () => {
  it('asks for the active release without a pin, and for a pinned one by its id as text', async () => {
    api.answer = { companyAnalysisRelease: releaseFixture() }
    await readCompanyAnalysisRelease(null)
    await readCompanyAnalysisRelease('7')
    expect(api.calls.map((call) => call.variables)).toEqual([{}, { release: '7' }])
  })

  it('sends the release on every answer read, and a scope with no empty list', async () => {
    api.answer = { companyAnalysisStats: statsFixture() }
    await readCompanyAnalysisStats({ release: '7', scope: { fiscalYear: 2024, legalForms: [], county: { in: [] }, uat: { includeUnknown: true } }, metrics: ['TURNOVER'] })
    expect(api.calls[0]?.variables).toEqual({ release: '7', scope: { fiscalYear: 2024, uat: { includeUnknown: true } }, metrics: ['TURNOVER'] })
  })

  it('keeps sums, means and counts as the API’s strings: a zero stays a zero, nothing stays null', async () => {
    api.answer = { companyAnalysisStats: statsFixture() }
    const stats = await readCompanyAnalysisStats({ release: '7', scope: { fiscalYear: 2024 }, metrics: ['TURNOVER', 'NET_RESULT', 'EMPLOYEES'] })
    const byMetric = new Map(stats.metrics.map((metric) => [metric.metric, metric]))
    expect(byMetric.get('TURNOVER')?.sum).toBe('9007199254741973.32')
    expect(byMetric.get('NET_RESULT')?.sum).toBe('0.00')
    expect(byMetric.get('EMPLOYEES')?.sum).toBeNull()
    expect(stats.companies).toBe('2718250')
  })

  it('answers a null root as a failure, never as an empty answer', async () => {
    api.answer = { companyAnalysisStats: null }
    await expect(readCompanyAnalysisStats({ release: '7', scope: { fiscalYear: 2024 }, metrics: [] })).rejects.toThrow(/no answer/u)
  })

  it('refuses an answer that turned a figure into a float', async () => {
    api.answer = { companyAnalysisStats: { ...statsFixture(), companies: 2718250 } }
    await expect(readCompanyAnalysisStats({ release: '7', scope: { fiscalYear: 2024 }, metrics: [] })).rejects.toThrow()
  })

  it('tells a refused release from a refused cursor and from the service being down', () => {
    expect(isReleaseRefused(refusal('release'))).toBe(true)
    expect(isReleaseRefused(refusal('after'))).toBe(false)
    expect(isCursorRefused(refusal('after'))).toBe(true)
    expect(isAnalyticsUnavailable(refusal('', 'SERVICE_UNAVAILABLE'))).toBe(true)
    expect(isReleaseRefused(new Error('down'))).toBe(false)
  })

  it('orders and trims the scope the way its echo does', () => {
    expect(
      apiScopeOf({ employeeSizeBands: ['ZERO'], fiscalYear: 2008, mainCaen: [{ code: '6201', revision: undefined }], financialRanges: [{ metric: 'TURNOVER' }, { metric: 'EMPLOYEES', max: '9' }] }),
    ).toEqual({ fiscalYear: 2008, mainCaen: [{ code: '6201' }], financialRanges: [{ metric: 'EMPLOYEES', max: '9' }], employeeSizeBands: ['ZERO'] })
  })
})
