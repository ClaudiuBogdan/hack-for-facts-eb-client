import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { buildEventDocumentTitle, eventName } from '@/features/elections/catalog/elections-catalog-text'
import { selectBallotDay } from '@/features/elections/lib/election-days'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'
import { electionsNoStoreHeaders, electionsPageHead } from '@/features/elections/lib/elections-head'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { isElectionRecordKey, parseElectionContestsSearch, type ElectionContestPage, type ElectionEvent } from '@/schemas/elections-catalog'

export interface ElectionEditionLoaderData {
  readonly electionKey: string
  /** Present on a server render whose read succeeded; the page's own query reads it otherwise. */
  readonly event?: ElectionEvent
  /** The first contests of the day the address names, with the key they were read under: they seed the list only under the same key. */
  readonly contests?: { readonly occurrenceKey: string; readonly seedKey: string; readonly page: ElectionContestPage }
}

/**
 * One election event and a page of one ballot day's contests. On the server
 * the event is read, then the contests of the day the address names, both
 * within one short deadline: an event the API does not have is a 404, a
 * failed read is the page's own retry, and a failed contest list leaves the
 * event standing. In the browser the loader starts both reads, the second
 * once the first names the day, and returns at once. A key the API could
 * never hold is no page.
 */
export const Route = createFileRoute('/alegeri/$electionKey')({
  ssr: true,
  validateSearch: parseElectionContestsSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps, abortController }): Promise<ElectionEditionLoaderData> => {
    const { electionKey } = params
    if (!isElectionRecordKey(electionKey)) throw notFound()
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/elections/hooks/use-elections-catalog')
      const { queryClient } = context
      void queryClient
        .fetchQuery(hooks.electionEventQueryOptions(electionKey))
        .then((event) => {
          const day = event ? selectBallotDay(event, deps.data) : null
          return day ? queryClient.prefetchQuery(hooks.electionContestsQueryOptions(day.occurrenceKey, deps)) : undefined
        })
        .catch(() => undefined)
      return { electionKey }
    }
    const { readElectionEventForSsr } = await import('@/features/elections/api/elections-catalog-ssr')
    const read = await readElectionEventForSsr(electionKey, deps, abortController.signal)
    if (read.event === null) throw notFound()
    return {
      electionKey,
      ...(read.event ? { event: read.event } : {}),
      ...(read.contests
        ? {
            contests: {
              occurrenceKey: read.contests.occurrenceKey,
              seedKey: seedKeyOf(electionsCatalogKeys.contests(read.contests.occurrenceKey, deps)),
              page: read.contests.page,
            },
          }
        : {}),
    }
  },
  headers: electionsNoStoreHeaders,
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    // After a client-side navigation the loader returns no event: the query cache may hold it.
    const event = loaderData?.event ?? match.context.queryClient.getQueryData<ElectionEvent | null>(electionsCatalogKeys.event(params.electionKey)) ?? null
    const name = event ? eventName(translator, event) : params.electionKey
    return electionsPageHead({
      title: buildEventDocumentTitle(translator, { eventKey: params.electionKey, event }),
      description: translator._(msg`${name}: zilele de vot și scrutinele lor, cu voturile la nivel de partid și prezența la vot.`),
      canonical: `${getSiteUrl()}/alegeri/${encodeURIComponent(params.electionKey)}`,
    })
  },
})
