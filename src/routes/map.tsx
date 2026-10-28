import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { buildPageHead } from '@/lib/page-head'
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
  // In the request's own language: the shared Lingui instance may hold another request's.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    return buildPageHead({
      title: translator._(msg`Romania spending heatmap - Transparenta.eu`),
      description: translator._(msg`Explore choropleth maps of public spending by UAT/County with per-capita or total normalization.`),
      canonical: `${getSiteUrl()}/map`,
    })
  },
})
