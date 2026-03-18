import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import type {
  Currency,
  ReportPeriodInputZ,
  SeriesConfiguration,
} from '@/schemas/charts';
import { applyMapRuntimeConfig } from '@/features/advanced-map-analytics/map-runtime-config';
import { areMapCentersEqual } from '@/features/advanced-map-analytics/map-viewport-utils';
import {
  usePublicMapViewportSync,
  type PublicMapViewport,
} from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';

function withPreservedViewport(
  mapState: AdvancedMapAnalyticsUrlState,
  {
    mapZoomOverride,
    mapCenterOverride,
    previousMapState,
  }: {
    mapZoomOverride?: number;
    mapCenterOverride?: [number, number];
    previousMapState?: AdvancedMapAnalyticsUrlState;
  }
): AdvancedMapAnalyticsUrlState {
  const preservedMapZoom =
    mapZoomOverride ?? previousMapState?.mapZoom ?? mapState.mapZoom;
  const preservedMapCenter =
    mapCenterOverride ?? previousMapState?.mapCenter ?? mapState.mapCenter;

  const hasSameViewport =
    mapState.mapZoom === preservedMapZoom &&
    areMapCentersEqual(mapState.mapCenter, preservedMapCenter);

  if (hasSameViewport) {
    return mapState;
  }

  return {
    ...mapState,
    mapZoom: preservedMapZoom,
    mapCenter: preservedMapCenter,
  };
}

interface UseMapPreviewRuntimeStateInput {
  mapKey: string;
  mapStateDefinition: AdvancedMapAnalyticsUrlState;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
  reportPeriodOverride?: ReportPeriodInputZ;
  selectedYearOverride?: number;
  reportTypeOverride?: SeriesConfiguration['filter']['report_type'];
  normalizationOverride?: 'total' | 'per_capita';
  currencyOverride?: Currency;
  inflationAdjustedOverride?: boolean;
  mapNameOverride?: string;
  forceMapActiveView?: boolean;
}

interface UseMapPreviewRuntimeStateResult {
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: Dispatch<SetStateAction<AdvancedMapAnalyticsUrlState>>;
}

export function useMapPreviewRuntimeState({
  mapKey,
  mapStateDefinition,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
  reportPeriodOverride,
  selectedYearOverride,
  reportTypeOverride,
  normalizationOverride,
  currencyOverride,
  inflationAdjustedOverride,
  mapNameOverride,
  forceMapActiveView = false,
}: Readonly<UseMapPreviewRuntimeStateInput>): UseMapPreviewRuntimeStateResult {
  const runtimeMapConfig = useMemo(
    () =>
      applyMapRuntimeConfig(mapStateDefinition, {
        reportPeriodOverride,
        selectedYearOverride,
        reportTypeOverride,
        normalizationOverride,
        currencyOverride,
        inflationAdjustedOverride,
        mapNameOverride,
        forceMapActiveView,
      }),
    [
      currencyOverride,
      forceMapActiveView,
      inflationAdjustedOverride,
      mapNameOverride,
      mapStateDefinition,
      normalizationOverride,
      reportPeriodOverride,
      reportTypeOverride,
      selectedYearOverride,
    ]
  );
  const [mapState, setMapState] = useState<AdvancedMapAnalyticsUrlState>(() => runtimeMapConfig);

  useEffect(() => {
    setMapState((previousMapState) =>
      withPreservedViewport(runtimeMapConfig, {
        previousMapState,
        mapZoomOverride,
        mapCenterOverride,
      })
    );
  }, [runtimeMapConfig, mapCenterOverride, mapZoomOverride]);

  usePublicMapViewportSync({
    mapKey,
    enabled: true,
    mapState,
    setMapState,
    mapZoomOverride,
    mapCenterOverride,
    onMapViewportChange,
  });

  return {
    mapState,
    setMapState,
  };
}
