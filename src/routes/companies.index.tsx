import { createFileRoute, redirect } from '@tanstack/react-router'
import { buildCompanyHubHead, companyHubSeoFigures } from '@/features/private-companies/seo/private-company-hub-seo'
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
 * Every figure is in the client's snapshot, so the page renders in full on
 * the server and is cached publicly. The render follows the locale and theme
 * cookies (language, number separators, the `html` class), so a shared cache
 * keys on the cookie, as `/pnrr` does, and the browser revalidates.
 *
 * The snapshot is imported by the loader, not at the top: this file is in
 * every route's entry chunk, and the head needs four of its figures.
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
  loader: async () => {
    const { COMPANY_HUB_SNAPSHOT } = await import('@/features/private-companies/lib/hub-snapshot')
    return { seo: companyHubSeoFigures(COMPANY_HUB_SNAPSHOT) }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 604800,
      vary: ['Accept-Encoding', 'Cookie'],
    }),
  head: ({ loaderData }) => buildCompanyHubHead(loaderData?.seo),
})
