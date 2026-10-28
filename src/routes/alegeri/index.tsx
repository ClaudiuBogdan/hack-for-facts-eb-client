import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { buildCatalogDocumentTitle } from '@/features/elections/catalog/elections-catalog-text'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'
import { electionsNoStoreHeaders, electionsPageHead } from '@/features/elections/lib/elections-head'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parseElectionsCatalogSearch, type ElectionEventPage } from '@/schemas/elections-catalog'

export interface ElectionsCatalogLoaderData {
  /** The query the server read was for: it seeds the page only under the same key. */
  readonly seedKey: string
  /** Present on a server render whose read succeeded; the page's own query reads it otherwise. */
  readonly page?: ElectionEventPage
}

/**
 * `/alegeri` — the elections with published figures. The page the address
 * names is read on the server under a short deadline, so a shared link and a
 * crawler get the rows and a slow API holds the first byte for a second at
 * most; in the browser the loader starts the read under the page's own key
 * and returns at once.
 */
export const Route = createFileRoute('/alegeri/')({
  ssr: true,
  validateSearch: parseElectionsCatalogSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, abortController }): Promise<ElectionsCatalogLoaderData> => {
    const seedKey = seedKeyOf(electionsCatalogKeys.events(deps))
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/elections/hooks/use-elections-catalog')
      void context.queryClient.prefetchQuery(hooks.electionEventsQueryOptions(deps)).catch(() => undefined)
      return { seedKey }
    }
    const { readElectionEventsForSsr } = await import('@/features/elections/api/elections-catalog-ssr')
    const page = await readElectionEventsForSsr(deps, abortController.signal)
    return page ? { seedKey, page } : { seedKey }
  },
  headers: electionsNoStoreHeaders,
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    return electionsPageHead({
      title: buildCatalogDocumentTitle(translator),
      description: translator._(msg`Alegerile din România cu rezultate publicate pe platformă, la nivel de partid: zilele de vot, scrutinele, voturile și prezența la vot.`),
      canonical: `${getSiteUrl()}/alegeri`,
    })
  },
})
