import { createFileRoute, redirect } from '@tanstack/react-router'
import { buildCompanyHubHead } from '@/features/private-companies/seo/private-company-hub-seo'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  cleanPrivateCompanyDirectorySearch,
  parseCompanyHubSearch,
  parsePrivateCompanyDirectorySearch,
  type PrivateCompanyDirectorySearchState,
} from '@/schemas/private-company-search'

/** The hub's own search keys; everything else an old link carries is the directory's or the site's. */
const HUB_KEYS = new Set(['indicator', 'domenii', 'clasament'])

/**
 * `/companies` is the hub; the directory moved to `/companies/search`. An old
 * deep link that still carries a directory filter is redirected there — the
 * `/procurement` → `/procurement/search` idiom — with the rest of what it
 * carried (the language, the currency), less the hub's own choices.
 *
 * The server render carries no registry figure: the hub reads them in the
 * browser under its pinned ONRC scope. So the page can still be cached
 * publicly — its HTML can never hold a figure past a publication or a
 * withdrawal. The render follows the locale and theme cookies (language,
 * number separators, the `html` class), so a shared cache keys on the
 * cookie, as `/pnrr` does, and the browser revalidates.
 */
export const Route = createFileRoute('/companies/')({
  validateSearch: parseCompanyHubSearch,
  beforeLoad: ({ location }) => {
    const raw = location.search as Record<string, unknown>
    const legacy = cleanPrivateCompanyDirectorySearch(parsePrivateCompanyDirectorySearch(raw))
    if (Object.keys(legacy).length > 0) {
      const carried = Object.fromEntries(Object.entries(raw).filter(([key]) => !HUB_KEYS.has(key)))
      throw redirect({
        to: '/companies/search',
        search: { ...carried, ...legacy } as Partial<PrivateCompanyDirectorySearchState>,
        replace: true,
      })
    }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 604800,
      vary: ['Accept-Encoding', 'Cookie'],
    }),
  head: () => buildCompanyHubHead(),
})
