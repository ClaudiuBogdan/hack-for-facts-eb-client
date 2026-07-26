import { useMemo } from 'react'
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
  stenogramNoticeClassName,
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

  const pages = data?.pages ?? []
  const sessions = pages.flatMap((page) => page.sessions)
  const first = pages[0]
  const activeCount = countActiveStenogramSessionFilters(search)

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
      <p
        aria-live="polite"
        className="border border-[#b1b4b6] bg-[#f3f2f1] px-5 py-3 text-sm tabular-nums text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]"
      >
        <Trans>
          Afișate <span className="font-bold">{shown}</span> din{' '}
          <span className="font-bold">{total}</span> ședințe
        </Trans>
      </p>

      {first.totalEstimated ? (
        <p className={stenogramNoticeClassName}>
          <Trans>
            Numărul total este plafonat la 10.000 de ședințe de către server.
            Restrângeți după an, cameră sau vorbitor pentru un total exact.
          </Trans>
        </p>
      ) : null}

      {sessions.map((session) => (
        <ParliamentStenogramSessionCard
          key={session.sessionKey}
          session={session}
        />
      ))}

      {hasNextPage ? (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-none border-2 px-6"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? (
              <Trans>Se încarcă…</Trans>
            ) : (
              <Trans>Încarcă mai multe ședințe</Trans>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
