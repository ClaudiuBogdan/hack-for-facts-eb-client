import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { buildContestDocumentTitle } from '@/features/elections/catalog/elections-catalog-text'
import { electionsCatalogKeys } from '@/features/elections/lib/elections-catalog-keys'
import { electionsNoStoreHeaders, electionsPageHead } from '@/features/elections/lib/elections-head'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { isElectionRecordKey, type ElectionContest } from '@/schemas/elections-catalog'

export interface ElectionContestLoaderData {
  readonly contestKey: string
  /** Present on a server render whose read succeeded; the page's own query reads it otherwise. */
  readonly contest?: ElectionContest
}

/**
 * One source contest's metadata. Read on the server under a deadline: a
 * contest the API does not have is a 404, a failed read is the page's own
 * retry. In the browser the loader starts the read and returns at once. A key
 * the API could never hold is no page.
 */
export const Route = createFileRoute('/alegeri/contest/$contestKey')({
  ssr: true,
  loader: async ({ context, params, abortController }): Promise<ElectionContestLoaderData> => {
    const { contestKey } = params
    if (!isElectionRecordKey(contestKey)) throw notFound()
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/elections/hooks/use-elections-catalog')
      void context.queryClient.prefetchQuery(hooks.electionContestQueryOptions(contestKey)).catch(() => undefined)
      return { contestKey }
    }
    const { readElectionContestForSsr } = await import('@/features/elections/api/elections-catalog-ssr')
    const contest = await readElectionContestForSsr(contestKey, abortController.signal)
    if (contest === null) throw notFound()
    return contest ? { contestKey, contest } : { contestKey }
  },
  headers: electionsNoStoreHeaders,
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    // After a client-side navigation the loader returns no contest: the query cache may hold it.
    const contest =
      loaderData?.contest ?? match.context.queryClient.getQueryData<ElectionContest | null>(electionsCatalogKeys.contest(params.contestKey)) ?? null
    const place = contest ? (contest.scopeLabel ?? contest.sourceScopeKey) : null
    const office = contest?.reportedOffice ?? null
    const election = contest?.electionKey ?? null
    return electionsPageHead({
      title: buildContestDocumentTitle(translator, { contestKey: params.contestKey, place, office }),
      description:
        place && office && election
          ? translator._(msg`Scrutinul ${office} din ${place}, din ediția de sursă ${election}: funcția, aria și turul raportate de sursă. Rezultatele nu sunt încă disponibile.`)
          : translator._(msg`Un scrutin dintr-o ediție de date electorale: funcția, aria și turul raportate de sursă. Rezultatele nu sunt încă disponibile.`),
      canonical: `${getSiteUrl()}/alegeri/contest/${encodeURIComponent(params.contestKey)}`,
    })
  },
})
