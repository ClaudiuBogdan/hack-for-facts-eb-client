import { createFileRoute } from '@tanstack/react-router'
import { ParliamentSearchSchema } from '@/schemas/parliament'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/parlament/')({
  validateSearch: ParliamentSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
