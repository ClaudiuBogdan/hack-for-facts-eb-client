import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { MapAnalyticsPublicPage } from '@/features/advanced-map-analytics/components/map-analytics-public-page';
import { usePublicMapViewportUrlSync } from '@/features/advanced-map-analytics/hooks/use-public-map-viewport';

export const Route = createLazyFileRoute('/maps/public/$mapId')({
  component: PublicMapRouteComponent,
});

export function PublicMapRouteComponent() {
  const { mapId: publicId } = Route.useParams();
  const rawSearch = Route.useSearch();
  const navigate = useNavigate({ from: '/maps/public/$mapId' });

  const updatePublicMapSearch = useCallback(
    (searchUpdater: (previousSearch: Record<string, unknown>) => Record<string, unknown>) => {
      navigate({
        search: searchUpdater,
        replace: true,
        resetScroll: false,
      });
    },
    [navigate]
  );

  const { mapZoomOverride, mapCenterOverride, onMapViewportChange } = usePublicMapViewportUrlSync({
    rawSearch,
    updatePublicMapSearch,
  });

  return (
    <MapAnalyticsPublicPage
      publicId={publicId}
      mapZoomOverride={mapZoomOverride}
      mapCenterOverride={mapCenterOverride}
      onMapViewportChange={onMapViewportChange}
    />
  );
}
