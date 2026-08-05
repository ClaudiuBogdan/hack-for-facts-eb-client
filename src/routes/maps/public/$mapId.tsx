import { createFileRoute } from '@tanstack/react-router';
import { warmAdvancedAnalyticsMapResources } from '@/features/advanced-map-analytics/analytics-map-warmup';
import { advancedMapAnalyticsPublicMapQueryOptions } from '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics';
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking';
import type { QueryClient } from '@tanstack/react-query';

type PublicMap = Awaited<
  ReturnType<
    NonNullable<ReturnType<typeof advancedMapAnalyticsPublicMapQueryOptions>['queryFn']>
  >
>;

/**
 * County boundaries are a separate, large GeoJSON payload, so it is only worth
 * warming for maps that actually draw them — which we cannot know until the
 * map's config has loaded.
 */
function warmCountyBoundariesIfUsed(
  queryClient: QueryClient,
  publicMap: PublicMap,
): void {
  if (publicMap?.lastSnapshot.config.mapLayers.countyBoundaries) {
    void warmAdvancedAnalyticsMapResources({
      queryClient,
      includeCountyGeoJson: true,
      preloadInteractiveMap: false,
    });
  }
}

export const Route = createFileRoute('/maps/public/$mapId')({
  // The awaited fetch here fed nothing but the warm-up decision below — the
  // loader returns no data and `MapAnalyticsPublicPage` runs its own query
  // with its own skeleton and error states. In the browser that await still
  // held the *previous* page for the whole round-trip: measured at 1.24–1.28s
  // of dead click with no feedback (the route declares no `pendingComponent`,
  // and the query client's `retry: 1` doubles a failing request).
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const publicId = params.mapId;

    void warmAdvancedAnalyticsMapResources({ queryClient });

    const publicMapPromise = queryClient.ensureQueryData(
      advancedMapAnalyticsPublicMapQueryOptions(publicId)
    );

    if (!shouldBlockLoaderForSsr()) {
      // Same request, same cache entry the page reads — just not awaited.
      // Rejections surface through the page's own error state.
      void publicMapPromise
        .then((publicMap) => warmCountyBoundariesIfUsed(queryClient, publicMap))
        .catch(() => {});
      return;
    }

    warmCountyBoundariesIfUsed(queryClient, await publicMapPromise);
  },
});
