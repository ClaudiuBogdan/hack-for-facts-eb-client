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
