import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  parseGroupDetailSearch,
  type ParliamentGroupDetailSearch,
} from '@/features/parliament/lib/group-roster'

export const Route = createFileRoute('/parlament/grupuri/$groupId')({
  // The roster filters are shareable state, so they live in the URL. The parse
  // is tolerant: a hand-edited param never throws, it just drops the filter.
  validateSearch: (search: Record<string, unknown>): ParliamentGroupDetailSearch =>
    parseGroupDetailSearch(search),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
