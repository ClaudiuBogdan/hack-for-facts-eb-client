import { createFileRoute } from '@tanstack/react-router';
import { warmAdvancedAnalyticsMapResources } from '@/features/advanced-map-analytics/analytics-map-warmup';
import { startPublicMapRead } from '@/features/advanced-map-analytics/hooks/public-map-read';
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking';

export const Route = createFileRoute('/maps/public/$mapId')({
  // The awaited fetch here fed nothing but the warm-up decision below — the
  // loader returns no data and `MapAnalyticsPublicPage` runs its own query
  // with its own skeleton and error states. In the browser that await still
  // held the *previous* page for the whole round-trip: measured at 1.24–1.28s
  // of dead click with no feedback (the route declares no `pendingComponent`,
  // and the query client's `retry: 1` doubles a failing request).
  loader: async ({ context, params, preload }) => {
    const { queryClient } = context;
    const publicId = params.mapId;

    const warming = warmAdvancedAnalyticsMapResources({ queryClient });

    if (!shouldBlockLoaderForSsr()) {
      // The read starts at the click, not awaited, unless the page already has
      // the map fresh: the response only. The page's query takes it and decodes
      // it with code that arrives with the page itself (the map's schemas stay
      // out of the route tree, which every page evaluates), then warms the
      // county boundaries once it knows the map draws them. Rejections surface
      // through the page's own error state.
      startPublicMapRead(queryClient, publicId);
      // A hover's preload waits for the map's code: it then arrives inside
      // the router's quiet preload (src/lib/route-code-warmup.ts), where a
      // failed fetch leaves the page being read alone and makes the click a
      // page load. A visit does not wait.
      if (preload) await warming;
      return;
    }

    // The server reads and decodes the map before rendering it (its code is
    // the server's own, never a chunk the browser fetches).
    const { advancedMapAnalyticsPublicMapQueryOptions, warmCountyBoundariesIfUsed } = await import(
      '@/features/advanced-map-analytics/hooks/use-advanced-map-analytics'
    );
    warmCountyBoundariesIfUsed(queryClient, await queryClient.ensureQueryData(advancedMapAnalyticsPublicMapQueryOptions(publicId)));
  },
});
