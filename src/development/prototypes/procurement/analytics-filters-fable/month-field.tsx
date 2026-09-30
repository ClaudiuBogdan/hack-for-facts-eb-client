import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { hubNumberLocale } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'

/**
 * A month in the page's language — „iun. 2025" — picked from a grid of
 * twelve under a year stepper, in place of the browser's own month input,
 * which reads in the browser's language and not the page's.
 */

/** `2025-06` → „iun. 2025". */
export function shortMonthText(month: string): string {
  const match = /^(\d{4})-(\d{2})$/u.exec(month)
  if (!match) return month
  return new Intl.DateTimeFormat(hubNumberLocale(), { month: 'short', year: 'numeric' }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1))
}

function monthNames(): readonly string[] {
  const format = new Intl.DateTimeFormat(hubNumberLocale(), { month: 'short' })
  return Array.from({ length: 12 }, (_, index) => format.format(new Date(2000, index, 1)))
}

export function MonthField({
  value,
  min,
  max,
  active,
  label,
  className,
  onChange,
}: {
  /** `YYYY-MM`, or empty when nothing is known yet. */
  readonly value: string
  readonly min: string
  readonly max: string
  /** Whether the months are the period in force (else the field shows the resolved months, muted). */
  readonly active: boolean
  readonly label: string
  readonly className?: string
  readonly onChange: (month: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number((value || max).slice(0, 4)))
  const names = monthNames()
  const first = Number(min.slice(0, 4))
  const last = Number(max.slice(0, 4))
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setYear(Number((value || max).slice(0, 4)))
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label={label} className={cn('flex w-full min-w-0 items-center justify-between gap-1 border bg-background px-2 text-sm', active ? 'border-primary font-medium' : 'text-muted-foreground', className)}>
          <span className="truncate">{value ? shortMonthText(value) : '…'}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 rounded-none p-2">
        <div className="flex items-center justify-between">
          <button type="button" disabled={year <= first} onClick={() => setYear(year - 1)} aria-label={t`Anul dinainte`} className="flex size-10 items-center justify-center hover:bg-muted disabled:opacity-30">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold tabular-nums">{year}</span>
          <button type="button" disabled={year >= last} onClick={() => setYear(year + 1)} aria-label={t`Anul de după`} className="flex size-10 items-center justify-center hover:bg-muted disabled:opacity-30">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-1 grid grid-cols-4 gap-px border bg-border/70">
          {names.map((name, index) => {
            const month = `${year}-${String(index + 1).padStart(2, '0')}`
            const outside = month < min || month > max
            return (
              <button
                key={month}
                type="button"
                disabled={outside}
                onClick={() => {
                  onChange(month)
                  setOpen(false)
                }}
                className={cn('h-11 bg-background text-sm hover:bg-muted disabled:text-muted-foreground/40 disabled:hover:bg-background sm:h-10', month === value && 'bg-primary/5 font-semibold text-foreground')}
              >
                {name}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
