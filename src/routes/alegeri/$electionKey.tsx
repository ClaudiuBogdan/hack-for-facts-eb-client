import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { buildEditionDocumentTitle } from '@/features/elections/catalog/elections-catalog-text'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'
import { electionsNoStoreHeaders, electionsPageHead } from '@/features/elections/lib/elections-head'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import {
  isElectionRecordKey,
  parseElectionContestsSearch,
  type ElectionContestPage,
  type ElectionEdition,
} from '@/schemas/elections-catalog'

export interface ElectionEditionLoaderData {
  readonly electionKey: string
  /** Present on a server render whose read succeeded; the page's own query reads it otherwise. */
  readonly edition?: ElectionEdition
  /** The contests query the server read was for: it seeds the list only under the same key. */
  readonly contestsSeedKey: string
  readonly contests?: ElectionContestPage
}

/**
 * One source edition and a page of its contests. Both are read on the
 * server, side by side under a deadline: an edition the API does not have is
 * a 404, a failed read is the page's own retry, and a failed contest list
 * leaves the edition standing. In the browser the loader starts both reads
 * and returns at once. A key the API could never hold is no page.
 */
export const Route = createFileRoute('/alegeri/$electionKey')({
  ssr: true,
  validateSearch: parseElectionContestsSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps, abortController }): Promise<ElectionEditionLoaderData> => {
    const { electionKey } = params
    if (!isElectionRecordKey(electionKey)) throw notFound()
    const contestsSeedKey = seedKeyOf(electionsCatalogKeys.contests(electionKey, deps))
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/elections/hooks/use-elections-catalog')
      void context.queryClient.prefetchQuery(hooks.electionEditionQueryOptions(electionKey)).catch(() => undefined)
      void context.queryClient.prefetchQuery(hooks.electionContestsQueryOptions(electionKey, deps)).catch(() => undefined)
      return { electionKey, contestsSeedKey }
    }
    const { readElectionEditionForSsr } = await import('@/features/elections/api/elections-catalog-ssr')
    const read = await readElectionEditionForSsr(electionKey, deps, abortController.signal)
    if (read.edition === null) throw notFound()
    return {
      electionKey,
      contestsSeedKey,
      ...(read.edition ? { edition: read.edition } : {}),
      ...(read.contests ? { contests: read.contests } : {}),
    }
  },
  headers: electionsNoStoreHeaders,
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    // After a client-side navigation the loader returns no edition: the query cache may hold it.
    const edition =
      loaderData?.edition ?? match.context.queryClient.getQueryData<ElectionEdition | null>(electionsCatalogKeys.edition(params.electionKey)) ?? null
    const name = edition?.reportedName || params.electionKey
    return electionsPageHead({
      title: buildEditionDocumentTitle(translator, { electionKey: params.electionKey, name: edition?.reportedName }),
      description: translator._(
        msg`Ediția de sursă ${name}: anul, tipul și turul raportate de sursă, și scrutinele ei. Rezultatele nu sunt încă disponibile.`,
      ),
      canonical: `${getSiteUrl()}/alegeri/${encodeURIComponent(params.electionKey)}`,
    })
  },
})
