import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseElectionHubSearch } from '@/schemas/elections'

export const Route = createFileRoute('/alegeri/$electionKey')({
  ssr: true,
  validateSearch: parseElectionHubSearch,
  headers: () =>
    // TODO(elections-live): reduce or disable public cache for provisional or
    // non-final live responses. The MVP route is mock-forced.
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
