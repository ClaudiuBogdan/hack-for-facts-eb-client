import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../lib/formatting'
import type { PnrrAggregates } from '@/schemas/pnrr'
import { t } from '@lingui/core/macro'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Wallet, TrendingUp, AlertTriangle, Landmark } from 'lucide-react'

export function PnrrStatsRibbon({
  aggregates,
}: {
  readonly aggregates: PnrrAggregates
}) {
  const currency = usePnrrCurrency()
  const absorptionRate =
    aggregates.rawTotalValue > 0
      ? (aggregates.completedValue / aggregates.rawTotalValue) * 100
      : 0

  const stats = [
    {
      label: t`Valoarea proiectelor listate`,
      value: formatPnrrCurrency(aggregates.rawTotalValue, currency),
      sublabel: t`${formatPnrrCurrency(aggregates.deduplicatedTotalValue, currency, 'standard')} estimat după posibile duplicate`,
      icon: Wallet,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      progressValue: undefined as number | undefined,
      variant: 'default' as const,
    },
    {
      label: t`Ponderea valorii proiectelor marcate finalizate`,
      value: `${formatNumber(absorptionRate)}%`,
      sublabel: t`${formatNumber(aggregates.completedCount)} proiecte marcate finalizate din ${formatNumber(aggregates.rawProjectCount)}`,
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      progressValue: absorptionRate,
      variant: 'default' as const,
    },
    {
      label: t`Finanțare din componenta de împrumut`,
      value: formatPnrrCurrency(aggregates.loanTotal, currency),
      sublabel: t`${formatNumber(aggregates.loanPercent)}% din valoarea proiectelor listate`,
      icon: Landmark,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      progressValue: undefined,
      variant: 'danger' as const,
    },
    {
      label: t`Date financiare nepublicate în set`,
      value: `${formatNumber(aggregates.missingFinProgressPercent)}%`,
      sublabel: t`${formatNumber(aggregates.missingFinProgressCount)} proiecte fără progres financiar publicat`,
      icon: AlertTriangle,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      progressValue: undefined,
      variant: 'warning' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card
            key={stat.label}
            className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-muted/50 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-black tracking-tight">
                    {stat.value}
                  </p>
                  {stat.progressValue !== undefined && (
                    <div className="w-32">
                      <Progress value={stat.progressValue} className="h-1.5" />
                    </div>
                  )}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {stat.sublabel}
                  </p>
                </div>
                <div
                  className={`rounded-xl ${stat.iconBg} p-2.5 transition-transform group-hover:scale-110`}
                >
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
