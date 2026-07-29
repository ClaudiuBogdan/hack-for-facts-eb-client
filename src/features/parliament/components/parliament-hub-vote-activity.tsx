import { useMemo, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import type { ParliamentSearch } from '@/schemas/parliament'
import { useParliamentVoteActivity } from '../hooks/use-parliament-data'
import { bucketFor, rollingWindow } from '../lib/vote-activity-grid'
import {
  ParliamentHubActivityHeatmap,
  type ActivityHeatmapDay,
} from './parliament-hub-activity-heatmap'
import { formatActivityDate } from '../lib/activity-heatmap-format'

const ROLLING_MONTHS = 12

/** The mixed all-chambers list: what a square's cross-chamber count matches. */
const DEFAULT_DAY_SEARCH: ParliamentSearch = { tab: 'voturi', chamber: 'all' }

type Props = {
  /**
   * What a day square carries BESIDES its own `from`/`to`. Under the votes list
   * this is the reader's live filter set, so choosing a day narrows the list
   * they are looking at instead of resetting it to a fresh cross-chamber query.
   */
  readonly daySearch?: ParliamentSearch
  /** Fired when a day is chosen — see `ActivityHeatmapDay.onSelect`. */
  readonly onSelectDay?: () => void
  /**
   * Replaces the "Vezi toate voturile" button. The list surface is already
   * there, so it passes its own footer rather than a link back to itself.
   */
  readonly cta?: ReactNode
}

/**
 * Plenary vote volume per day over the last 12 months, and the way into the
 * votes list — the footer of the hub's Voturi card and of the votes list.
 *
 * The window is FIXED, and so is its scope: a square counts every division that
 * day across Camera, Senat and the joint sittings, whatever the surface below
 * it is filtered to. Recomputing it per filter would make the same square mean
 * a different thing on each visit; the surface says which reading it is showing
 * instead.
 *
 * A square is a DIVISION count, not a ballot count — the number of times the
 * chambers voted that day, which is why a busy day reads in the hundreds and
 * not the tens of thousands its ballots would.
 */
export function ParliamentHubVoteActivity({
  daySearch = DEFAULT_DAY_SEARCH,
  onSelectDay,
  cta,
}: Props = {}) {
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
          // The day is added to whatever the surface already asks for: on the
          // hub that is the ALL-chambers list (the square's count sums camera,
          // senat and comun), on the votes page the reader's own filters.
          search: { ...daySearch, from: day.date, to: day.date },
          onSelect: onSelectDay,
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
  }, [primary.data, secondary.data, needsBothYears, window, daySearch, onSelectDay])

  /**
   * A day is COVERED when at least one chamber's crawl window contains it and
   * no typed gap claims it. Absent coverage (an older API) this stays undefined
   * and the grid keeps its two-state reading rather than inventing a third.
   *
   * The union across chambers is the right reading for a cross-chamber square:
   * it is uncaptured only when NOBODY watched that day.
   */
  const isCovered = useMemo(() => {
    const coverage = [
      ...(primary.data?.coverage ?? []),
      ...(secondary.data?.coverage ?? []),
    ]
    if (coverage.length === 0) return undefined
    const gapDays = new Set(
      coverage.flatMap((c) =>
        c.gaps
          .filter((g) => g.status !== 'PROVISIONAL')
          .map((g) => g.date),
      ),
    )
    return (iso: string): boolean =>
      !gapDays.has(iso) &&
      coverage.some((c) => c.ranges.some((r) => iso >= r.from && iso <= r.to))
  }, [primary.data, secondary.data])

  return (
    <ParliamentHubActivityHeatmap
      ariaLabel={t`Activitatea de vot pe zile, ultimele 12 luni`}
      window={window}
      days={days}
      {...(isCovered !== undefined && { isCovered })}
      uncapturedLabel={(iso) =>
        t`${formatActivityDate(iso)} — nu am colectat această zi`
      }
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
        cta ?? (
          <Button
            asChild
            className="mt-4 h-10 rounded-none bg-[#1d70b8] px-5 text-base font-normal text-white hover:bg-[#1d70b8]/90"
          >
            <Link to="/parlament" search={{ tab: 'voturi', chamber: 'all' }}>
              <Trans>Vezi toate voturile</Trans>
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )
      }
    />
  )
}
