import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { divisionLabel } from '../../lib/caen-divisions'
import { STATUS_ACTIVE, STATUS_STRUCK_OFF } from '../../lib/company-status-codes'
import { countyName } from '../../lib/hub-counties'
import { formatHubChange, formatHubValue, type HubUnit } from '../../lib/hub-format'
import type { HubLeader } from '../../lib/hub-snapshot-types'

/** A company that led the year and has left business since says so: the ranking is of a year, the registry of now. */
function statusNote(status: string | null): string | null {
  if (status === null || status === STATUS_ACTIVE) return null
  return status === STATUS_STRUCK_OFF ? t`radiată` : t`nu mai e în funcțiune`
}

/**
 * One ranking of companies: place, name, sector and county, the figure and
 * its change on the year before. Each row opens the company's profile.
 *
 * The change is left out, not zeroed, for a company that did not file the
 * year before.
 */
export function HubLeaders({
  leaders,
  unit,
  limit,
  className,
}: {
  readonly leaders: readonly HubLeader[]
  readonly unit: HubUnit
  readonly limit: number
  readonly className?: string
}) {
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)} data-testid="company-hub-leaders">
      {leaders.slice(0, limit).map((leader, index) => {
        const figure = formatHubValue(leader.value, unit)
        const change = formatHubChange(leader.previous, leader.value)
        const note = statusNote(leader.status)
        const meta = [leader.division ? divisionLabel(leader.division) : null, leader.county ? countyName(leader.county) : null].filter(Boolean)
        return (
          <li key={leader.cui}>
            <Link
              to="/companies/$cui"
              params={{ cui: leader.cui }}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2 transition-colors hover:bg-muted/40"
            >
              <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{leader.name}</span>
                <MonoLabel className="mt-0.5 block truncate text-muted-foreground">
                  {meta.join(' · ')}
                  {note ? (
                    <>
                      {meta.length > 0 ? ' · ' : null}
                      <span className="text-foreground">{note}</span>
                    </>
                  ) : null}
                </MonoLabel>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums text-foreground">
                  {figure.value}
                  {unit === 'lei' ? <span className="ml-1 font-normal text-muted-foreground">{figure.unit}</span> : null}
                </span>
                {change ? <MonoLabel className="block tabular-nums text-muted-foreground">{change}</MonoLabel> : null}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
