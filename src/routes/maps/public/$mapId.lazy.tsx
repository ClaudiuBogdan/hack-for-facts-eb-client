import { createLazyFileRoute } from '@tanstack/react-router';
import { MapAnalyticsPublicPage } from '@/features/advanced-map-analytics/components/map-analytics-public-page';

export const Route = createLazyFileRoute('/maps/public/$mapId')({
  component: PublicMapRouteComponent,
});

function PublicMapRouteComponent() {
  const { mapId: publicId } = Route.useParams();

  return <MapAnalyticsPublicPage publicId={publicId} />;
}
