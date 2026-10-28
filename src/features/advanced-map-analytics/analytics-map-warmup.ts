import type { QueryClient } from '@tanstack/react-query';
import { geoJsonQueryOptions, type MapViewType } from '@/hooks/useGeoJson';

interface WarmAdvancedAnalyticsMapResourcesOptions {
  queryClient: QueryClient;
  /** The boundaries the map draws; UAT unless the map is a county map. */
  mapViewType?: MapViewType;
  includeCountyGeoJson?: boolean;
  preloadInteractiveMap?: boolean;
  /** Also start MapLibre's workers and the label glyphs once the renderer has loaded. */
  prewarmRenderer?: boolean;
}

export async function loadInteractiveMapModule() {
  return import('@/components/maps/InteractiveMap');
}

export async function warmAdvancedAnalyticsMapResources({
  queryClient,
  mapViewType = 'UAT',
  includeCountyGeoJson = false,
  preloadInteractiveMap = true,
  prewarmRenderer = false,
}: Readonly<WarmAdvancedAnalyticsMapResourcesOptions>): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const warmupTasks: Array<Promise<unknown>> = [
    queryClient.prefetchQuery(geoJsonQueryOptions(mapViewType)),
  ];

  if (preloadInteractiveMap) {
    warmupTasks.push(loadInteractiveMapModule());
    if (prewarmRenderer) {
      warmupTasks.push(
        import('@/components/maps/interactive-map-prewarm').then((module) => module.prewarmInteractiveMap()),
      );
    }
  }

  if (includeCountyGeoJson && mapViewType !== 'County') {
    warmupTasks.push(queryClient.prefetchQuery(geoJsonQueryOptions('County')));
  }

  await Promise.allSettled(warmupTasks);
}
