import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useExperimentalMapSeriesData } from '@/hooks/useExperimentalMapSeriesData';
import { createDefaultExperimentalMapSeries } from '@/schemas/experimental-map';
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

describe('useExperimentalMapSeriesData', () => {
  beforeEach(() => {
    fetchGroupedSeriesDataMock.mockReset();
  });

  it('keeps query cache stable when only activeSeriesId changes', async () => {
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const secondSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

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
        useExperimentalMapSeriesData({
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

  it('keeps query cache stable when base series order changes', async () => {
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const secondSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

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
        useExperimentalMapSeriesData({
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
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useExperimentalMapSeriesData({
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
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useExperimentalMapSeriesData({
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
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue(
      makeGroupedResponse({
        series: [{ id: baseSeries.id, unit: 'RON' }],
        rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      })
    );

    const wrapper = createWrapper();
    const { rerender, result } = renderHook(
      ({ enabled }) =>
        useExperimentalMapSeriesData({
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
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const insSeries = createDefaultExperimentalMapSeries('ins-series');

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
        useExperimentalMapSeriesData({
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
    const insSeries = createDefaultExperimentalMapSeries('ins-series');
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
        useExperimentalMapSeriesData({
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
    const insSeries = createDefaultExperimentalMapSeries('ins-series');
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
        useExperimentalMapSeriesData({
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
});
