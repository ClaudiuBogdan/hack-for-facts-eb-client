import { useMemo, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber, cn } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import type { PnrrProject } from '@/schemas/pnrr'
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

const GAP_BUCKETS = [
  { min: -Infinity, max: -50, label: '< -50%', color: '#991b1b' },
  { min: -50, max: -20, label: '-50% → -20%', color: '#ef4444' },
  { min: -20, max: 0, label: '-20% → 0%', color: '#f59e0b' },
  { min: 0, max: 20, label: '0% → 20%', color: '#6f6f6f' },
  { min: 20, max: 50, label: '20% → 50%', color: '#3b82f6' },
  { min: 50, max: 100, label: '50% → 100%', color: '#1d4ed8' },
  { min: 100, max: Infinity, label: '> 100%', color: '#16a34a' },
]

const PROGRESS_BUCKETS = [
  { min: 0, max: 10, label: '0% → 10%', color: '#6f6f6f' },
  { min: 10, max: 25, label: '10% → 25%', color: '#d97706' },
  { min: 25, max: 50, label: '25% → 50%', color: '#f59e0b' },
  { min: 50, max: 75, label: '50% → 75%', color: '#3b82f6' },
  { min: 75, max: 90, label: '75% → 90%', color: '#1d4ed8' },
  { min: 90, max: 100, label: '90% → 100%', color: '#b6ff00' },
  { min: 100, max: Infinity, label: '> 100%', color: '#16a34a' },
]

const METRIC_LABELS: Record<Metric, string> = {
  tech: t`Technical Progress`,
  fin: t`Financial Progress`,
  gap: t`Progress difference`,
}

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'tech', label: t`Technical` },
  { value: 'fin', label: t`Financial` },
  { value: 'gap', label: t`Difference` },
]

const MODE_OPTIONS: { value: DistributionMode; label: string }[] = [
  { value: 'count', label: t`Projects` },
  { value: 'value', label: t`Value` },
]

export function PnrrProgressHistogram({
  projects,
}: {
  readonly projects: readonly PnrrProject[]
}) {
  const [metric, setMetric] = useState<Metric>('tech')
  const [mode, setMode] = useState<DistributionMode>('count')
  const currency = usePnrrCurrency()

  const { data, coveragePercent, validCount, totalValue } = useMemo(() => {
    if (metric === 'gap') {
      const valid = projects.filter(
        (p) =>
          typeof p.techProgress === 'number' &&
          typeof p.finProgress === 'number',
      )

      const counts = GAP_BUCKETS.map((bucket) => {
        const matches = valid.filter((p) => {
          const gap = (p.techProgress as number) - (p.finProgress as number)
          return gap >= bucket.min && gap < bucket.max
        })
        return {
          label: bucket.label,
          count: matches.length,
          value: matches.reduce((sum, p) => sum + p.valueEur, 0),
          color: bucket.color,
        }
      })

      const coverage =
        projects.length > 0 ? (valid.length / projects.length) * 100 : 0

      return {
        data: counts,
        coveragePercent: coverage,
        validCount: valid.length,
        totalValue: valid.reduce((sum, p) => sum + p.valueEur, 0),
      }
    }

    const key = metric === 'tech' ? 'techProgress' : 'finProgress'
    const valid = projects.filter((p) => typeof p[key] === 'number')

    const counts = PROGRESS_BUCKETS.map((bucket) => {
      const matches = valid.filter((p) => {
        const val = p[key] as number
        return val >= bucket.min && val < bucket.max
      })
      return {
        label: bucket.label,
        count: matches.length,
        value: matches.reduce((sum, p) => sum + p.valueEur, 0),
        color: bucket.color,
      }
    })

    const coverage =
      projects.length > 0 ? (valid.length / projects.length) * 100 : 0

    return {
      data: counts,
      coveragePercent: coverage,
      validCount: valid.length,
      totalValue: valid.reduce((sum, p) => sum + p.valueEur, 0),
    }
  }, [projects, metric])

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
                      Percentages over 100% come directly from the data reported
                      by beneficiaries. They often appear because of scope
                      changes after contract signing, delays in updating the
                      reference value, or data entry errors.
                    </Trans>
                  </p>
                </TooltipContent>
              </ShadcnTooltip>
            </TooltipProvider>
          </div>
          {metric === 'gap' && (
            <span className="mt-1 inline-block border border-[var(--pnrr-border)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--pnrr-muted)]">
              <Trans>Technical - Financial</Trans>
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
              {formatPnrrCurrency(totalValue, currency)}{' '}
              <span className="text-[var(--pnrr-muted)]">
                <Trans>of</Trans>
              </span>{' '}
              {formatPnrrCurrency(
                projects.reduce((s, p) => s + p.valueEur, 0),
                currency,
              )}{' '}
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
              <span className="font-bold">{formatNumber(projects.length)}</span>{' '}
              <span className="text-[var(--pnrr-muted)]">
                <Trans>projects with complete data</Trans>
              </span>
            </span>
          )}
          <span className="shrink-0 text-xl font-black tabular-nums text-[var(--pnrr-fg)]">
            {formatNumber(coveragePercent)}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-[#e5e5e5]">
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
                stroke="#d1d1cc"
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
                  return [formatNumber(Number(val)), t`Projects`]
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
