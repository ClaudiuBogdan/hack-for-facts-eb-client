import { describe, expect, it } from 'vitest';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  createDefaultAdvancedMapAnalyticsSeries,
} from '@/schemas/advanced-map-analytics';
import { applyMapRuntimeConfig } from './map-runtime-config';

describe('applyMapRuntimeConfig', () => {
  it('overrides compatible yearly series to the selected year', () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    if (baseSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Preview map',
      series: [
        {
          ...baseSeries,
          filter: {
            ...baseSeries.filter,
            report_period: {
              type: 'YEAR',
              selection: {
                interval: {
                  start: '2025',
                  end: '2025',
                },
              },
            },
          },
        },
      ],
    });

    const nextState = applyMapRuntimeConfig(mapState, {
      selectedYearOverride: 2023,
    });

    const series = nextState.series[0];
    if (!series || series.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    expect(series.filter.report_period).toEqual({
      type: 'YEAR',
      selection: {
        interval: {
          start: '2023',
          end: '2023',
        },
      },
    });
  });

  it('keeps non single-year report periods unchanged', () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    if (baseSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Preview map',
      series: [
        {
          ...baseSeries,
          filter: {
            ...baseSeries.filter,
            report_period: {
              type: 'YEAR',
              selection: {
                interval: {
                  start: '2024',
                  end: '2025',
                },
              },
            },
          },
        },
      ],
    });

    const nextState = applyMapRuntimeConfig(mapState, {
      selectedYearOverride: 2023,
    });

    const series = nextState.series[0];
    if (!series || series.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    expect(series.filter.report_period).toEqual({
      type: 'YEAR',
      selection: {
        interval: {
          start: '2024',
          end: '2025',
        },
      },
    });
  });

  it('overrides compatible series with the provided report period', () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    if (baseSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Preview map',
      series: [
        {
          ...baseSeries,
          filter: {
            ...baseSeries.filter,
            report_period: {
              type: 'YEAR',
              selection: {
                interval: {
                  start: '2025',
                  end: '2025',
                },
              },
            },
          },
        },
      ],
    });

    const nextState = applyMapRuntimeConfig(mapState, {
      reportPeriodOverride: {
        type: 'QUARTER',
        selection: {
          interval: {
            start: '2025-Q2',
            end: '2025-Q2',
          },
        },
      },
      selectedYearOverride: 2023,
    });

    const series = nextState.series[0];
    if (!series || series.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    expect(series.filter.report_period).toEqual({
      type: 'QUARTER',
      selection: {
        interval: {
          start: '2025-Q2',
          end: '2025-Q2',
        },
      },
    });
  });

  it('forces the map view when requested', () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Preview map',
      activeView: 'analytics',
    });

    const nextState = applyMapRuntimeConfig(mapState, {
      forceMapActiveView: true,
    });

    expect(nextState.activeView).toBe('map');
  });

  it('overrides normalization, currency, inflation, and map name on compatible remote series', () => {
    const budgetSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const commitmentsSeries = createDefaultAdvancedMapAnalyticsSeries('commitments-analytics');

    if (budgetSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Expected execution series');
    }

    if (commitmentsSeries.type !== 'commitments-analytics') {
      throw new Error('Expected commitments series');
    }

    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Preview map',
      series: [
        {
          ...budgetSeries,
          filter: {
            ...budgetSeries.filter,
            normalization: 'total',
            currency: 'RON',
            inflation_adjusted: false,
          },
        },
        {
          ...commitmentsSeries,
          filter: {
            ...commitmentsSeries.filter,
            normalization: 'total',
            currency: 'RON',
            inflation_adjusted: false,
          },
        },
      ],
    });

    const nextState = applyMapRuntimeConfig(mapState, {
      reportTypeOverride: 'Executie bugetara detaliata',
      normalizationOverride: 'per_capita',
      currencyOverride: 'EUR',
      inflationAdjustedOverride: true,
      mapNameOverride: 'Cheltuieli UAT (2024)',
    });

    expect(nextState.mapName).toBe('Cheltuieli UAT (2024)');
    expect(nextState.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'line-items-aggregated-yearly',
          filter: expect.objectContaining({
            report_type: 'Executie bugetara detaliata',
            normalization: 'per_capita',
            currency: 'EUR',
            inflation_adjusted: true,
          }),
        }),
        expect.objectContaining({
          type: 'commitments-analytics',
          filter: expect.objectContaining({
            normalization: 'per_capita',
            currency: 'EUR',
            inflation_adjusted: true,
          }),
        }),
      ])
    );
  });
});


describe('annual population runtime year', () => {
  function state(period: {type: 'YEAR' | 'MONTH'; selection: {interval: {start: string; end: string}}}) {
    const budget = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    if (budget.type !== 'line-items-aggregated-yearly') throw new Error('Expected budget');
    return AdvancedMapAnalyticsUrlStateSchema.parse({series: [
      {...budget, filter: {...budget.filter, report_period: period}},
      {type: 'geojson-dataset-series', id: 'population', datasetKey: 'annualPopulation', year: 2025},
      {type: 'geojson-dataset-series', id: 'census', datasetKey: 'insPop2021'},
    ]});
  }
  it.each([
    [{type: 'YEAR' as const, selection: {interval: {start: '2025', end: '2025'}}}, 2023],
    [{type: 'YEAR' as const, selection: {interval: {start: '2024', end: '2025'}}}, 2025],
    [{type: 'MONTH' as const, selection: {interval: {start: '2024-01', end: '2024-09'}}}, 2024],
  ])('follows the effective financial period %#', (period, expectedYear) => {
    const next = applyMapRuntimeConfig(state(period), {selectedYearOverride: 2023});
    expect(next.series.find(series => series.id === 'population')).toMatchObject({year: expectedYear});
    expect(next.series.find(series => series.id === 'census')).not.toHaveProperty('year');
  });
  it('uses the latest explicit interval year and preserves saved years without overrides', () => {
    const original = state({type: 'YEAR', selection: {interval: {start: '2025', end: '2025'}}});
    expect(applyMapRuntimeConfig(original, {}).series.find(series => series.id === 'population')).toMatchObject({year: 2025});
    const next = applyMapRuntimeConfig(original, {selectedYearOverride: 2023, reportPeriodOverride: {type: 'YEAR', selection: {interval: {start: '2021', end: '2024'}}}});
    expect(next.series.find(series => series.id === 'population')).toMatchObject({year: 2024});
  });
});
