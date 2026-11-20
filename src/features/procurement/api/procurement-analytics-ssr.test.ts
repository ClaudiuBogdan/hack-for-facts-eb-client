import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newestKey } from '@/lib/disclosure-key'
import { homeYear } from '../lib/home-model'
import { forgetProcurementCutoff } from './procurement-cutoff'
import { readProcurementAnalyticsForSsr } from './procurement-analytics-ssr'
import { resetDaReleaseForTests } from './procurement-da-release-status'
// The disclosure publication direct purchases are kept under (D6), alongside the build.
const release = vi.hoisted(() => ({ disclosure: 'v1' as string | null, queue: [] as (string | null)[] }))
vi.mock('./procurement-da-release-status', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./procurement-da-release-status')>()),
  daSupplierReads: () => Promise.resolve({ figures: true, places: true, known: true }), disclosureVersion: () => Promise.resolve(release.queue.length > 0 ? release.queue.shift()! : release.disclosure) }))

/**
 * The server render's generation guard: without a cutoff's build it reads no
 * analysis at all (the browser reads, pinned); a read refused for its build
 * forgets the kept cutoff, so the next render starts from the new build, and
 * a render that met a refusal is never kept.
 */

const api = vi.hoisted(() => ({
  served: '13',
  /** The D6 state the API serves its direct-purchase blocks under. */
  key: 'off',
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
      const block = { recordCount: '1', withValueCount: '0', valueAwardedSum: null, avgValueAwarded: null, meta: { answerability: null, provisional: null, caveats: null, undatedInScope: null, disclosureKey: api.key } }
      if (op === 'AnalyticsFigures') return Promise.resolve({ now: { blocks: [block] }, before: { blocks: [block] } })
      if (op === 'AnalyticsRecords') return Promise.resolve({ l: { total: '0', items: [], meta: { answerability: 'served', disclosureKey: api.key } } })
      if (op === 'AnalyticsRanking') return Promise.resolve({ r: [{ rankedBy: 'count', valueWithheldAssociationSum: null, buckets: [], meta: { disclosureKey: api.key } }] })
      if (op === 'AnalyticsConcentration') return Promise.resolve({ c: [{ supplierCount: null, top1Share: null, top5Share: null, meta: { disclosureKey: api.key } }] })
      return Promise.resolve({ n: [{ points: [], meta: { disclosureKey: api.key } }], v: [{ points: [], meta: { disclosureKey: api.key } }] })
    },
  }
})

const analysis = () => api.calls.filter((call) => call.op.startsWith('Analytics') && call.op !== 'AnalyticsCpvDivisions')
const cutoffReads = () => api.calls.filter((call) => call.op === 'ProcurementCutoff').length

beforeEach(() => {
  api.served = '13'
  api.key = 'off'
  release.queue = []
  resetDaReleaseForTests()
  api.cutoffBuild = '13'
  api.cutoffFails = false
  api.calls = []
  release.disclosure = 'v1'
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
    // Every seeded direct-purchase key carries the build and the disclosure publication (D6: a publish can withhold a supplier without a new build).
    const keys = read.seed.map((entry) => entry.key).filter((key) => ['figures', 'records'].includes(String(key[2])))
    expect(keys.length).toBeGreaterThan(0)
    // Direct purchases under '13|v1'; the other tabs' counts (contracts, frameworks) under the contract build alone.
    expect(keys.every((key) => key[3] === '13|v1' || key[3] === '13')).toBe(true)
    expect(keys.filter((key) => key[3] === '13|v1').length).toBeGreaterThan(0)
  })

  it('keeps no render whose disclosure publication cannot be read: not in the memo, not by the CDN (D6)', async () => {
    release.disclosure = null
    const first = await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'VS' })
    expect(first.complete).toBe(false)
    const before = analysis().length
    await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'VS' })
    // Read again, not served from the memo.
    expect(analysis().length).toBeGreaterThan(before)
  })

  it('reads the records’ page and order the address holds, each page kept apart', async () => {
    const read = await readProcurementAnalyticsForSsr({ tip: 'contracte', judet: 'IS', dupa: 'inregistrari', ordine: 'data', pagina: 3 })
    const records = read.seed.find((entry) => entry.key[2] === 'records')?.key
    expect(records?.slice(-2)).toEqual(['date_desc', 3])
    // Another page of the same question is another read, not the kept one.
    const next = await readProcurementAnalyticsForSsr({ tip: 'contracte', judet: 'IS', dupa: 'inregistrari', ordine: 'data', pagina: 4 })
    expect(next.seed.find((entry) => entry.key[2] === 'records')?.key.slice(-2)).toEqual(['date_desc', 4])
    expect(analysis().filter((call) => call.op === 'AnalyticsRecords')).toHaveLength(2)
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
    expect(next.seed.find((entry) => entry.key[2] === 'figures')?.key[3]).toBe('14|v1')
  })

  it('two renders in one process across a key advance: the one planned under the older key keeps nothing, and neither loops (API doc 10)', async () => {
    const P1 = '2026-11-18T03:10:00.123456Z'
    const P2 = '2026-11-19T03:10:00.123456Z'
    // The API has published P2. One render planned under P1 (a status read just before), the other under P2.
    api.key = P2
    release.queue = [`on:t1:d6:${P1}`, `on:t1:d6:${P2}`]
    release.disclosure = `on:t1:d6:${P2}`
    const [older, newer] = await Promise.all([
      readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'AG', dupa: 'inregistrari' }),
      readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'AR', dupa: 'inregistrari' }),
    ])
    const keptUnderP1 = [...older.seed, ...newer.seed].filter((entry) => String(entry.key[3]).includes(P1))
    expect(keptUnderP1).toEqual([])
    expect(older.complete).toBe(false)
    expect(newer.complete).toBe(true)
    expect(newestKey()).toBe(P2)
    // Each render asks once per read: nothing retries in a loop.
    const perRender = analysis().length / 2
    expect(perRender).toBeLessThanOrEqual(6)
    // A later render plans under P2 and is whole.
    const after = await readProcurementAnalyticsForSsr({ tip: 'directe', judet: 'AG', dupa: 'inregistrari' })
    expect(after.complete).toBe(true)
  })
})
