import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  AdvancedMapAnalyticsUrlStateSchema,
  type AdvancedMapAnalyticsUrlState,
} from '@/schemas/advanced-map-analytics';
import type { ReportPeriodInputZ } from '@/schemas/charts';
import { useAdvancedMapAnalyticsPublicMapQuery } from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';
import { applyMapRuntimeConfig } from '@/features/advanced-map-analytics/map-runtime-config';
import {
  usePublicMapViewportSync,
  type PublicMapViewport,
} from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import { getRemoteGroupedSeriesHash } from '@/lib/map-series/grouped-series-request';
import type { GroupedSeriesDataResponse } from '@/lib/map-series/interfaces';

interface UsePublicMapRuntimeStateInput {
  publicId: string;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (nextViewport: PublicMapViewport) => void;
  reportPeriodOverride?: ReportPeriodInputZ;
  selectedYearOverride?: number;
  forceMapActiveView?: boolean;
}

interface UsePublicMapRuntimeStateResult {
  publicMapQuery: ReturnType<typeof useAdvancedMapAnalyticsPublicMapQuery>;
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: Dispatch<SetStateAction<AdvancedMapAnalyticsUrlState>>;
  isRuntimeStateReady: boolean;
  mapDescription: string;
  bundledGroupedSeriesData?: GroupedSeriesDataResponse;
  bundledRemoteBaseSeriesHash?: string;
}

export function usePublicMapRuntimeState({
  publicId,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
  reportPeriodOverride,
  selectedYearOverride,
  forceMapActiveView = false,
}: Readonly<UsePublicMapRuntimeStateInput>): UsePublicMapRuntimeStateResult {
  const publicMapQuery = useAdvancedMapAnalyticsPublicMapQuery(publicId, true);
  const [mapState, setMapState] = useState<AdvancedMapAnalyticsUrlState>(() =>
    AdvancedMapAnalyticsUrlStateSchema.parse({})
  );
  const [isRuntimeStateReady, setIsRuntimeStateReady] = useState(false);

  const runtimeSnapshotConfig = useMemo(() => {
    if (!publicMapQuery.data) {
      return undefined;
    }

    return applyMapRuntimeConfig(publicMapQuery.data.lastSnapshot.config, {
      reportPeriodOverride,
      selectedYearOverride,
      forceMapActiveView,
    });
  }, [forceMapActiveView, publicMapQuery.data, reportPeriodOverride, selectedYearOverride]);

  useEffect(() => {
    if (!runtimeSnapshotConfig) {
      setIsRuntimeStateReady(false);
      return;
    }

    setMapState(runtimeSnapshotConfig);
    setIsRuntimeStateReady(true);
  }, [runtimeSnapshotConfig]);

  usePublicMapViewportSync({
    mapKey: publicId,
    enabled: Boolean(runtimeSnapshotConfig),
    mapState,
    setMapState,
    mapZoomOverride,
    mapCenterOverride,
    onMapViewportChange,
  });

  const bundledRemoteBaseSeriesHash = useMemo(() => {
    if (!publicMapQuery.data) {
      return undefined;
    }

    return getRemoteGroupedSeriesHash(publicMapQuery.data.lastSnapshot.config.series);
  }, [publicMapQuery.data]);

  return {
    publicMapQuery,
    mapState,
    setMapState,
    isRuntimeStateReady,
    mapDescription: publicMapQuery.data?.description ?? '',
    bundledGroupedSeriesData: publicMapQuery.data?.groupedSeriesData,
    bundledRemoteBaseSeriesHash,
  };
}
