import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useAdvancedMapAnalyticsSeriesData } from '@/hooks/useAdvancedMapAnalyticsSeriesData';
import {
  createDefaultAdvancedMapAnalyticsSeries,
  createDefaultAdvancedMapAnalyticsStatsValueFilterRule,
  createDefaultAdvancedMapAnalyticsValueFilterRule,
} from '@/schemas/advanced-map-analytics';
import { getRemoteGroupedSeriesHash } from '@/lib/map-series/grouped-series-request';
import { serializeGroupedSeriesWideMatrixCsv } from '@/lib/map-series/csv';

const fetchGroupedSeriesDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/map-series', () => ({
  fetchGroupedSeriesData: fetchGroupedSeriesDataMock,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makeGroupedResponse(input: {
  series: Array<{ id: string; unit?: string }>;
  rows: Array<{ series_id: string; siruta_code: string; value: number }>;
}) {
  const seriesOrder = input.series.map((series) => series.id);

  return {
    manifest: {
      generated_at: new Date().toISOString(),
      format: 'wide_matrix_v1' as const,
      granularity: 'UAT' as const,
      series: input.series.map((series) => ({
        series_id: series.id,
        unit: series.unit,
        defined_value_count: input.rows.filter((row) => row.series_id === series.id).length,
      })),
    },
    payload: {
      mime: 'text/csv' as const,
      compression: 'none' as const,
      data: serializeGroupedSeriesWideMatrixCsv(input.rows, seriesOrder),
    },
    warnings: [],
  };
}

describe('useAdvancedMapAnalyticsSeriesData', () => {
  beforeEach(() => {
    fetchGroupedSeriesDataMock.mockReset();
  });

  it('keeps query cache stable when only activeSeriesId changes', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const secondSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [
          { id: baseSeries.id, unit: 'RON' },
          { id: secondSeries.id, unit: 'RON' },
        ],
        rows: [
          { series_id: baseSeries.id, siruta_code: '1001', value: 10 },
          { series_id: secondSeries.id, siruta_code: '1001', value: 20 },
        ],
      })
    );

    const wrapper = createWrapper();

    const { result, rerender } = renderHook(
      ({ activeSeriesId }) =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries, secondSeries],
          activeSeriesId,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 100,
        }),
      {
        wrapper,
        initialProps: { activeSeriesId: baseSeries.id },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
    expect(result.current.activeSeriesId).toBe(baseSeries.id);

    rerender({ activeSeriesId: secondSeries.id });

    await waitFor(() => {
      expect(result.current.activeSeriesId).toBe(secondSeries.id);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
  });

  it('uses bundled grouped-series data when bundled hash matches current series hash', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const bundledData = makeGroupedResponse({
      series: [{ id: baseSeries.id, unit: 'RON' }],
      rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          bundledGroupedSeriesData: bundledData,
          bundledRemoteBaseSeriesHash: getRemoteGroupedSeriesHash([baseSeries]),
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).not.toHaveBeenCalled();
    expect(result.current.valuesBySeriesId.get(baseSeries.id)?.get('1001')).toBe(10);
  });

  it('falls back to grouped-series endpoint when bundled hash does not match current series hash', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const bundledData = makeGroupedResponse({
      series: [{ id: baseSeries.id, unit: 'RON' }],
      rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
    });

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 30 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          bundledGroupedSeriesData: bundledData,
          bundledRemoteBaseSeriesHash: 'different_hash',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
    expect(result.current.valuesBySeriesId.get(baseSeries.id)?.get('1001')).toBe(30);
  });

  it('does not inject viewer default currency or inflation flags into remote fetch payload', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    if (baseSeries.type !== 'line-items-aggregated-yearly') {
      throw new Error('Unexpected series type in test setup');
    }
    delete baseSeries.filter.currency;
    delete baseSeries.filter.inflation_adjusted;

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'USD',
          defaultInflationAdjusted: true,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
    const request = fetchGroupedSeriesDataMock.mock.calls[0]?.[0];
    expect(request?.series[0]?.filter?.currency).toBeUndefined();
    expect(request?.series[0]?.filter?.inflation_adjusted).toBeUndefined();
  });

  it('keeps query cache stable when base series order changes', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const secondSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [
          { id: baseSeries.id, unit: 'RON' },
          { id: secondSeries.id, unit: 'RON' },
        ],
        rows: [
          { series_id: baseSeries.id, siruta_code: '1001', value: 10 },
          { series_id: secondSeries.id, siruta_code: '1001', value: 20 },
        ],
      })
    );

    const wrapper = createWrapper();

    const { result, rerender } = renderHook(
      ({ series }) =>
        useAdvancedMapAnalyticsSeriesData({
          series,
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 100,
        }),
      {
        wrapper,
        initialProps: { series: [baseSeries, secondSeries] },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);

    rerender({ series: [secondSeries, baseSeries] });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
  });

  it('emits URL budget warning when search payload is too large', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 2200,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.warnings.some((warning) => warning.type === 'url_budget')).toBe(true);
  });

  it('does not fetch when hook is disabled', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 120,
          enabled: false,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).not.toHaveBeenCalled();
  });

  it('fetches once after being re-enabled', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { rerender, result } = renderHook(
      ({ enabled }) =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 120,
          enabled,
        }),
      {
        wrapper,
        initialProps: { enabled: false },
      }
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
  });

  it('loads INS series values and units from grouped-series payload', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const insSeries = createDefaultAdvancedMapAnalyticsSeries('ins-series');

    fetchGroupedSeriesDataMock.mockResolvedValueOnce({
      ...makeGroupedResponse({
        series: [
          { id: baseSeries.id, unit: 'RON' },
          { id: insSeries.id, unit: 'pers.' },
        ],
        rows: [
          { series_id: baseSeries.id, siruta_code: '1001', value: 10 },
          { series_id: insSeries.id, siruta_code: '1001', value: 25 },
          { series_id: insSeries.id, siruta_code: '1002', value: 30 },
        ],
      }),
      warnings: [
        {
          type: 'missing_population',
          message: 'Per-capita value is undefined because population is missing',
          seriesId: baseSeries.id,
        },
      ],
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries, insSeries],
          activeSeriesId: insSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 100,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
    expect(result.current.valuesBySeriesId.get(insSeries.id)?.get('1001')).toBe(25);
    expect(result.current.unitsBySeriesId.get(insSeries.id)).toBe('pers.');
    expect(
      result.current.warnings.some((warning) => warning.type === 'missing_population')
    ).toBe(true);
  });

  it('keeps INS unit override when manifest unit is missing', async () => {
    const insSeries = createDefaultAdvancedMapAnalyticsSeries('ins-series');
    if (insSeries.type !== 'ins-series') {
      throw new Error('Unexpected series type in test setup');
    }
    insSeries.unit = 'pers.';

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: insSeries.id }],
        rows: [{ series_id: insSeries.id, siruta_code: '1001', value: 25 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [insSeries],
          activeSeriesId: insSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 100,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unitsBySeriesId.get(insSeries.id)).toBe('pers.');
  });

  it('does not use implicit RON as INS fallback unit when manifest unit is missing', async () => {
    const insSeries = createDefaultAdvancedMapAnalyticsSeries('ins-series');
    if (insSeries.type !== 'ins-series') {
      throw new Error('Unexpected series type in test setup');
    }
    insSeries.unit = 'RON';

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: insSeries.id }],
        rows: [{ series_id: insSeries.id, siruta_code: '1001', value: 25 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [insSeries],
          activeSeriesId: insSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          urlSearchLength: 100,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unitsBySeriesId.get(insSeries.id)).toBeUndefined();
  });

  it('loads local geojson dataset vectors without remote fetch rows', async () => {
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [geojsonSeries],
          activeSeriesId: geojsonSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          localValuesBySeriesId: new Map([
            [
              geojsonSeries.id,
              new Map<string, number | undefined>([
                ['1001', 5400],
                ['1002', 2100],
              ]),
            ],
          ]),
          localUnitsBySeriesId: new Map([[geojsonSeries.id, 'inhabitants']]),
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).not.toHaveBeenCalled();
    expect(result.current.valuesBySeriesId.get(geojsonSeries.id)?.get('1001')).toBe(5400);
    expect(result.current.unitsBySeriesId.get(geojsonSeries.id)).toBe('inhabitants');
  });

  it('excludes geojson dataset series from grouped-series API payload', async () => {
    const executionSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected series type in test setup');
    }

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: executionSeries.id, unit: 'RON' }],
        rows: [{ series_id: executionSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [executionSeries, geojsonSeries],
          activeSeriesId: executionSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          localValuesBySeriesId: new Map([
            [geojsonSeries.id, new Map([['1001', 32]])],
          ]),
          localUnitsBySeriesId: new Map([[geojsonSeries.id, 'code']]),
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
    const firstCallArg = fetchGroupedSeriesDataMock.mock.calls[0]?.[0];
    expect(firstCallArg?.series).toHaveLength(1);
    expect(firstCallArg?.series[0]?.id).toBe(executionSeries.id);
  });

  it('supports calculations depending on geojson dataset series', async () => {
    const geojsonSeries = createDefaultAdvancedMapAnalyticsSeries('geojson-dataset-series');
    const calculationSeries = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');

    if (geojsonSeries.type !== 'geojson-dataset-series') {
      throw new Error('Unexpected geojson series type in test setup');
    }
    if (calculationSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series type in test setup');
    }

    calculationSeries.calculation = {
      op: 'sum',
      args: [geojsonSeries.id, 1],
    };

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [geojsonSeries, calculationSeries],
          activeSeriesId: calculationSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
          localValuesBySeriesId: new Map([
            [
              geojsonSeries.id,
              new Map<string, number | undefined>([
                ['1001', 9],
                ['1002', 4],
              ]),
            ],
          ]),
          localUnitsBySeriesId: new Map([[geojsonSeries.id, 'inhabitants']]),
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.valuesBySeriesId.get(calculationSeries.id)?.get('1001')).toBe(10);
    expect(result.current.valuesBySeriesId.get(calculationSeries.id)?.get('1002')).toBe(5);
  });

  it('applies value filters after calculations', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const calcSeries = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    if (calcSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series type in test setup');
    }

    calcSeries.calculation = {
      op: 'sum',
      args: [baseSeries.id, 1],
    };

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [
          { series_id: baseSeries.id, siruta_code: '1001', value: 2 },
          { series_id: baseSeries.id, siruta_code: '1002', value: 10 },
        ],
      })
    );

    const rule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    rule.operator = 'lt';
    rule.value = 5;

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries, calcSeries],
          activeSeriesId: calcSeries.id,
          valueFilterRules: [rule],
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.valuesBySeriesId.get(calcSeries.id)?.has('1001')).toBe(true);
    expect(result.current.valuesBySeriesId.get(calcSeries.id)?.has('1002')).toBe(false);
  });

  it('does not include calculation warnings from disabled series outside current scope', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const disabledCalcSeries = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    if (disabledCalcSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series type in test setup');
    }

    disabledCalcSeries.enabled = false;
    disabledCalcSeries.calculation = {
      op: 'divide',
      args: [1, 0],
    };

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries, disabledCalcSeries],
          activeSeriesId: baseSeries.id,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.warnings.some((warning) => warning.seriesId === disabledCalcSeries.id)).toBe(false);
  });

  it('keeps calculation warnings for disabled series used by active value filters', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const disabledCalcSeries = createDefaultAdvancedMapAnalyticsSeries('aggregated-series-calculation');
    if (disabledCalcSeries.type !== 'aggregated-series-calculation') {
      throw new Error('Unexpected calculation series type in test setup');
    }

    disabledCalcSeries.enabled = false;
    disabledCalcSeries.calculation = {
      op: 'divide',
      args: [1, 0],
    };

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const sourceRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    sourceRule.seriesRef = {
      mode: 'series',
      seriesId: disabledCalcSeries.id,
    };
    sourceRule.operator = 'is_defined';

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries, disabledCalcSeries],
          activeSeriesId: baseSeries.id,
          valueFilterRules: [sourceRule],
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(
      result.current.warnings.some((warning) =>
        warning.type === 'divide_by_zero' && warning.seriesId === disabledCalcSeries.id
      )
    ).toBe(true);
  });

  it('supports active-series dynamic value filter source without refetch', async () => {
    const firstSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const secondSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [
          { id: firstSeries.id, unit: 'RON' },
          { id: secondSeries.id, unit: 'RON' },
        ],
        rows: [
          { series_id: firstSeries.id, siruta_code: '1001', value: 10 },
          { series_id: firstSeries.id, siruta_code: '1002', value: 2 },
          { series_id: secondSeries.id, siruta_code: '1001', value: 1 },
          { series_id: secondSeries.id, siruta_code: '1002', value: 20 },
        ],
      })
    );

    const rule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    rule.operator = 'gt';
    rule.value = 5;

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ activeSeriesId }) =>
        useAdvancedMapAnalyticsSeriesData({
          series: [firstSeries, secondSeries],
          activeSeriesId,
          valueFilterRules: [rule],
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
        }),
      {
        wrapper,
        initialProps: { activeSeriesId: firstSeries.id },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.valuesBySeriesId.get(firstSeries.id)?.has('1001')).toBe(true);
    expect(result.current.valuesBySeriesId.get(firstSeries.id)?.has('1002')).toBe(false);
    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);

    rerender({ activeSeriesId: secondSeries.id });

    await waitFor(() => {
      expect(result.current.activeSeriesId).toBe(secondSeries.id);
    });

    expect(result.current.valuesBySeriesId.get(secondSeries.id)?.has('1002')).toBe(true);
    expect(result.current.valuesBySeriesId.get(secondSeries.id)?.has('1001')).toBe(false);
    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
  });

  it('uses explicit filter source series even when source is disabled for display', async () => {
    const spendingSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    const populationSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');
    populationSeries.enabled = false;

    fetchGroupedSeriesDataMock.mockResolvedValueOnce(
      makeGroupedResponse({
        series: [
          { id: spendingSeries.id, unit: 'RON' },
          { id: populationSeries.id, unit: 'inhabitants' },
        ],
        rows: [
          { series_id: spendingSeries.id, siruta_code: '1001', value: 100 },
          { series_id: spendingSeries.id, siruta_code: '1002', value: 200 },
          { series_id: populationSeries.id, siruta_code: '1001', value: 4500 },
          { series_id: populationSeries.id, siruta_code: '1002', value: 1500 },
        ],
      })
    );

    const populationRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    populationRule.seriesRef = {
      mode: 'series',
      seriesId: populationSeries.id,
    };
    populationRule.operator = 'gte';
    populationRule.value = 3000;

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useAdvancedMapAnalyticsSeriesData({
          series: [spendingSeries, populationSeries],
          activeSeriesId: spendingSeries.id,
          valueFilterRules: [populationRule],
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.valuesBySeriesId.has(populationSeries.id)).toBe(false);
    expect(result.current.valuesBySeriesId.get(spendingSeries.id)?.has('1001')).toBe(true);
    expect(result.current.valuesBySeriesId.get(spendingSeries.id)?.has('1002')).toBe(false);
  });

  it('does not refetch when value filter rules change', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [
          { series_id: baseSeries.id, siruta_code: '1001', value: 10 },
          { series_id: baseSeries.id, siruta_code: '1002', value: 20 },
        ],
      })
    );

    const wrapper = createWrapper();
    const firstRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    firstRule.operator = 'gt';
    firstRule.value = 5;

    const secondRule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    secondRule.operator = 'gt';
    secondRule.value = 15;

    const { result, rerender } = renderHook(
      ({ rules }) =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          valueFilterRules: rules,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
        }),
      {
        wrapper,
        initialProps: { rules: [firstRule] },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.valuesBySeriesId.get(baseSeries.id)?.size).toBe(2);
    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);

    rerender({ rules: [secondRule] });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.valuesBySeriesId.get(baseSeries.id)?.size).toBe(1);
    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when stats value filter parameters change', async () => {
    const baseSeries = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [
          { series_id: baseSeries.id, siruta_code: '1001', value: 10 },
          { series_id: baseSeries.id, siruta_code: '1002', value: 20 },
          { series_id: baseSeries.id, siruta_code: '1003', value: 30 },
        ],
      })
    );

    const wrapper = createWrapper();
    const firstRule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule('percentile_band');
    firstRule.minPercentile = 0;
    firstRule.maxPercentile = 50;

    const secondRule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule('percentile_band');
    secondRule.minPercentile = 50;
    secondRule.maxPercentile = 100;

    const { result, rerender } = renderHook(
      ({ rules }) =>
        useAdvancedMapAnalyticsSeriesData({
          series: [baseSeries],
          activeSeriesId: baseSeries.id,
          valueFilterRules: rules,
          defaultCurrency: 'RON',
          defaultInflationAdjusted: false,
        }),
      {
        wrapper,
        initialProps: { rules: [firstRule] },
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
    expect(result.current.valuesBySeriesId.get(baseSeries.id)?.size).toBe(2);

    rerender({ rules: [secondRule] });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(fetchGroupedSeriesDataMock).toHaveBeenCalledTimes(1);
    expect(result.current.valuesBySeriesId.get(baseSeries.id)?.size).toBe(2);
  });
});
