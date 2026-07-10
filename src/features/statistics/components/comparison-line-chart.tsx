import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildLineSeries, lineSeriesKey, type ComparisonMatrix } from '../lib/comparison-series'
import { ComparisonFigure } from './comparison-chart-shell'
import { formatComparisonAxisTick, formatComparisonNumber, type ComparisonSeriesDescriptor } from '../lib/comparison-format'

type Props = {
  readonly matrix: ComparisonMatrix
  readonly series: readonly ComparisonSeriesDescriptor[]
}

type TooltipEntry = {
  readonly dataKey?: string | number
  readonly value?: number | string | null
}

type TooltipProps = {
  readonly active?: boolean
  readonly label?: string | number
  readonly payload?: readonly TooltipEntry[]
  readonly series: readonly ComparisonSeriesDescriptor[]
}

/**
 * Crosshair tooltip. Only territories that HAVE a value at this period appear;
 * a territory with a gap is simply absent from the list rather than shown as
 * zero or carried over from the previous period.
 */
function ComparisonLineTooltip({ active, label, payload, series }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const rows = series
    .map((entry) => {
      const match = payload.find((item) => item.dataKey === lineSeriesKey(entry.siruta))
      return { entry, value: typeof match?.value === 'number' ? match.value : null }
    })
    .filter((row) => row.value !== null)

  if (rows.length === 0) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1.5 text-xs font-medium text-foreground">{label}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.entry.siruta} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: row.entry.color }}
            />
            <span className="text-muted-foreground">{row.entry.label}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {formatComparisonNumber(row.value as number)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * All periods, one line per territory.
 *
 * `connectNulls={false}` is the honesty control: a territory missing a period
 * shows a break in its line instead of a straight segment implying a value it
 * never reported.
 */
export function ComparisonLineChart({ matrix, series }: Props) {
  const data = buildLineSeries(matrix)

  return (
    <ComparisonFigure
      title={<Trans>Evoluție în timp</Trans>}
      caption={
        <Trans>
          O linie per teritoriu, toate perioadele disponibile. Întreruperile marchează perioade
          fără date raportate.
        </Trans>
      }
      series={series}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[...data]} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.25} className="stroke-border" />
            <XAxis
              dataKey="isoPeriod"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fontSize: 11 }}
              tickFormatter={formatComparisonAxisTick}
              className="fill-muted-foreground"
            />
            <Tooltip
              cursor={{ strokeOpacity: 0.3 }}
              content={<ComparisonLineTooltip series={series} />}
            />
            {series.map((entry) => (
              <Line
                key={entry.siruta}
                type="monotone"
                dataKey={lineSeriesKey(entry.siruta)}
                name={entry.label}
                stroke={entry.color}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: entry.color }}
                activeDot={{ r: 5, strokeWidth: 2, className: 'stroke-background' }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        {t`Grafic cu linii: evoluția indicatorului pentru ${series.length} teritorii. Datele exacte sunt disponibile în tabelul de comparație de mai sus.`}
      </p>
    </ComparisonFigure>
  )
}
