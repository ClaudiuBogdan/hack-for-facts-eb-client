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
  MemberVoteChoice,
  ParliamentMemberVoteActivity,
  ParliamentMemberVoteActivityDay,
} from '@/schemas/parliament'
import { getMemberVoteChoiceLabel, getVoteChoiceAccentColor } from '../lib/formatting'
import {
  bucketFor,
  buildYearGrid,
  RO_WEEKDAY_LABELS,
} from '../lib/vote-activity-grid'

/**
 * GOV.UK blue ramp (#1d70b8) for buckets 1–4 — light→dark tints of the action
 * blue, so the intensity reads in both colour modes without a dark override.
 */
const GOVUK_BLUE_RAMP = ['#d2e2f1', '#a3c6e3', '#5e94c9', '#1d70b8'] as const

/** Weekday rows that get a printed letter (Luni / Miercuri / Vineri). */
const LABELLED_WEEKDAY_ROWS = new Set([0, 2, 4])

/** A vote-choice breakdown line in the cell tooltip. */
const TOOLTIP_CHOICES: readonly MemberVoteChoice[] = [
  'pentru',
  'impotriva',
  'abtinere',
  'nu_a_votat',
]

type Props = {
  readonly activity: ParliamentMemberVoteActivity | undefined
  readonly selectedDay?: string
  readonly onSelectDay: (day: string | null) => void
  readonly year: number
  readonly onSelectYear: (year: number) => void
  readonly isLoading: boolean
}

function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

function choiceCount(
  day: ParliamentMemberVoteActivityDay,
  choice: MemberVoteChoice,
): number {
  switch (choice) {
    case 'pentru':
      return day.pentru
    case 'impotriva':
      return day.impotriva
    case 'abtinere':
      return day.abtinere
    case 'nu_a_votat':
      return day.nuAVotat
  }
}

function YearSelector({
  years,
  year,
  onSelectYear,
  orientation,
}: {
  readonly years: readonly number[]
  readonly year: number
  readonly onSelectYear: (year: number) => void
  readonly orientation: 'horizontal' | 'vertical'
}) {
  return (
    <div
      className={cn(
        'flex gap-2',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      )}
      role="group"
      aria-label="Alege anul"
    >
      {years.map((option) => {
        const active = option === year
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onSelectYear(option)}
            className={cn(
              'rounded-none border-2 px-4 py-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
              active
                ? 'border-[#1d70b8] bg-[#1d70b8] text-white'
                : 'border-[#b1b4b6] text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

/** GitHub-style calendar heatmap of a member's per-day vote counts for a year. */
export function MemberVoteActivityHeatmap({
  activity,
  selectedDay,
  onSelectDay,
  year,
  onSelectYear,
  isLoading,
}: Props) {
  const grid = useMemo(() => buildYearGrid(year), [year])
  const dayMap = useMemo(() => {
    const map = new Map<string, ParliamentMemberVoteActivityDay>()
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
      {/* Below lg: year selector as a horizontal row above the grid. */}
      <div className="lg:hidden">
        <YearSelector
          years={years}
          year={year}
          onSelectYear={onSelectYear}
          orientation="horizontal"
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-none" />
          ) : !hasActivity ? (
            <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Nicio activitate de vot în {year}.
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
                          const bucket = bucketFor(total)
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

                          const label = `${formatLongDate(cell.isoDate)} — ${total} voturi`
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
                                  {total} voturi
                                </p>
                                {TOOLTIP_CHOICES.map((choice) => (
                                  <p
                                    key={choice}
                                    className="flex items-center gap-1.5 text-[11px]"
                                  >
                                    <span
                                      aria-hidden
                                      className="inline-block h-2 w-2 shrink-0"
                                      style={{
                                        backgroundColor: getVoteChoiceAccentColor(choice),
                                      }}
                                    />
                                    {getMemberVoteChoiceLabel(choice)}: {choiceCount(day, choice)}
                                  </p>
                                ))}
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

        {/* lg+: year selector as a vertical column right of the grid. */}
        <div className="hidden lg:block">
          <YearSelector
            years={years}
            year={year}
            onSelectYear={onSelectYear}
            orientation="vertical"
          />
        </div>
      </div>
    </div>
  )
}
