import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useExperimentalMapSeriesData } from '@/hooks/useExperimentalMapSeriesData';
import { createDefaultExperimentalMapSeries } from '@/schemas/experimental-map';

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

describe('useExperimentalMapSeriesData', () => {
  beforeEach(() => {
    fetchGroupedSeriesDataMock.mockReset();
  });

  it('keeps query cache stable when only activeSeriesId changes', async () => {
    const baseSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');
    const secondSeries = createDefaultExperimentalMapSeries('line-items-aggregated-yearly');

    fetchGroupedSeriesDataMock.mockResolvedValue({
      manifest: {
        generated_at: new Date().toISOString(),
        format: 'long_rows_v1',
        granularity: 'UAT',
        series: [
          { series_id: baseSeries.id, unit: 'RON', row_count: 1 },
          { series_id: secondSeries.id, unit: 'RON', row_count: 1 },
        ],
      },
      rows: [
        { series_id: baseSeries.id, siruta_code: '1001', value: 10 },
        { series_id: secondSeries.id, siruta_code: '1001', value: 20 },
      ],
      warnings: [],
    });

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

    fetchGroupedSeriesDataMock.mockResolvedValue({
      manifest: {
        generated_at: new Date().toISOString(),
        format: 'long_rows_v1',
        granularity: 'UAT',
        series: [
          { series_id: baseSeries.id, unit: 'RON', row_count: 1 },
          { series_id: secondSeries.id, unit: 'RON', row_count: 1 },
        ],
      },
      rows: [
        { series_id: baseSeries.id, siruta_code: '1001', value: 10 },
        { series_id: secondSeries.id, siruta_code: '1001', value: 20 },
      ],
      warnings: [],
    });

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

    fetchGroupedSeriesDataMock.mockResolvedValue({
      manifest: {
        generated_at: new Date().toISOString(),
        format: 'long_rows_v1',
        granularity: 'UAT',
        series: [{ series_id: baseSeries.id, unit: 'RON', row_count: 1 }],
      },
      rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      warnings: [],
    });

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

    fetchGroupedSeriesDataMock.mockResolvedValue({
      manifest: {
        generated_at: new Date().toISOString(),
        format: 'long_rows_v1',
        granularity: 'UAT',
        series: [{ series_id: baseSeries.id, unit: 'RON', row_count: 1 }],
      },
      rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      warnings: [],
    });

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

    fetchGroupedSeriesDataMock.mockResolvedValue({
      manifest: {
        generated_at: new Date().toISOString(),
        format: 'long_rows_v1',
        granularity: 'UAT',
        series: [{ series_id: baseSeries.id, unit: 'RON', row_count: 1 }],
      },
      rows: [{ series_id: baseSeries.id, siruta_code: '1001', value: 10 }],
      warnings: [],
    });

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
});
