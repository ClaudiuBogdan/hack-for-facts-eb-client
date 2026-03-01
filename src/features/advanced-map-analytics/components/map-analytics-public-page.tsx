import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdvancedMapAnalyticsUrlStateSchema, type AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { MapAnalyticsWorkspace } from '@/features/advanced-map-analytics/components/map-analytics-workspace';
import { useAdvancedMapAnalyticsPublicMapQuery } from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';

interface MapAnalyticsPublicPageProps {
  mapId: string;
}

export function MapAnalyticsPublicPage({ mapId }: Readonly<MapAnalyticsPublicPageProps>) {
  const publicMapQuery = useAdvancedMapAnalyticsPublicMapQuery(mapId, true);
  const [mapState, setMapState] = useState<AdvancedMapAnalyticsUrlState>(() =>
    AdvancedMapAnalyticsUrlStateSchema.parse({})
  );

  useEffect(() => {
    if (!publicMapQuery.data) {
      return;
    }

    setMapState(publicMapQuery.data.lastSnapshot.config);
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
    />
  );
}
