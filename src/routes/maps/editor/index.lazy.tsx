import { createLazyFileRoute } from '@tanstack/react-router';
import { MapAnalyticsListPage } from '@/features/advanced-map-analytics/components/map-analytics-list-page';

export const Route = createLazyFileRoute('/maps/editor/')({
  component: MapAnalyticsListPage,
});
