import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { divisionLabel } from '../../lib/caen-divisions'
import { formatHubShare, formatHubValue, type HubUnit } from '../../lib/hub-format'
import type { HubSector, HubSizeClass } from '../../lib/hub-snapshot-types'

export type SectorMetric = 'turnover' | 'employees' | 'activeFirms'

const SECTOR_METRIC_UNIT: Record<SectorMetric, HubUnit> = {
  turnover: 'lei',
  employees: 'persons',
  activeFirms: 'firms',
}

/**
 * The divisions ranked by one measure, the first ten, each with its share of
 * the total. A company counts once, in the division of its ANAF fiscal CAEN
 * code (a source observation, not a main activity), so the shares add up.
 *
 * The rest are in the companies analysis (`analysis`), by the activity
 * declared to ANAF. It groups by the four-digit code, not the division, and
 * filters on exact codes only, so a row here is the economy's split and not a
 * way into its companies: rows are not links.
 */
export function HubSectors({
  sectors,
  metric,
  total,
  analysis,
  limit = 10,
  className,
}: {
  readonly sectors: readonly HubSector[]
  readonly metric: SectorMetric
  /** The country's total for the metric. */
  readonly total: number
  /** The analysis's address for the activities, by this measure. */
  readonly analysis: Record<string, unknown>
  readonly limit?: number
  readonly className?: string
}) {
  const ranked = [...sectors].sort((a, b) => b[metric] - a[metric])
  const max = Math.max(...ranked.map((sector) => sector[metric]), 1)
  const unit = SECTOR_METRIC_UNIT[metric]
  return (
    <div className={className} data-testid="company-hub-sectors">
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {ranked.slice(0, limit).map((sector, index) => {
          const figure = formatHubValue(sector[metric], unit)
          return (
            <li key={sector.division} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5">
              <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-foreground sm:truncate">{divisionLabel(sector.division)}</span>
                  <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{formatHubShare(sector[metric], total)}</MonoLabel>
                </span>
                <span className="mt-1.5 block h-1.5 bg-muted/70" aria-hidden="true">
                  <span className="block h-full bg-primary/70" style={{ width: `${Math.max(0.6, (sector[metric] / max) * 100).toFixed(1)}%` }} />
                </span>
              </span>
              <span className="w-24 text-right text-sm font-semibold tabular-nums text-foreground sm:w-28">
                {figure.value}
                {unit === 'lei' ? <span className="ml-1 font-normal text-muted-foreground">{figure.unit}</span> : null}
              </span>
            </li>
          )
        })}
      </ol>
      <Link to="/companies/analytics" search={analysis} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-9">
        <Trans>Toate activitățile, în analiza bilanțurilor</Trans> →
      </Link>
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">
        <Trans>După codul CAEN fiscal ANAF, grupat pe diviziuni; băncile și asigurătorii nu depun bilanțul acolo.</Trans>
      </MonoLabel>
    </div>
  )
}

/**
 * The statements by size class: how many companies each class is, and how
 * much of the employment and the turnover it holds. Shares of one total each,
 * so each column adds up to the whole. The caller's caption names the classes
 * („după numărul de salariați"), so a row is only its range.
 */
export function HubSizeTable({ classes, className }: { readonly classes: readonly HubSizeClass[]; readonly className?: string }) {
  const firms = classes.reduce((sum, row) => sum + row.firms, 0)
  const employees = classes.reduce((sum, row) => sum + row.employees, 0)
  const turnover = classes.reduce((sum, row) => sum + row.turnover, 0)
  const label: Record<HubSizeClass['key'], ReactNode> = {
    '0': <Trans>niciunul</Trans>,
    '1-9': '1–9',
    '10-49': '10–49',
    '50-249': '50–249',
    '250+': <Trans>250 și peste</Trans>,
  }
  const head = (text: ReactNode, last = false) => (
    <th scope="col" className={cn('pb-2 pl-3 text-right align-bottom font-normal', last && 'pr-1')}>
      <MonoLabel className="text-muted-foreground">{text}</MonoLabel>
    </th>
  )
  return (
    <table className={cn('w-full text-sm', className)} data-testid="company-hub-sizes">
      <thead>
        <tr className="border-b border-border/70">
          <td />
          {head(<Trans>Firme</Trans>)}
          {head(<Trans>Salariați</Trans>)}
          {head(<Trans>Cifra de afaceri</Trans>, true)}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {classes.map((row) => (
          <tr key={row.key}>
            <th scope="row" className="whitespace-nowrap py-2.5 pl-1 text-left font-normal text-foreground">
              {label[row.key]}
            </th>
            <td className="py-2.5 pl-3 text-right tabular-nums text-foreground">{formatHubShare(row.firms, firms)}</td>
            <td className="py-2.5 pl-3 text-right tabular-nums text-foreground">{formatHubShare(row.employees, employees)}</td>
            <td className="py-2.5 pl-3 pr-1 text-right font-semibold tabular-nums text-foreground">{formatHubShare(row.turnover, turnover)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
