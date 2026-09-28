import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { contractsCount, moneyText } from '../../lib/home-format'
import { DIRECT_COMPARABLE_FROM, type YearPoint } from '../../lib/home-model'

/** A profile's years: direct purchases (money) and contracts (a count), as its chart draws them. */
export interface ProfileYearPoints {
  readonly direct: readonly YearPoint[]
  readonly contracts: readonly YearPoint[]
}

/** A year's line in the list: „4,8 mil. lei · 1 contract"; null for a year with neither. */
function yearSummary(points: ProfileYearPoints, year: number): string | null {
  const direct = points.direct.find((point) => point.year === year)
  const contracts = points.contracts.find((point) => point.year === year)?.count ?? 0
  const parts = [direct?.value ? moneyText(direct.value) : null, contracts > 0 ? contractsCount(contracts) : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * The year a procurement profile describes (a firm's, a buyer's), as a
 * dropdown at the right end of the head's top row — above the chart on a
 * wide screen, beside the way back on a phone. The year in progress comes
 * first, marked; once the profile is read, each year in the list says what
 * it holds, so the list is also the profile's years at a glance.
 */
export function ProfileYearSelect({
  points,
  year,
  latest,
  emptyLabel,
  onYear,
  className,
}: {
  /** Null while the profile is read: the years are listed without their figures. */
  readonly points: ProfileYearPoints | null
  /** The year asked for: shown at once, while the page still shows the one before. */
  readonly year: number
  /** The last complete year. */
  readonly latest: number
  /** A year with nothing: „fără vânzări" on a firm's page, „fără achiziții" on a buyer's. */
  readonly emptyLabel: string
  readonly onYear: (year: number) => void
  readonly className?: string
}) {
  const labelId = useId()
  const newest = latest + 1
  const years = Array.from({ length: newest - DIRECT_COMPARABLE_FROM + 1 }, (_, index) => newest - index)
  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <MonoLabel id={labelId} className="text-muted-foreground">
        <Trans>Anul</Trans>
      </MonoLabel>
      <Select value={String(year)} onValueChange={(value) => onYear(Number(value))}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-9 w-auto gap-2 rounded-none border-foreground/25 bg-background px-3 font-semibold tabular-nums shadow-none hover:border-foreground/60 focus:ring-1"
        >
          {/* The trigger shows the year alone; the list shows each year with its figures. */}
          <SelectValue>{year}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-64 rounded-none">
          {years.map((option) => {
            const summary = points ? yearSummary(points, option) : null
            return (
              <SelectItem key={option} value={String(option)} textValue={String(option)} className="rounded-none py-2">
                <span className="flex w-full items-baseline gap-4">
                  <span className="font-semibold tabular-nums text-foreground">{option}</span>
                  {option > latest ? <MonoLabel className="text-amber-700 dark:text-amber-300">{t`în curs`}</MonoLabel> : null}
                  {points ? <span className={summary ? 'text-xs tabular-nums text-muted-foreground' : 'text-xs text-muted-foreground/70'}>{summary ?? emptyLabel}</span> : null}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
