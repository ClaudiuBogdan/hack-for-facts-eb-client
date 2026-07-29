import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { useParliamentVoteActivity } from '../hooks/use-parliament-data'
import { bucketFor, rollingWindow } from '../lib/vote-activity-grid'
import {
  ParliamentHubActivityHeatmap,
  type ActivityHeatmapDay,
} from './parliament-hub-activity-heatmap'
import { formatActivityDate } from '../lib/activity-heatmap-format'

const ROLLING_MONTHS = 12

/**
 * Plenary vote volume per day over the last 12 months, and the way into the
 * votes list — the footer of the hub's Voturi card.
 *
 * The window is FIXED. The hub answers "when did the chambers vote, and how
 * much" at a glance; choosing a period is the votes page's job, and a period
 * control here would be a filter with no visible results to change.
 *
 * A square is a DIVISION count, not a ballot count — the number of times the
 * chambers voted that day, which is why a busy day reads in the hundreds and
 * not the tens of thousands its ballots would.
 */
export function ParliamentHubVoteActivity() {
  const window = useMemo(
    () => rollingWindow({ months: ROLLING_MONTHS, today: new Date() }),
    [],
  )

  // Two hooks, always called. A 12-month window crosses a new year, and the
  // aggregate is served one calendar year at a time; when the window needs only
  // one year both ask for the same key and React Query serves the second from
  // the first's cache, so it stays a single request.
  const primary = useParliamentVoteActivity(window.years[0]!)
  const secondary = useParliamentVoteActivity(
    window.years[1] ?? window.years[0]!,
  )

  const needsBothYears = window.years.length > 1
  const hasFailed = primary.isError || (needsBothYears && secondary.isError)
  const isLoading =
    !hasFailed && (primary.isLoading || (needsBothYears && secondary.isLoading))

  // A window spanning two calendar years is only true once BOTH have answered.
  // Drawing the half that arrived would print the missing year as empty days —
  // a silent claim that nobody voted, which is exactly the gap this app must
  // not render as a zero.
  const days = useMemo(() => {
    const map = new Map<string, ActivityHeatmapDay>()
    if (primary.data === undefined || primary.data === null) return map
    if (
      needsBothYears &&
      (secondary.data === undefined || secondary.data === null)
    ) {
      return map
    }
    for (const part of [primary.data, secondary.data]) {
      for (const day of part?.days ?? []) {
        if (day.date < window.startIso || day.date > window.endIso) continue
        const dateLabel = formatActivityDate(day.date)
        const countLabel = plural(day.total, {
          one: '# vot',
          few: '# voturi',
          other: '# de voturi',
        })
        map.set(day.date, {
          total: day.total,
          label: t`${dateLabel} — ${countLabel}`,
          // The ALL-chambers list: the square's count sums camera, senat and
          // comun, so only the mixed list shows the set of votes it claims.
          search: { tab: 'voturi', chamber: 'all', from: day.date, to: day.date },
          tooltip: (
            <>
              <p className="font-semibold">{dateLabel}</p>
              <p className="mb-1 text-[11px] text-white/80">{countLabel}</p>
              <p className="text-[11px] text-white/80">
                <Trans>
                  Camera {day.camera} · Senat {day.senat} · Comun {day.comun}
                </Trans>
              </p>
            </>
          ),
        })
      }
    }
    return map
  }, [primary.data, secondary.data, needsBothYears, window])

  return (
    <ParliamentHubActivityHeatmap
      ariaLabel={t`Activitatea de vot pe zile, ultimele 12 luni`}
      window={window}
      days={days}
      status={isLoading ? 'loading' : hasFailed ? 'error' : 'ready'}
      errorLead={
        <Trans>
          Activitatea de vot pe zile nu a putut fi încărcată. Lista de mai sus
          nu este afectată.
        </Trans>
      }
      errorDetail={
        primary.error instanceof Error ? primary.error.message : undefined
      }
      emptyLabel={<Trans>Niciun vot în plen în ultimele 12 luni.</Trans>}
      bucketOf={bucketFor}
      cta={
        <Button
          asChild
          className="mt-4 h-10 rounded-none bg-[#1d70b8] px-5 text-base font-normal text-white hover:bg-[#1d70b8]/90"
        >
          <Link to="/parlament" search={{ tab: 'voturi', chamber: 'all' }}>
            <Trans>Vezi toate voturile</Trans>
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      }
    />
  )
}
