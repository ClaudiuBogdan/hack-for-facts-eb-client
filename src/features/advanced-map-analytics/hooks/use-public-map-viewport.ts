import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  areMapViewportsEqual,
  normalizeMapViewport,
  type MapViewport,
} from '@/features/advanced-map-analytics/map-viewport-utils';
import { parseSearchParamJson } from '@/lib/router-search';

export type PublicMapViewport = MapViewport;

const PublicMapViewportSearchSchema = z.object({
  mapCenter: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]).optional(),
  mapZoom: z.number().min(1).max(20).optional(),
});

interface UsePublicMapViewportUrlSyncInput {
  rawSearch: unknown;
  updatePublicMapSearch: (
    searchUpdater: (previousSearch: Record<string, unknown>) => Record<string, unknown>
  ) => void;
}

interface UsePublicMapViewportUrlSyncResult {
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange: (nextViewport: PublicMapViewport) => void;
}

export function usePublicMapViewportUrlSync({
  rawSearch,
  updatePublicMapSearch,
}: Readonly<UsePublicMapViewportUrlSyncInput>): UsePublicMapViewportUrlSyncResult {
  const [windowSearchFallback, setWindowSearchFallback] = useState<{
    mapZoom?: number;
    mapCenter?: [number, number];
  }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mapZoom = parseSearchParamJson(params.get('mapZoom'));
    const mapCenter = parseSearchParamJson(params.get('mapCenter'));

    const parsedZoom = PublicMapViewportSearchSchema.shape.mapZoom.safeParse(mapZoom);
    const parsedCenter = PublicMapViewportSearchSchema.shape.mapCenter.safeParse(mapCenter);

    setWindowSearchFallback({
      ...(parsedZoom.success ? { mapZoom: parsedZoom.data } : {}),
      ...(parsedCenter.success ? { mapCenter: parsedCenter.data } : {}),
    });
  }, []);

  const parsedViewportSearch = useMemo(() => {
    const record =
      typeof rawSearch === 'object' && rawSearch !== null
        ? (rawSearch as Record<string, unknown>)
        : {};

    const mapZoomCandidate = record.mapZoom ?? windowSearchFallback.mapZoom;
    const mapCenterCandidate = record.mapCenter ?? windowSearchFallback.mapCenter;

    const parsedMapZoom = PublicMapViewportSearchSchema.shape.mapZoom.safeParse(mapZoomCandidate);
    const parsedMapCenter = PublicMapViewportSearchSchema.shape.mapCenter.safeParse(mapCenterCandidate);

    return {
      ...(parsedMapZoom.success ? { mapZoom: parsedMapZoom.data } : {}),
      ...(parsedMapCenter.success ? { mapCenter: parsedMapCenter.data } : {}),
    };
  }, [rawSearch, windowSearchFallback]);

  const onMapViewportChange = useCallback(
    (nextViewport: PublicMapViewport) => {
      const normalizedNextViewport = normalizeMapViewport(nextViewport);
      updatePublicMapSearch((previousSearch) => {
        const parsedPreviousSearch = PublicMapViewportSearchSchema.safeParse(previousSearch);

        if (parsedPreviousSearch.success && areMapViewportsEqual(parsedPreviousSearch.data, normalizedNextViewport)) {
          return previousSearch;
        }

        const nextSearch: Record<string, unknown> = { ...previousSearch };

        if (normalizedNextViewport.mapZoom === undefined) {
          delete nextSearch.mapZoom;
        } else {
          nextSearch.mapZoom = normalizedNextViewport.mapZoom;
        }

        if (normalizedNextViewport.mapCenter === undefined) {
          delete nextSearch.mapCenter;
        } else {
          nextSearch.mapCenter = normalizedNextViewport.mapCenter;
        }

        return nextSearch;
      });
    },
    [updatePublicMapSearch]
  );

  return {
    mapZoomOverride: parsedViewportSearch.mapZoom,
    mapCenterOverride: parsedViewportSearch.mapCenter,
    onMapViewportChange,
  };
}
