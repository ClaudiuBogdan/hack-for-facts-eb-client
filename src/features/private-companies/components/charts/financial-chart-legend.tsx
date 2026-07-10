import { t } from '@lingui/core/macro'
import { SERIES_COLORS, type SeriesKey } from './financial-chart-theme'

/**
 * A single color chip. `secondaryColor` splits it in two — the net-result
 * series is green or red depending on the year, so its legend entry shows both.
 */
export function ChartSeriesSwatch({
  color,
  secondaryColor,
}: {
  readonly color: string
  readonly secondaryColor?: string
}) {
  if (secondaryColor) {
    return (
      <span
        className="flex h-3 w-3 shrink-0 overflow-hidden border border-[var(--pnrr-border)]"
        aria-hidden
      >
        <span className="h-full w-1/2" style={{ backgroundColor: color }} />
        <span className="h-full w-1/2" style={{ backgroundColor: secondaryColor }} />
      </span>
    )
  }

  return (
    <span
      className="h-3 w-3 shrink-0 border border-[var(--pnrr-border)]"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

export function FinancialChartLegend() {
  const items: {
    key: SeriesKey
    label: string
    color: string
    secondaryColor?: string
  }[] = [
    { key: 'turnover', label: t`Turnover`, color: SERIES_COLORS.turnover },
    {
      key: 'netResult',
      label: t`Net result`,
      color: SERIES_COLORS.netResultPositive,
      secondaryColor: SERIES_COLORS.netResultNegative,
    },
    { key: 'employees', label: t`Employees`, color: SERIES_COLORS.employees },
  ]

  return (
    <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 pb-3 pt-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <ChartSeriesSwatch color={item.color} secondaryColor={item.secondaryColor} />
          <span className="text-xs font-bold text-[var(--pnrr-fg)]">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
