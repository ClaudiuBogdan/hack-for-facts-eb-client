import { t } from '@lingui/core/macro'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import {
  getCalendarYearBounds,
  getOlderCalendarYearOptions,
  getRecentCalendarYearQuickOptions,
  selectedCalendarYearFromPeriod,
  type ResolvedProcurementOverviewPeriod,
} from '@/schemas/procurement-overview'
import {
  procurementToggleItemClassName,
} from '../lib/procurement-theme'

type Props = {
  readonly period: ResolvedProcurementOverviewPeriod
  readonly onSelectYear: (bounds: {
    readonly dateFrom: string
    readonly dateTo: string
  }) => void
  readonly now?: Date
}

/**
 * Period quick picks: current year + two prior years (blue active like grain),
 * plus a chevron menu for older years down to 2020.
 */
export function ProcurementPeriodYearPresets({
  period,
  onSelectYear,
  now,
}: Props) {
  const quickYears = getRecentCalendarYearQuickOptions(now)
  const olderYears = getOlderCalendarYearOptions(now)
  const selectedYear = selectedCalendarYearFromPeriod(period)
  const quickSelected =
    selectedYear !== undefined && quickYears.includes(selectedYear)
      ? String(selectedYear)
      : ''
  const olderSelected =
    selectedYear !== undefined && olderYears.includes(selectedYear)
      ? selectedYear
      : null

  return (
    <div className="space-y-2">
      <div className="flex w-full gap-2">
        <ToggleGroup
          type="single"
          value={quickSelected}
          onValueChange={(value) => {
            if (!value) return
            const year = Number(value)
            if (!Number.isInteger(year)) return
            onSelectYear(getCalendarYearBounds(year))
          }}
          aria-label={t`Period year`}
          className="grid min-w-0 flex-1 grid-cols-3 gap-2"
        >
          {quickYears.map((year) => (
            <ToggleGroupItem
              key={year}
              value={String(year)}
              className={cn(
                procurementToggleItemClassName,
                'h-9 w-full justify-center px-3 text-xs font-semibold tabular-nums',
              )}
            >
              {year}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {olderYears.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'inline-flex h-9 w-14 shrink-0 items-center justify-center gap-1 rounded-none border-2 px-2 text-xs font-semibold tabular-nums shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] sm:w-16',
                  olderSelected !== null
                    ? 'border-[#1d70b8] bg-[#1d70b8] text-white hover:bg-[#1d70b8] hover:text-white'
                    : 'border-[#b1b4b6] bg-white text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]',
                )}
                aria-label={
                  olderSelected !== null
                    ? t`Older years, selected ${olderSelected}`
                    : t`Older years`
                }
              >
                {olderSelected !== null ? <span>{olderSelected}</span> : null}
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-64 min-w-28 overflow-y-auto rounded-none border-2 border-[#b1b4b6] p-1 dark:border-[var(--pnrr-border)]"
            >
              {olderYears.map((year) => (
                <DropdownMenuItem
                  key={year}
                  className={cn(
                    'cursor-pointer rounded-none text-sm font-semibold tabular-nums',
                    olderSelected === year &&
                      'bg-[#1d70b8] text-white focus:bg-[#1d70b8] focus:text-white',
                  )}
                  onSelect={() => onSelectYear(getCalendarYearBounds(year))}
                >
                  {year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

    </div>
  )
}
