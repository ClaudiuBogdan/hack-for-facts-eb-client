import { describe, expect, it } from 'vitest'
import {
  applyPrimarieEntityCanonicalSearchPatch,
  filterPrimarieEntityRedirectSearchPatch,
  hasPrimarieEntityCanonicalSearchPatch,
  resolvePrimarieEntityRouteAdapter,
} from './primarie-entity-route-adapter'

describe('resolvePrimarieEntityRouteAdapter', () => {
  it('builds a canonical patch when invalid primarie search values need defaults', () => {
    const result = resolvePrimarieEntityRouteAdapter({
      cui: '4305857',
      search: {
        period: 'invalid',
        year: 2024,
        month: '99',
        quarter: 'Q9',
        report_type: 'DETAILED',
        normalization: 'total',
        view: 'main-info',
        treemap_account: 'ch',
        treemap_primary: 'fn',
        treemap_depth: 'invalid-depth',
        evolution_account: 'ch',
        evolution_primary: 'fn',
        public_map: 'expenses',
        main_creditor_cui: '   ',
      } as any,
    })

    expect(result.normalizedSearch).toMatchObject({
      period: 'YEAR',
      year: 2024,
      month: '01',
      quarter: 'Q1',
      report_type: 'DETAILED',
      main_creditor_cui: undefined,
      treemap_depth: 'chapter',
    })
    expect(result.canonicalSearchPatch).toStrictEqual({
      period: 'YEAR',
      month: undefined,
      quarter: undefined,
      main_creditor_cui: undefined,
      treemap_depth: 'chapter',
    })
    expect(result.shouldCanonicalizeSearch).toBe(true)
    expect(
      hasPrimarieEntityCanonicalSearchPatch(result.canonicalSearchPatch),
    ).toBe(true)
  })

  it('derives initial settings from URL-only public settings defaults', () => {
    const result = resolvePrimarieEntityRouteAdapter({
      cui: '4305857',
      search: {
        normalization: 'per_capita',
      },
    })

    expect(result.initialSettings).toStrictEqual({
      currency: 'RON',
      inflationAdjusted: false,
    })
    expect(result.executionContext.publicSettings).toStrictEqual({
      normalization: 'per_capita',
      currency: 'RON',
      inflationAdjusted: false,
      showPeriodGrowth: false,
    })
    expect(result.shouldCanonicalizeSearch).toBe(true)
  })

  it('builds the primarie execution context and exact query inputs for detailed monthly reports', () => {
    const result = resolvePrimarieEntityRouteAdapter({
      cui: '4267117',
      search: {
        period: 'MONTH',
        year: 2024,
        month: '03',
        report_type: 'DETAILED',
        main_creditor_cui: ' 1234567 ',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
        view: 'contracts',
      },
    })

    expect(result.executionContext).toStrictEqual({
      routeId: 'primarie',
      cui: '4267117',
      lang: undefined,
      period: 'MONTH',
      year: 2024,
      month: '03',
      quarter: undefined,
      reportType: 'DETAILED',
      effectiveReportType: 'DETAILED',
      mainCreditorCui: '1234567',
      activeView: 'contracts',
      publicSettings: {
        normalization: 'per_capita',
        currency: 'EUR',
        inflationAdjusted: true,
        showPeriodGrowth: false,
      },
    })
    expect(result.exactQueryInputs).toStrictEqual({
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
        reportType: 'DETAILED',
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
        show_period_growth: false,
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
        reportType: 'DETAILED',
        mainCreditorCui: '1234567',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
      },
    })
  })

  it('preserves primarie-specific normalized search behavior for challenge views and map state', () => {
    const result = resolvePrimarieEntityRouteAdapter({
      cui: '4305857',
      search: {
        period: 'MONTH',
        year: 2025,
        month: '02',
        report_type: 'PRINCIPAL_AGGREGATED',
        normalization: 'total',
        view: 'profile',
        treemap_account: 'vn',
        treemap_primary: 'ec',
        treemap_depth: 'chapter',
        evolution_account: 'vn',
        evolution_primary: 'ec',
        public_map: 'local-taxes',
      },
    })

    expect(result.normalizedSearch).toMatchObject({
      period: 'MONTH',
      year: 2025,
      month: '02',
      report_type: 'PRINCIPAL_AGGREGATED',
      view: 'profile',
      treemap_account: 'vn',
      treemap_primary: 'fn',
      evolution_account: 'vn',
      evolution_primary: 'fn',
      public_map: 'local-taxes',
    })
    expect(result.canonicalSearchPatch).toStrictEqual({
      treemap_primary: 'fn',
      evolution_primary: 'fn',
    })
    expect(
      hasPrimarieEntityCanonicalSearchPatch(result.canonicalSearchPatch),
    ).toBe(true)
    expect(hasPrimarieEntityCanonicalSearchPatch({})).toBe(false)
  })

  it('applies canonical patches by removing undefined keys instead of retaining them', () => {
    expect(
      applyPrimarieEntityCanonicalSearchPatch(
        {
          period: 'YEAR',
          month: '03',
          quarter: 'Q1',
          public_map: 'legacy-map',
          insDataset: 'POP107D',
        },
        {
          month: undefined,
          quarter: undefined,
          public_map: 'expenses',
        },
      ),
    ).toStrictEqual({
      period: 'YEAR',
      public_map: 'expenses',
      insDataset: 'POP107D',
    })
  })

  it('filters redirect patches so omitted defaults do not trigger a redirect', () => {
    expect(
      filterPrimarieEntityRedirectSearchPatch(
        {},
        {
          period: 'YEAR',
          year: 2025,
          view: 'main-info',
        },
      ),
    ).toStrictEqual({})

    expect(
      filterPrimarieEntityRedirectSearchPatch(
        {
          period: 'invalid',
          month: '03',
          public_map: 'legacy-map',
        },
        {
          period: 'YEAR',
          month: undefined,
          public_map: 'expenses',
        },
      ),
    ).toStrictEqual({
      period: 'YEAR',
      month: undefined,
      public_map: 'expenses',
    })
  })
})
