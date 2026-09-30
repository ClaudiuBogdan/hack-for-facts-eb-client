import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { NgoFinanceLeader } from './finance-summary-types'
import { formatNgoChange, formatNgoMoney } from './ngo-format'
import { DOMAIN_LABEL, LEADER_STATUS_LABEL } from './ngo-hub-labels'
import { LEADER_ROW_CLASS as ROW_CLASS } from './ngo-hub-sections'


/**
 * The year's largest NGOs by revenue: place, name, domain and county, the
 * revenue and its change on the year before — left out, not zeroed, where
 * there was no statement that year. A leader whose entry has closed since
 * says so: the ranking is of a year, the registry of now.
 *
 * A row opens the organisation's profile where there is one to open: with
 * the NGO API on (`registry`), and for a CUI the profile resolves (`linked`).
 */
export function NgoLeaderRows({
  leaders,
  registry,
  previousYear,
  limit,
  id,
  className,
}: {
  readonly leaders: readonly NgoFinanceLeader[]
  readonly registry: boolean
  /** The year each change is measured against. */
  readonly previousYear: number
  readonly limit: number
  readonly id?: string
  readonly className?: string
}) {
  const { i18n } = useLingui()
  return (
    <ol id={id} className={cn('divide-y divide-border/70 border-y border-border/70', className)} data-testid="ngo-hub-leaders">
      {leaders.slice(0, limit).map((leader, index) => {
        const money = formatNgoMoney(leader.revenue)
        const change = formatNgoChange(leader.previous, leader.revenue)
        // The catch-all and the unclassified say nothing a reader can use: the county alone.
        const domain = leader.domain === 'general' || leader.domain === 'other' ? null : i18n._(DOMAIN_LABEL[leader.domain])
        const meta = [domain, leader.county ? countyNameRo(leader.county) : null].filter(Boolean).join(' · ')
        const cells: ReactNode = (
          <>
            <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
            <span className="min-w-0">
              {/* Two lines on a phone, where one would keep a word of the name. */}
              {/* Two lines kept for it there, long name or short, so the loading state's rows are this height. */}
              <span className="line-clamp-2 text-sm font-medium text-foreground max-sm:min-h-10 sm:line-clamp-none sm:block sm:truncate">{leader.name}</span>
              <MonoLabel className="mt-0.5 block truncate text-muted-foreground">
                {meta}
                {leader.status ? (
                  <>
                    {meta ? ' · ' : null}
                    <span className="text-foreground">{i18n._(LEADER_STATUS_LABEL[leader.status])}</span>
                  </>
                ) : null}
              </MonoLabel>
            </span>
            <span className="text-right">
              <span className="block whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                {money.value}
                <span className="ml-1 font-normal text-muted-foreground">{money.unit}</span>
              </span>
              {change ? (
                <MonoLabel className="block tabular-nums text-muted-foreground">
                  {change}
                  <span className="sr-only"> {t`față de ${previousYear}`}</span>
                </MonoLabel>
              ) : null}
            </span>
          </>
        )
        return (
          <li key={leader.cui}>
            {registry && leader.linked ? (
              <Link to="/ngos/$cui" params={{ cui: leader.cui }} className={cn(ROW_CLASS, 'transition-colors hover:bg-muted/40')}>
                {cells}
              </Link>
            ) : (
              <div className={ROW_CLASS}>{cells}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
