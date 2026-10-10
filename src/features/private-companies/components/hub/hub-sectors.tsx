import { useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { DecimalLocale } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisBreakdown } from '@/schemas/company-analytics'
import { countText } from '../../lib/company-analytics-format'
import { sizeBandLabel } from '../../lib/company-analytics-text'
import { labelSourcesOf } from '../../lib/company-analytics-view'
import {
  caenRevisionTag,
  caenRowLabel,
  hubMeasureLabel,
  hubRankingOf,
  hubSizeRowsOf,
  hubValueText,
  type HubMeasure,
  type HubRow,
} from '../../lib/company-hub-analytics'

/**
 * The main activities of the year's companies, ranked by one measure: each
 * with its share of the year's total and a bar against the first. A company
 * counts once, in the activity it declared as its main one to ANAF — in the
 * CAEN revision ANAF published for it, or of unknown revision when it
 * published none (never given one) — so the shares add up, with the folded
 * groups and the companies without a declared main activity as the last rows
 * of the full list. These are not the activities authorised in the trade
 * register (ONRC), which overlap.
 */

const COLLAPSED = 10

function RowValue({ row, measure, locale }: { readonly row: HubRow; readonly measure: HubMeasure; readonly locale: DecimalLocale }) {
  if (row.value === null) return <MonoLabel className="text-muted-foreground">{t`fără valoare raportată`}</MonoLabel>
  const figure = hubValueText(row.value, measure, locale)
  return (
    <>
      {figure.value}
      {measure === 'TURNOVER' ? <span className="ml-1 font-normal text-muted-foreground">{figure.unit}</span> : null}
    </>
  )
}

export function HubSectors({
  breakdown,
  measure,
  locale,
  className,
}: {
  readonly breakdown: CompanyAnalysisBreakdown
  readonly measure: HubMeasure
  readonly locale: DecimalLocale
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const limit = COLLAPSED
  const ranking = hubRankingOf(breakdown, measure, locale)
  const shown = expanded ? ranking.rows : ranking.rows.slice(0, limit)
  const tail = expanded ? [ranking.other, ranking.unknown].filter((row): row is HubRow => row !== null) : []
  const sources = labelSourcesOf(breakdown.groups.map((bucket) => bucket.labelSource))
  if (ranking.rows.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)} data-testid="company-hub-sectors-empty">
        {t`Nicio activitate principală declarată pentru anul ales.`}
      </p>
    )
  }
  return (
    <div className={className} data-testid="company-hub-sectors">
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {shown.map((row, index) => {
          const tag = caenRevisionTag(row.bucket)
          return (
            <li key={row.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5">
              <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
              <span className="min-w-0">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-foreground sm:truncate">{caenRowLabel(row.bucket)}</span>
                  <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{row.share ?? '—'}</MonoLabel>
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="block h-1.5 flex-1 bg-muted/70" aria-hidden="true">
                    <span className="block h-full bg-primary/70" style={{ width: `${row.bar > 0 ? Math.max(0.6, row.bar).toFixed(1) : '0'}%` }} />
                  </span>
                  {tag ? <MonoLabel className="shrink-0 text-muted-foreground/80">{tag}</MonoLabel> : null}
                </span>
              </span>
              <span className="w-24 text-right text-sm font-semibold tabular-nums text-foreground sm:w-28">
                <RowValue row={row} measure={measure} locale={locale} />
              </span>
            </li>
          )
        })}
        {tail.map((row) => (
          <li key={row.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5" data-testid={`company-hub-sectors-${row.key}`}>
            <span aria-hidden="true" />
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">{row.key === 'other' ? t`Alte ${row.bucket.groups} activități` : t`Fără activitate principală declarată`}</span>
              <MonoLabel className="shrink-0 tabular-nums text-muted-foreground">{row.share ?? '—'}</MonoLabel>
            </span>
            <span className="w-24 text-right text-sm tabular-nums text-muted-foreground sm:w-28">
              <RowValue row={row} measure={measure} locale={locale} />
            </span>
          </li>
        ))}
      </ol>
      {ranking.rows.length > limit || ranking.other || ranking.unknown ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {expanded ? <Trans>Doar primele {limit}</Trans> : <Trans>Toată lista</Trans>}
        </button>
      ) : null}
      <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground">
        <Trans>
          Activitatea principală ANAF din instantaneul ediției analizei, nu istoricul ei pe ani, în revizia CAEN publicată pentru ea; un cod fără revizie
          publicată rămâne cu revizia necunoscută. Nu sunt activitățile autorizate în registrul comerțului.
        </Trans>
        {sources.length > 0 ? ` ${t`Denumiri: ${sources.join(', ')}.`}` : null}
      </MonoLabel>
    </div>
  )
}

/**
 * The year's companies with a statement by size band — those without a
 * reported headcount included — how many of them each band holds, and how
 * much of the measure's sum. One total per column, so each column adds up
 * to the whole. When a band's sum is negative no band has a share of it: the
 * column shows each band's exact sum instead.
 */
export function HubSizeTable({
  breakdown,
  measure,
  locale,
  className,
}: {
  readonly breakdown: CompanyAnalysisBreakdown
  readonly measure: HubMeasure
  readonly locale: DecimalLocale
  readonly className?: string
}) {
  const rows = hubSizeRowsOf(breakdown, measure, locale)
  if (rows.length === 0) return <p className={cn('text-sm text-muted-foreground', className)}>{t`Nicio situație financiară cu număr de salariați în anul ales.`}</p>
  const head = (text: ReactNode, last = false) => (
    <th scope="col" className={cn('pb-2 pl-3 text-right align-bottom font-normal', last && 'pr-1')}>
      <MonoLabel className="text-muted-foreground">{text}</MonoLabel>
    </th>
  )
  const valued = measure !== 'FILERS'
  // Shares for the column, or none at all: then each band says its exact sum.
  const sharesShown = rows.some((row) => row.valueShare !== null)
  const sumText = (value: string) => {
    const figure = hubValueText(value, measure, locale)
    return `${figure.value} ${figure.unit}`
  }
  return (
    <table className={cn('w-full text-sm', className)} data-testid="company-hub-sizes">
      <thead>
        <tr className="border-b border-border/70">
          <td />
          {head(<Trans>Firme</Trans>, !valued)}
          {valued ? head(hubMeasureLabel(measure), true) : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((row) => (
          <tr key={row.band}>
            <th scope="row" className="py-2.5 pl-1 text-left font-normal text-foreground">
              {sizeBandLabel(row.band)}
            </th>
            <td className={cn('py-2.5 pl-3 text-right tabular-nums text-foreground', !valued && 'pr-1')} title={countText(row.filers, locale)}>
              {row.filersShare ?? '—'}
            </td>
            {valued ? (
              <td className="py-2.5 pl-3 pr-1 text-right font-semibold tabular-nums text-foreground">
                {row.valueShare ?? (row.value !== null && !sharesShown ? sumText(row.value) : '—')}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
