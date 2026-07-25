import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  parseCommitteeBrowseSearch,
  type ParliamentCommitteeBrowseSearch,
} from '@/features/parliament/lib/committee-browse-search'

/**
 * Committee browse filters live in the URL (AGENTS.md: URL search params are the
 * app's shareable-state contract). They used to be component `useState`, so a
 * filtered committee list could not be linked, bookmarked, or restored on
 * back-navigation.
 */
export const Route = createFileRoute('/parlament/comisii/')({
  validateSearch: (search: Record<string, unknown>): ParliamentCommitteeBrowseSearch =>
    parseCommitteeBrowseSearch(search),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
