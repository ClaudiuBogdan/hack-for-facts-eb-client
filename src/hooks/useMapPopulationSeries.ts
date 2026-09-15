import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { GeoJsonObject } from 'geojson';
import type { UatFeature } from '@/components/maps/interfaces';
import type { MapSupportedSeries } from '@/schemas/advanced-map-analytics';
import { fetchMapPopulation } from '@/lib/api/map-population';
import {
  buildPopulationVectors,
  populationSeriesInUse,
} from '@/lib/map-series/population';
import { useGeoJsonData } from './useGeoJson';

function features(data: GeoJsonObject | undefined): UatFeature[] {
  return data && 'features' in data && Array.isArray(data.features)
    ? (data.features as UatFeature[])
    : [];
}

/** Shared by editor and public viewer; TanStack deduplicates each year/level request. */
export function useMapPopulationSeries(
  series: MapSupportedSeries[],
  granularity: 'UAT' | 'County',
  enabled: boolean,
  roots?: ReadonlySet<string>,
) {
  const populationSeries = populationSeriesInUse(series, roots);
  const active = enabled && populationSeries.length > 0;
  const geometry = useGeoJsonData(granularity, { enabled: active });
  const years = [
    ...new Set(
      populationSeries.flatMap((entry) =>
        entry.datasetKey === 'annualPopulation' && entry.year !== undefined
          ? [entry.year]
          : [],
      ),
    ),
  ].sort();
  const queries = useQueries({
    queries: years.map((year) => ({
      queryKey: ['mapAnnualPopulation', granularity, year],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchMapPopulation(year, granularity, signal),
      staleTime: 0,
      gcTime: 0,
      enabled: active && typeof window !== 'undefined',
    })),
  });
  const result = useMemo(
    () =>
      buildPopulationVectors(
        populationSeries,
        features(geometry.data),
        granularity,
        new Map(
          queries.flatMap((query, index) =>
            query.data ? [[years[index], query.data] as const] : [],
          ),
        ),
      ),
    [populationSeries, geometry.data, granularity, queries, years],
  );
  return {
    ...result,
    isLoading:
      active &&
      (geometry.isLoading || queries.some((query) => query.isLoading)),
    isFetching:
      active &&
      (geometry.isFetching || queries.some((query) => query.isFetching)),
    error: active
      ? (geometry.error ?? queries.find((query) => query.error)?.error ?? null)
      : null,
  };
}
