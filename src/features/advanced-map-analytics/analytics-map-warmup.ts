import type { QueryClient } from '@tanstack/react-query';
import { geoJsonQueryOptions } from '@/hooks/useGeoJson';

interface WarmAdvancedAnalyticsMapResourcesOptions {
  queryClient: QueryClient;
  includeCountyGeoJson?: boolean;
  preloadInteractiveMap?: boolean;
}

export async function loadInteractiveMapModule() {
  return import('@/components/maps/InteractiveMap');
}

export async function warmAdvancedAnalyticsMapResources({
  queryClient,
  includeCountyGeoJson = false,
  preloadInteractiveMap = true,
}: Readonly<WarmAdvancedAnalyticsMapResourcesOptions>): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const warmupTasks: Array<Promise<unknown>> = [
    queryClient.prefetchQuery(geoJsonQueryOptions('UAT')),
  ];

  if (preloadInteractiveMap) {
    warmupTasks.push(loadInteractiveMapModule());
  }

  if (includeCountyGeoJson) {
    warmupTasks.push(queryClient.prefetchQuery(geoJsonQueryOptions('County')));
  }

  await Promise.allSettled(warmupTasks);
}
