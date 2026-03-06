import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';
import type { PublicMapViewport } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';
import {
  usePublicMapRuntimeState,
} from '@/features/advanced-map-analytics/hooks/use-public-map-runtime-state';
import { t } from '@lingui/core/macro';

interface MapAnalyticsPublicPageProps {
  publicId: string;
  mapZoomOverride?: number;
  mapCenterOverride?: [number, number];
  onMapViewportChange?: (next: PublicMapViewport) => void;
}

export function MapAnalyticsPublicPage({
  publicId,
  mapZoomOverride,
  mapCenterOverride,
  onMapViewportChange,
}: Readonly<MapAnalyticsPublicPageProps>) {
  const {
    publicMapQuery,
    mapState,
    setMapState,
    mapDescription,
    bundledGroupedSeriesData,
    bundledRemoteBaseSeriesHash,
  } = usePublicMapRuntimeState({
    publicId,
    mapZoomOverride,
    mapCenterOverride,
    onMapViewportChange,
  });

  if (publicMapQuery.isLoading) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text={t`Loading public map...`} />
      </div>
    );
  }

  if (publicMapQuery.error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t`Public map unavailable`}</CardTitle>
            <CardDescription>{publicMapQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <MapAnalyticsWorkspace
      mode="public"
      mapState={mapState}
      setMapState={setMapState}
      mapDescription={mapDescription}
      capabilities={{ readOnly: true }}
      mobileControlsDefaultCollapsed={true}
      bundledGroupedSeriesData={bundledGroupedSeriesData}
      bundledRemoteBaseSeriesHash={bundledRemoteBaseSeriesHash}
    />
  );
}
