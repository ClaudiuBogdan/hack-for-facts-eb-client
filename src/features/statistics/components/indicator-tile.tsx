import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowRight } from 'lucide-react'
import type {
  StatisticsIndicatorTile,
  StatisticsTileBenchmark,
} from '@/schemas/statistics'
import { activeNumberLocale } from '../lib/format'
import { DataStatusBadge } from './data-status-badge'
import { FreshnessBadge } from './freshness-badge'
import { RequestDatasetAction } from './request-dataset-action'
import { SourceProvenanceDrawer } from './source-provenance-drawer'

type IndicatorTileProps = {
  readonly tile: StatisticsIndicatorTile
  readonly siruta: string
  /** County + national reference values, when the headline data allows. */
  readonly benchmark?: StatisticsTileBenchmark
  readonly countyCode?: string | null
}

function formatValue(rawValue: string | null, unit: string | null): string {
  if (rawValue === null) return '—'
  const numeric = Number(rawValue.replace(',', '.'))
  if (!Number.isFinite(numeric)) return rawValue
  const formatted = new Intl.NumberFormat(activeNumberLocale(), {
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
  const min = Math.min(...numericPoints)
  const max = Math.max(...numericPoints)
  const firstPeriod = points[0]?.[0].iso_period ?? ''
  const lastPeriod = points[points.length - 1]?.[0].iso_period ?? ''
  const axisFormat = new Intl.NumberFormat(activeNumberLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  return (
    <div>
      <div className="flex items-stretch gap-1.5">
        <div
          className="flex w-10 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-muted-foreground"
          aria-hidden
        >
          <span>{axisFormat.format(max)}</span>
          <span>{axisFormat.format(min)}</span>
        </div>
        <svg
          className="h-10 w-full"
          viewBox="0 0 100 40"
          role="img"
          aria-label={t`Evoluție de la ${firstPeriod} până în ${lastPeriod}, între ${axisFormat.format(min)} și ${axisFormat.format(max)}`}
          preserveAspectRatio="none"
        >
          <title>{`${firstPeriod} – ${lastPeriod}`}</title>
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
      </div>
      <div
        className="ml-[2.875rem] flex justify-between text-[10px] tabular-nums text-muted-foreground"
        aria-hidden
      >
        <span>{firstPeriod}</span>
        <span>{lastPeriod}</span>
      </div>
    </div>
  )
}

function BenchmarkLine({
  benchmark,
}: {
  readonly benchmark: StatisticsTileBenchmark
}) {
  const parts: string[] = []
  if (benchmark.county?.value) {
    parts.push(
      `${t`Județ`}: ${formatValue(benchmark.county.value, benchmark.county.unitSymbol)} (${benchmark.county.period ?? ''})`,
    )
  }
  if (benchmark.national?.value) {
    parts.push(
      `${t`România`}: ${formatValue(benchmark.national.value, benchmark.national.unitSymbol)} (${benchmark.national.period ?? ''})`,
    )
  }
  if (parts.length === 0) return null
  return (
    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
      {parts.join(' · ')}
    </p>
  )
}

export function IndicatorTile({ tile, siruta, benchmark, countyCode }: IndicatorTileProps) {
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
          {benchmark ? <BenchmarkLine benchmark={benchmark} /> : null}
          <div className="mt-4">
            {tile.sparklineUnavailable ? (
              <p className="text-xs text-muted-foreground"><Trans>Graficul necesită o singură frecvență compatibilă. Inspectează seria din sursă.</Trans></p>
            ) : <Sparkline points={tile.sparkline} />}
          </div>
        </>
      ) : (
        <div className="mt-5 flex flex-1 flex-col justify-center text-sm text-muted-foreground">
          <AlertCircle className="mb-2 h-4 w-4" aria-hidden="true" />
          {tile.tileState === 'catalog-only' ? (
            <Trans>Setul există în catalog, dar observațiile nu sunt încă încărcate.</Trans>
          ) : tile.tileState === 'ambiguous' ? (
            <Trans>Mai multe serii INS corespund selecției. Alege o serie din sursă.</Trans>
          ) : tile.tileState === 'period-ambiguous' ? (
            <Trans>Mai multe frecvențe corespund acestei perioade. Inspectează observațiile din sursă.</Trans>
          ) : tile.tileState === 'unavailable' ? (
            <Trans>Perioada nu este inclusă în istoricul încărcat. Verifică seria completă.</Trans>
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
        {tile.tileState === 'ambiguous' || tile.tileState === 'period-ambiguous' || tile.tileState === 'unavailable' || tile.truncated || tile.sparklineUnavailable ? (
          <Link to="/statistici/seturi/$cod" params={{ cod: tile.datasetCode }}
            search={{ teritoriu: `siruta:${siruta}` }}
            className="text-xs font-medium text-primary underline underline-offset-2">
            <Trans>Inspectează seria din sursă</Trans>
          </Link>
        ) : null}
        {tile.tileState === 'catalog-only' ? (
          <RequestDatasetAction
            datasetCode={tile.datasetCode}
            datasetName={tile.datasetNameRo}
            siruta={siruta}
          />
        ) : null}
        {tile.tileState === 'available' ? (
          <Link
            to="/statistici/comparatii"
            search={{
              cod: tile.datasetCode,
              teritorii: [
                `siruta:${siruta}`,
                ...(countyCode ? [`cod:${countyCode}`] : []),
                'cod:RO',
              ] as [string, ...string[]],
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            <Trans>Compară</Trans>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  )
}
