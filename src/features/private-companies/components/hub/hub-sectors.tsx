import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { divisionLabel } from '../../lib/caen-divisions'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import { formatHubShare, formatHubValue, type HubUnit } from '../../lib/hub-format'
import type { HubSector, HubSizeClass } from '../../lib/hub-snapshot-types'

export type SectorMetric = 'turnover' | 'employees' | 'activeFirms'

const SECTOR_METRIC_UNIT: Record<SectorMetric, HubUnit> = {
  turnover: 'lei',
  employees: 'persons',
  activeFirms: 'firms',
}

/**
 * The divisions ranked by one measure, each with its share of the total. A
 * company counts once, in the division of its main activity, so the shares
 * add up — with the companies whose main activity is missing or an old code
 * as the last, unranked row of the full list.
 *
 * A row opens the directory on the division's companies in business. The
 * directory filters on every activity a company recorded, not only its main
 * one, so it lists more companies than the row counts, and the note under
 * the list says so: the row is the economy's split, the directory the way
 * into it.
 */
export function HubSectors({
  sectors,
  metric,
  total,
  limit = 10,
  className,
}: {
  readonly sectors: readonly HubSector[]
  readonly metric: SectorMetric
  /** The country's total for the metric. */
  readonly total: number
  readonly limit?: number
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const ranked = [...sectors].sort((a, b) => b[metric] - a[metric])
  const max = ranked[0]?.[metric] ?? 1
  const unit = SECTOR_METRIC_UNIT[metric]
  const shown = expanded ? ranked : ranked.slice(0, limit)
  const rest = total - ranked.reduce((sum, sector) => sum + sector[metric], 0)
  const restFigure = formatHubValue(rest, unit)
  return (
    <div className={className} data-testid="company-hub-sectors">
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {shown.map((sector, index) => {
          const figure = formatHubValue(sector[metric], unit)
          return (
            <li key={sector.division}>
              <Link
                to="/companies/search"
                search={{ caen: sector.division, status: [STATUS_ACTIVE] }}
                className="group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-foreground sm:truncate">{divisionLabel(sector.division)}</span>
                    <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{formatHubShare(sector[metric], total)}</MonoLabel>
                  </span>
                  <span className="mt-1.5 block h-1.5 bg-muted/70" aria-hidden="true">
                    <span
                      className="block h-full bg-primary/70 transition-colors group-hover:bg-primary"
                      style={{ width: `${Math.max(0.6, (sector[metric] / max) * 100).toFixed(1)}%` }}
                    />
                  </span>
                </span>
                <span className="w-24 text-right text-sm font-semibold tabular-nums text-foreground sm:w-28">
                  {figure.value}
                  {unit === 'lei' ? <span className="ml-1 font-normal text-muted-foreground">{figure.unit}</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
        {expanded && rest > 0 ? (
          <li className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5" data-testid="company-hub-sectors-rest">
            <span aria-hidden="true" />
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                <Trans>Fără activitate principală recunoscută</Trans>
              </span>
              <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{formatHubShare(rest, total)}</MonoLabel>
            </span>
            <span className="w-24 text-right text-sm tabular-nums text-muted-foreground sm:w-28">
              {restFigure.value}
              {unit === 'lei' ? <span className="ml-1">{restFigure.unit}</span> : null}
            </span>
          </li>
        ) : null}
      </ol>
      {ranked.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {expanded ? (
            <Trans>Doar primele {limit}</Trans>
          ) : (
            plural(ranked.length, { one: 'Un domeniu', few: 'Toate cele # domenii', other: 'Toate cele # de domenii' })
          )}
        </button>
      ) : null}
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">
        <Trans>
          Activitatea principală declarată la ANAF; băncile și asigurătorii nu depun bilanțul acolo. Un domeniu deschide toate
          firmele care îl au printre activități.
        </Trans>
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
