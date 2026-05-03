import { useMemo, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../../lib/formatting'
import type { PnrrAggregates } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import countyPopulations from '../../data/ins-county-population.json'
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
  ResponsiveContainer,
  Cell,
} from 'recharts'

type ViewMode = 'value' | 'count' | 'perCapita'

export function PnrrCountyChart({
  aggregates,
  filterState,
}: {
  readonly aggregates: PnrrAggregates
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const [view, setView] = useState<ViewMode>('value')
  const currency = usePnrrCurrency()

  const data = useMemo(() => {
    const entries = Object.entries(aggregates.countyStats)
      .map(([county, stats]) => {
        const pop = (countyPopulations as Record<string, number>)[county] ?? 1
        return {
          county,
          value: stats.value,
          count: stats.count,
          perCapita: pop > 0 ? stats.value / pop : 0,
        }
      })
      .sort((a, b) => b[view] - a[view])
      .slice(0, 20)

    return entries
  }, [aggregates.countyStats, view])

  const handleClick = (entry: unknown) => {
    const e = entry as { county: string }
    if (!e.county) return
    const current = filterState.search.counties ?? []
    if (current.includes(e.county)) {
      filterState.setCounties(current.filter((c) => c !== e.county))
    } else {
      filterState.setCounties([...current, e.county])
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-bold">
            <Trans>Top Counties</Trans>
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            Top 20
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
          <ToggleGroupItem value="perCapita" className="h-7 text-xs">
            <Trans>/capita</Trans>
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 20, right: 20, top: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e2e8f0"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v) =>
                  view === 'value'
                    ? formatPnrrCurrency(v, currency)
                    : view === 'perCapita'
                      ? formatPnrrCurrency(v, currency)
                      : formatNumber(v, 'compact')
                }
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                type="category"
                dataKey="county"
                width={70}
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  fontSize: 12,
                }}
                formatter={(val) => [
                  view === 'value'
                    ? formatPnrrCurrency(Number(val), currency, 'standard')
                    : view === 'perCapita'
                      ? formatPnrrCurrency(Number(val), currency, 'standard')
                      : formatNumber(Number(val)),
                  view === 'perCapita' ? t`Value per capita` : '',
                ]}
              />

              <Bar
                dataKey={view}
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={handleClick}
                animationDuration={500}
              >
                {data.map((_entry, i) => (
                  <Cell
                    key={i}
                    fill={`hsl(${200 + i * 4}, ${60 + (i % 3) * 10}%, ${45 + (i % 2) * 5}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
