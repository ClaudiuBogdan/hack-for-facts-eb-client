import { describe, expect, it } from 'vitest'
import { defaultEntityAnalyticsFilter, entityAnalyticsFilterSchema, resolveEntityAnalyticsFilter, entityAnalyticsQueryOptions } from './entity-analytics-query'

describe('entity analytics shared request state', () => {
  it('keeps explicit URL settings authoritative over conflicting saved preferences', () => {
    const filter = entityAnalyticsFilterSchema.parse({ ...defaultEntityAnalyticsFilter, currency: 'EUR', inflation_adjusted: false })
    const resolved = resolveEntityAnalyticsFilter(filter, { currency: 'RON', inflationAdjusted: true })
    expect(resolved.currency).toBe('EUR')
    expect(resolved.inflation_adjusted).toBe(false)
    expect(filter.currency).toBe('EUR')
    expect(resolved.report_period).toEqual(defaultEntityAnalyticsFilter.report_period)
    expect(resolved.report_type).toBe(defaultEntityAnalyticsFilter.report_type)
    const input = { filter: resolved, page: 2, pageSize: 25, sortOrder: 'desc' as const }
    expect(entityAnalyticsQueryOptions(input).queryKey).toEqual(entityAnalyticsQueryOptions({ ...input }).queryKey)
    expect(entityAnalyticsQueryOptions(input).staleTime).toBe(60_000)
  })
  it('preserves serialized explicit clears rather than restoring page defaults', () => {
    const filter = entityAnalyticsFilterSchema.parse(JSON.stringify({ ...defaultEntityAnalyticsFilter, report_type: undefined, report_period: undefined, exclude: undefined }))
    expect(filter.report_type).toBeUndefined()
    expect(filter.exclude).toBeUndefined()
    expect(filter.report_period).toBeUndefined()
  })
  it.each(['total_euro', 'per_capita_euro'] as const)('retains EUR for legacy %s aliases', (normalization) => {
    const resolved = resolveEntityAnalyticsFilter({ ...defaultEntityAnalyticsFilter, normalization, currency: 'USD' }, { currency: 'RON', inflationAdjusted: false })
    expect(resolved.currency).toBe('EUR')
    expect(resolved.normalization).toBe(normalization === 'total_euro' ? 'total' : 'per_capita')
  })
  it('uses preferences only when absent and disables inflation for GDP', () => {
    const preferences = { currency: 'USD' as const, inflationAdjusted: true }
    expect(resolveEntityAnalyticsFilter(defaultEntityAnalyticsFilter, preferences)).toMatchObject({ currency: 'USD', inflation_adjusted: true })
    expect(resolveEntityAnalyticsFilter({ ...defaultEntityAnalyticsFilter, normalization: 'percent_gdp', inflation_adjusted: true }, preferences).inflation_adjusted).toBe(false)
  })
})
