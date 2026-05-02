import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { formatNumber } from '@/lib/utils'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../lib/formatting'
import type { PnrrProject } from '@/schemas/pnrr'
import { useMemo } from 'react'

interface PnrrNationalSummaryProps {
  readonly projects: readonly PnrrProject[]
}

export function PnrrNationalSummary({ projects }: PnrrNationalSummaryProps) {
  const currency = usePnrrCurrency()
  const stats = useMemo(() => {
    const totalValue = projects.reduce((s, p) => s + p.valueEur, 0)
    const projectCount = projects.length
    const riskCount = projects.filter((p) => p.anomalies.length > 0).length

    const grantValue = projects
      .filter((p) => p.fundingSource === 'grant')
      .reduce((s, p) => s + p.valueEur, 0)
    const loanValue = projects
      .filter((p) => p.fundingSource === 'loan')
      .reduce((s, p) => s + p.valueEur, 0)
    const mixedValue = projects
      .filter((p) => p.fundingSource === 'grant/loan')
      .reduce((s, p) => s + p.valueEur, 0)

    const completedCount = projects.filter((p) => p.status === 'completed').length
    const notStartedCount = projects.filter((p) => p.status === 'not-started').length
    const inProgressCount = projectCount - completedCount - notStartedCount

    const publicCount = projects.filter((p) => p.entityType === 'public').length
    const privateCount = projects.filter((p) => p.entityType === 'private').length
    const nationalCount = projects.filter((p) => p.entityType === 'national').length

    return {
      totalValue,
      projectCount,
      riskCount,
      grantValue,
      loanValue,
      mixedValue,
      completedCount,
      notStartedCount,
      inProgressCount,
      publicCount,
      privateCount,
      nationalCount,
    }
  }, [projects])

  const MetricCard = ({
    label,
    value,
    sub,
  }: {
    readonly label: string
    readonly value: string
    readonly sub?: string
  }) => (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label={t`Valoare totală`}
          value={formatPnrrCurrency(stats.totalValue, currency)}
        />
        <MetricCard
          label={t`Proiecte`}
          value={formatNumber(stats.projectCount, 'compact')}
        />
        <MetricCard
          label={t`Riscuri`}
          value={formatNumber(stats.riskCount, 'compact')}
          sub={stats.projectCount > 0
            ? `${((stats.riskCount / stats.projectCount) * 100).toFixed(1)}%`
            : undefined}
        />
        <MetricCard
          label={t`Finalizate`}
          value={formatNumber(stats.completedCount, 'compact')}
          sub={stats.projectCount > 0
            ? `${((stats.completedCount / stats.projectCount) * 100).toFixed(1)}%`
            : undefined}
        />
      </div>

      {/* Funding breakdown */}
      <div className="rounded-lg border border-border p-4">
        <h4 className="mb-3 text-sm font-semibold"><Trans>Surse de finanțare</Trans></h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Grant</Trans></p>
            <p className="text-lg font-bold">{formatPnrrCurrency(stats.grantValue, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Împrumut</Trans></p>
            <p className="text-lg font-bold">{formatPnrrCurrency(stats.loanValue, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Grant + Împrumut</Trans></p>
            <p className="text-lg font-bold">{formatPnrrCurrency(stats.mixedValue, currency)}</p>
          </div>
        </div>
      </div>

      {/* Entity breakdown */}
      <div className="rounded-lg border border-border p-4">
        <h4 className="mb-3 text-sm font-semibold"><Trans>Tip entitate beneficiar</Trans></h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Publice</Trans></p>
            <p className="text-lg font-bold">{formatNumber(stats.publicCount, 'compact')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Private</Trans></p>
            <p className="text-lg font-bold">{formatNumber(stats.privateCount, 'compact')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Naționale</Trans></p>
            <p className="text-lg font-bold">{formatNumber(stats.nationalCount, 'compact')}</p>
          </div>
        </div>
      </div>

      {/* Progress breakdown */}
      <div className="rounded-lg border border-border p-4">
        <h4 className="mb-3 text-sm font-semibold"><Trans>Stadiu implementare</Trans></h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Finalizate</Trans></p>
            <p className="text-lg font-bold">{formatNumber(stats.completedCount, 'compact')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground"><Trans>În progres</Trans></p>
            <p className="text-lg font-bold">{formatNumber(stats.inProgressCount, 'compact')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground"><Trans>Neîncepute</Trans></p>
            <p className="text-lg font-bold">{formatNumber(stats.notStartedCount, 'compact')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
