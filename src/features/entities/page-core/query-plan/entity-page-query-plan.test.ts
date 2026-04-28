import { describe, expect, it } from 'vitest'
import { entityDetailsQueryOptions } from '@/lib/hooks/useEntityDetails'
import { defaultYearRange } from '@/schemas/charts'
import { getInitialFilterState, makeTrendPeriod } from '@/schemas/reporting'
import type { EntityPageExecutionContext } from '../types'
import { getEntityPageQueryPlan } from './entity-page-query-plan'

function createContext(
  overrides: Partial<EntityPageExecutionContext> = {},
): EntityPageExecutionContext {
  return {
    routeId: 'entities',
    cui: '4305857',
    lang: 'ro',
    period: 'YEAR',
    year: 2025,
    reportType: 'PRINCIPAL_AGGREGATED',
    effectiveReportType: 'PRINCIPAL_AGGREGATED',
    publicSettings: {
      normalization: 'total',
      currency: 'RON',
      inflationAdjusted: false,
      showPeriodGrowth: false,
    },
    ...overrides,
  }
}

describe('entity-page-query-plan', () => {
  it.each([
    {
      label: 'default view',
      context: createContext(),
    },
    {
      label: 'overview view',
      context: createContext({ activeView: 'overview' }),
    },
  ])('keeps warmups disabled for $label', ({ context }) => {
    const plan = getEntityPageQueryPlan({ context })

    expect(plan.blocking).toHaveLength(1)
    expect(plan.blocking[0]).toMatchObject({
      id: 'entity-details',
      executionClass: 'blocking',
    })
    expect(plan.blocking[0]?.queryKey).toEqual(
      entityDetailsQueryOptions({
        cui: context.cui,
        normalization: context.publicSettings.normalization,
        currency: context.publicSettings.currency,
        inflation_adjusted: context.publicSettings.inflationAdjusted,
        show_period_growth: context.publicSettings.showPeriodGrowth,
        reportPeriod: getInitialFilterState(
          context.period,
          context.year,
          context.month ?? '01',
          context.quarter ?? 'Q1',
        ),
        reportType: context.effectiveReportType,
        trendPeriod: makeTrendPeriod(
          context.period,
          context.year,
          defaultYearRange.start,
          defaultYearRange.end,
        ),
        mainCreditorCui: context.mainCreditorCui,
      }).queryKey,
    )
    expect(plan.backgroundPrefetch).toEqual([])
    expect(plan.clientOnly).toEqual([])
  })

  it.each(['map', 'income-trends', 'expense-trends', 'contracts'])(
    'does not emit old-view warmups for %s',
    (activeView) => {
      const plan = getEntityPageQueryPlan({
        context: createContext({ activeView }),
      })

      expect(plan.blocking).toHaveLength(1)
      expect(plan.backgroundPrefetch).toEqual([])
      expect(plan.clientOnly).toEqual([])
    },
  )
})
