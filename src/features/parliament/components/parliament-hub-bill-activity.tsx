import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { useParliamentBillActivity } from '../hooks/use-parliament-data'
import { billBucketFor, rollingWindow } from '../lib/vote-activity-grid'
import {
  ParliamentHubActivityHeatmap,
  type ActivityHeatmapDay,
} from './parliament-hub-activity-heatmap'
import { formatActivityDate } from '../lib/activity-heatmap-format'

const ROLLING_MONTHS = 12

/**
 * Legislative volume per day over the last 12 months, and the way into the
 * bills list — the footer of the hub's Proiecte de lege card.
 *
 * A square counts BILLS WHOSE LAST STEP falls on that day — the `lastEventDate`
 * the cards above already print as "Actualizat" and the list sorts by. It is
 * not a count of procedural steps: ~56% of CDep procedural rows carry no date
 * at source, so a step-grain heatmap would draw most of the record as empty.
 *
 * The squares do NOT link. The bills list can be narrowed by type, stage, year
 * and text, but not to a single day, so a link would land on an unfiltered list
 * and answer a wider question than the square asked.
 */
export function ParliamentHubBillActivity() {
  const window = useMemo(
    () => rollingWindow({ months: ROLLING_MONTHS, today: new Date() }),
    [],
  )

  // Two hooks, always called — see the vote panel: the window crosses a year
  // and the aggregate is served one calendar year at a time.
  const primary = useParliamentBillActivity(window.years[0]!)
  const secondary = useParliamentBillActivity(
    window.years[1] ?? window.years[0]!,
  )

  const needsBothYears = window.years.length > 1
  const hasFailed = primary.isError || (needsBothYears && secondary.isError)
  const isLoading =
    !hasFailed && (primary.isLoading || (needsBothYears && secondary.isLoading))

  // Both halves or nothing: drawing the year that arrived would print the other
  // as a run of empty days, i.e. as "Parliament legislated nothing".
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
          one: '# proiect',
          few: '# proiecte',
          other: '# de proiecte',
        })
        map.set(day.date, {
          total: day.total,
          label: t`${dateLabel} — ${countLabel}`,
          tooltip: (
            <>
              <p className="font-semibold">{dateLabel}</p>
              <p className="mb-1 text-[11px] text-white/80">{countLabel}</p>
              <p className="text-[11px] text-white/80">
                <Trans>cu ultima etapă în această zi</Trans>
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
      ariaLabel={t`Activitatea legislativă pe zile, ultimele 12 luni`}
      window={window}
      days={days}
      status={isLoading ? 'loading' : hasFailed ? 'error' : 'ready'}
      errorLead={
        <Trans>
          Activitatea legislativă pe zile nu a putut fi încărcată. Lista de mai
          sus nu este afectată.
        </Trans>
      }
      errorDetail={
        primary.error instanceof Error ? primary.error.message : undefined
      }
      emptyLabel={
        <Trans>Niciun proiect cu etape noi în ultimele 12 luni.</Trans>
      }
      bucketOf={billBucketFor}
      cta={
        <Button
          asChild
          className="mt-4 h-10 rounded-none bg-[#1d70b8] px-5 text-base font-normal text-white hover:bg-[#1d70b8]/90"
        >
          <Link to="/parlament" search={{ tab: 'proiecte' }}>
            <Trans>Vezi toate proiectele</Trans>
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      }
    />
  )
}
