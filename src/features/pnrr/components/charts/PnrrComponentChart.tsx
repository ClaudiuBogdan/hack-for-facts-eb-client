import { useMemo, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import type { PnrrAggregates } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PNRR_COMPONENTS } from '../../data/component-definitions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
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

type ViewMode = 'value' | 'count'

export function PnrrComponentChart({
  aggregates,
  filterState,
}: {
  readonly aggregates: PnrrAggregates
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const [view, setView] = useState<ViewMode>('value')
  const currency = usePnrrCurrency()

  const data = useMemo(() => {
    const entries = Object.entries(aggregates.componentStats)
      .map(([code, stats]) => ({
        code,
        name: PNRR_COMPONENTS[code]?.nameRo ?? code,
        shortName: code,
        value: stats.value,
        count: stats.count,
        color: PNRR_COMPONENTS[code]?.color ?? '#94a3b8',
        missingFin: stats.missingFinProgress,
      }))
      .sort((a, b) => b[view] - a[view])

    return entries
  }, [aggregates.componentStats, view])

  const handleClick = (entry: unknown) => {
    const e = entry as { code: string }
    if (!e.code) return
    const current = filterState.search.components ?? []
    if (current.includes(e.code)) {
      filterState.setComponents(current.filter((c) => c !== e.code))
    } else {
      filterState.setComponents([...current, e.code])
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-bold">
            <Trans>Distribution by Components</Trans>
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {data.length} <Trans>components</Trans>
          </Badge>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as ViewMode)}
          size="sm"
        >
          <ToggleGroupItem value="value" className="h-7 text-xs">
            <Trans>Value</Trans>
          </ToggleGroupItem>
          <ToggleGroupItem value="count" className="h-7 text-xs">
            <Trans>Count</Trans>
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[320px]">
          <SafeResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 20, right: 20, top: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--pnrr-track)"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--pnrr-muted)' }}
                tickFormatter={(v) =>
                  view === 'value'
                    ? formatPnrrCurrency(v, currency)
                    : formatNumber(v, 'compact')
                }
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="category"
                dataKey="shortName"
                width={50}
                tick={{ fontSize: 11, fill: 'var(--pnrr-fg)', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--pnrr-track)',
                  background: 'var(--pnrr-card)',
                  color: 'var(--pnrr-fg)',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  fontSize: 12,
                }}
                formatter={(val) => [
                  view === 'value'
                    ? formatPnrrCurrency(Number(val), currency, 'standard')
                    : formatNumber(Number(val)),
                  view === 'value' ? t`Value` : t`Projects`,
                ]}
                labelFormatter={(label) => {
                  const item = data.find((d) => d.shortName === label)
                  return item?.name ?? label
                }}
              />

              <Bar
                dataKey={view}
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={handleClick}
                animationDuration={500}
              >
                {data.map((entry) => (
                  <Cell key={entry.code} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
