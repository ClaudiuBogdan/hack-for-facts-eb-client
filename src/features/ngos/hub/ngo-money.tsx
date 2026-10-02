import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { NgoFinanceSize, NgoFinanceSummary } from './finance-summary-types'
import { formatNgoMoney, formatNgoShare } from './ngo-format'
import { SIZE_LABEL } from './ngo-hub-labels'

/**
 * The statements by revenue class: how many organisations each class is, and
 * how much of the year's revenue it holds — of the headline total, so the two
 * agree. The few statements below zero hold no share of it (a dash, not a
 * negative percent), nor do those whose revenue is blank: unknown, drawn
 * paler, never zero. The caller's caption names the classes.
 */
export function NgoSizeTable({ sizes, className }: { readonly sizes: readonly NgoFinanceSize[]; readonly className?: string }) {
  const { i18n } = useLingui()
  const statements = sizes.reduce((sum, row) => sum + row.statements, 0)
  const revenue = sizes.reduce((sum, row) => sum + row.revenue, 0)
  const share = (part: number, whole: number) => (whole > 0 ? formatNgoShare(part / whole) : '—')
  const head = (text: ReactNode, last = false) => (
    <th scope="col" className={cn('pb-2 pl-3 text-right align-bottom font-normal', last && 'pr-1')}>
      <MonoLabel className="text-muted-foreground">{text}</MonoLabel>
    </th>
  )
  return (
    <table className={cn('w-full text-sm', className)} data-testid="ngo-hub-sizes">
      <thead>
        <tr className="border-b border-border/70">
          <td />
          {head(<Trans>Organizații</Trans>)}
          {head(<Trans>Venituri</Trans>, true)}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {sizes.map((row) => {
          const unknown = row.key === 'unknown'
          // A class that holds no statement this year (no blank revenue) is not drawn: an empty row says nothing.
          if (unknown && row.statements === 0) return null
          return (
            <tr key={row.key} className={cn(unknown && 'text-muted-foreground')}>
              <th scope="row" className={cn('whitespace-nowrap py-2.5 pl-1 text-left font-normal', !unknown && 'text-foreground')}>
                {i18n._(SIZE_LABEL[row.key])}
              </th>
              <td className={cn('py-2.5 pl-3 text-right tabular-nums', !unknown && 'text-foreground')}>{share(row.statements, statements)}</td>
              <td className={cn('py-2.5 pl-3 pr-1 text-right tabular-nums', !unknown && 'font-semibold text-foreground')}>
                {row.revenue < 0 || unknown ? '—' : share(row.revenue, revenue)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Where the year's revenue came from: one proportion bar over the three sources, which add up to the total. */
export function NgoSourceSplit({ summary, className }: { readonly summary: NgoFinanceSummary; readonly className?: string }) {
  const rows = [
    { key: 'nonProfit', label: t`Activități fără scop patrimonial`, value: summary.sources.nonProfit, fill: 'bg-primary' },
    { key: 'economic', label: t`Activități economice`, value: summary.sources.economic, fill: 'bg-foreground/45' },
    { key: 'special', label: t`Activități cu destinație specială`, value: summary.sources.special, fill: 'bg-foreground/20' },
  ]
  const share = (value: number) => (summary.revenue > 0 ? value / summary.revenue : 0)
  return (
    <div className={className} data-testid="ngo-hub-sources">
      <div className="flex h-2.5 gap-px" aria-hidden="true">
        {rows.map((row) => (
          <span key={row.key} className={row.fill} style={{ width: `${(share(row.value) * 100).toFixed(2)}%` }} />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {rows.map((row) => {
          const money = formatNgoMoney(row.value)
          return (
            <li key={row.key} className="grid min-h-11 grid-cols-[auto_1fr_auto_3.25rem] items-center gap-x-3 py-1.5">
              <span className={cn('ml-1 size-2.5 rounded-[2px]', row.fill)} aria-hidden="true" />
              <span className="text-sm text-foreground">{row.label}</span>
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                {money.value}
                <span className="ml-1 font-normal text-muted-foreground">{money.unit}</span>
              </span>
              <span className="pr-1 text-right text-xs tabular-nums text-muted-foreground">{formatNgoShare(share(row.value))}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
