import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
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

type PopulationRows = Awaited<ReturnType<typeof fetchMapPopulation>>;

/**
 * The year queries as one value, built by a `combine` whose identity depends only on `active`. TanStack reuses a
 * combined result while the results, query hashes and `combine` are unchanged, so the `data` array keeps its identity
 * across renders, which keeps the vectors below memoised. `active` is part of the identity because toggling `enabled`
 * alone does not invalidate that cache: without it, the first render after re-enabling would report the previous
 * status and error.
 */
function usePopulationQueriesCombine(active: boolean) {
  return useCallback(
    (results: readonly UseQueryResult<PopulationRows>[]) => ({
      data: results.map((query) => query.data),
      isLoading: active && results.some((query) => query.isLoading),
      isFetching: active && results.some((query) => query.isFetching),
      error: active ? (results.find((query) => query.error)?.error ?? null) : null,
    }),
    [active],
  );
}

/**
 * Shared by editor and public viewer; TanStack deduplicates each year/level request.
 *
 * The returned `values`, `units` and `warnings` keep their identity while the inputs and data are unchanged: the map
 * recomputes its whole pipeline from them, and its parents re-render often (a treemap drill-down on the entity page
 * re-renders the whole page).
 */
export function useMapPopulationSeries(
  series: MapSupportedSeries[],
  granularity: 'UAT' | 'County',
  enabled: boolean,
  roots?: ReadonlySet<string>,
) {
  const populationSeries = useMemo(
    () => populationSeriesInUse(series, roots),
    [series, roots],
  );
  const active = enabled && populationSeries.length > 0;
  const geometry = useGeoJsonData(granularity, { enabled: active });
  const years = useMemo(
    () =>
      [
        ...new Set(
          populationSeries.flatMap((entry) =>
            entry.datasetKey === 'annualPopulation' && entry.year !== undefined
              ? [entry.year]
              : [],
          ),
        ),
      ].sort(),
    [populationSeries],
  );
  const populationQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: ['mapAnnualPopulation', granularity, year],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchMapPopulation(year, granularity, signal),
      staleTime: 0,
      gcTime: 0,
      enabled: active && typeof window !== 'undefined',
    })),
    combine: usePopulationQueriesCombine(active),
  });
  const result = useMemo(
    () =>
      buildPopulationVectors(
        populationSeries,
        features(geometry.data),
        granularity,
        new Map(
          populationQueries.data.flatMap((rows, index) =>
            rows ? [[years[index], rows] as const] : [],
          ),
        ),
      ),
    [populationSeries, geometry.data, granularity, populationQueries.data, years],
  );
  return {
    ...result,
    isLoading: active && (geometry.isLoading || populationQueries.isLoading),
    isFetching: active && (geometry.isFetching || populationQueries.isFetching),
    error: active ? (geometry.error ?? populationQueries.error) : null,
  };
}
