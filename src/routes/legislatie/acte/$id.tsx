import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseLegalActDetailSearch } from '@/schemas/legal'

export const Route = createFileRoute('/legislatie/acte/$id')({
  validateSearch: parseLegalActDetailSearch,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
