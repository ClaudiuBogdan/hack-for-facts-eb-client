import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AdvancedMapAnalyticsUrlStateSchema, type AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';

export interface PublicMapViewport {
  mapZoom?: number;
  mapCenter?: [number, number];
}

const PublicMapViewportSearchSchema = AdvancedMapAnalyticsUrlStateSchema.pick({
  mapCenter: true,
  mapZoom: true,
});

function areMapCentersEqual(
  firstMapCenter: [number, number] | undefined,
  secondMapCenter: [number, number] | undefined
): boolean {
  if (firstMapCenter === undefined && secondMapCenter === undefined) {
    return true;
  }

  if (firstMapCenter === undefined || secondMapCenter === undefined) {
    return false;
  }

  return firstMapCenter[0] === secondMapCenter[0] && firstMapCenter[1] === secondMapCenter[1];
}

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
  const parsedViewportSearch = useMemo(() => {
    const parsedSearch = PublicMapViewportSearchSchema.safeParse(rawSearch);
    return parsedSearch.success ? parsedSearch.data : {};
  }, [rawSearch]);

  const onMapViewportChange = useCallback(
    (nextViewport: PublicMapViewport) => {
      updatePublicMapSearch((previousSearch) => {
        const parsedPreviousSearch = PublicMapViewportSearchSchema.safeParse(previousSearch);
        const previousMapZoom = parsedPreviousSearch.success ? parsedPreviousSearch.data.mapZoom : undefined;
        const previousMapCenter = parsedPreviousSearch.success ? parsedPreviousSearch.data.mapCenter : undefined;

        if (
          previousMapZoom === nextViewport.mapZoom &&
          areMapCentersEqual(previousMapCenter, nextViewport.mapCenter)
        ) {
          return previousSearch;
        }

        const nextSearch: Record<string, unknown> = { ...previousSearch };

        if (nextViewport.mapZoom === undefined) {
          delete nextSearch.mapZoom;
        } else {
          nextSearch.mapZoom = nextViewport.mapZoom;
        }

        if (nextViewport.mapCenter === undefined) {
          delete nextSearch.mapCenter;
        } else {
          nextSearch.mapCenter = nextViewport.mapCenter;
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

interface UsePublicMapViewportSyncInput {
  publicId: string;
  enabled: boolean;
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: Dispatch<SetStateAction<AdvancedMapAnalyticsUrlState>>;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
}

export function usePublicMapViewportSync({
  publicId,
  enabled,
  mapState,
  setMapState,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
}: Readonly<UsePublicMapViewportSyncInput>) {
  const lastViewportEmissionRef = useRef<string | null>(null);

  useEffect(() => {
    lastViewportEmissionRef.current = null;
  }, [publicId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (mapZoomOverride === undefined && mapCenterOverride === undefined) {
      return;
    }

    setMapState((previousState) => {
      let didChangeViewport = false;
      const nextState: AdvancedMapAnalyticsUrlState = { ...previousState };

      if (mapZoomOverride !== undefined && previousState.mapZoom !== mapZoomOverride) {
        nextState.mapZoom = mapZoomOverride;
        didChangeViewport = true;
      }

      if (mapCenterOverride !== undefined && !areMapCentersEqual(previousState.mapCenter, mapCenterOverride)) {
        nextState.mapCenter = mapCenterOverride;
        didChangeViewport = true;
      }

      return didChangeViewport ? nextState : previousState;
    });
  }, [enabled, mapCenterOverride, mapZoomOverride, setMapState]);

  useEffect(() => {
    if (!enabled || !onMapViewportChange) {
      return;
    }

    if (mapState.mapZoom === undefined && mapState.mapCenter === undefined) {
      return;
    }

    const nextViewport: PublicMapViewport = {
      mapZoom: mapState.mapZoom,
      mapCenter: mapState.mapCenter,
    };
    const nextViewportKey = JSON.stringify(nextViewport);

    if (lastViewportEmissionRef.current === nextViewportKey) {
      return;
    }

    lastViewportEmissionRef.current = nextViewportKey;
    onMapViewportChange(nextViewport);
  }, [enabled, mapState.mapCenter, mapState.mapZoom, onMapViewportChange]);
}
