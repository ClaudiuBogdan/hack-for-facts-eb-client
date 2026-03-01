import { createFileRoute } from '@tanstack/react-router';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';

export const Route = createFileRoute('/maps/editor/$mapId')({
  ssr: false,
  validateSearch: AdvancedMapAnalyticsUrlStateSchema,
});
