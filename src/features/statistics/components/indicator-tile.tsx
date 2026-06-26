import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Trans } from '@lingui/react/macro'
import { AlertCircle } from 'lucide-react'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { DataStatusBadge } from './data-status-badge'
import { FreshnessBadge } from './freshness-badge'
import { RequestDatasetAction } from './request-dataset-action'
import { SourceProvenanceDrawer } from './source-provenance-drawer'

type IndicatorTileProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
}

function formatValue(rawValue: string | null, unit: string | null): string {
  if (rawValue === null) return '—'
  const numeric = Number(rawValue.replace(',', '.'))
  if (!Number.isFinite(numeric)) return rawValue
  const formatted = new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: numeric % 1 === 0 ? 0 : 2,
  }).format(numeric)
  return unit ? `${formatted} ${unit}` : formatted
}

function isBlockingValueStatus(status: string | null): boolean {
  return status === ':' || status === 'c' || status === 'x'
}

function getStatisticsStatusLabel(status: string | null): string | null {
  if (!status) return null

  const labels: Readonly<Record<string, string>> = {
    ':': t`Lipsă`,
    c: t`Confidențial`,
    x: t`Confidențial`,
    e: t`Estimat`,
    p: t`Preliminar`,
    r: t`Revizuit`,
  }

  return labels[status] ?? t`Indisponibil`
}

function getPeriodSequence(period: StatisticsIndicatorTile['sparkline'][number][0]) {
  if (period.periodicity === 'MONTHLY' && period.month) {
    return period.year * 12 + period.month - 1
  }
  if (period.periodicity === 'QUARTERLY' && period.quarter) {
    return period.year * 4 + period.quarter - 1
  }
  return period.year
}

function buildSparklinePaths(points: StatisticsIndicatorTile['sparkline']) {
  const numericValues = points
    .map(([, value]) => (value === null ? null : Number(value.replace(',', '.'))))
    .filter((value): value is number => Number.isFinite(value))

  if (numericValues.length < 2) {
    return []
  }

  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1
  const paths: string[] = []
  let currentPath: string[] = []
  let previousSequence: number | null = null

  points.forEach(([period, value], index) => {
    const sequence = getPeriodSequence(period)
    const numeric = value === null ? Number.NaN : Number(value.replace(',', '.'))
    const isGap =
      previousSequence !== null && sequence - previousSequence > 1

    if (!Number.isFinite(numeric) || isGap) {
      if (currentPath.length > 1) {
        paths.push(currentPath.join(' '))
      }
      currentPath = []
    }

    if (Number.isFinite(numeric)) {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100
      const y = 36 - ((numeric - min) / range) * 30
      currentPath.push(
        `${currentPath.length === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`,
      )
    }

    previousSequence = sequence
  })

  if (currentPath.length > 1) {
    paths.push(currentPath.join(' '))
  }

  return paths
}

function Sparkline({
  points,
}: {
  readonly points: StatisticsIndicatorTile['sparkline']
}) {
  const numericPoints = points
    .map(([, value]) => (value === null ? null : Number(value.replace(',', '.'))))
    .filter((value): value is number => Number.isFinite(value))

  if (numericPoints.length < 2) {
    return (
      <div
        className="flex h-10 items-center rounded-md bg-muted/50 px-2 text-xs text-muted-foreground"
        role="img"
        aria-label={t`Serie prea scurtă pentru grafic`}
      >
        <Trans>Serie prea scurtă pentru grafic</Trans>
      </div>
    )
  }

  const paths = buildSparklinePaths(points)

  return (
    <svg
      className="h-10 w-full"
      viewBox="0 0 100 40"
      role="img"
      aria-label={t`Evoluție până în ${points[points.length - 1]?.[0].iso_period ?? ''}`}
      preserveAspectRatio="none"
    >
      {paths.map((path) => (
        <path
          key={path}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
      ))}
    </svg>
  )
}

export function IndicatorTile({ tile, siruta }: IndicatorTileProps) {
  const { i18n } = useLingui()
  const isRomanian = i18n.locale.toLowerCase().startsWith('ro')
  const datasetName =
    (isRomanian ? tile.datasetNameRo : tile.datasetNameEn) ||
    tile.datasetNameRo ||
    tile.datasetNameEn ||
    tile.datasetCode
  const statusLabel = getStatisticsStatusLabel(tile.valueStatus)
  const value = isBlockingValueStatus(tile.valueStatus)
    ? '—'
    : formatValue(tile.value, tile.unitSymbol)

  return (
    <article className="flex min-h-56 flex-col rounded-lg border border-border/70 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold leading-snug">{datasetName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{tile.datasetCode}</p>
        </div>
        <DataStatusBadge status={tile.dataStatus} />
      </div>

      {tile.tileState === 'available' ? (
        <>
          <div className="mt-5 text-3xl font-semibold tabular-nums">{value}</div>
          {statusLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <Trans>Status valoare</Trans>: {statusLabel}
            </p>
          ) : null}
          <div className="mt-4">
            <Sparkline points={tile.sparkline} />
          </div>
        </>
      ) : (
        <div className="mt-5 flex flex-1 flex-col justify-center text-sm text-muted-foreground">
          <AlertCircle className="mb-2 h-4 w-4" aria-hidden="true" />
          {tile.tileState === 'catalog-only' ? (
            <Trans>Setul există în catalog, dar observațiile nu sunt încă încărcate.</Trans>
          ) : (
            <Trans>Nu există observații pentru acest teritoriu în setul curent.</Trans>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <FreshnessBadge period={tile.latestPeriod} />
        <SourceProvenanceDrawer
          datasetCode={tile.datasetCode}
          datasetName={tile.datasetNameRo}
          periodicity={tile.periodicity}
          unitLabel={tile.unitNameRo ?? tile.unitSymbol}
          latestPeriod={tile.latestPeriod}
        />
        {tile.tileState === 'catalog-only' ? (
          <RequestDatasetAction
            datasetCode={tile.datasetCode}
            datasetName={tile.datasetNameRo}
            siruta={siruta}
          />
        ) : null}
      </div>
    </article>
  )
}
