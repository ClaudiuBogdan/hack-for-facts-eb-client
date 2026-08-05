/**
 * CategoryChart Component
 *
 * Horizontal bar chart showing budget, committed, and paid amounts
 * by functional classification (budget chapter)
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SafeResponsiveContainer } from '@/components/charts/safe-responsive-container'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'

export type CategoryData = {
  readonly id: string
  readonly name: string
  readonly budget: number
  readonly committed: number
  readonly paid: number
}

type Props = {
  readonly data: CategoryData[]
  readonly currency?: 'RON' | 'EUR' | 'USD'
  readonly isLoading?: boolean
  /** The breakdown could not be fetched — distinct from "there is none". */
  readonly isError?: boolean
}

type TooltipPayloadItem = {
  value: number
  payload: CategoryData
}

type CustomTooltipProps = {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  currency: 'RON' | 'EUR' | 'USD'
}

function CustomTooltip({ active, payload, currency }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-card p-4 shadow-xl border border-border rounded-lg text-sm">
        <p className="font-bold text-card-foreground mb-2">{data.name}</p>
        <div className="space-y-1">
          <p className="text-muted-foreground">
            {t`Budget credits`}:{' '}
            <span className="font-semibold text-foreground">
              {formatCurrency(data.budget, 'compact', currency)}
            </span>
          </p>
          <p className="text-blue-500">
            {t`Legal commitments`}:{' '}
            <span className="font-semibold">
              {formatCurrency(data.committed, 'compact', currency)}
            </span>
          </p>
          <p className="text-emerald-500">
            {t`Payments`}:{' '}
            <span className="font-semibold">
              {formatCurrency(data.paid, 'compact', currency)}
            </span>
          </p>
        </div>
      </div>
    )
  }
  return null
}

export function CategoryChart({
  data,
  currency = 'RON',
  isLoading = false,
  isError = false,
}: Props) {
  // Sort by budget size descending
  const sortedData = [...data].sort((a, b) => b.budget - a.budget)

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border h-[380px]">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-[280px] w-full" />
      </div>
    )
  }

  // Checked before the empty case: an unanswered request tells us nothing
  // about whether a breakdown exists.
  if (isError && (!data || data.length === 0)) {
    return (
      <div
        role="alert"
        className="bg-card p-6 rounded-xl shadow-sm border border-border h-[380px] flex items-center justify-center"
      >
        <p className="text-muted-foreground">
          <Trans>The category breakdown could not be loaded</Trans>
        </p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border h-[380px] flex items-center justify-center">
        <p className="text-muted-foreground">
          <Trans>No category data available</Trans>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card p-6 rounded-xl shadow-sm border border-border h-[380px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-card-foreground">
          <Trans>Status by Budget Chapters</Trans>
        </h3>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-slate-200 rounded-sm" />
            <span className="text-muted-foreground">
              <Trans>Budget credits</Trans>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span className="text-muted-foreground">
              <Trans>Legal commitments</Trans>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
            <span className="text-muted-foreground">
              <Trans>Payments</Trans>
            </span>
          </div>
        </div>
      </div>

      <SafeResponsiveContainer width="100%" height="90%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#e2e8f0"
          />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickFormatter={(name: string) => name.length > 14 ? `${name.slice(0, 14)}…` : name}
          />
          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ fill: '#f8fafc' }}
          />

          {/* Background Bar - Total Budget */}
          <Bar dataKey="budget" barSize={24} radius={[0, 4, 4, 0]} fill="#e2e8f0" />

          {/* Foreground Bar - Committed */}
          <Bar
            dataKey="committed"
            barSize={16}
            radius={[0, 4, 4, 0]}
            fill="#3b82f6"
          />

          {/* Foreground Bar - Paid */}
          <Bar dataKey="paid" barSize={8} radius={[0, 4, 4, 0]} fill="#34d399" />
        </BarChart>
      </SafeResponsiveContainer>
    </div>
  )
}
