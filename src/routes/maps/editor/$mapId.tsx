import { createFileRoute } from '@tanstack/react-router';
import { warmAdvancedAnalyticsMapResources } from '@/features/advanced-map-analytics/analytics-map-warmup';

export const Route = createFileRoute('/maps/editor/$mapId')({
  ssr: false,
  loader: async ({ context, preload }) => {
    const warming = warmAdvancedAnalyticsMapResources({
      queryClient: context.queryClient,
    });
    // A hover's preload waits for it: the map's code then arrives inside the
    // router's quiet preload (src/lib/route-code-warmup.ts), where a failed
    // fetch leaves the page being read alone and makes the click a page load.
    // A visit does not wait.
    if (preload) await warming;
  },
});
