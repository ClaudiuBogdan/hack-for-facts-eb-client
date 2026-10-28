import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { buildContestDocumentTitle, officeLabel, placeName } from '@/features/elections/catalog/elections-catalog-text'
import { electionsCatalogKeys } from '@/features/elections/lib/elections-catalog-keys'
import { electionsNoStoreHeaders, electionsPageHead } from '@/features/elections/lib/elections-head'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { isElectionRecordKey, type ElectionContest, type ElectionEvent, type ElectionResult } from '@/schemas/elections-catalog'

export interface ElectionContestLoaderData {
  readonly contestKey: string
  /** Present on a server render whose read succeeded; the page's own query reads it otherwise. */
  readonly contest?: ElectionContest
  /** The contest's figures (`null`: its place has none); absent when the read failed. */
  readonly result?: ElectionResult | null
  /** The contest's event, for its name and ballot day; absent when the read failed. */
  readonly event?: ElectionEvent
}

/**
 * One contest and its figures. On the server the contest is read, then its
 * figures and its event side by side, all within one short deadline: a
 * contest the API does not have is a 404, a failed read is the page's own
 * retry. In the browser the loader starts the reads, the second pair once the
 * contest is known, and returns at once. A key the API could never hold is no
 * page.
 */
export const Route = createFileRoute('/alegeri/contest/$contestKey')({
  ssr: true,
  loader: async ({ context, params, abortController }): Promise<ElectionContestLoaderData> => {
    const { contestKey } = params
    if (!isElectionRecordKey(contestKey)) throw notFound()
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/elections/hooks/use-elections-catalog')
      const { queryClient } = context
      void queryClient
        .fetchQuery(hooks.electionContestQueryOptions(contestKey))
        .then((contest) =>
          contest
            ? Promise.all([
                queryClient.prefetchQuery(hooks.electionResultQueryOptions(contest)),
                queryClient.prefetchQuery(hooks.electionEventQueryOptions(contest.eventKey)),
              ])
            : undefined,
        )
        .catch(() => undefined)
      return { contestKey }
    }
    const { readElectionContestForSsr } = await import('@/features/elections/api/elections-catalog-ssr')
    const read = await readElectionContestForSsr(contestKey, abortController.signal)
    if (read.contest === null) throw notFound()
    return {
      contestKey,
      ...(read.contest ? { contest: read.contest } : {}),
      ...(read.result !== undefined ? { result: read.result } : {}),
      // An event the API no longer has leaves the contest with its key only.
      ...(read.event ? { event: read.event } : {}),
    }
  },
  headers: electionsNoStoreHeaders,
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    // After a client-side navigation the loader returns no contest: the query cache may hold it.
    const contest =
      loaderData?.contest ?? match.context.queryClient.getQueryData<ElectionContest | null>(electionsCatalogKeys.contest(params.contestKey)) ?? null
    const place = contest ? placeName(translator, contest.jurisdiction) : null
    const office = contest ? officeLabel(translator, contest.office) : null
    return electionsPageHead({
      title: buildContestDocumentTitle(translator, { contestKey: params.contestKey, place, office }),
      description:
        place && office
          ? translator._(msg`Scrutinul pentru funcția ${office} în ${place}: voturile la nivel de partid și prezența la vot.`)
          : translator._(msg`Un scrutin dintr-o alegere: voturile la nivel de partid și prezența la vot.`),
      canonical: `${getSiteUrl()}/alegeri/contest/${encodeURIComponent(params.contestKey)}`,
    })
  },
})
