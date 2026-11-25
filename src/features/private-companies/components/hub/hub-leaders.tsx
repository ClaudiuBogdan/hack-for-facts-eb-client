import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { COMPANY_ANALYSIS_SELECTING_BASES, type CompanyAnalysisActivity } from '@/schemas/company-analytics'
import { leaderActivityText } from '../../lib/company-activity-text'
import { STATUS_ACTIVE, STATUS_STRUCK_OFF } from '../../lib/company-status-codes'
import { countyName } from '../../lib/hub-counties'
import { formatHubChange, formatHubValue, type HubUnit } from '../../lib/hub-format'
import type { HubLeader } from '../../lib/hub-snapshot-types'
import { LEADER_META_CLASS, LEADER_ROW_CLASS } from './company-hub-sections'

/** A company that led the year and has left business since says so: the ranking is of a year, the registry of now. */
function statusNote(status: string | null): string | null {
  if (status === null || status === STATUS_ACTIVE) return null
  return status === STATUS_STRUCK_OFF ? t`radiată` : t`nu mai e în funcțiune`
}

/**
 * The release's selected activity, said only when there is one: a row too narrow for a caveat would cut
 * „Mai multe activități clasificate ONRC, niciuna selectată" into a fragment, and the company's page says
 * why none is selected (owner, 25 November 2026).
 */
function selectedActivityText(activity: CompanyAnalysisActivity | null): string | null {
  if (!activity || activity.code === null) return null
  if (activity.basis !== null && !COMPANY_ANALYSIS_SELECTING_BASES.has(activity.basis)) return null
  return leaderActivityText({ activity, mainCaen: null })
}

/**
 * One ranking of companies: place, name, the figure as a share of the
 * largest's, county and the release's selected activity, the figure and its
 * change on the year before.
 * Each row opens the company's profile.
 *
 * The change is left out, not zeroed, for a company that did not file the
 * year before; it says what it is compared with to a pointer and to
 * assistive technology (`changeLabel`), since no footnote under the card says it.
 */
export function HubLeaders({
  leaders,
  unit,
  limit,
  id,
  className,
  changeLabel,
}: {
  readonly leaders: readonly HubLeader[]
  readonly unit: HubUnit
  readonly limit: number
  readonly id?: string
  readonly className?: string
  /** What a change is measured against („față de 2024"), said after it to a pointer and a screen reader. */
  readonly changeLabel?: string
}) {
  // Against the largest of all, not of the rows shown, so the bars keep their lengths when the list opens.
  const top = Math.max(...leaders.map((leader) => leader.value), 1)
  return (
    <ol id={id} className={cn('divide-y divide-border/70 border-y border-border/70', className)} data-testid="company-hub-leaders">
      {leaders.slice(0, limit).map((leader, index) => {
        const figure = formatHubValue(leader.value, unit)
        const change = formatHubChange(leader.previous, leader.value)
        const note = statusNote(leader.status)
        const county = leader.county ? countyName(leader.county) : null
        const activity = selectedActivityText(leader.activity)
        return (
          <li key={leader.cui}>
            <Link to="/companies/$cui" params={{ cui: leader.cui }} className={cn(LEADER_ROW_CLASS, 'transition-colors hover:bg-muted/40')}>
              <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{leader.name}</span>
                <FigureBar fraction={leader.value / top} />
                {/* The activity last: it is the long part, the one the line cuts, so the status is never cut. */}
                <span className={cn('mt-1 block truncate', LEADER_META_CLASS)} title={[county, note, activity].filter(Boolean).join(' · ')}>
                  {county}
                  {note ? (
                    <>
                      {county ? ' · ' : null}
                      <span className="text-foreground">{note}</span>
                    </>
                  ) : null}
                  {activity ? `${county || note ? ' · ' : ''}${activity}` : null}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums text-foreground">
                  {figure.value}
                  {unit === 'lei' ? <span className="ml-1 font-normal text-muted-foreground">{figure.unit}</span> : null}
                </span>
                {change ? (
                  <span className={cn('block tabular-nums', LEADER_META_CLASS)} title={changeLabel ? `${change} ${changeLabel}` : undefined}>
                    {change}
                    {changeLabel ? <span className="sr-only"> {changeLabel}</span> : null}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

/** The leader's figure as a share of the largest's, as the procurement and NGO hubs' rows draw theirs. */
function FigureBar({ fraction }: { readonly fraction: number }) {
  return (
    <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
      <span
        className="block h-1 bg-primary/70 transition-colors group-hover:bg-primary"
        style={{ width: `${Math.min(Math.max(fraction * 100, 0.8), 100).toFixed(1)}%` }}
      />
    </span>
  )
}
