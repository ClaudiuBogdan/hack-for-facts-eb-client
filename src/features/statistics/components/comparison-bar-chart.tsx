import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildBarSeries, type ComparisonMatrix } from '../lib/comparison-series'
import { ComparisonFigure } from './comparison-chart-shell'
import { formatComparisonAxisTick, formatComparisonNumber, type ComparisonSeriesDescriptor } from '../lib/comparison-format'

type Props = {
  readonly matrix: ComparisonMatrix
  readonly series: readonly ComparisonSeriesDescriptor[]
  readonly selectedPeriod: string | null
}

type TooltipEntry = { readonly payload?: { readonly name?: string | null; readonly value?: number | null } }

type TooltipProps = {
  readonly active?: boolean
  readonly payload?: readonly TooltipEntry[]
}

function ComparisonBarTooltip({ active, payload }: TooltipProps) {
  const datum = payload?.[0]?.payload
  if (!active || !datum || typeof datum.value !== 'number') return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{datum.name}</p>
      <p className="text-sm font-medium tabular-nums text-foreground">
        {formatComparisonNumber(datum.value)}
      </p>
    </div>
  )
}

/**
 * Territories at the selected period, in selection order.
 *
 * A territory with no observation for this period has no bar. Rather than let
 * that read as "zero", the territories it applies to are named underneath —
 * an absent bar and a zero-height bar look identical otherwise.
 *
 * Direct value labels are not decoration: two of the light-mode palette slots
 * fall below 3:1 contrast on the page surface, and the dataviz relief rule
 * requires visible labels (or the table view) whenever they do.
 */
export function ComparisonBarChart({ matrix, series, selectedPeriod }: Props) {
  const data = buildBarSeries(matrix, selectedPeriod)
  const colorBySiruta = new Map(series.map((entry) => [entry.code, entry.color]))
  const labelBySiruta = new Map(series.map((entry) => [entry.code, entry.label]))

  const plotted = data
    .filter((datum) => datum.value !== null)
    .map((datum) => ({
      code: datum.code,
      name: labelBySiruta.get(datum.code) ?? datum.code,
      value: datum.value as number,
    }))

  const missing = data
    .filter((datum) => datum.value === null)
    .map((datum) => labelBySiruta.get(datum.code) ?? datum.code)

  return (
    <ComparisonFigure
      title={<Trans>Comparație la perioada selectată</Trans>}
      caption={
        selectedPeriod ? (
          <Trans>Valorile raportate pentru perioada {selectedPeriod}.</Trans>
        ) : (
          <Trans>Nicio perioadă selectată.</Trans>
        )
      }
      series={series}
    >
      {plotted.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          <Trans>Niciun teritoriu nu are date pentru această perioadă.</Trans>
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plotted} margin={{ top: 20, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.25} className="stroke-border" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                interval={0}
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
              <Tooltip cursor={{ fillOpacity: 0.06 }} content={<ComparisonBarTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {plotted.map((datum) => (
                  <Cell
                    key={datum.code}
                    fill={colorBySiruta.get(datum.code)}
                    // 2px surface gap between adjacent bars.
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  className="fill-foreground text-[11px] tabular-nums"
                  formatter={(value) =>
                    typeof value === 'number' ? formatComparisonNumber(value) : ''
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {missing.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t`Fără date raportate pentru această perioadă: ${missing.join(', ')}.`}
        </p>
      ) : null}
    </ComparisonFigure>
  )
}
