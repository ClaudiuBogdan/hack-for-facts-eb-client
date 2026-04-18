import { describe, expect, it } from 'vitest'
import { resolveEntityPageQueryInputs } from './entity-page-query-inputs'

describe('resolveEntityPageQueryInputs', () => {
  it('builds the exact year-based entity details and line-item inputs', () => {
    expect(resolveEntityPageQueryInputs({
      context: {
        routeId: 'entities',
        cui: '4305857',
        period: 'YEAR',
        year: 2025,
        publicSettings: {
          normalization: 'total',
          currency: 'RON',
          inflationAdjusted: false,
          showPeriodGrowth: false,
        },
      },
    })).toStrictEqual({
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

  it('converts the effective report type and preserves the monthly query shape', () => {
    expect(resolveEntityPageQueryInputs({
      context: {
        routeId: 'primarie',
        cui: '4267117',
        period: 'MONTH',
        year: 2024,
        month: '03',
        reportType: 'COMMITMENT_DETAILED',
        effectiveReportType: 'COMMITMENT_PRINCIPAL_AGGREGATED',
        mainCreditorCui: '1234567',
        activeView: 'overview',
        publicSettings: {
          normalization: 'per_capita',
          currency: 'EUR',
          inflationAdjusted: true,
          showPeriodGrowth: true,
        },
      },
    })).toStrictEqual({
      entityDetails: {
        cui: '4267117',
        reportPeriod: {
          type: 'MONTH',
          selection: {
            interval: {
              start: '2024-03',
              end: '2024-03',
            },
          },
        },
        reportType: 'PRINCIPAL_AGGREGATED',
        trendPeriod: {
          type: 'MONTH',
          selection: {
            interval: {
              start: '2024-01',
              end: '2024-12',
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
          type: 'MONTH',
          selection: {
            interval: {
              start: '2024-03',
              end: '2024-03',
            },
          },
        },
        reportType: 'PRINCIPAL_AGGREGATED',
        mainCreditorCui: '1234567',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
      },
    })
  })
})
