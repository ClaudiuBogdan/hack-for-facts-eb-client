import { createFileRoute } from '@tanstack/react-router';
import { warmAdvancedAnalyticsMapResources } from '@/features/advanced-map-analytics/analytics-map-warmup';

export const Route = createFileRoute('/maps/editor/$mapId')({
  ssr: false,
  loader: ({ context }) => {
    void warmAdvancedAnalyticsMapResources({
      queryClient: context.queryClient,
    });
  },
});
