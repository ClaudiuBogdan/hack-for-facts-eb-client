import { useId } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DIRECT_COMPARABLE_FROM, type YearPoint } from '../../lib/home-model'
import { RECENT, type PeriodChoice } from '../../lib/profile-period'
import { monthSpanText, periodFiguresText } from '../../lib/profile-period-text'

/** A profile's years: direct purchases (money) and contracts (a count), as its chart draws them. */
export interface ProfileYearPoints {
  readonly direct: readonly YearPoint[]
  readonly contracts: readonly YearPoint[]
}

/** The last twelve months in the list: their months once a read has told them (SEAP's cutoff), their figures when the page shows them. */
export interface RecentOption {
  readonly from: string
  readonly through: string
  readonly figures: string | null
}

function yearFigures(points: ProfileYearPoints, year: number): string | null {
  const direct = points.direct.find((point) => point.year === year)?.value ?? null
  return periodFiguresText(direct, points.contracts.find((point) => point.year === year)?.count ?? 0)
}

/**
 * The period a procurement profile describes (a firm's, a buyer's), as a
 * dropdown at the right end of the head's top row — above the chart on a
 * wide screen, beside the way back on a phone. The last twelve months come
 * first (the default, with their months), then the years, the year in
 * progress marked; once the profile is read, each year says what it holds, so
 * the list is also the profile's years at a glance.
 */
export function ProfileYearSelect({
  points,
  value,
  latest,
  recent,
  emptyLabel,
  onChoice,
  className,
}: {
  /** Null while the profile is read: the years are listed without their figures. */
  readonly points: ProfileYearPoints | null
  /** The period asked for: shown at once, while the page still shows the one before. */
  readonly value: PeriodChoice
  /** The last complete year. */
  readonly latest: number
  readonly recent: RecentOption | null
  /** A year with nothing: „fără vânzări" on a firm's page, „fără achiziții" on a buyer's. */
  readonly emptyLabel: string
  readonly onChoice: (choice: PeriodChoice) => void
  readonly className?: string
}) {
  const labelId = useId()
  const newest = latest + 1
  const years = Array.from({ length: newest - DIRECT_COMPARABLE_FROM + 1 }, (_, index) => newest - index)
  return (
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      {/* On a phone the way back and the period share a line: the label stays for assistive technology. */}
      <MonoLabel id={labelId} className="sr-only text-muted-foreground sm:not-sr-only">
        <Trans>Perioada</Trans>
      </MonoLabel>
      <Select value={String(value)} onValueChange={(next) => onChoice(next === RECENT ? RECENT : Number(next))}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-9 w-auto gap-2 rounded-none border-foreground/25 bg-background px-3 font-semibold tabular-nums shadow-none hover:border-foreground/60 focus:ring-1"
        >
          {/* The trigger shows the period alone; the list shows each with its figures. */}
          <SelectValue>{value === RECENT ? t`Ultimele 12 luni` : value}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-72 rounded-none">
          <SelectItem value={RECENT} textValue={t`Ultimele 12 luni`} className="rounded-none py-2">
            <span className="flex w-full flex-col gap-0.5">
              <span className="font-semibold text-foreground">
                <Trans>Ultimele 12 luni</Trans>
              </span>
              {recent ? (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {/* Read aloud as one name, the parts apart. */}
                  <span className="sr-only">, </span>
                  {[monthSpanText(recent.from, recent.through), recent.figures].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </span>
          </SelectItem>
          <SelectSeparator />
          {years.map((option) => {
            const figures = points ? yearFigures(points, option) : null
            return (
              <SelectItem key={option} value={String(option)} textValue={String(option)} className="rounded-none py-2">
                <span className="flex w-full items-baseline gap-4">
                  <span className="font-semibold tabular-nums text-foreground">{option}</span>
                  {option > latest ? (
                    <MonoLabel className="text-amber-700 dark:text-amber-300">
                      <span className="sr-only">, </span>
                      {t`în curs`}
                    </MonoLabel>
                  ) : null}
                  {points ? (
                    <span className={figures ? 'text-xs tabular-nums text-muted-foreground' : 'text-xs text-muted-foreground/70'}>
                      <span className="sr-only">, </span>
                      {figures ?? emptyLabel}
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
