import { createFileRoute } from '@tanstack/react-router'
import { geoJsonQueryOptions } from '@/hooks/useGeoJson'
import { MapStateSchema } from '@/schemas/map-filters'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

type MapViewType = 'UAT' | 'County'

export const Route = createFileRoute('/map')({
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  beforeLoad: async ({ context, search }) => {
    const { queryClient } = context
    // Parse and normalize search params using zod defaults to ensure valid filters
    const parsed = MapStateSchema.parse(search)
    const viewType: MapViewType = parsed.mapViewType
    // GeoJSON uses relative URLs that don't work during SSR, prefetch only on client
    if (typeof window !== 'undefined') {
      queryClient.prefetchQuery(geoJsonQueryOptions(viewType))
    }
  },
})
