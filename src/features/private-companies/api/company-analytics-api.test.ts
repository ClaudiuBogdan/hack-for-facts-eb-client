import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import {
  apiScopeOf,
  isAnalyticsUnavailable,
  isCursorRefused,
  isReleaseRefused,
  readCompanyAnalysisBreakdown,
  readCompanyAnalysisRecords,
  readCompanyAnalysisRelease,
  readCompanyAnalysisSeries,
  readCompanyAnalysisStats,
} from './company-analytics-api'
import { breakdownFixture, recordsFixture, releaseFixture, releaseRef, seriesFixture, SOURCE_EDITION_41, statsFixture } from './company-analytics.fixture'

/**
 * The adapter speaks the API's contract: the release as the `BigInt` string
 * the scalar takes, a scope without empty lists, refusals told apart by
 * their field — and the answers kept as the API's own strings.
 */

const api = vi.hoisted(() => ({ calls: [] as { readonly op: string; readonly document: string; readonly variables: Record<string, unknown> }[], answer: null as unknown, error: null as unknown }))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      api.calls.push({ op: options.operationName, document, variables })
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

describe('company analytics API adapter — schema v2', () => {
  const SOURCE = 'source { editionId publicationEpoch sourceSnapshotId sourcePublishedAt interpretationVersion privacyPolicyVersion dimensionPolicyVersion eligibilityPolicyVersion }'

  it('asks every answer for its release’s ONRC source pin, the records for their bases and recorded date, and nothing of a registration year', async () => {
    api.answer = { companyAnalysisRelease: releaseFixture(), companyAnalysisStats: statsFixture(), companyAnalysisBreakdown: breakdownFixture(), companyAnalysisSeries: seriesFixture(), companyAnalysisRecords: recordsFixture() }
    await readCompanyAnalysisRelease(null)
    await readCompanyAnalysisStats({ release: '7', scope: {}, metrics: [] })
    await readCompanyAnalysisBreakdown({ release: '7', scope: {}, dimension: 'COUNTY', metric: null, rankBy: 'COMPANIES', topN: 10 })
    await readCompanyAnalysisSeries({ release: '7', scope: {}, metric: 'TURNOVER', cohortMode: 'EACH_YEAR' })
    await readCompanyAnalysisRecords({ release: '7', scope: {}, sort: 'CUI', sortMetric: null, direction: 'ASC', metrics: [], first: 25, after: null })
    for (const call of api.calls) {
      expect(call.document).toContain(SOURCE)
      expect(call.document).not.toMatch(/registrationYear|registration_year/u)
    }
    const records = api.calls.find((call) => call.op === 'CompanyAnalysisRecords')!.document
    for (const field of ['legalFormBasis', 'countyBasis', 'uatBasis', 'observedStatusBasis', 'observedStatusCoverage', 'onrcCaenCoverage', 'onrcRecordedDate', 'onrcRecordedYear', 'onrcRecordedDateBasis', 'county { code label labelSource }']) expect(records).toContain(field)
    expect(api.calls.find((call) => call.op === 'CompanyAnalysisBreakdown')!.document).toContain('labelSource basis')
  })

  it('keeps the source pin and its civil date as the API wrote them', async () => {
    api.answer = { companyAnalysisRelease: releaseFixture() }
    const release = await readCompanyAnalysisRelease('7')
    expect(release.release.source).toEqual({
      editionId: '41',
      publicationEpoch: '3',
      sourceSnapshotId: 'onrc-2026-09-30',
      sourcePublishedAt: '2026-09-30',
      interpretationVersion: 'onrc-edition-v1',
      privacyPolicyVersion: 'onrc-privacy-v1',
      dimensionPolicyVersion: 'onrc-dimensions-v1',
      eligibilityPolicyVersion: 'public-legal-person-v1',
    })
    expect(release.schemaVersion).toBe('companies-analytics-ch-v2')
  })

  it.each([
    ['a v1 schema', { schemaVersion: 'companies-analytics-ch-v1' }],
    ['a v1 population', { populationPolicyVersion: 'eligible-legal-persons-v1' }],
    ['a pin without its publication epoch', { release: { ...releaseRef(), source: { ...SOURCE_EDITION_41, publicationEpoch: undefined } } }],
    ['a timestamp for a source date', { release: releaseRef('7', { source: { ...SOURCE_EDITION_41, sourcePublishedAt: '2026-09-30T00:00:00Z' } }) }],
    ['year 0000', { release: releaseRef('7', { source: { ...SOURCE_EDITION_41, sourcePublishedAt: '0000-01-01' } }) }],
    ['a month 13', { release: releaseRef('7', { source: { ...SOURCE_EDITION_41, sourcePublishedAt: '2026-13-01' } }) }],
    ['a non-canonical edition id', { release: releaseRef('7', { source: { ...SOURCE_EDITION_41, editionId: '041' } }) }],
  ])('refuses a release answer with %s, rather than read it as v2', async (_case, override) => {
    api.answer = { companyAnalysisRelease: { ...releaseFixture(), ...override } }
    await expect(readCompanyAnalysisRelease('7')).rejects.toThrow()
  })

  it('keeps a record’s bases, coverages and recorded date — the 0001-01-01 boundary as text, and a null as a null', async () => {
    api.answer = { companyAnalysisRecords: recordsFixture() }
    const records = await readCompanyAnalysisRecords({ release: '7', scope: {}, sort: 'METRIC', sortMetric: 'TURNOVER', direction: 'DESC', metrics: ['TURNOVER'], first: 25, after: null })
    const [first, second, third] = records.edges.map((edge) => edge.node)
    expect(first).toMatchObject({ onrcRecordedDate: '2010-03-15', onrcRecordedYear: 2010, countyBasis: 'CONSISTENT_OBSERVATIONS', county: { code: 'CJ', label: 'Cluj', labelSource: 'territory_hub' } })
    expect(second).toMatchObject({ county: null, countyBasis: 'MULTIPLE_VALUES', observedStatus: null, observedStatusBasis: 'PARTIAL_OBSERVATIONS', observedStatusCoverage: 'PARTIAL', onrcRecordedDate: '0001-01-01', onrcRecordedYear: 1 })
    expect(third).toMatchObject({ onrcRecordedDate: null, onrcRecordedYear: null, onrcRecordedDateBasis: 'MISSING' })
    expect(first).not.toHaveProperty('registrationYear')
  })

  it('refuses a record whose recorded year is not its date’s, and one without its bases (a v1 record)', async () => {
    const records = recordsFixture()
    const node = records.edges[0]!.node
    api.answer = { companyAnalysisRecords: { ...records, edges: [{ cursor: 'c1', node: { ...node, onrcRecordedYear: 2011 } }] } }
    await expect(readCompanyAnalysisRecords({ release: '7', scope: {}, sort: 'CUI', sortMetric: null, direction: 'ASC', metrics: [], first: 25, after: null })).rejects.toThrow()
    const { countyBasis: _basis, onrcRecordedDateBasis: _dateBasis, ...v1 } = node
    api.answer = { companyAnalysisRecords: { ...records, edges: [{ cursor: 'c1', node: { ...v1, registrationYear: 2010 } }] } }
    await expect(readCompanyAnalysisRecords({ release: '7', scope: {}, sort: 'CUI', sortMetric: null, direction: 'ASC', metrics: [], first: 25, after: null })).rejects.toThrow()
  })

  it('keeps a basis group’s key, basis and explicit zero, a value group’s label source, and the empty unknown slot', async () => {
    api.answer = { companyAnalysisBreakdown: breakdownFixture() }
    const breakdown = await readCompanyAnalysisBreakdown({ release: '7', scope: {}, dimension: 'COUNTY', metric: 'TURNOVER', rankBy: 'METRIC_SUM', topN: 3 })
    expect(breakdown.groups.map((group) => [group.key, group.basis, group.label, group.labelSource, group.metric?.sum])).toEqual([
      ['B', null, 'București', 'territory_hub', '700.00'],
      ['CJ', null, 'Cluj', 'territory_hub', '200.00'],
      ['(multiple_values)', 'MULTIPLE_VALUES', null, null, '0.00'],
    ])
    expect(breakdown.unknown).toMatchObject({ companies: '0', metric: { sum: null } })
  })

  it('sends a basis key as the exact key it is, and the ONRC observations last, without an empty list or exclusion', () => {
    expect(
      apiScopeOf({
        fiscalYear: 2024,
        // The companies whose entries name different counties — exactly that bucket.
        county: { in: ['(multiple_values)', 'CJ'] },
        // A public 1048 and a Cluj county and a 6201 (any revision, unknown included) on the SAME identifier.
        onrc: { status: ['1048'], county: ['CJ'], caenCode: ['6201'], onrcCaen: [], exclude: { status: [], caenCode: ['4711'] } },
        observedStatus: { in: [], includeUnknown: true },
      }),
    ).toEqual({ fiscalYear: 2024, county: { in: ['(multiple_values)', 'CJ'] }, observedStatus: { includeUnknown: true }, onrc: { status: ['1048'], county: ['CJ'], caenCode: ['6201'], exclude: { caenCode: ['4711'] } } })
    expect(apiScopeOf({ onrc: { status: [], exclude: { county: [] } } })).toEqual({})
  })
})
