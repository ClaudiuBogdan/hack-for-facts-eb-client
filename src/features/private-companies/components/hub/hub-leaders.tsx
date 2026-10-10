import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { DecimalLocale } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import { exactValueText } from '../../lib/company-analytics-format'
import { statusLabel } from '../../lib/company-analytics-text'
import { hubValueText, type HubLeader, type HubSumMeasure } from '../../lib/company-hub-analytics'

/**
 * One ranking of companies for the year: place, name, county and main
 * activity, and the figure — on one scale, its exact value as the row's
 * title. Each row opens the company's profile. A company the directory does
 * not name publicly is said so, by its CUI; a value that is not reported is
 * its status, never a zero.
 */
export function HubLeaders({
  leaders,
  measure,
  locale,
  className,
}: {
  readonly leaders: readonly HubLeader[]
  readonly measure: HubSumMeasure
  readonly locale: DecimalLocale
  readonly className?: string
}) {
  const unit = measure === 'EMPLOYEES' ? 'HEADCOUNT' : 'RON'
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)} data-testid="company-hub-leaders">
      {leaders.map((leader, index) => {
        const figure = leader.value === null ? null : hubValueText(leader.value, measure, locale)
        const meta = [leader.county, leader.caen].filter(Boolean)
        return (
          <li key={leader.cui}>
            <Link
              to="/companies/$cui"
              params={{ cui: leader.cui }}
              title={leader.value === null ? undefined : exactValueText(leader.value, unit, locale)}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2 transition-colors hover:bg-muted/40"
            >
              <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{leader.name ?? t`Fără denumire publică · CUI ${leader.cui}`}</span>
                {meta.length > 0 ? <MonoLabel className="mt-0.5 block truncate text-muted-foreground">{meta.join(' · ')}</MonoLabel> : null}
              </span>
              <span className="text-right">
                {figure ? (
                  <span className="block text-sm font-semibold tabular-nums text-foreground">
                    {figure.value}
                    {measure === 'TURNOVER' ? <span className="ml-1 font-normal text-muted-foreground">{figure.unit}</span> : null}
                  </span>
                ) : (
                  <MonoLabel className="block text-muted-foreground">{leader.status ? statusLabel(leader.status) : '—'}</MonoLabel>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
