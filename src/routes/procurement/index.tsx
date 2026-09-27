import { createFileRoute, redirect } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { ProcurementHubState } from '@/schemas/procurement-hub'
import { explorerSearchOf, parseProcurementHomeSearch } from '@/schemas/procurement-home'
import type { ProcurementHomeInitialData } from '@/features/procurement/components/home/procurement-home-page'

/**
 * `/procurement` is the front door; the explorer (overview, list, rankings)
 * moved to `/procurement/search`. An old deep link that still carries an
 * explorer choice is redirected there with the rest of what it carried (the
 * language, the currency), less the front door's own choices — the idiom
 * `/companies` → `/companies/search` uses.
 *
 * The national picture, the categories and the year's largest contracts are
 * read on the server (kept there for ten minutes, under a deadline — see
 * `procurement-home-ssr.ts`) and seed the page's queries; on a client-side
 * navigation the loader starts them and returns at once, so the page frame
 * paints and the bands fill in.
 */
export const Route = createFileRoute('/procurement/')({
  ssr: true,
  validateSearch: parseProcurementHomeSearch,
  beforeLoad: ({ location }) => {
    const explorer = explorerSearchOf(location.search as Record<string, unknown>)
    // The explorer's own route parses and cleans what the link carried.
    if (explorer) throw redirect({ to: '/procurement/search', search: explorer as Partial<ProcurementHubState>, replace: true })
  },
  loader: async ({ context }): Promise<ProcurementHomeInitialData> => {
    const { homeYear } = await import('@/features/procurement/lib/home-model')
    const hooks = await import('@/features/procurement/hooks/use-procurement-home')
    const year = homeYear()
    if (!shouldBlockLoaderForSsr()) {
      void context.queryClient.prefetchQuery(hooks.procurementHomeNationalQueryOptions(year)).catch(() => undefined)
      void context.queryClient.prefetchQuery(hooks.procurementHomeCategoriesQueryOptions(year)).catch(() => undefined)
      void context.queryClient.prefetchQuery(hooks.procurementHomeBigContractsQueryOptions(year)).catch(() => undefined)
      return { year }
    }
    // Read directly, not through the query client: a query created on the
    // server is dehydrated with the server's clock, so a copy served from a
    // shared cache would look stale on mount and read again. The loader's
    // data seeds the page's queries with the browser's clock.
    const { readProcurementHomeForSsr } = await import('@/features/procurement/api/procurement-home-ssr')
    return readProcurementHomeForSsr(year)
  },
  // A render with a failed read is not worth caching for everyone: it is
  // served once and the next request reads again. The document follows the
  // locale and theme cookies, so a shared cache keys on them.
  headers: ({ loaderData }) =>
    !loaderData?.national || !loaderData.categories || !loaderData.bigContracts
      ? // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
        { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          vary: ['Accept-Encoding', 'Cookie'],
        }),
  // In the request's own language: the shared Lingui instance may hold another
  // request's by the time a head that waited on its loader runs.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const canonical = `${getSiteUrl()}/procurement`
    const title = `${translator._(msg`Achiziții publice`)} — Transparenta.eu`
    const description = translator._(
      msg`Ce cumpără statul și de la cine: contractele și achizițiile directe ale instituțiilor publice, pe categorii, firme, județe și ani, din SEAP.`,
    )
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    }
  },
})
