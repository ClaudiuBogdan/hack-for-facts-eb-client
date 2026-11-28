import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import type { LocalMandates } from '@/features/elections/analytics/lib/mandates'
import { electionsNoStoreHeaders, electionsPageHead } from '@/features/elections/lib/elections-head'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parseElectionsAnalyticsSearch } from '@/schemas/elections-search'

export interface ElectionsAnalyticsLoaderData {
  /** The local mandates, on a server render whose read succeeded; the page's own query reads them otherwise. */
  readonly mandates?: LocalMandates
}

/**
 * `/alegeri/analize`: the elections' analysis page, one question per view in
 * the address (`tip`, `dupa`, `judet`). The local mandates are read on the
 * server under the elections pages' deadline and reach the page already
 * folded into party lines; in the browser the loader starts the read and
 * returns at once. The reads do not depend on the address, so a change of
 * view or county never runs the loader again.
 */
export const Route = createFileRoute('/alegeri/analize')({
  ssr: true,
  validateSearch: parseElectionsAnalyticsSearch,
  loader: async ({ context, abortController }): Promise<ElectionsAnalyticsLoaderData> => {
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/elections/analytics/hooks/use-elections-analytics')
      void context.queryClient.prefetchQuery(hooks.localMandatesQueryOptions()).catch(() => undefined)
      return {}
    }
    const { readLocalMandatesForSsr } = await import('@/features/elections/analytics/api/elections-analytics-ssr')
    const mandates = await readLocalMandatesForSsr(abortController.signal)
    return mandates ? { mandates } : {}
  },
  headers: electionsNoStoreHeaders,
  // In the request's own language. The bare page is indexed; a reader's own question is answered, not indexed.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const search = match.search as Record<string, unknown>
    // Only the page's own keys make a question; the language (`lang`) is the site's, and leaves the page bare.
    const bare = ['tip', 'dupa', 'judet'].every((key) => search[key] === undefined)
    // Named for what the page draws today (the SEO session, 2026-11-28): the title grows with the views.
    return electionsPageHead({
      title: translator._(msg`Analiza alegerilor locale 2024 — Transparenta.eu`),
      description: translator._(msg`Cine a obținut primăriile și mandatele de consilier la alegerile locale din 2024, pe partide și pe județe, din rezultatele oficiale.`),
      canonical: `${getSiteUrl()}/alegeri/analize`,
      indexed: bare,
    })
  },
})
