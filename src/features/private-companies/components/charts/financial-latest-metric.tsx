import type { ReactNode } from 'react'

type Props = {
  readonly label: ReactNode
  readonly value: ReactNode
  /** Full-precision figure, shown on hover next to the compact display value. */
  readonly title?: string
  readonly tone?: 'default' | 'positive' | 'negative'
}

/** One KPI in the latest-year strip above the chart. */
export function FinancialLatestMetric({ label, value, title, tone = 'default' }: Props) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'negative'
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-[var(--pnrr-fg)]'

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums leading-none sm:text-xl ${valueClass}`}
        title={title}
      >
        {value}
      </p>
    </div>
  )
}
