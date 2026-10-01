import { beforeEach, describe, expect, it, vi } from 'vitest'
import { homeYear } from '../lib/home-model'
import { forgetProcurementCutoff } from './procurement-cutoff'
import { readProcurementAnalyticsForSsr } from './procurement-analytics-ssr'

/**
 * The server render's generation guard: without a cutoff's build it reads no
 * analysis at all (the browser reads, pinned); a read refused for its build
 * forgets the kept cutoff, so the next render starts from the new build, and
 * a render that met a refusal is never kept.
 */

const api = vi.hoisted(() => ({
  served: '13',
  cutoffBuild: '13',
  cutoffFails: false,
  calls: [] as { readonly op: string; readonly build: unknown }[],
}))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (_document: string, variables: Record<string, unknown> | undefined, options: { readonly operationName: string }) => {
      const op = options.operationName
      api.calls.push({ op, build: variables?.build })
      if (op === 'ProcurementGeographyOptions') return Promise.resolve({ referenceRegions: [], referenceCounties: [] })
      if (op === 'AnalyticsCpvDivisions') return Promise.resolve({ procurementCpvDivisions: [] })
      if (op === 'ProcurementCutoff') {
        if (api.cutoffFails) return Promise.reject(new Error('down'))
        const meta = { buildId: api.cutoffBuild }
        return Promise.resolve({ nationalDirectMonths: [{ points: [], meta }], nationalAwardMonths: [{ points: [], meta }] })
      }
      if (variables?.build !== api.served) {
        return Promise.reject(new actual.GraphQLRequestError('stale', { graphQLErrors: [{ message: 'stale', extensions: { code: 'INVALID_INPUT', field: 'build' } }] }))
      }
      const block = { recordCount: '1', withValueCount: '0', valueAwardedSum: null, avgValueAwarded: null, meta: null }
      if (op === 'AnalyticsFigures') return Promise.resolve({ now: { blocks: [block] }, before: { blocks: [block] } })
      if (op === 'AnalyticsRecords') return Promise.resolve({ l: { total: '0', items: [], meta: { answerability: 'served' } } })
      if (op === 'AnalyticsRanking') return Promise.resolve({ r: [{ rankedBy: 'count', valueWithheldAssociationSum: null, buckets: [] }] })
      if (op === 'AnalyticsConcentration') return Promise.resolve({ c: [] })
      return Promise.resolve({ n: [{ points: [] }], v: [{ points: [] }] })
    },
  }
})

const analysis = () => api.calls.filter((call) => call.op.startsWith('Analytics') && call.op !== 'AnalyticsCpvDivisions')
const cutoffReads = () => api.calls.filter((call) => call.op === 'ProcurementCutoff').length

beforeEach(() => {
  api.served = '13'
  api.cutoffBuild = '13'
  api.cutoffFails = false
  api.calls = []
  forgetProcurementCutoff(homeYear())
})

describe('readProcurementAnalyticsForSsr', () => {
  it('reads no analysis without a cutoff’s build, and keeps no such render', async () => {
    api.cutoffFails = true
    const read = await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'AB', dupa: 'inregistrari' })
    expect(read.complete).toBe(false)
    expect(analysis()).toEqual([])
  })

  it('pins every seeded read, the records included, to the cutoff’s build', async () => {
    const read = await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'BV', dupa: 'inregistrari' })
    expect(analysis().map((call) => call.op)).toContain('AnalyticsRecords')
    expect(analysis().every((call) => call.build === '13')).toBe(true)
    // Every seeded analysis key carries the build.
    const keys = read.seed.map((entry) => entry.key).filter((key) => ['figures', 'records'].includes(String(key[2])))
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.every((key) => key[3] === '13')).toBe(true)
  })

  it('forgets the kept cutoff when a read is refused for its build: the next render starts from the new one', async () => {
    await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'CJ' })
    expect(cutoffReads()).toBe(1)
    // Build 14 is published while the process still keeps the cutoff of 13.
    api.served = '14'
    const refused = await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'SB' })
    expect(refused.complete).toBe(false)
    api.cutoffBuild = '14'
    const next = await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'SB' })
    expect(cutoffReads()).toBe(2)
    expect(next.seed.find((entry) => entry.key[2] === 'figures')?.key[3]).toBe('14')
  })
})
