import { queryOptions } from '@tanstack/react-query';
import {
  fetchPublicMapPayload,
  type AdvancedMapAnalyticsApiError,
} from '@/features/advanced-map-analytics/api/advanced-map-analytics-transport';

/**
 * A public map's response, not yet decoded: what the public map route starts at
 * the click. Under the decoded query's key, so invalidating or removing a public
 * map covers both. The page decodes it (`advancedMapAnalyticsPublicMapQueryOptions`)
 * with code that arrives with the page, so the route, which every page evaluates,
 * carries no decoder (docs/route-contracts.md).
 */
export function publicMapPayloadQueryOptions(publicId: string) {
  return queryOptions<unknown, AdvancedMapAnalyticsApiError>({
    queryKey: ['advanced-map-analytics', 'public', publicId, 'payload'] as const,
    queryFn: () => fetchPublicMapPayload(publicId),
    staleTime: 60_000,
    gcTime: 60_000,
  });
}
