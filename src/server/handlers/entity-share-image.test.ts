import { describe, expect, it } from 'vitest'
import {
  buildEntityShareImageViewModel,
  buildShareImageResponseHeaders,
  formatShareKpiValue,
  resolveEntityShareLocale,
} from './entity-share-image'
import type { EntitySeoSnapshot } from '@/features/entities/seo/entity-share-seo'

function makeBaseSnapshot(): EntitySeoSnapshot {
  return {
    cui: '4305857',
    name: 'MUNICIPIUL CLUJ-NAPOCA',
    entityType: 'city_hall',
    defaultReportType: 'DETAILED',
    countyName: 'Cluj',
    population: 286598,
    totalIncome: 1320000000,
    totalExpenses: 1210000000,
    budgetBalance: 110000000,
    filterContext: {
      year: 2025,
      period: 'YEAR',
      normalization: 'total',
      currency: 'RON',
      inflationAdjusted: false,
      showPeriodGrowth: false,
      lang: 'ro',
    },
  }
}

describe('entity-share-image', () => {
  it('formats KPI values for total, per_capita, and % of GDP', () => {
    const totalValue = formatShareKpiValue({
      value: 1500000000,
      normalization: 'total',
      currency: 'RON',
      locale: 'ro',
    })
    expect(totalValue).toContain('RON')

    const perCapitaValue = formatShareKpiValue({
      value: 3200,
      normalization: 'per_capita',
      currency: 'EUR',
      locale: 'en',
    })
    expect(perCapitaValue).toContain('/capita')

    const percentOfGdpValue = formatShareKpiValue({
      value: 5.4,
      normalization: 'percent_gdp',
      currency: 'RON',
      locale: 'ro',
    })
    expect(percentOfGdpValue.endsWith('%')).toBe(true)
  })

  it('falls back to romanian locale when lang and cookie locale are absent', () => {
    const locale = resolveEntityShareLocale({
      lang: undefined,
      cookieLocale: undefined,
    })

    expect(locale).toBe('ro')
  })

  it('builds a graceful view model when optional fields are missing', () => {
    const baseSnapshot = makeBaseSnapshot()
    const snapshotWithoutOptionals: EntitySeoSnapshot = {
      ...baseSnapshot,
      entityType: null,
      countyName: null,
      population: null,
      name: undefined,
      totalIncome: null,
      totalExpenses: null,
      budgetBalance: null,
    }

    const viewModel = buildEntityShareImageViewModel({
      snapshot: snapshotWithoutOptionals,
      locale: 'ro',
      siteUrl: 'https://transparenta.eu',
    })

    expect(viewModel.badge).toBe('Entitate publică')
    expect(viewModel.title).toContain('Entitatea 4305857')
    expect(viewModel.subtitle).toBe('Executie bugetara detaliata')
    expect(viewModel.yearLabel).toBe('2025')
    expect(viewModel.metaItems).toEqual(['CUI 4305857'])
    expect(viewModel.kpis.every((kpi) => kpi.value === 'N/A')).toBe(true)
  })

  it('prefers query report type over entity default report type for subtitle', () => {
    const snapshot: EntitySeoSnapshot = {
      ...makeBaseSnapshot(),
      defaultReportType: 'DETAILED',
      filterContext: {
        ...makeBaseSnapshot().filterContext,
        reportType: 'SECONDARY_AGGREGATED',
      },
    }

    const viewModel = buildEntityShareImageViewModel({
      snapshot,
      locale: 'en',
      siteUrl: 'https://transparenta.eu',
    })

    expect(viewModel.subtitle).toBe('Budget execution secondary')
  })

  it('uses no-store headers for non-cacheable image responses', () => {
    const noStoreHeaders = buildShareImageResponseHeaders({
      cacheable: false,
    })
    expect(noStoreHeaders['cache-control']).toBe('no-store')
    expect(noStoreHeaders['cdn-cache-control']).toBeUndefined()

    const cacheableHeaders = buildShareImageResponseHeaders({
      cacheable: true,
    })
    expect(cacheableHeaders['cache-control']).toContain('max-age=86400')
    expect(cacheableHeaders['cdn-cache-control']).toContain('max-age=86400')
  })
})
