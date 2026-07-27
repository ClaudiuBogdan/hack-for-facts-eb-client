import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { ParliamentSpeechActivity } from '@/schemas/parliament'
import { useParliamentSpeechActivity } from '../hooks/use-parliament-data'
import type { ParliamentSpeechesFilterInput } from '../lib/parliament-speeches-filter'
import { MemberSpeechActivityHeatmap } from './member-speech-activity-heatmap'
import { ParliamentYearCombobox } from './parliament-year-combobox'

type Props = {
  /** The speech filter the surrounding list is using, so both agree. */
  readonly filter: ParliamentSpeechesFilterInput | undefined
  readonly q: string | undefined
  /** Years the aggregate reports as having any activity at all. */
  readonly availableYears: readonly number[]
  /** `?from=`/`?to=` when they name a single day — the selected square. */
  readonly selectedDay: string | undefined
  readonly onSelectDay: (day: string | null) => void
}

/** The rolling window, or a calendar year picked from the dropdown. */
type Range = { readonly kind: 'rolling' } | { readonly kind: 'year'; readonly year: number }

const ROLLING_MONTHS = 12

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function isoOf(date: Date): string {
  return `${String(date.getUTCFullYear())}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/**
 * The window a range resolves to, and the calendar years it needs fetching for.
 *
 * The aggregate is served ONE CALENDAR YEAR at a time, so a rolling window is
 * two requests stitched together — which is also why the window is computed
 * here rather than inside the chart: the chart must draw exactly the days the
 * queries covered, or it would show an empty December that was never asked for.
 */
function resolveRange(range: Range, today: Date) {
  if (range.kind === 'year') {
    return {
      startIso: `${String(range.year)}-01-01`,
      endIso: `${String(range.year)}-12-31`,
      years: [range.year],
      anchorYear: range.year,
    }
  }
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )
  const start = new Date(end)
  // Day FIRST, then month. `setUTCMonth` overflows when the target month is
  // shorter than the current day — from 2026-03-31 it lands on 2025-05-01
  // instead of 2025-04-01, and the window silently loses a month.
  start.setUTCDate(1)
  start.setUTCMonth(start.getUTCMonth() - (ROLLING_MONTHS - 1))
  const years = Array.from(
    new Set([start.getUTCFullYear(), end.getUTCFullYear()]),
  )
  return {
    startIso: isoOf(start),
    endIso: isoOf(end),
    years,
    anchorYear: end.getUTCFullYear(),
  }
}

const STEP_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-none border-2 border-[#b1b4b6] bg-white text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] disabled:opacity-40 disabled:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)] dark:disabled:hover:bg-[var(--pnrr-card)]'

/**
 * Plenary activity per day, over a range the reader chooses.
 *
 * WHY IT OPENS ON THE LAST 12 MONTHS. A calendar year is an accident of the
 * archive, not a reading: on the 3rd of January it shows three days of squares
 * and hides the session that just ended. The rolling window always covers the
 * same amount of recent record, and the years behind it stay one click away in
 * the strip — which scrolls, because this archive starts in 1996 and the list
 * grows by one every January.
 *
 * The range is LOCAL to this panel: it chooses which days are drawn, and
 * nothing else. Clicking a square is what touches the list — it writes
 * `?from=`/`?to=`, the one thing on this surface allowed to narrow the results.
 * A range that also re-filtered the list would be a second year control
 * fighting the toolbar's own for the same URL.
 */
export function ParliamentSpeechActivityPanel({
  filter,
  q,
  availableYears,
  selectedDay,
  onSelectDay,
}: Props) {
  const [range, setRange] = useState<Range>({ kind: 'rolling' })
  const resolved = useMemo(() => resolveRange(range, new Date()), [range])

  // Two hooks, always called. When the range needs only one year both ask for
  // the same key, and React Query serves the second from the first's cache —
  // so a calendar year stays exactly one request.
  const primary = useParliamentSpeechActivity(resolved.years[0]!, filter, q)
  const secondary = useParliamentSpeechActivity(
    resolved.years[1] ?? resolved.years[0]!,
    filter,
    q,
  )

  // A window that spans two calendar years is only true once BOTH of them have
  // answered. Drawing the half that arrived would print the missing year as a
  // row of empty days — a silent claim that nothing was said — which is exactly
  // the kind of gap this app is not allowed to render as a zero.
  const needsBothYears = resolved.years.length > 1
  const isIncomplete =
    primary.data === undefined ||
    (needsBothYears && secondary.data === undefined)
  const hasFailed =
    primary.isError || (needsBothYears && secondary.isError)

  const activity: ParliamentSpeechActivity | undefined = useMemo(() => {
    if (isIncomplete) return undefined
    const parts = [primary.data, secondary.data].filter(
      (part): part is ParliamentSpeechActivity =>
        part !== undefined && part !== null,
    )
    const head = parts[0]
    if (!head) return undefined
    // Days are keyed by date, so stitching two calendar years is a merge, not a
    // concat: a day can only be reported by the year it belongs to.
    const days = new Map<string, ParliamentMemberSpeechActivityDayLike>()
    for (const part of parts) for (const day of part.days) days.set(day.date, day)
    return {
      ...head,
      year: resolved.anchorYear,
      days: [...days.values()]
        .filter(
          (day) => day.date >= resolved.startIso && day.date <= resolved.endIso,
        )
        .sort((left, right) => left.date.localeCompare(right.date)),
    }
  }, [isIncomplete, primary.data, secondary.data, resolved])

  const years = useMemo(
    () => [...availableYears].sort((left, right) => right - left),
    [availableYears],
  )

  // ── the periods, in one order, walked by both controls ───────────────────
  // The arrows step through exactly what the dropdown offers — the rolling
  // window, then the years newest-first — so the two can never disagree about
  // what "the previous period" is, and no arrow can land on a window the list
  // does not contain. `undefined` IS the rolling window here, which is also how
  // the picker below encodes it.
  const periods = useMemo<(number | undefined)[]>(
    () => [undefined, ...years],
    [years],
  )
  const current = range.kind === 'rolling' ? undefined : range.year
  const at = periods.indexOf(current)
  const step = (delta: number) => {
    const target = at + delta
    if (at < 0 || target < 0 || target >= periods.length) return
    const next = periods[target]
    setRange(
      next === undefined ? { kind: 'rolling' } : { kind: 'year', year: next },
    )
  }
  // Older is DOWN the list (newest first), newer is up.
  const canGoOlder = at >= 0 && at + 1 < periods.length
  const canGoNewer = at > 0

  // Still loading counts as loading; a failure is NOT drawn as an empty year.
  const isLoading =
    !hasFailed &&
    (primary.isLoading || (needsBothYears && secondary.isLoading))

  return (
    <section
      aria-label={t`Activitatea în plen pe zile`}
      className="border-2 border-[#b1b4b6] bg-white p-5 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
    >
      {/* Heading and period control on ONE row. A strip of thirty year chips
          was wider than the chart and pushed it down the page; a dropdown says
          the same thing in one control, and the arrows beside it are the step a
          reader actually wants — "the period before this one" — without opening
          anything. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          <Trans>Activitatea în plen pe zile</Trans>
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={STEP_CLASS}
            disabled={!canGoOlder}
            aria-label={t`Perioada anterioară`}
            onClick={() => step(1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>

          <ParliamentYearCombobox
            id="parliament-activity-range"
            years={years}
            value={current}
            onChange={(next) =>
              setRange(
                next === undefined
                  ? { kind: 'rolling' }
                  : { kind: 'year', year: next },
              )
            }
            // The rolling window IS the "no single year" entry — one control,
            // one list, and the arrows walk the same order.
            allLabel={t`Ultimele 12 luni`}
            ariaPurpose={t`Perioada afișată`}
            className="h-9 w-auto min-w-44 sm:w-auto"
          />

          <button
            type="button"
            className={STEP_CLASS}
            disabled={!canGoNewer}
            aria-label={t`Perioada următoare`}
            onClick={() => step(-1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        <Trans>
          Fiecare pătrat este o zi; intensitatea arată câte intervenții au fost
          consemnate. Faceți clic pe o zi pentru a filtra lista.
        </Trans>
      </p>

      <div className="mt-4">
        <MemberSpeechActivityHeatmap
          activity={activity}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
          year={resolved.anchorYear}
          onSelectYear={(next) => setRange({ kind: 'year', year: next })}
          isLoading={isLoading}
          // The strip above owns the range; an inline year picker would be a
          // second control for the same thing.
          yearControl="none"
          window={{ startIso: resolved.startIso, endIso: resolved.endIso }}
          emptyLabel={
            hasFailed
              ? t`Activitatea pe zile nu a putut fi încărcată.`
              : range.kind === 'rolling'
                ? t`Nicio intervenție în plen în ultimele 12 luni.`
                : t`Nicio intervenție în plen în ${String(resolved.anchorYear)}.`
          }
        />
      </div>
    </section>
  )
}

/** The day shape both calendar years report, narrowed to what we merge on. */
type ParliamentMemberSpeechActivityDayLike =
  ParliamentSpeechActivity['days'][number]
