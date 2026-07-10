import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChartSeriesSwatch } from './financial-chart-legend'
import {
  TOOLTIP_SERIES_ORDER,
  formatTooltipValue,
  getSeriesSwatchColor,
  type SeriesKey,
} from './financial-chart-theme'

export type TooltipPayloadItem = {
  readonly name: string
  readonly value: number
  readonly color: string
  readonly dataKey: string
}

function getSeriesLabel(dataKey: SeriesKey): string {
  switch (dataKey) {
    case 'turnover':
      return t`Turnover`
    case 'netResult':
      return t`Net result`
    case 'employees':
      return t`Employees`
    default: {
      const exhaustive: never = dataKey
      return exhaustive
    }
  }
}

/**
 * Recharts hands us the payload in render order; we re-project it onto a fixed
 * series order and drop the years where a series has no value.
 */
export function FinancialChartTooltip({
  active,
  payload,
  label,
}: {
  readonly active?: boolean
  readonly payload?: TooltipPayloadItem[]
  readonly label?: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  const payloadByKey = new Map(payload.map((item) => [item.dataKey, item] as const))

  const rows = TOOLTIP_SERIES_ORDER.flatMap((dataKey) => {
    const item = payloadByKey.get(dataKey)
    if (!item || item.value === null || !Number.isFinite(item.value)) {
      return []
    }
    return [
      {
        dataKey,
        label: getSeriesLabel(dataKey),
        value: item.value,
        swatchColor: getSeriesSwatchColor(dataKey, item.value),
      },
    ]
  })

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="min-w-[14rem] border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-3 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        <Trans>Year {label}</Trans>
      </p>
      <ul className="mt-2 space-y-2">
        {rows.map((row) => (
          <li
            key={row.dataKey}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 font-semibold text-[var(--pnrr-fg)]">
              <ChartSeriesSwatch color={row.swatchColor} />
              {row.label}
            </span>
            <span className="shrink-0 font-black tabular-nums text-[var(--pnrr-fg)]">
              {formatTooltipValue(row.dataKey, row.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
