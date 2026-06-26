import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseElectionsLandingSearch } from '@/schemas/elections'

export const Route = createFileRoute('/alegeri/')({
  ssr: true,
  validateSearch: parseElectionsLandingSearch,
  headers: () =>
    // TODO(elections-live): reduce or disable public cache for provisional or
    // non-final live responses. The MVP route is mock-forced.
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
