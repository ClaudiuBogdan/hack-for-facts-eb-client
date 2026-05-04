import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber, cn } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import type { PnrrWorkerOverviewModel } from '../../workers/pnrr-worker-types'
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Info } from 'lucide-react'

type Metric = 'tech' | 'fin' | 'gap'
type DistributionMode = 'count' | 'value'

const METRIC_LABELS: Record<Metric, string> = {
  tech: t`Reported technical progress`,
  fin: t`Reported financial progress`,
  gap: t`Reported progress difference`,
}

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'tech', label: t`Technical` },
  { value: 'fin', label: t`Financial` },
  { value: 'gap', label: t`Difference` },
]

const MODE_OPTIONS: { value: DistributionMode; label: string }[] = [
  { value: 'count', label: t`Records` },
  { value: 'value', label: t`Value` },
]

export function PnrrProgressHistogram({
  model,
}: {
  readonly model: PnrrWorkerOverviewModel['histogram']
}) {
  const [metric, setMetric] = useState<Metric>('tech')
  const [mode, setMode] = useState<DistributionMode>('count')
  const currency = usePnrrCurrency()

  const {
    data,
    countCoveragePercent,
    valueCoveragePercent,
    validCount,
    validValue,
    totalRecordCount,
    totalValue,
  } = model[metric]
  const coveragePercent = mode === 'value'
    ? valueCoveragePercent
    : countCoveragePercent

  return (
    <div
      className="min-w-0 overflow-hidden border-2 border-[var(--pnrr-border)]"
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b-2 border-[var(--pnrr-border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: title + badge + info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="text-lg font-black leading-tight text-[var(--pnrr-fg)]">
              {METRIC_LABELS[metric]}
            </h3>
            <TooltipProvider delayDuration={200}>
              <ShadcnTooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60"
                    aria-label={t`Information about percentages over 100%`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="start"
                  className="max-w-[280px] border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-fg)]"
                >
                  <p className="text-xs leading-relaxed">
                    <Trans>
                      Percentages over 100% come from reported data. They can
                      appear from changes in reference value, delayed updates,
                      or entry errors.
                    </Trans>
                  </p>
                </TooltipContent>
              </ShadcnTooltip>
            </TooltipProvider>
          </div>
          {metric === 'gap' && (
            <span className="mt-1 inline-block border border-[var(--pnrr-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--pnrr-muted)]">
              <Trans>Technical - financial</Trans>
            </span>
          )}
        </div>

        {/* Right: segmented controls aligned end */}
        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={(v) => setMode(v)}
          />

          <SegmentedControl
            options={METRIC_OPTIONS}
            value={metric}
            onChange={(v) => setMetric(v)}
          />
        </div>
      </div>

      {/* Coverage indicator */}
      <div className="border-b-2 border-[var(--pnrr-border)] px-5 py-3">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--pnrr-fg)]">
          {mode === 'value' ? (
            <span className="break-words">
              {formatPnrrCurrency(validValue, currency)}{' '}
              <span className="text-[var(--pnrr-muted)]">
                <Trans>of</Trans>
              </span>{' '}
              {formatPnrrCurrency(totalValue, currency)}{' '}
              <span className="text-[var(--pnrr-muted)]">
                <Trans>value with complete data</Trans>
              </span>
            </span>
          ) : (
            <span className="break-words">
              <span className="font-bold">{formatNumber(validCount)}</span>{' '}
              <span className="text-[var(--pnrr-muted)]">
                <Trans>of</Trans>
              </span>{' '}
              <span className="font-bold">{formatNumber(totalRecordCount)}</span>{' '}
              <span className="text-[var(--pnrr-muted)]">
                <Trans>records with complete data</Trans>
              </span>
            </span>
          )}
          <span className="shrink-0 text-xl font-black tabular-nums text-[var(--pnrr-fg)]">
            {formatNumber(coveragePercent)}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-[var(--pnrr-track)]">
          <div
            className="h-full bg-[var(--pnrr-fg)] transition-all"
            style={{ width: `${Math.min(coveragePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 py-5 sm:px-5">
        <div className="h-[280px]">
          <SafeResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 30, left: 10, right: 10 }}>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="var(--pnrr-track)"
              />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--pnrr-muted)' }}
                angle={-25}
                textAnchor="end"
                axisLine={{ stroke: 'var(--pnrr-border)' }}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 11, fill: 'var(--pnrr-muted)' }}
                axisLine={{ stroke: 'var(--pnrr-border)' }}
                tickLine={false}
                tickFormatter={(v) =>
                  mode === 'value'
                    ? formatPnrrCurrency(v, currency)
                    : formatNumber(v, 'compact')
                }
              />

              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={{
                  borderRadius: 0,
                  border: '2px solid var(--pnrr-border)',
                  boxShadow: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'var(--pnrr-card)',
                  color: 'var(--pnrr-fg)',
                  padding: '10px 14px',
                }}
                formatter={(val) => {
                  if (mode === 'value') {
                    return [
                      formatPnrrCurrency(Number(val), currency, 'compact'),
                      t`Value`,
                    ]
                  }
                  return [formatNumber(Number(val)), t`Records`]
                }}
              />

              <Bar
                dataKey={mode === 'value' ? 'value' : 'count'}
                radius={[0, 0, 0, 0]}
                animationDuration={500}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    stroke="var(--pnrr-border)"
                    strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  Brutalist Segmented Control                                    */
/* ──────────────────────────────────────────────────────────────── */

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  readonly options: readonly { value: T; label: string }[]
  readonly value: T
  readonly onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex border-2 border-[var(--pnrr-border)]">
      {options.map((opt, i) => {
        const isActive = value === opt.value
        const isFirst = i === 0
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60',
              isActive
                ? 'bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]'
                : 'bg-[var(--pnrr-card)] text-[var(--pnrr-muted)] hover:text-[var(--pnrr-fg)]',
              !isFirst && 'border-l-2 border-[var(--pnrr-border)]',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
