import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AdvancedMapAnalyticsUrlStateSchema, type AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { areMapCentersEqual } from '@/features/advanced-map-analytics/map-viewport-utils';
import { parseSearchParamJson } from '@/lib/router-search';

export interface PublicMapViewport {
  mapZoom?: number;
  mapCenter?: [number, number];
}

const PublicMapViewportSearchSchema = AdvancedMapAnalyticsUrlStateSchema.pick({
  mapCenter: true,
  mapZoom: true,
});

function buildViewportOverrideKey(viewportOverride: PublicMapViewport): string {
  return JSON.stringify({
    mapZoom: viewportOverride.mapZoom ?? null,
    mapCenter: viewportOverride.mapCenter ?? null,
  });
}

function doesMapStateMatchViewportOverride(
  mapState: AdvancedMapAnalyticsUrlState,
  viewportOverride: PublicMapViewport
): boolean {
  const hasZoomMismatch =
    viewportOverride.mapZoom !== undefined && mapState.mapZoom !== viewportOverride.mapZoom;
  const hasCenterMismatch =
    viewportOverride.mapCenter !== undefined &&
    !areMapCentersEqual(mapState.mapCenter, viewportOverride.mapCenter);

  return !hasZoomMismatch && !hasCenterMismatch;
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
  mapKey: string;
  enabled: boolean;
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: Dispatch<SetStateAction<AdvancedMapAnalyticsUrlState>>;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
}

export function usePublicMapViewportSync({
  mapKey,
  enabled,
  mapState,
  setMapState,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
}: Readonly<UsePublicMapViewportSyncInput>) {
  const lastViewportEmissionRef = useRef<string | null>(null);
  // Tracks the most-recent URL viewport override that we've already
  // propagated into local state. The emit-to-URL effect uses this to tell
  // apart "URL just changed externally and state hasn't caught up" (don't
  // emit) from "user-driven state change ahead of URL" (do emit).
  const lastAppliedOverrideKeyRef = useRef<string | null>(null);
  const externalViewportOverride = useMemo<PublicMapViewport>(
    () => ({
      mapZoom: mapZoomOverride,
      mapCenter: mapCenterOverride,
    }),
    [mapCenterOverride, mapZoomOverride]
  );
  const externalViewportOverrideKey = useMemo(
    () => buildViewportOverrideKey(externalViewportOverride),
    [externalViewportOverride]
  );

  useEffect(() => {
    lastViewportEmissionRef.current = null;
    lastAppliedOverrideKeyRef.current = null;
  }, [mapKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (mapZoomOverride === undefined && mapCenterOverride === undefined) {
      lastAppliedOverrideKeyRef.current = externalViewportOverrideKey;
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
  }, [enabled, externalViewportOverrideKey, mapCenterOverride, mapZoomOverride, setMapState]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (doesMapStateMatchViewportOverride(mapState, externalViewportOverride)) {
      lastAppliedOverrideKeyRef.current = externalViewportOverrideKey;
    }
  }, [
    enabled,
    externalViewportOverride,
    externalViewportOverrideKey,
    mapState,
  ]);

  useEffect(() => {
    if (!enabled || !onMapViewportChange) {
      return;
    }

    // If the URL override changed and we haven't yet propagated it into state
    // (we'll do so in the next commit), skip this emission so the parent's
    // override doesn't immediately get overwritten by stale state.
    if (lastAppliedOverrideKeyRef.current !== externalViewportOverrideKey) {
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
  }, [
    enabled,
    externalViewportOverrideKey,
    mapState.mapCenter,
    mapState.mapZoom,
    onMapViewportChange,
  ]);
}
