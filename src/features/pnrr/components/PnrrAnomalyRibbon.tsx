import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../lib/formatting'
import type { PnrrAggregates, AnomalyType, DataQualitySignalType } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { cn } from '@/lib/utils'
import {
  ANOMALY_CONFIG,
  DATA_QUALITY_SIGNAL_CONFIG,
} from '../lib/anomaly-definitions'
import { Info } from 'lucide-react'

export function PnrrAnomalyRibbon({
  aggregates,
  filterState,
  onInfoClick,
  onDataQualityInfoClick,
}: {
  readonly aggregates: PnrrAggregates
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly onInfoClick?: (type: AnomalyType) => void
  readonly onDataQualityInfoClick?: (type: DataQualitySignalType) => void
}) {
  const currency = usePnrrCurrency()
  const activeAnomalies = filterState.search.anomalyTypes ?? []
  const activeDataQualitySignals = filterState.search.dataQualitySignalTypes ?? []

  const toggleAnomaly = (type: AnomalyType) => {
    const current = new Set(activeAnomalies)
    if (current.has(type)) {
      current.delete(type)
    } else {
      current.add(type)
    }
    filterState.setAnomalyTypes(Array.from(current))
  }

  const toggleDataQualitySignal = (type: DataQualitySignalType) => {
    const current = new Set(activeDataQualitySignals)
    if (current.has(type)) {
      current.delete(type)
    } else {
      current.add(type)
    }
    filterState.setDataQualitySignalTypes(Array.from(current))
  }

  const visibleAnomalies = ANOMALY_CONFIG.filter(
    (cfg) => aggregates.anomalyCounts[cfg.type]?.count > 0
  )

  const visibleDataQualitySignals = DATA_QUALITY_SIGNAL_CONFIG.filter(
    (cfg) => aggregates.dataQualitySignalCounts[cfg.type]?.count > 0
  )

  if (visibleAnomalies.length === 0 && visibleDataQualitySignals.length === 0) {
    return (
      <div className="border-2 border-dashed border-foreground/10 p-6 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <Trans>Niciun semnal detectat în datele curente.</Trans>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Risks */}
      {visibleAnomalies.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h4 className="shrink-0 text-lg font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
              <Trans>Riscuri majore</Trans>
            </h4>
            <span className="h-0.5 flex-1 bg-[var(--pnrr-border)]" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleAnomalies.map((cfg) => {
              const data = aggregates.anomalyCounts[cfg.type]
              const isActive = activeAnomalies.includes(cfg.type)
              const Icon = cfg.icon

              return (
                <AnomalyTile
                  key={cfg.type}
                  icon={Icon}
                  label={cfg.label}
                  shortDescription={cfg.shortDescription}
                  count={data.count}
                  value={data.value}
                  currency={currency}
                  tone={cfg.severity === 'warning' ? 'orange' : 'red'}
                  isActive={isActive}
                  onClick={() => toggleAnomaly(cfg.type)}
                  onInfoClick={() => onInfoClick?.(cfg.type)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Data Quality */}
      {visibleDataQualitySignals.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h4 className="shrink-0 text-lg font-black uppercase tracking-wide text-[var(--pnrr-fg)]">
              <Trans>Calitatea datelor</Trans>
            </h4>
            <span className="h-0.5 flex-1 bg-[var(--pnrr-border)]" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {visibleDataQualitySignals.map((cfg) => {
              const data = aggregates.dataQualitySignalCounts[cfg.type]
              const isActive = activeDataQualitySignals.includes(cfg.type)
              const Icon = cfg.icon

              return (
                <AnomalyTile
                  key={cfg.type}
                  icon={Icon}
                  label={cfg.label}
                  shortDescription={cfg.shortDescription}
                  count={data.count}
                  value={data.value}
                  currency={currency}
                  tone="blue"
                  isActive={isActive}
                  onClick={() => toggleDataQualitySignal(cfg.type)}
                  onInfoClick={() => onDataQualityInfoClick?.(cfg.type)}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AnomalyTile({
  icon: Icon,
  label,
  shortDescription,
  count,
  value,
  currency,
  tone,
  isActive,
  onClick,
  onInfoClick,
}: {
  readonly icon: React.ElementType
  readonly label: string
  readonly shortDescription: string
  readonly count: number
  readonly value: number
  readonly currency: 'RON' | 'EUR' | 'USD'
  readonly tone: 'red' | 'orange' | 'blue'
  readonly isActive: boolean
  readonly onClick: () => void
  readonly onInfoClick?: () => void
}) {
  const toneClasses = {
    red: {
      border: 'border-t-[var(--pnrr-red)]',
      icon: 'bg-[var(--pnrr-red)] text-white',
    },
    orange: {
      border: 'border-t-[var(--pnrr-orange)]',
      icon: 'bg-[var(--pnrr-orange)] text-white',
    },
    blue: {
      border: 'border-t-[var(--pnrr-blue)]',
      icon: 'bg-[var(--pnrr-blue)] text-white',
    },
  }[tone]

  return (
    <div
      className={cn(
        'group relative min-h-[178px] cursor-pointer border-2 border-t-4 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 transition-colors',
        toneClasses.border,
        isActive
          ? 'bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]'
          : 'hover:bg-[var(--pnrr-bg)]'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Top row: label + info button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-4">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-sm', toneClasses.icon)}>
            <Icon className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                'text-base font-black uppercase leading-tight tracking-wide',
                isActive ? 'text-[var(--pnrr-bg)]' : 'text-[var(--pnrr-fg)]'
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                'mt-1 text-sm leading-snug',
                isActive ? 'text-[var(--pnrr-bg)]/80' : 'text-[var(--pnrr-fg)]'
              )}
            >
              {shortDescription}
            </p>
          </div>
        </div>
        {onInfoClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onInfoClick()
            }}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-current opacity-0 transition-opacity group-hover:opacity-100',
              isActive
                ? 'text-[var(--pnrr-bg)] hover:bg-[var(--pnrr-bg)] hover:text-[var(--pnrr-fg)]'
                : 'text-[var(--pnrr-muted)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]'
            )}
            aria-label={t`Detalii despre ${label}`}
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Bottom row: big number + value */}
      <div className="mt-6">
        <p
          className={cn(
            'text-5xl font-black leading-none tabular-nums',
            isActive ? 'text-[var(--pnrr-bg)]' : 'text-black'
          )}
        >
          {count.toLocaleString('ro-RO')}
        </p>
        <div
          className={cn(
            'mt-3 h-0.5 w-44 max-w-full',
            isActive ? 'bg-[var(--pnrr-bg)]' : 'bg-[var(--pnrr-border)]'
          )}
        />
        <p
          className={cn(
            'mt-2 text-base tabular-nums',
            isActive ? 'text-[var(--pnrr-bg)]/90' : 'text-[var(--pnrr-fg)]'
          )}
        >
          {formatPnrrCurrency(value, currency, 'compact')}
        </p>
      </div>
    </div>
  )
}
