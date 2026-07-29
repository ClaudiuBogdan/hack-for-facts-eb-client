import { useMemo, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import type { ParliamentSearch } from '@/schemas/parliament'
import { buildVotesFilter } from '../api/graphql/parliament-filters'
import { toGraphqlVoteChamber } from '../api/graphql/parliament-translate'
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

  /**
   * Every coverage row from BOTH yearly reads, deliberately NOT de-duplicated by
   * lane key. De-duplicating let the second response overwrite the first, so a
   * stale or more generous row could replace a stricter one. Keeping them all
   * and requiring EVERY row to cover a day makes the merge conservative by
   * construction: disagreement between the two reads can only narrow a claim.
   */
  const lanes = useMemo(
    () => [
      ...(primary.data?.coverage ?? []),
      ...(secondary.data?.coverage ?? []),
    ],
    [primary.data, secondary.data],
  )

  /**
   * The chambers this square SUMS, so the chambers coverage must account for.
   * Without this, coverage that simply omits a lane reads as coverage that
   * confirms it — absence would never veto presence, and an all-chamber day
   * could be confirmed on one lane's say-so.
   */
  const expectedChambers = useMemo(() => {
    const c = daySearch.chamber
    return c === undefined || c === 'all'
      ? ['camera_deputatilor', 'senat', 'comun']
      : [toGraphqlVoteChamber(c)]
  }, [daySearch.chamber])

  /**
   * What we can honestly say about one day — ONE function, consulted by empty
   * and non-empty squares alike. They used to be judged separately: empty cells
   * checked gaps + ranges + frontier, while cells WITH divisions checked only
   * the frontier. So a day carrying a typed Senate gap and five Camera
   * divisions printed a bare "5 votes" (28 such gap dates overlap 340
   * divisions live). A count is a completeness claim too.
   */
  const verdictFor = useMemo(() => {
    if (lanes.length === 0) return undefined
    const gapByDate = new Map<string, { status: string; reason: string | null }>()
    for (const c of lanes) {
      for (const g of c.gaps) if (!gapByDate.has(g.date)) gapByDate.set(g.date, g)
    }
    const covered = new Set(lanes.map((c) => c.chamber))
    const laneSetComplete = expectedChambers.every((c) => covered.has(c))
    return (
      iso: string,
    ):
      | { kind: 'accounted' }
      | { kind: 'gap'; status: string; reason: string | null }
      | { kind: 'lane-missing' }
      | { kind: 'not-captured' }
      | { kind: 'not-settled' } => {
      const gap = gapByDate.get(iso)
      if (gap !== undefined) {
        return { kind: 'gap', status: gap.status, reason: gap.reason }
      }
      if (!laneSetComplete) return { kind: 'lane-missing' }
      if (!lanes.every((c) => c.ranges.some((r) => iso >= r.from && iso <= r.to))) {
        return { kind: 'not-captured' }
      }
      if (
        !lanes.every(
          (c) => c.finalizedThrough !== null && iso <= c.finalizedThrough,
        )
      ) {
        return { kind: 'not-settled' }
      }
      return { kind: 'accounted' }
    }
  }, [lanes, expectedChambers])

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
        const settled = (verdictFor?.(day.date).kind ?? 'accounted') === 'accounted'
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
    verdictFor,
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
  const isCovered = useMemo(
    () =>
      verdictFor === undefined
        ? undefined
        : (iso: string): boolean => verdictFor(iso).kind === 'accounted',
    [verdictFor],
  )

  return (
    <ParliamentHubActivityHeatmap
      ariaLabel={t`Activitatea de vot pe zile, ultimele 12 luni`}
      window={window}
      days={days}
      {...(isCovered !== undefined && { isCovered })}
      uncapturedLabel={(iso) => {
        const dateLabel = formatActivityDate(iso)
        // Four different admissions. Saying the wrong one is its own small lie:
        // a day the crawl WATCHED and found listed-but-empty is not a day we
        // "checked too early", and a day whose lane is simply missing from the
        // coverage read is neither.
        const v = verdictFor?.(iso)
        switch (v?.kind) {
          case 'gap':
            return v.reason !== null
              ? t`${dateLabel} — ${v.reason}`
              : t`${dateLabel} — sursa nu a returnat nimic pentru această zi`
          case 'not-settled':
            return t`${dateLabel} — am verificat dimineața, înainte de ședință; ziua nu e confirmată`
          case 'lane-missing':
            return t`${dateLabel} — nu avem acoperirea tuturor camerelor pentru această zi`
          default:
            return t`${dateLabel} — nu am colectat această zi`
        }
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
