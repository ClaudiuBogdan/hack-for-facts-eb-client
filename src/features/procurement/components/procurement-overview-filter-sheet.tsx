import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { CalendarRange, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import {
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
} from '@/schemas/procurement-overview'
import {
  procurementDateInputClassName,
  procurementOutlineButtonClassName,
  procurementPrimaryButtonClassName,
  procurementSectionLabelClassName,
} from '../lib/procurement-theme'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly filters: ProcurementLandingFilters
  readonly onChange: (filters: ProcurementLandingFilters) => void
}

export function ProcurementOverviewFilterSheet({
  open,
  onOpenChange,
  filters,
  onChange,
}: Props) {
  const activeCount = filters.dateFrom || filters.dateTo ? 1 : 0

  const setDateFrom = (value: string | undefined) => {
    const dateFrom = normalizeProcurementMonthStart(value)
    const dateTo =
      dateFrom && filters.dateTo && dateFrom > filters.dateTo
        ? normalizeProcurementMonthEnd(dateFrom)
        : filters.dateTo
    onChange({ dateFrom, dateTo })
  }

  const setDateTo = (value: string | undefined) => {
    const dateTo = normalizeProcurementMonthEnd(value)
    const dateFrom =
      dateTo && filters.dateFrom && filters.dateFrom > dateTo
        ? normalizeProcurementMonthStart(dateTo)
        : filters.dateFrom
    onChange({ dateFrom, dateTo })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden overscroll-contain border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>Filter procurement data</Trans>
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>
              The selected period applies to every indicator and analysis on
              this page.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-4" aria-labelledby="procurement-period-label">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />
                <p
                  id="procurement-period-label"
                  className={procurementSectionLabelClassName}
                >
                  <Trans>Period</Trans>
                </p>
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Analytics are monthly. Start dates become the first day of
                  the month and end dates become its last day.
                </Trans>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="overview-date-from" className="text-sm font-bold">
                  <Trans>From</Trans>
                </Label>
                <input
                  id="overview-date-from"
                  name="procurement-date-from"
                  type="date"
                  autoComplete="off"
                  className={procurementDateInputClassName}
                  value={filters.dateFrom ?? ''}
                  max={filters.dateTo ?? undefined}
                  onChange={(event) =>
                    setDateFrom(event.target.value || undefined)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="overview-date-to" className="text-sm font-bold">
                  <Trans>To</Trans>
                </Label>
                <input
                  id="overview-date-to"
                  name="procurement-date-to"
                  type="date"
                  autoComplete="off"
                  className={procurementDateInputClassName}
                  value={filters.dateTo ?? ''}
                  min={filters.dateFrom ?? undefined}
                  onChange={(event) =>
                    setDateTo(event.target.value || undefined)
                  }
                />
              </div>
            </div>

            <p className="border-l-4 border-[#1d70b8] pl-3 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                Full dates remain in the URL; the live analytics API receives
                the matching calendar months.
              </Trans>
            </p>
          </section>
        </div>

        <div className="border-t-2 border-[#b1b4b6] bg-white p-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)]">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className={procurementOutlineButtonClassName}
              disabled={activeCount === 0}
              onClick={() => onChange({})}
            >
              <Trans>Clear period</Trans>
            </Button>
            <Button
              type="button"
              className={procurementPrimaryButtonClassName}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Close</Trans>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ProcurementOverviewFilterTrigger({
  active,
  onClick,
}: {
  readonly active: boolean
  readonly onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="relative gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-2 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={active ? t`Filters, 1 active` : t`Open filters`}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        <Trans>Filters</Trans>
      </span>
      {active ? (
        <Badge className="h-5 min-w-5 rounded-full bg-[#1d70b8] px-1.5 text-xs text-white">
          1
        </Badge>
      ) : null}
    </Button>
  )
}
