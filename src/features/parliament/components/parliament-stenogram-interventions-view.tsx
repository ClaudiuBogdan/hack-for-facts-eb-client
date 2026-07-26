import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentSpeechesSearch } from '@/schemas/parliament'
import { useParliamentSpeeches } from '../hooks/use-parliament-data'
import {
  buildParliamentSpeechesFilter,
  countActiveParliamentSpeechFilters,
  expectedSearchDepth,
  getParliamentSpeechQ,
} from '../lib/parliament-speeches-filter'
import { classifyStenogramFailure } from '../lib/parliament-stenogram-error'
import { formatStenogramTotal } from '../lib/stenogram-presentation'
import {
  stenogramMutedTextClassName,
  stenogramNoticeClassName,
} from '../lib/stenogram-theme'
import { MemberSpeechRecordCard } from './member-speech-record-card'
import { ParliamentSpeechSearchDepthNotice } from './parliament-speech-search-depth-notice'
import { ParliamentStenogramFailureNotice } from './parliament-stenogram-failure'

type Props = {
  readonly search: ParliamentSpeechesSearch
  /** Resolved by the page (URL year, else the newest year with turns). */
  readonly year: number
}

/**
 * The INTERVENTIONS view — one card per contribution, across sittings.
 *
 * This is the view that carries the server's boundedness constraint: there is
 * no date index on the 1.4M turns, so the list ALWAYS travels with a bound
 * (speaker, explicit range, or the selected year's window). That is why the
 * year is a required part of this view's URL and not a removable chip.
 */
export function ParliamentStenogramInterventionsView({ search, year }: Props) {
  const { i18n } = useLingui()
  const q = getParliamentSpeechQ(search)
  const filter = useMemo(
    () => buildParliamentSpeechesFilter(search, { year }),
    [search, year],
  )

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useParliamentSpeeches(filter, q)

  const pages = data?.pages ?? []
  const speeches = pages.flatMap((page) => page.speeches)
  const first = pages[0]
  const activeCount = countActiveParliamentSpeechFilters(search)
  // The server response is the depth source of truth; the pure hint only covers
  // the loading gap so the notice never flickers between the two meanings.
  const searchDepth = first?.searchDepth ?? expectedSearchDepth(search)

  if (isLoading) {
    return (
      <div
        className="space-y-4"
        aria-busy="true"
        aria-label={t`Se încarcă lista de intervenții`}
      >
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-44 w-full rounded-none" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ParliamentStenogramFailureNotice
        failure={classifyStenogramFailure(error)}
        onRetry={() => void refetch()}
      />
    )
  }

  if (speeches.length === 0 || !first) {
    return (
      <div className="space-y-3">
        {q ? <ParliamentSpeechSearchDepthNotice depth={searchDepth} /> : null}
        <p className={stenogramMutedTextClassName}>
          {/* `q` is not a sheet facet (activeCount ignores it) but it does
              narrow the list — both must flip the empty-state copy. */}
          {activeCount > 0 || q ? (
            <Trans>Nicio intervenție nu corespunde criteriilor selectate.</Trans>
          ) : (
            <Trans>Nu există intervenții consemnate pentru anul {year}.</Trans>
          )}
        </p>
      </div>
    )
  }

  const shown = String(speeches.length)
  const total = formatStenogramTotal(
    first.total,
    first.totalEstimated,
    i18n.locale,
  )

  return (
    <div className="space-y-4">
      {q ? <ParliamentSpeechSearchDepthNotice depth={searchDepth} /> : null}

      <p
        aria-live="polite"
        className="border border-[#b1b4b6] bg-[#f3f2f1] px-5 py-3 text-sm tabular-nums text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]"
      >
        <Trans>
          Afișate <span className="font-bold">{shown}</span> din{' '}
          <span className="font-bold">{total}</span> intervenții
        </Trans>
      </p>

      <p className={stenogramNoticeClassName}>
        <Trans>
          Fiecare card conține o singură luare de cuvânt. Acolo unde intervenția
          are o poziție dovedită în stenogramă, cardul duce la locul ei exact în
          textul integral al ședinței.
        </Trans>
      </p>

      {speeches.map((speech) => (
        <MemberSpeechRecordCard
          key={speech.speechKey}
          speech={speech}
          detailTo={speech.speechKey}
          speaker={
            speech.speaker
              ? {
                  name: speech.speaker.fullName,
                  memberId: speech.speaker.mandateKey,
                  groupName: speech.speaker.groupName,
                }
              : speech.speakerName
                ? { name: speech.speakerName }
                : undefined
          }
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
              <Trans>Încarcă mai multe intervenții</Trans>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
