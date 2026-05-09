import { createFileRoute } from '@tanstack/react-router';
import { warmAdvancedAnalyticsMapResources } from '@/features/advanced-map-analytics/analytics-map-warmup';
import { advancedMapAnalyticsPublicMapQueryOptions } from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';

export const Route = createFileRoute('/maps/public/$mapId')({
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const publicId = params.mapId;

    void warmAdvancedAnalyticsMapResources({
      queryClient,
    });

    const publicMap = await queryClient.ensureQueryData(
      advancedMapAnalyticsPublicMapQueryOptions(publicId)
    );

    if (publicMap.lastSnapshot.config.mapLayers.countyBoundaries) {
      void warmAdvancedAnalyticsMapResources({
        queryClient,
        includeCountyGeoJson: true,
        preloadInteractiveMap: false,
      });
    }
  },
});
