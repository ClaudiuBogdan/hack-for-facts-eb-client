import { describe, expect, it } from 'vitest'
import type { ReportPeriodInput } from '@/schemas/reporting'
import { entityDetailsQueryOptions } from './useEntityDetails'

describe('entityDetailsQueryOptions', () => {
  it('uses the same query key for equivalent params with different field order', () => {
    const reportPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: {
        interval: {
          start: '2025',
          end: '2025',
        },
      },
    }
    const trendPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: {
        interval: {
          start: '2016',
          end: '2026',
        },
      },
    }

    const loaderParams = {
      cui: '4305857',
      reportPeriod,
      reportType: 'DETAILED' as const,
      mainCreditorCui: '1234567',
      normalization: 'total' as const,
      currency: 'RON' as const,
      inflation_adjusted: false,
      trendPeriod,
      show_period_growth: true,
    }

    const clientParams = {
      cui: '4305857',
      normalization: 'total' as const,
      currency: 'RON' as const,
      inflation_adjusted: false,
      show_period_growth: true,
      reportPeriod,
      reportType: 'DETAILED' as const,
      trendPeriod,
      mainCreditorCui: '1234567',
    }

    expect(entityDetailsQueryOptions(loaderParams).queryKey).toEqual(
      entityDetailsQueryOptions(clientParams).queryKey,
    )
  })

  it('uses the same query key when trendPeriod is omitted or matches reportPeriod', () => {
    const reportPeriod: ReportPeriodInput = {
      type: 'YEAR',
      selection: {
        interval: {
          start: '2025',
          end: '2025',
        },
      },
    }

    const implicitTrendPeriodParams = {
      cui: '4305857',
      normalization: 'total' as const,
      currency: 'RON' as const,
      inflation_adjusted: false,
      show_period_growth: false,
      reportPeriod,
      reportType: 'DETAILED' as const,
      mainCreditorCui: '1234567',
    }

    const explicitTrendPeriodParams = {
      ...implicitTrendPeriodParams,
      trendPeriod: reportPeriod,
    }

    expect(entityDetailsQueryOptions(implicitTrendPeriodParams).queryKey).toEqual(
      entityDetailsQueryOptions(explicitTrendPeriodParams).queryKey,
    )
  })
})
