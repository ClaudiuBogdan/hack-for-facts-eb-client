import { createFileRoute, redirect } from '@tanstack/react-router'
import { CompanyHubPending } from '@/features/private-companies/components/hub/company-hub-pending'
import { buildCompanyHubHead, companyHubSeoFigures } from '@/features/private-companies/seo/private-company-hub-seo'
import { companyDirectoryRedirect, hasDirectorySearch } from '@/features/private-companies/lib/company-directory-redirect'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { companyHubSearchSchema, parseCompanyHubSearch } from '@/schemas/private-company-search'

/** The hub's own search keys; everything else an old link carries is the directory's or the site's. */
const HUB_KEYS = new Set(Object.keys(companyHubSearchSchema.unwrap().shape))

/**
 * `/companies` is the hub. Before it, `/companies` was the company directory,
 * since retired: an old deep link that still carries a directory filter goes
 * where `/companies/search` sends it (`companyDirectoryRedirect`), with the
 * rest of what it carried (the language, the currency). The hub's own choices
 * stay only on the hub: elsewhere they would be another page's keys
 * (`indicator` is the analysis's measure).
 *
 * Every figure is in the client's snapshot, so the page renders in full on
 * the server and is cached publicly. The render follows the locale and theme
 * cookies (language, number separators, the `html` class), so a shared cache
 * keys on the cookie, as `/pnrr` does, and the browser revalidates.
 *
 * The snapshot is imported by the loader, not at the top: this file is in
 * every route's entry chunk, and the head needs four of its figures. On a
 * client navigation the page's head shows while its chunk loads
 * (`CompanyHubPending`): the title, the search box and the pinned bar are
 * words, not data.
 */
export const Route = createFileRoute('/companies/')({
  validateSearch: parseCompanyHubSearch,
  pendingComponent: CompanyHubPending,
  beforeLoad: ({ location }) => {
    const raw = location.search as Record<string, unknown>
    if (!hasDirectorySearch(raw)) return
    const hub = Object.fromEntries(Object.entries(raw).filter(([key]) => HUB_KEYS.has(key)))
    const target = companyDirectoryRedirect(Object.fromEntries(Object.entries(raw).filter(([key]) => !HUB_KEYS.has(key))))
    if (target.to === '/companies/$cui') {
      throw redirect({ to: target.to, params: target.params, search: target.search as never, replace: true, statusCode: 301 })
    }
    const search = target.to === '/companies' ? { ...target.search, ...hub } : target.search
    throw redirect({ to: target.to, search: search as never, replace: true, statusCode: 301 })
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
