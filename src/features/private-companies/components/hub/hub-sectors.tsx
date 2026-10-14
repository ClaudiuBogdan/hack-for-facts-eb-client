import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { activitySourceTag, unclassifiedActivityLabel } from '../../lib/company-activity-text'
import { formatHubShare, formatHubValue, type HubUnit } from '../../lib/hub-format'
import type { HubActivityRanking, HubActivityRow, HubSizeClass } from '../../lib/hub-snapshot-types'
import type { CompanyAnalysisActivityBasis } from '@/schemas/company-analytics'

export type ActivityMeasure = 'turnover' | 'employees' | 'activeFirms'

const MEASURE_UNIT: Record<ActivityMeasure, HubUnit> = {
  turnover: 'lei',
  employees: 'persons',
  activeFirms: 'firms',
}

const ROW_CLASS = 'grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5'

/**
 * The analysis's derived activity selection ranked by one measure, the first
 * ten, each with its share of the API's own total for that measure — an ONRC
 * class in its own revision, or ANAF's fiscal code with its revision
 * unpublished, named by the API's exact label: never a division, never a
 * registered principal activity, and the same digits in two revisions never
 * one row. Each row opens its companies in the analysis (`rowLink`, the
 * exact selected-activity filter). The rest of the groups, and the companies
 * with no selected activity (several ONRC classes, a code outside the
 * nomenclature, no qualified selection), follow apart, counted and never
 * ranked: the parts add up to the total the shares are of.
 */
export function HubActivities({
  ranking,
  measure,
  rowLink,
  analysis,
  caption,
  className,
}: {
  readonly ranking: HubActivityRanking
  readonly measure: ActivityMeasure
  /** The analysis's address for one row's companies, under this measure's question. */
  readonly rowLink: (row: HubActivityRow) => Record<string, unknown>
  /** The analysis's address for every activity, under this measure's question. */
  readonly analysis: Record<string, unknown>
  /** What the shares are of, and where the figures come from. */
  readonly caption: ReactNode
  readonly className?: string
}) {
  const unit = MEASURE_UNIT[measure]
  const max = Math.max(...ranking.rows.map((row) => row.value), 1)
  const figure = (value: number | null) => {
    if (value === null) return <span className="text-muted-foreground">—</span>
    const formatted = formatHubValue(value, unit)
    return (
      <>
        {formatted.value}
        {unit === 'lei' ? <span className="ml-1 font-normal text-muted-foreground">{formatted.unit}</span> : null}
      </>
    )
  }
  const groups = ranking.other.groups
  const rest = [
    {
      key: 'other',
      label: plural(groups, { one: 'O altă activitate selectată', few: 'Alte # activități selectate', other: 'Alte # de activități selectate' }),
      value: ranking.other.value,
    },
    ...ranking.unclassified.map((entry) => ({
      key: entry.basis,
      label: unclassifiedActivityLabel(entry.basis as CompanyAnalysisActivityBasis),
      value: entry.value,
    })),
  ]
  return (
    <div className={className} data-testid="company-hub-activities">
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {ranking.rows.map((row, index) => {
          const { code } = row
          const label = row.label ?? t`Codul CAEN ${code}`
          const tag = `${code} · ${activitySourceTag(row) ?? ''}`
          return (
            <li key={row.key}>
              <Link to="/companies/analytics" search={rowLink(row)} className={cn(ROW_CLASS, 'transition-colors hover:bg-muted/40')}>
                <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-foreground sm:truncate" title={label}>
                      {label}
                    </span>
                    <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{formatHubShare(row.value, ranking.total)}</MonoLabel>
                  </span>
                  <MonoLabel className="mt-0.5 block truncate text-muted-foreground">{tag}</MonoLabel>
                  <span className="mt-1.5 block h-1.5 bg-muted/70" aria-hidden="true">
                    <span className="block h-full bg-primary/70" style={{ width: `${Math.max(0.6, (row.value / max) * 100).toFixed(1)}%` }} />
                  </span>
                </span>
                <span className="w-24 text-right text-sm font-semibold tabular-nums text-foreground sm:w-28">{figure(row.value)}</span>
              </Link>
            </li>
          )
        })}
      </ol>
      {/* Never ranked, always counted: the rest of the groups, and the companies the selection names no activity for. */}
      <ul className="divide-y divide-border/70 border-b border-border/70" data-testid="company-hub-activities-rest">
        {rest.map((entry) => (
          <li key={entry.key} className={ROW_CLASS}>
            <span aria-hidden="true" />
            <span className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">{entry.label}</span>
              <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{entry.value === null ? '—' : formatHubShare(entry.value, ranking.total)}</MonoLabel>
            </span>
            <span className="w-24 text-right text-sm tabular-nums text-muted-foreground sm:w-28">{figure(entry.value)}</span>
          </li>
        ))}
      </ul>
      <Link to="/companies/analytics" search={analysis} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-9">
        <Trans>Toate activitățile selectate, în analiza bilanțurilor</Trans> →
      </Link>
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">{caption}</MonoLabel>
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
