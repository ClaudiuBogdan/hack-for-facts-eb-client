import { createFileRoute } from '@tanstack/react-router';
import { geoJsonQueryOptions } from '@/hooks/useGeoJson';
import {
  ExperimentalMapUrlStateSchema,
  parseExperimentalMapUrlState,
} from '@/schemas/experimental-map';
import { createPublicPageCacheHeaders } from '@/lib/http-cache';

export const Route = createFileRoute('/experimental/map')({
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  validateSearch: ExperimentalMapUrlStateSchema,
  beforeLoad: async ({ context, search }) => {
    parseExperimentalMapUrlState(search);

    if (typeof window !== 'undefined') {
      context.queryClient.prefetchQuery(geoJsonQueryOptions('UAT'));
    }
  },
});
