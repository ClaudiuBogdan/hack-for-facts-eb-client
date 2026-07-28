import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  parseAgendaSearch,
  type ParliamentAgendaSearch,
} from '@/features/parliament/lib/agenda-format'

/**
 * The page, the year and the search term live in the URL, per the app's
 * shareable-state contract — a reader who links "orders of business from 2019"
 * must land on 2019, not on page 1 of everything.
 *
 * The parse is tolerant: a hand-edited param drops that one filter rather than
 * throwing the page away.
 */
export const Route = createFileRoute('/parlament/agenda/')({
  validateSearch: (search: Record<string, unknown>): ParliamentAgendaSearch =>
    parseAgendaSearch(search),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
