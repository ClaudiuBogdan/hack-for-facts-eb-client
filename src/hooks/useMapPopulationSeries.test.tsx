import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { GeoJsonDatasetSeriesConfigurationSchema } from '@/schemas/advanced-map-analytics';
import { useMapPopulationSeries } from './useMapPopulationSeries';
const fetchPopulation = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/map-population', () => ({
  fetchMapPopulation: fetchPopulation,
}));
vi.mock('./useGeoJson', () => ({
  useGeoJsonData: () => ({
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
  }),
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
});
