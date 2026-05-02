import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import {
  formatPnrrCurrency,
  getPnrrCurrencyDisplayParts,
} from '../../lib/formatting'
import type { PnrrAggregates } from '@/schemas/pnrr'

const CATEGORY_CONFIG = [
  {
    key: 'grant' as const,
    label: t`Grant`,
    color: '#16a34a',
    topColor: 'bg-[#16a34a]',
  },
  {
    key: 'loan' as const,
    label: t`Loan`,
    color: '#ef4444',
    topColor: 'bg-[#ef4444]',
  },
  {
    key: 'mixed' as const,
    label: t`Mixed`,
    color: '#f59e0b',
    topColor: 'bg-[#f59e0b]',
  },
]

export function PnrrFundingBar({
  aggregates,
}: {
  readonly aggregates: PnrrAggregates
}) {
  const currency = usePnrrCurrency()
  const total =
    aggregates.grantTotal + aggregates.loanTotal + aggregates.mixedTotal || 1

  const grantPct = (aggregates.grantTotal / total) * 100
  const loanPct = (aggregates.loanTotal / total) * 100
  const mixedPct = (aggregates.mixedTotal / total) * 100

  const categories = [
    { ...CATEGORY_CONFIG[0], value: aggregates.grantTotal, pct: grantPct },
    { ...CATEGORY_CONFIG[1], value: aggregates.loanTotal, pct: loanPct },
    { ...CATEGORY_CONFIG[2], value: aggregates.mixedTotal, pct: mixedPct },
  ]

  return (
    <div className="min-w-0 overflow-hidden border-2 border-[var(--pnrr-border)]" style={{ backgroundColor: 'var(--pnrr-card)' }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-[var(--pnrr-border)] px-5 py-4">
        <h3 className="text-lg font-black text-[var(--pnrr-fg)]">
          <Trans>Sursă Finanțare</Trans>
        </h3>
        <span className="border-2 border-[var(--pnrr-border)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--pnrr-muted)]">
          Grant / Loan / Mixed
        </span>
      </div>

      <div className="space-y-6 p-5">
        {/* Section label */}
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
          <Trans>Distribuție</Trans>
        </p>

        {/* Stacked bar */}
        <div className="space-y-3">
          <div className="h-6 w-full border-2 border-[var(--pnrr-border)]">
            <div className="flex h-full">
              <div
                className="h-full border-r-2 border-[var(--pnrr-border)] transition-all duration-700"
                style={{ width: `${grantPct}%`, backgroundColor: '#16a34a' }}
              />
              <div
                className="h-full border-r-2 border-[var(--pnrr-border)] transition-all duration-700"
                style={{ width: `${loanPct}%`, backgroundColor: '#ef4444' }}
              />
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${mixedPct}%`, backgroundColor: '#f59e0b' }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-[var(--pnrr-fg)]">
            {categories.map((cat) => (
              <span key={cat.key} className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 border border-[var(--pnrr-border)]"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium">{cat.label}</span>
                <span className="font-extrabold tabular-nums">{formatNumber(cat.pct)}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-[var(--pnrr-border)]" />

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {categories.map((cat) => {
            const formattedValue = getPnrrCurrencyDisplayParts(
              formatPnrrCurrency(cat.value, currency),
            )

            return (
              <div
                key={cat.key}
                className="overflow-hidden border-2 border-[var(--pnrr-border)]"
                style={{ backgroundColor: 'var(--pnrr-card)' }}
              >
                {/* Colored top rule */}
                <div className={`h-2 ${cat.topColor}`} />
                <div className="p-5 text-center">
                  <p className="mb-4 text-sm font-black uppercase tracking-widest text-[var(--pnrr-fg)]">
                    {cat.label}
                  </p>
                  <div className="text-xl font-black leading-tight text-[var(--pnrr-fg)] sm:text-2xl">
                    <span>{formattedValue.amount}</span>
                    {formattedValue.unit ? (
                      <>
                        {' '}
                        <span className="inline-block whitespace-nowrap">
                          {formattedValue.unit}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-3 border-t-2 border-[var(--pnrr-border)] pt-3 text-lg font-bold text-[var(--pnrr-fg)]">
                    {formatNumber(cat.pct)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
