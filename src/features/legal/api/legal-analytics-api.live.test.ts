import { afterEach, describe, expect, it, vi } from 'vitest'
import { legislationAnalyticsFixture } from '../mocks/fixtures/legislation-analytics'
import { answersQuestion, fetchLegalAnalyticsLive } from './legal-analytics-api.live'

vi.mock('@/config/env', () => ({
  env: { VITE_APP_ENVIRONMENT: 'test' },
  getApiBaseUrl: () => 'https://api.test',
}))

const ANOTHER_QUESTION = 'Analytics response answers another question'
const OFF_CONTRACT = 'Analytics response did not match the contract'

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))),
  )
}

const summary = legislationAnalyticsFixture.summary
const stock = legislationAnalyticsFixture['summary-stock']
const ok = (view: string, fixture: { readonly data: unknown; readonly layer: unknown; readonly args: unknown }) => ({
  ok: true,
  data: fixture.data,
  meta: { view, layer: fixture.layer, args: fixture.args },
})

describe('fetchLegalAnalyticsLive', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('takes the answer to the question asked', async () => {
    respond(200, ok('summary', stock))
    const answer = await fetchLegalAnalyticsLive('summary', { population: 'stock' })
    expect(answer.data.total).toBe(46_535)
  })

  it('refuses a flow answer to a stock question, so it is never cached as the stock', async () => {
    respond(200, ok('summary', summary))
    await expect(fetchLegalAnalyticsLive('summary', { population: 'stock' })).rejects.toThrow(ANOTHER_QUESTION)
  })

  it('refuses an answer for another view, and a body without the success flag', async () => {
    respond(200, ok('head', summary))
    await expect(fetchLegalAnalyticsLive('summary', {})).rejects.toThrow(ANOTHER_QUESTION)
    respond(200, { data: summary.data, meta: { view: 'summary', layer: summary.layer, args: {} } })
    await expect(fetchLegalAnalyticsLive('summary', {})).rejects.toThrow(OFF_CONTRACT)
  })

  it('refuses a series whose years carry the wrong number of counts', async () => {
    const series = legislationAnalyticsFixture.series
    const short = { ...series.data, years: series.data.years.map((y, j) => (j === 0 ? { ...y, acts: y.acts.slice(1) } : y)) }
    respond(200, ok('series', { ...series, data: short }))
    await expect(fetchLegalAnalyticsLive('series', { lens: 'felul' })).rejects.toThrow(OFF_CONTRACT)
  })

  it('refuses a negative rest in a breakdown', async () => {
    const breakdown = legislationAnalyticsFixture.breakdown
    respond(200, ok('breakdown', { ...breakdown, data: { ...breakdown.data, rest: -1 } }))
    await expect(fetchLegalAnalyticsLive('breakdown', {})).rejects.toThrow(OFF_CONTRACT)
  })

  it('keeps the status when the body cannot be read', async () => {
    const response = new Response('{}', { status: 503 })
    vi.spyOn(response, 'text').mockRejectedValue(new Error('connection reset'))
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response)))
    await expect(fetchLegalAnalyticsLive('summary', {})).rejects.toMatchObject({ kind: 'unavailable', status: 503 })
  })

  it('keeps the field a 400 names', async () => {
    respond(400, { ok: false, error: 'InvalidInput', message: 'stale cursor', field: 'cursor' })
    await expect(fetchLegalAnalyticsLive('acts', { cursor: 'x' })).rejects.toMatchObject({ kind: 'invalid', status: 400, field: 'cursor' })
  })
})

describe('answersQuestion', () => {
  it('compares the filter as the server writes it: lists sorted, the default population dropped', () => {
    expect(answersQuestion('summary', { type: ['ordin', 'hotarare'] }, { view: 'summary', args: { type: ['hotarare', 'ordin'] } })).toBe(true)
    expect(answersQuestion('summary', { population: 'flow' }, { view: 'summary', args: {} })).toBe(true)
    expect(answersQuestion('breakdown', { lens: 'issuer', limit: 9 }, { view: 'breakdown', args: { lens: 'issuer', limit: 9 } })).toBe(true)
    expect(answersQuestion('summary', { from: 1990, to: 2000 }, { view: 'summary', args: { from: 1990 } })).toBe(false)
    expect(answersQuestion('summary', {}, { view: 'summary', args: { issuer: 'Guvernul' } })).toBe(false)
  })

  it('checks the question\'s own axes, with the server\'s defaults for those left out', () => {
    // a Felul breakdown is not an issuer breakdown
    expect(answersQuestion('breakdown', { lens: 'issuer', limit: 9 }, { view: 'breakdown', args: {} })).toBe(false)
    expect(answersQuestion('breakdown', {}, { view: 'breakdown', args: {} })).toBe(true)
    expect(answersQuestion('series', { lens: 'kind' }, { view: 'series', args: { lens: 'kind' } })).toBe(true)
    // the grid's columns: type by default, Felul when the rows are types
    expect(answersQuestion('grid', { lens: 'issuer' }, { view: 'grid', args: { lens: 'issuer' } })).toBe(true)
    expect(answersQuestion('grid', { lens: 'issuer', by: 'kind' }, { view: 'grid', args: { lens: 'issuer' } })).toBe(false)
    expect(answersQuestion('grid', { lens: 'type' }, { view: 'grid', args: { lens: 'type' } })).toBe(true)
    // an amended-order page is not the cited ranking
    expect(answersQuestion('acts', { order: 'cited', limit: 5 }, { view: 'acts', args: { limit: 5 } })).toBe(false)
    expect(answersQuestion('acts', { order: 'amended', limit: 5 }, { view: 'acts', args: { limit: 5 } })).toBe(true)
  })
})
