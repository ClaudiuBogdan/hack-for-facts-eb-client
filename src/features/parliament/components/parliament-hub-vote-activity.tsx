import { useMemo, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import type { ParliamentSearch } from '@/schemas/parliament'
import { buildVotesFilter } from '../api/graphql/parliament-filters'
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
 * The window is FIXED; its SCOPE is the reader's own filter set. A square counts
 * exactly what the list beneath it would return, because the two are computed
 * from the same filter — clicking a day must not hand back a different number
 * than the one that was clicked. On the hub, where there is no filter panel, the
 * count is cross-chamber.
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

  /**
   * The list's own filter, minus its day bound. `from`/`to` are dropped for two
   * reasons: the server REJECTS a voteDate inside this field (the year argument
   * is the bound), and a chart collapsed to the one day the reader already
   * picked could not show them the year they are picking within.
   */
  const activityFilter = useMemo(() => {
    const { from: _from, to: _to, ...rest } = daySearch
    const filter = buildVotesFilter(rest)
    delete filter.voteDate
    return Object.keys(filter).length > 0 ? filter : undefined
  }, [daySearch])

  // Two hooks, always called. A 12-month window crosses a new year, and the
  // aggregate is served one calendar year at a time; when the window needs only
  // one year both ask for the same key and React Query serves the second from
  // the first's cache, so it stays a single request.
  const primary = useParliamentVoteActivity(window.years[0]!, activityFilter)
  const secondary = useParliamentVoteActivity(
    window.years[1] ?? window.years[0]!,
    activityFilter,
  )

  const needsBothYears = window.years.length > 1
  const hasFailed = primary.isError || (needsBothYears && secondary.isError)
  const isLoading =
    !hasFailed && (primary.isLoading || (needsBothYears && secondary.isLoading))

  /** One entry per lane; the two yearly reads repeat the same coverage rows. */
  const lanes = useMemo(() => {
    const rows = [
      ...(primary.data?.coverage ?? []),
      ...(secondary.data?.coverage ?? []),
    ]
    const byKey = new Map<string, (typeof rows)[number]>()
    for (const c of rows) byKey.set(`${c.chamber}/${c.sourceSystem}`, c)
    return [...byKey.values()]
  }, [primary.data, secondary.data])

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
        /**
         * A count past the settled frontier is a floor, not a total. 131 held
         * divisions currently sit on such days: the 04:30 poll caught what had
         * happened by then, and nothing revisits the day. Saying "4 voturi"
         * flatly there would assert a completeness we do not have — the same
         * error as painting an unwatched day quiet, one step less obvious.
         */
        const settled =
          lanes.length === 0 ||
          lanes.every(
            (c) => c.finalizedThrough !== null && day.date <= c.finalizedThrough,
          )
        map.set(day.date, {
          total: day.total,
          label: settled
            ? t`${dateLabel} — ${countLabel}`
            : t`${dateLabel} — ${countLabel} (încă neconfirmat)`,
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
              {!settled && (
                <p className="mt-1 text-[11px] text-white/80">
                  <Trans>
                    Ziua nu e confirmată — am verificat dimineața, înainte de
                    ședință, așa că pot lipsi voturi.
                  </Trans>
                </p>
              )}
            </>
          ),
        })
      }
    }
    return map
  }, [
    primary.data,
    secondary.data,
    needsBothYears,
    window,
    daySearch,
    onSelectDay,
    lanes,
  ])

  /**
   * Whether a zero on this day is a FACT. Three things must all hold, and the
   * first cut got each of the last two wrong:
   *
   *  1. No typed gap claims the day.
   *  2. EVERY contributing lane covers it — not "some". A square sums the lanes
   *     in scope, so if Senate coverage stops on 2026-06-30 and CDep runs to
   *     07-29, a July square is missing the Senate half entirely; `some` painted
   *     it confirmed. Intersection is the only sound reading of a summed count.
   *  3. The day is at or below every contributing lane's SETTLED frontier. CDep
   *     polls each day at 04:30 that same morning and never revisits, so a day
   *     inside the crawl window is not thereby a day whose sitting we saw.
   *     Measured: on 2026-07-27 the source published 2 divisions and we hold 0 —
   *     inside coverage, after the frontier. `finalizedThrough` was fetched and
   *     ignored, which is what let that day render as a quiet one.
   *
   * A NULL frontier means nothing is settled, so nothing after it is confirmed.
   * Absent coverage entirely (an older API, or migrated-but-underived) this stays
   * undefined and the grid keeps its two-state reading rather than inventing a
   * third from data it does not have.
   */
  const isCovered = useMemo(() => {
    if (lanes.length === 0) return undefined
    const gapDays = new Set(lanes.flatMap((c) => c.gaps.map((g) => g.date)))
    return (iso: string): boolean => {
      if (gapDays.has(iso)) return false
      return lanes.every(
        (c) =>
          c.ranges.some((r) => iso >= r.from && iso <= r.to) &&
          c.finalizedThrough !== null &&
          iso <= c.finalizedThrough,
      )
    }
  }, [lanes])

  /**
   * WHY an unconfirmed day is unconfirmed, so the tooltip admits the right
   * thing: 'not-settled' = we fetched it, but at 04:30 before the sitting;
   * 'not-captured' = we never watched it at all.
   */
  const unconfirmedReason = useMemo(() => {
    return (iso: string): 'not-settled' | 'not-captured' => {
      const inEveryWindow = lanes.every((c) =>
        c.ranges.some((r) => iso >= r.from && iso <= r.to),
      )
      return lanes.length > 0 && inEveryWindow ? 'not-settled' : 'not-captured'
    }
  }, [lanes])

  return (
    <ParliamentHubActivityHeatmap
      ariaLabel={t`Activitatea de vot pe zile, ultimele 12 luni`}
      window={window}
      days={days}
      {...(isCovered !== undefined && { isCovered })}
      uncapturedLabel={(iso) => {
        const dateLabel = formatActivityDate(iso)
        // Two different admissions, and saying the wrong one is its own small
        // lie. A day after the settled frontier WAS fetched — just at 04:30,
        // before the chamber could sit — so "we never collected it" is false.
        return unconfirmedReason(iso) === 'not-settled'
          ? t`${dateLabel} — am verificat dimineața, înainte de ședință; ziua nu e confirmată`
          : t`${dateLabel} — nu am colectat această zi`
      }}
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
