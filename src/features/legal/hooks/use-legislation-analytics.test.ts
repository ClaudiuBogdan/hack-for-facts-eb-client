import { describe, expect, it } from 'vitest'
import { LegalAnalyticsError } from '../api/legal-analytics-api'
import { legalAnalyticsQueryOptions, retryLegalAnalytics, retryLegalAnalyticsOnMount } from './use-legislation-analytics'

describe('retryLegalAnalytics', () => {
  it('never retries a refusal: 400, 429, 503', () => {
    expect(retryLegalAnalytics(0, new LegalAnalyticsError('invalid', 'bad filter', 400))).toBe(false)
    expect(retryLegalAnalytics(0, new LegalAnalyticsError('failed', 'slow down', 429))).toBe(false)
    expect(retryLegalAnalytics(0, new LegalAnalyticsError('unavailable', 'no layer', 503))).toBe(false)
  })

  it('retries a transport failure or another server error twice', () => {
    for (const error of [new LegalAnalyticsError('failed', 'boom', 500), new LegalAnalyticsError('failed', 'network'), new Error('other')]) {
      expect(retryLegalAnalytics(0, error)).toBe(true)
      expect(retryLegalAnalytics(1, error)).toBe(true)
      expect(retryLegalAnalytics(2, error)).toBe(false)
    }
  })
})

describe('retryLegalAnalyticsOnMount', () => {
  it('does not read a refused query again just because a view mounts', () => {
    for (const status of [400, 429, 503] as const) {
      const kind = status === 400 ? 'invalid' : status === 503 ? 'unavailable' : 'failed'
      expect(retryLegalAnalyticsOnMount({ state: { error: new LegalAnalyticsError(kind, 'refused', status) } }), String(status)).toBe(false)
    }
    expect(retryLegalAnalyticsOnMount({ state: { error: new LegalAnalyticsError('failed', 'boom', 500) } })).toBe(true)
    expect(retryLegalAnalyticsOnMount({ state: { error: null } })).toBe(true)
  })
})

describe('legalAnalyticsQueryOptions', () => {
  it('keeps nothing of the views that name acts', () => {
    for (const view of ['acts', 'links'] as const) {
      const options = legalAnalyticsQueryOptions(view, {})
      expect(options.staleTime, view).toBe(0)
      expect(options.gcTime, view).toBe(0)
    }
  })

  it('keeps the aggregate views for five minutes', () => {
    for (const view of ['head', 'summary', 'breakdown', 'series', 'grid'] as const) {
      const options = legalAnalyticsQueryOptions(view, {})
      expect(options.staleTime, view).toBe(5 * 60 * 1000)
      expect(options.gcTime, view).toBeUndefined()
    }
  })
})
