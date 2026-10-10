import { createFileRoute, redirect } from '@tanstack/react-router'
import type { CompanyAnalyticsServerRead } from '@/features/private-companies/api/company-analytics-ssr'
import { buildCompanyHubHead } from '@/features/private-companies/seo/private-company-hub-seo'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
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
 * The hub's figures are read on the server — the active analytics release,
 * then each section pinned to it, within one deadline
 * (`company-hub-analytics.ts`) — and seed the page's queries; on a
 * client-side navigation the loader returns at once and the page reads in
 * the browser. Like `/companies/analytics`, no response is ever cached, by a
 * CDN or by the browser: its HTML holds a release's figures, and a release
 * withdrawn from publication must stop reaching readers at the next request.
 */
export const Route = createFileRoute('/companies/')({
  ssr: true,
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
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }): Promise<CompanyAnalyticsServerRead> => {
    if (!shouldBlockLoaderForSsr()) return { seed: [], complete: true }
    const { readCompanyHubForSsr } = await import('@/features/private-companies/api/company-hub-analytics')
    return readCompanyHubForSsr(deps.search)
  },
  // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
  headers: () => ({ ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }),
  head: () => buildCompanyHubHead(),
})
