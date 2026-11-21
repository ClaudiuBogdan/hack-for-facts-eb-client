import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { GeoJsonDatasetSeriesConfigurationSchema } from '@/schemas/advanced-map-analytics';
import { useMapPopulationSeries } from './useMapPopulationSeries';
const fetchPopulation = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/map-population', () => ({
  fetchMapPopulation: fetchPopulation,
}));
// Stable data inside a fresh wrapper, as the real query returns: the identity tests below must not depend on the
// wrapper object.
const geometry = vi.hoisted(() => ({
    data: {
      type: 'FeatureCollection',
      features: [
        {
          properties: {
            natcode: '179141',
            countyId: 40,
            regionId: 8,
            insPop2021: 224764,
          },
        },
      ],
    },
    isLoading: false,
    isFetching: false,
    error: null,
}));
vi.mock('./useGeoJson', () => ({
  useGeoJsonData: () => ({ ...geometry }),
}));
const series = GeoJsonDatasetSeriesConfigurationSchema.parse({
  type: 'geojson-dataset-series',
  id: 'p',
  datasetKey: 'annualPopulation',
  year: 2025,
});
function wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchPopulation.mockReset();
});
describe('shared map population loading', () => {
  it('does not fetch or fail on an unused disabled population series', () => {
    const { result } = renderHook(
      () =>
        useMapPopulationSeries([{ ...series, enabled: false }], 'UAT', true),
      { wrapper },
    );
    expect(fetchPopulation).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
  it('deduplicates same-year series and reloads when the selected year changes', async () => {
    fetchPopulation.mockImplementation(async (year: number) => [
      {
        territoryCode: '179141',
        territoryId: 1,
        year,
        population: year === 2025 ? 264698 : 259084,
        metadata: null,
      },
    ]);
    const { result, rerender } = renderHook(
      ({ year }) =>
        useMapPopulationSeries(
          [
            { ...series, year },
            { ...series, id: 'second', year },
          ],
          'UAT',
          true,
        ),
      { wrapper, initialProps: { year: 2025 } },
    );
    await waitFor(() =>
      expect(result.current.values.get('p')?.get('179141')).toBe('264698'),
    );
    expect(fetchPopulation).toHaveBeenCalledTimes(1);
    rerender({ year: 2021 });
    await waitFor(() =>
      expect(result.current.values.get('p')?.get('179141')).toBe('259084'),
    );
    expect(fetchPopulation).toHaveBeenCalledTimes(2);
  });
  it('exposes errors without falling back to census', async () => {
    fetchPopulation.mockRejectedValue(new Error('Unavailable'));
    const { result } = renderHook(
      () => useMapPopulationSeries([series], 'UAT', true),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.error?.message).toBe('Unavailable'),
    );
    expect(result.current.values.get('p')?.get('179141')).toBeUndefined();
  });
  // The map recomputes its whole pipeline (values, colour range, styled GeoJSON) whenever these change identity, so a
  // parent re-render with the same inputs — a treemap drill-down on the entity page, for instance — must not.
  it('returns the same vectors when re-rendered with the same inputs', async () => {
    fetchPopulation.mockResolvedValue([
      { territoryCode: '179141', territoryId: 1, year: 2025, population: 264698, metadata: null },
    ]);
    const list = [series];
    const { result, rerender } = renderHook(({ input }) => useMapPopulationSeries(input, 'UAT', true), {
      wrapper,
      initialProps: { input: list },
    });
    await waitFor(() => expect(result.current.values.get('p')?.get('179141')).toBe('264698'));
    const before = result.current;
    rerender({ input: list });
    expect(result.current.values).toBe(before.values);
    expect(result.current.units).toBe(before.units);
    expect(result.current.warnings).toBe(before.warnings);
  });
  it('reports loading and no stale error on the first render after it is re-enabled', async () => {
    fetchPopulation.mockRejectedValueOnce(new Error('Unavailable'))
    const list = [series];
    const { result, rerender } = renderHook(({ enabled }) => useMapPopulationSeries(list, 'UAT', enabled), {
      wrapper,
      initialProps: { enabled: true },
    });
    await waitFor(() => expect(result.current.error?.message).toBe('Unavailable'));
    rerender({ enabled: false });
    expect(result.current.error).toBeNull();
    fetchPopulation.mockImplementation(() => new Promise(() => {}));
    rerender({ enabled: true });
    // Checked at once, before any wait: the combined result must reflect the re-enabled query.
    expect(result.current.isLoading || result.current.isFetching).toBe(true);
    expect(result.current.error).toBeNull();
  });
  it('returns the same empty vectors when no population series is in use', () => {
    const list = [{ ...series, enabled: false }];
    const { result, rerender } = renderHook(({ input }) => useMapPopulationSeries(input, 'UAT', true), {
      wrapper,
      initialProps: { input: list },
    });
    const before = result.current;
    rerender({ input: list });
    expect(result.current.values).toBe(before.values);
    expect(result.current.warnings).toBe(before.warnings);
  });
});
