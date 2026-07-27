import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentSpeechesSearch } from '@/schemas/parliament'
import { useParliamentStenogramSessions } from '../hooks/use-parliament-data'
import { classifyStenogramFailure } from '../lib/parliament-stenogram-error'
import {
  buildStenogramSessionsFilter,
  countActiveStenogramSessionFilters,
} from '../lib/parliament-stenogram-filter'
import { getParliamentSpeechQ } from '../lib/parliament-speeches-filter'
import { formatStenogramTotal } from '../lib/stenogram-presentation'
import {
  stenogramMutedTextClassName,
} from '../lib/stenogram-theme'
import { ParliamentStenogramFailureNotice } from './parliament-stenogram-failure'
import { ParliamentStenogramSessionCard } from './parliament-stenogram-session-card'

type Props = {
  readonly search: ParliamentSpeechesSearch
}

/** Skeleton that matches the real card rhythm, so nothing jumps on arrival. */
function SessionsSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Se încarcă lista de ședințe"
    >
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-40 w-full rounded-none" />
      ))}
    </div>
  )
}

/**
 * The SITTINGS view — the default surface.
 *
 * A stenogram is a document, so the browse unit is the sitting. Unlike the
 * interventions view this list needs no year bound (see
 * `buildStenogramSessionsFilter`), which is what lets the page open on the
 * whole history, newest first, with an empty URL.
 */
export function ParliamentStenogramSessionsView({ search }: Props) {
  const { i18n } = useLingui()
  const q = getParliamentSpeechQ(search)
  const filter = useMemo(() => buildStenogramSessionsFilter(search), [search])

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useParliamentStenogramSessions(filter, q)

  // ── which page is on screen ──────────────────────────────────────────────
  // The server pages by CURSOR, so page N only exists once N-1 has been asked
  // for. The infinite query keeps every page it has fetched, so stepping back
  // is instant and free — the index below chooses which of them is rendered,
  // and "next" only ever hits the network at the frontier.
  const [pageIndex, setPageIndex] = useState(0)

  // A new filter or a new search is a NEW list, and page 4 of the old one means
  // nothing in it. Keyed on the query's own identity so this cannot drift from
  // what the hook is fetching.
  const listKey = useMemo(
    () => JSON.stringify({ filter: filter ?? null, q: q ?? null }),
    [filter, q],
  )
  const [seenListKey, setSeenListKey] = useState(listKey)
  if (seenListKey !== listKey) {
    setSeenListKey(listKey)
    setPageIndex(0)
  }

  const pages = data?.pages ?? []
  const page = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))]
  const sessions = page?.sessions ?? []
  const first = pages[0]
  const activeCount = countActiveStenogramSessionFilters(search)
  const canGoBack = pageIndex > 0
  const canGoForward = pageIndex + 1 < pages.length || hasNextPage

  if (isLoading) return <SessionsSkeleton />

  if (isError) {
    // A dead search projection is reported as ITSELF, never as "no results" —
    // an empty list would answer "there are no such sittings", which we do not
    // know and which is very likely false.
    return (
      <ParliamentStenogramFailureNotice
        failure={classifyStenogramFailure(error)}
        onRetry={() => void refetch()}
      />
    )
  }

  if (sessions.length === 0 || !first) {
    return (
      <p className={stenogramMutedTextClassName}>
        {activeCount > 0 || q ? (
          <Trans>Nicio ședință nu corespunde criteriilor selectate.</Trans>
        ) : (
          <Trans>Nu există stenograme publicate.</Trans>
        )}
      </p>
    )
  }

  const shown = String(sessions.length)
  const total = formatStenogramTotal(
    first.total,
    first.totalEstimated,
    i18n.locale,
  )

  return (
    <div className="space-y-4">
      {/* The count stays, the BOX around it does not. Two banners stacked above
          the results — a tally, then a caveat about the tally — pushed the
          sittings themselves below the fold and made the reader read two
          sentences about a list before reading the list. The tally is still
          announced, because it is what tells a screen-reader user that a filter
          did something; the cap needs no banner of its own, since the total is
          already printed as "peste 10.000" rather than as a number it is not. */}
      <p aria-live="polite" className="sr-only">
        <Trans>
          Afișate <span className="font-bold">{shown}</span> din{' '}
          <span className="font-bold">{total}</span> ședințe
        </Trans>
      </p>

      {sessions.map((session) => (
        <ParliamentStenogramSessionCard
          key={session.sessionKey}
          session={session}
        />
      ))}

      {/* A PAGER, not a "load more" pile. Ten sittings a page, and the page
          number is the reader's place in the list — which is also why no total
          page count is printed: the server caps `total` at 10.000 and reports
          it as an estimate, and a "din 1.000 de pagini" built on a capped
          number would be a made-up denominator. Where it can be exact, the
          pager simply stops offering a next page. */}
      {canGoBack || canGoForward ? (
        <nav
          aria-label={t`Paginare ședințe`}
          className="flex flex-wrap items-center gap-3 pt-2"
        >
          <Button
            type="button"
            variant="outline"
            className="rounded-none border-2 px-4"
            disabled={!canGoBack}
            onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            <Trans>Pagina anterioară</Trans>
          </Button>

          <span className="text-sm tabular-nums text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>Pagina {pageIndex + 1}</Trans>
          </span>

          <Button
            type="button"
            variant="outline"
            className="rounded-none border-2 px-4"
            disabled={!canGoForward || isFetchingNextPage}
            onClick={() => {
              // Already fetched? Just step. At the frontier, fetch and step
              // once it lands, so the button never advances onto an empty page.
              if (pageIndex + 1 < pages.length) {
                setPageIndex((index) => index + 1)
                return
              }
              const requestedFor = listKey
              void fetchNextPage().then((result) => {
                // Only step onto a page that actually arrived, and only if the
                // reader has not changed the list meanwhile. A failed fetch
                // resolves like any other, and a resolution that lands after a
                // new filter would move the pager off a list it never paged.
                if (requestedFor !== listKey) return
                const fetched = result.data?.pages.length ?? 0
                setPageIndex((index) => (index + 1 < fetched ? index + 1 : index))
              })
            }}
          >
            {isFetchingNextPage ? (
              <Trans>Se încarcă…</Trans>
            ) : (
              <Trans>Pagina următoare</Trans>
            )}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </nav>
      ) : null}
    </div>
  )
}
