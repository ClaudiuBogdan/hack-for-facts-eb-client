import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  ParliamentMemberSpeechActivity,
  ParliamentMemberSpeechActivityDay,
} from '@/schemas/parliament'
import {
  speechBucketFor,
  buildWindowGrid,
  buildYearGrid,
  RO_WEEKDAY_LABELS,
} from '../lib/vote-activity-grid'
import { ParliamentYearCombobox } from './parliament-year-combobox'

/**
 * GOV.UK blue ramp (#1d70b8) for buckets 1–4 — light→dark tints of the action
 * blue, so the intensity reads in both colour modes without a dark override.
 */
const GOVUK_BLUE_RAMP = ['#d2e2f1', '#a3c6e3', '#5e94c9', '#1d70b8'] as const

/** Weekday rows that get a printed letter (Luni / Miercuri / Vineri). */
const LABELLED_WEEKDAY_ROWS = new Set([0, 2, 4])

type Props = {
  readonly activity: ParliamentMemberSpeechActivity | undefined
  readonly selectedDay?: string
  readonly onSelectDay: (day: string | null) => void
  readonly year: number
  readonly onSelectYear: (year: number) => void
  readonly isLoading: boolean
  /**
   * `'none'` when the surrounding page already owns the year control (the
   * stenograme toolbar does). Two year pickers on one screen that drive the
   * same URL param is a bug, not redundancy.
   */
  readonly yearControl?: 'inline' | 'none'
  /**
   * Draw an arbitrary INCLUSIVE window instead of the calendar year — what a
   * rolling "last 12 months" needs, since it crosses a new year halfway.
   * `year` still names the fallback empty state and the inline picker.
   */
  readonly window?: { readonly startIso: string; readonly endIso: string }
  /** Sentence for "nothing here", which a window phrases differently. */
  readonly emptyLabel?: string
}

function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

/** "1 intervenție" vs "N intervenții" (short plural; skips the 20+ "de" rule). */
function interventionsLabel(count: number): string {
  return `${count} ${count === 1 ? 'intervenție' : 'intervenții'}`
}

/** GitHub-style calendar heatmap of a member's per-day speech turns for a year. */
export function MemberSpeechActivityHeatmap({
  activity,
  selectedDay,
  onSelectDay,
  year,
  onSelectYear,
  isLoading,
  yearControl = 'inline',
  window: dayWindow,
  emptyLabel,
}: Props) {
  const grid = useMemo(
    () => (dayWindow ? buildWindowGrid(dayWindow) : buildYearGrid(year)),
    [dayWindow, year],
  )
  const dayMap = useMemo(() => {
    const map = new Map<string, ParliamentMemberSpeechActivityDay>()
    for (const day of activity?.days ?? []) map.set(day.date, day)
    return map
  }, [activity])

  const years = useMemo(() => {
    const list = [...(activity?.availableYears ?? [])]
    if (!list.includes(year)) list.push(year)
    return list.sort((a, b) => b - a)
  }, [activity, year])

  const hasActivity = (activity?.days.length ?? 0) > 0

  return (
    <div className="space-y-4">
      {/* One fixed-size, keyboard-navigable control instead of the column of
          year buttons this used to carry — that list grew every year, pushed
          the grid sideways on desktop and wrapped on mobile. */}
      {yearControl === 'inline' ? (
        <ParliamentYearCombobox
          id="speech-activity-year"
          years={years}
          value={year}
          onChange={(next) => {
            if (next !== undefined) onSelectYear(next)
          }}
        />
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-none" />
          ) : !hasActivity ? (
            <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {emptyLabel ?? `Nicio intervenție în plen în ${String(year)}.`}
            </p>
          ) : (
            <TooltipProvider delayDuration={100}>
              <div className="overflow-x-auto pb-2">
                <div className="inline-flex flex-col gap-1">
                  {/* Month labels row, aligned to their week column. */}
                  <div className="flex gap-[3px] pl-8">
                    {grid.weeks.map((_, columnIndex) => {
                      const label = grid.monthLabels.find(
                        (m) => m.columnIndex === columnIndex,
                      )
                      return (
                        <div
                          key={columnIndex}
                          className="h-4 w-3 shrink-0 text-[11px] leading-4 text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                        >
                          {label ? (
                            <span className="whitespace-nowrap">{label.label}</span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-[3px]">
                    {/* Weekday-letter column (L / M / V shown sparsely). */}
                    <div className="mr-1 flex w-7 shrink-0 flex-col gap-[3px]">
                      {RO_WEEKDAY_LABELS.map((label, row) => (
                        <div
                          key={row}
                          className="h-3 text-[10px] leading-3 text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                        >
                          {LABELLED_WEEKDAY_ROWS.has(row) ? label : ''}
                        </div>
                      ))}
                    </div>

                    {grid.weeks.map((week, columnIndex) => (
                      <div key={columnIndex} className="flex flex-col gap-[3px]">
                        {week.days.map((cell) => {
                          if (!cell.inYear) {
                            return (
                              <div key={cell.isoDate} className="h-3 w-3 shrink-0" />
                            )
                          }
                          const day = dayMap.get(cell.isoDate)
                          const total = day?.total ?? 0
                          const bucket = speechBucketFor(total)
                          const isSelected = cell.isoDate === selectedDay
                          const selectionRing = isSelected
                            ? 'ring-2 ring-[#0b0c0c] dark:ring-[var(--pnrr-fg)]'
                            : ''

                          if (total === 0 || !day) {
                            return (
                              <div
                                key={cell.isoDate}
                                className={cn(
                                  'h-3 w-3 shrink-0 border border-[#e5e5e0] bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-map-empty)]',
                                  selectionRing,
                                )}
                              />
                            )
                          }

                          const label = `${formatLongDate(cell.isoDate)} — ${interventionsLabel(total)}`
                          return (
                            <Tooltip key={cell.isoDate}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={label}
                                  title={label}
                                  onClick={() => onSelectDay(cell.isoDate)}
                                  className={cn(
                                    'h-3 w-3 shrink-0 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
                                    selectionRing,
                                  )}
                                  style={{
                                    backgroundColor: GOVUK_BLUE_RAMP[bucket - 1],
                                  }}
                                />
                              </TooltipTrigger>
                              <TooltipContent className="rounded-none bg-[#0b0c0c] text-white">
                                <p className="font-semibold">{formatLongDate(cell.isoDate)}</p>
                                <p className="mb-1 text-[11px] text-white/80">
                                  {interventionsLabel(total)}
                                </p>
                                <p className="text-[11px] text-white/80">
                                  Cameră proprie {day.proprie} · Ședințe comune {day.comun}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Legend: Mai puține [5 squares] Mai multe. */}
                  <div className="mt-2 flex items-center gap-2 pl-8 text-[11px] text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    <span>Mai puține</span>
                    <span className="inline-block h-3 w-3 border border-[#e5e5e0] bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-map-empty)]" />
                    {GOVUK_BLUE_RAMP.map((color) => (
                      <span
                        key={color}
                        className="inline-block h-3 w-3"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <span>Mai multe</span>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  )
}
