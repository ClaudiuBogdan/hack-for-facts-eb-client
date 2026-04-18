import { describe, expect, it } from 'vitest'
import { resolveEntitiesEntityRouteAdapter } from './entities-entity-route-adapter'

describe('resolveEntitiesEntityRouteAdapter', () => {
  it('keeps report_type optional for the entities route contract', () => {
    const result = resolveEntitiesEntityRouteAdapter({
      cui: '4305857',
      search: {
        period: 'YEAR',
        year: 2025,
      },
    })

    expect(result.normalizedSearch.report_type).toBeUndefined()
    expect(result.executionContext.reportType).toBeUndefined()
    expect(result.executionContext.effectiveReportType).toBeUndefined()
    expect(result.exactQueryInputs).toStrictEqual({
      entityDetails: {
        cui: '4305857',
        reportPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2025',
              end: '2025',
            },
          },
        },
        reportType: undefined,
        trendPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2016',
              end: '2026',
            },
          },
        },
        mainCreditorCui: undefined,
        normalization: 'total',
        currency: 'RON',
        inflation_adjusted: false,
        show_period_growth: false,
      },
      entityExecutionLineItems: {
        cui: '4305857',
        reportPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2025',
              end: '2025',
            },
          },
        },
        reportType: undefined,
        mainCreditorCui: undefined,
        normalization: 'total',
        currency: 'RON',
        inflation_adjusted: false,
      },
    })
  })

  it('normalizes route period compatibility for month and quarter inputs', () => {
    const monthly = resolveEntitiesEntityRouteAdapter({
      cui: '4305857',
      search: {
        period: 'MONTH',
        year: 2024,
      },
    })
    const quarterly = resolveEntitiesEntityRouteAdapter({
      cui: '4305857',
      search: {
        period: 'QUARTER',
        year: 2024,
        month: '03',
      },
    })
    const yearly = resolveEntitiesEntityRouteAdapter({
      cui: '4305857',
      search: {
        period: 'YEAR',
        year: 2024,
        month: '03',
        quarter: 'Q4',
      },
    })

    expect(monthly.normalizedSearch).toMatchObject({
      period: 'MONTH',
      year: 2024,
      month: '01',
      quarter: undefined,
    })
    expect(quarterly.normalizedSearch).toMatchObject({
      period: 'QUARTER',
      year: 2024,
      month: undefined,
      quarter: 'Q1',
    })
    expect(yearly.normalizedSearch).toMatchObject({
      period: 'YEAR',
      year: 2024,
      month: undefined,
      quarter: undefined,
    })
  })

  it('derives URL-based SSR settings and forced overrides from search params', () => {
    const result = resolveEntitiesEntityRouteAdapter({
      cui: '4305857',
      search: {
        normalization: 'per_capita_euro',
        currency: 'USD',
        inflation_adjusted: true,
        show_period_growth: true,
      },
    })

    expect(result.normalizedSearch.normalization).toBe('per_capita_euro')
    expect(result.urlPublicSettings).toStrictEqual({
      normalization: 'per_capita',
      currency: 'EUR',
      inflationAdjusted: true,
      showPeriodGrowth: true,
    })
    expect(result.ssrSettings).toStrictEqual({
      currency: 'EUR',
      inflationAdjusted: true,
    })
    expect(result.forcedOverrides).toStrictEqual({
      currency: 'EUR',
      inflationAdjusted: undefined,
    })
  })

  it('builds exact query inputs from the normalized entities execution context', () => {
    const result = resolveEntitiesEntityRouteAdapter({
      cui: '4267117',
      search: {
        period: 'QUARTER',
        year: 2024,
        quarter: 'Q3',
        report_type: 'COMMITMENT_SECONDARY_AGGREGATED',
        main_creditor_cui: '1234567',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
        show_period_growth: true,
        view: 'ranking',
      },
    })

    expect(result.executionContext).toStrictEqual({
      routeId: 'entities',
      cui: '4267117',
      lang: undefined,
      period: 'QUARTER',
      year: 2024,
      month: undefined,
      quarter: 'Q3',
      reportType: 'COMMITMENT_SECONDARY_AGGREGATED',
      effectiveReportType: 'SECONDARY_AGGREGATED',
      mainCreditorCui: '1234567',
      activeView: 'ranking',
      publicSettings: {
        normalization: 'per_capita',
        currency: 'EUR',
        inflationAdjusted: true,
        showPeriodGrowth: true,
      },
    })
    expect(result.exactQueryInputs).toStrictEqual({
      entityDetails: {
        cui: '4267117',
        reportPeriod: {
          type: 'QUARTER',
          selection: {
            interval: {
              start: '2024-Q3',
              end: '2024-Q3',
            },
          },
        },
        reportType: 'SECONDARY_AGGREGATED',
        trendPeriod: {
          type: 'QUARTER',
          selection: {
            interval: {
              start: '2024-Q1',
              end: '2024-Q4',
            },
          },
        },
        mainCreditorCui: '1234567',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
        show_period_growth: true,
      },
      entityExecutionLineItems: {
        cui: '4267117',
        reportPeriod: {
          type: 'QUARTER',
          selection: {
            interval: {
              start: '2024-Q3',
              end: '2024-Q3',
            },
          },
        },
        reportType: 'SECONDARY_AGGREGATED',
        mainCreditorCui: '1234567',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
      },
    })
  })

  it('allows external client-preference overlays without changing URL-derived SSR settings', () => {
    const result = resolveEntitiesEntityRouteAdapter({
      cui: '4305857',
      search: {
        normalization: 'total',
        currency: 'RON',
        inflation_adjusted: false,
      },
      publicSettingsOverride: {
        normalization: 'total',
        currency: 'USD',
        inflationAdjusted: true,
        showPeriodGrowth: false,
      },
    })

    expect(result.urlPublicSettings).toStrictEqual({
      normalization: 'total',
      currency: 'RON',
      inflationAdjusted: false,
      showPeriodGrowth: false,
    })
    expect(result.ssrSettings).toStrictEqual({
      currency: 'RON',
      inflationAdjusted: false,
    })
    expect(result.executionContext.publicSettings).toStrictEqual({
      normalization: 'total',
      currency: 'USD',
      inflationAdjusted: true,
      showPeriodGrowth: false,
    })
    expect(result.exactQueryInputs.entityDetails.currency).toBe('USD')
    expect(result.exactQueryInputs.entityDetails.inflation_adjusted).toBe(true)
  })
})
