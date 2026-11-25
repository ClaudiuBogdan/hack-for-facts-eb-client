import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { STEP_BG } from '@/features/statistics/lib/county-map'
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

/** The ranked rows a phone shows before the reader asks for the rest: the list is a screen and a half there. */
const PHONE_ROWS = 5

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
  // Every row is in the server's HTML; on a phone the ones past the first five wait behind a button.
  const [allShown, setAllShown] = useState(false)
  const folded = allShown ? 0 : Math.max(ranking.rows.length - PHONE_ROWS, 0)
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
      label: plural(groups, { one: 'O altă activitate', few: 'Alte # activități', other: 'Alte # de activități' }),
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
      {/* Two columns from a wide screen, read down the first and then the second: ten rows in the height of
          five. Each row carries its own bottom rule, so both columns close on one. */}
      <ol
        className="border-t border-border/70 lg:grid lg:grid-flow-col lg:grid-cols-2 lg:gap-x-12"
        style={{ gridTemplateRows: `repeat(${Math.ceil(ranking.rows.length / 2)}, auto)` }}
      >
        {ranking.rows.map((row, index) => {
          const { code } = row
          const label = row.label ?? t`Codul CAEN ${code}`
          const tag = `${code} · ${activitySourceTag(row) ?? ''}`
          return (
            <li key={row.key} className={cn('border-b border-border/70', folded > 0 && index >= PHONE_ROWS && 'max-sm:hidden')}>
              <Link to="/companies/analytics" search={rowLink(row)} className={cn(ROW_CLASS, 'h-full transition-colors hover:bg-muted/40')}>
                <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-3">
                    {/* The whole name on a phone; two lines from `sm`, where two columns share the width, the rest on a pointer. */}
                    <span className="text-sm leading-snug text-foreground sm:line-clamp-2" title={label}>
                      {label}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatHubShare(row.value, ranking.total)}</span>
                  </span>
                  {/* The code and its source: quiet, in the page's sans, its own casing („ONRC Rev.3"). */}
                  <span className="mt-0.5 block truncate text-xs tabular-nums text-muted-foreground">{tag}</span>
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
      {folded > 0 ? (
        <button
          type="button"
          onClick={() => setAllShown(true)}
          className="flex min-h-11 w-full items-center gap-3 border-b border-border/70 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 sm:hidden"
        >
          <span className="h-px flex-1 border-t border-dashed border-border" aria-hidden="true" />
          {plural(folded, { one: 'Încă o activitate', few: 'Încă # activități', other: 'Încă # de activități' })}
          <span className="h-px flex-1 border-t border-dashed border-border" aria-hidden="true" />
        </button>
      ) : null}
      {/* Never ranked, always counted: the rest of the groups, and the companies the selection names no activity
          for. Beside them from a wide screen, where the list leads and what its shares are of. */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
        <ul className="divide-y divide-border/70 border-b border-border/70" data-testid="company-hub-activities-rest">
          {rest.map((entry) => (
            <li key={entry.key} className={ROW_CLASS}>
              <span aria-hidden="true" />
              <span className="flex min-w-0 items-baseline justify-between gap-3">
                <span className="text-sm text-muted-foreground">{entry.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{entry.value === null ? '—' : formatHubShare(entry.value, ranking.total)}</span>
              </span>
              <span className="w-24 text-right text-sm tabular-nums text-muted-foreground sm:w-28">{figure(entry.value)}</span>
            </li>
          ))}
        </ul>
        <div>
          <Link to="/companies/analytics" search={analysis} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-9">
            <Trans>Toate activitățile, în analiza bilanțurilor</Trans> →
          </Link>
          {/* A sentence, so plain text: what the shares are of, and the note behind its marker. */}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{caption}</p>
        </div>
      </div>
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

/** The size classes' names, smallest first: the bars' legend and the table's rows. */
function sizeClassLabel(key: HubSizeClass['key']): ReactNode {
  switch (key) {
    case '0':
      return <Trans>niciunul</Trans>
    case '250+':
      return <Trans>250 și peste</Trans>
    default:
      return key.replace('-', '–')
  }
}

/** A size class in words, for a part's title on a pointer („250 de salariați sau mai mulți: 40,7% din cifra de afaceri"). */
function sizeClassText(key: HubSizeClass['key']): string {
  switch (key) {
    case '0':
      return t`fără salariați`
    case '250+':
      return t`250 de salariați sau mai mulți`
    default: {
      const range = key.replace('-', '–')
      return t`${range} salariați`
    }
  }
}

/** Text on the map's steps 1–3 is the foreground colour, on 4–5 the background colour: at least 4.5:1 in either theme. */
const STEP_LABEL = ['text-foreground', 'text-foreground', 'text-foreground', 'text-background', 'text-background'] as const

/**
 * The statements by size class as three bars, one whole each — the firms,
 * their employees and their turnover — split into the five classes, smallest
 * first, in the county map's five steps of one hue (the classes are ordered).
 * A part wide enough carries its share; every part says its class and share
 * to a pointer. The bars are a picture: the same figures are the table under
 * them, for assistive technology (`HubSizeTable`).
 */
export function HubSizeBars({ classes, className }: { readonly classes: readonly HubSizeClass[]; readonly className?: string }) {
  const measures = [
    { key: 'firms', label: <Trans>Firme</Trans>, of: t`din firme`, value: (row: HubSizeClass) => row.firms },
    { key: 'employees', label: <Trans>Salariați</Trans>, of: t`din salariați`, value: (row: HubSizeClass) => row.employees },
    { key: 'turnover', label: <Trans>Cifra de afaceri</Trans>, of: t`din cifra de afaceri`, value: (row: HubSizeClass) => row.turnover },
  ] as const
  return (
    <div className={className} data-testid="company-hub-size-bars">
      <div className="space-y-3" aria-hidden="true">
        {measures.map((measure) => {
          const total = classes.reduce((sum, row) => sum + measure.value(row), 0)
          return (
            <div key={measure.key} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4">
              <span className="text-sm text-foreground">{measure.label}</span>
              <div className="flex h-9 gap-px overflow-hidden rounded-sm bg-border/70">
                {classes.map((row, index) => {
                  const value = measure.value(row)
                  if (value <= 0 || total <= 0) return null
                  const share = value / total
                  const text = formatHubShare(value, total)
                  return (
                    <span
                      key={row.key}
                      className={cn('flex min-w-0.5 items-center justify-center overflow-hidden', STEP_BG[index], STEP_LABEL[index])}
                      style={{ flexGrow: value, flexBasis: 0 }}
                      title={`${sizeClassText(row.key)}: ${text} ${measure.of}`}
                    >
                      {/* The share inside the part when it fits: from 6% of the width on a wide screen, 14% on a phone. */}
                      {share >= 0.06 ? (
                        <span className={cn('whitespace-nowrap px-1 text-xs font-medium tabular-nums', share < 0.14 && 'max-sm:hidden')}>{text}</span>
                      ) : null}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
        {/* The classes, in the bars' order and colours. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground sm:pl-[10rem]">
          <span>
            <Trans>Salariați pe firmă:</Trans>
          </span>
          {classes.map((row, index) => (
            <span key={row.key} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-[2px] ring-1 ring-inset ring-foreground/10', STEP_BG[index])} />
              {sizeClassLabel(row.key)}
            </span>
          ))}
        </div>
      </div>
      <HubSizeTable className="sr-only" classes={classes} />
    </div>
  )
}
