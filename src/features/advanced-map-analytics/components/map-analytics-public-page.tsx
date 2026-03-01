import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdvancedMapAnalyticsUrlStateSchema, type AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';
import { useAdvancedMapAnalyticsPublicMapQuery } from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';
import { getRemoteGroupedSeriesHash } from '@/lib/map-series/grouped-series-request';

interface MapAnalyticsPublicPageProps {
  publicId: string;
}

export function MapAnalyticsPublicPage({ publicId }: Readonly<MapAnalyticsPublicPageProps>) {
  const publicMapQuery = useAdvancedMapAnalyticsPublicMapQuery(publicId, true);
  const [mapState, setMapState] = useState<AdvancedMapAnalyticsUrlState>(() =>
    AdvancedMapAnalyticsUrlStateSchema.parse({})
  );

  useEffect(() => {
    if (!publicMapQuery.data) {
      return;
    }

    setMapState(publicMapQuery.data.lastSnapshot.config);
  }, [publicMapQuery.data]);

  const bundledRemoteBaseSeriesHash = useMemo(() => {
    if (!publicMapQuery.data) {
      return undefined;
    }

    return getRemoteGroupedSeriesHash(publicMapQuery.data.lastSnapshot.config.series);
  }, [publicMapQuery.data]);

  if (publicMapQuery.isLoading) {
    return (
      <div className="container mx-auto py-12">
        <LoadingSpinner text="Loading public map..." />
      </div>
    );
  }

  if (publicMapQuery.error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Public map unavailable</CardTitle>
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
      capabilities={{ readOnly: true }}
      bundledGroupedSeriesData={publicMapQuery.data?.groupedSeriesData}
      bundledRemoteBaseSeriesHash={bundledRemoteBaseSeriesHash}
    />
  );
}
