import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { buildInsComparisonChartLink } from '@/lib/chart-links'
import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { cn } from '@/lib/utils'
import type { InsDatasetDetails, InsPeriodicity } from '@/schemas/ins'
import type { ComparisonReading } from '../hooks/use-comparison-reading'
import { changeLine, chartableRun, rankStandings, type ComparisonView, type ComparisonWindow } from '../lib/comparison-view'
import { formatHubChange, formatHubPeriod, formatHubValue, hubChange, hubUnitWord, isAdditiveUnit, sharedDecimals } from '../lib/hub-format'
import type { NativeComparisonMatrix } from '../lib/native-comparison'
import { periodicityLabel } from '../lib/periodicity-labels'
import { statisticsTheme } from '../lib/statistics-theme'
import { ComparisonLinesChart } from './comparison-lines-chart'
import { ComparisonStandings, type ComparisonStandingRow } from './comparison-standings'
import { ComparisonTable } from './comparison-table'
import { DetailSourceLine } from './detail-source-line'
import { HubIndicatorToggle } from './hub/hub-county-rank'

type Props = {
  readonly reading: ComparisonReading
  /** The reading's window, resolved: the band draws only with one. */
  readonly range: ComparisonWindow
  readonly matrix: NativeComparisonMatrix
  readonly meta: InsDatasetDetails
  readonly cadence: InsPeriodicity | null
  readonly unitCode: string | null
  /** The indicator as the rail names it; the code stands in while the name loads. */
  readonly indicatorName: string | null
  /** True while the previous reading stands in for a selection still loading. */
  readonly refreshing: boolean
  readonly onWindowChange: (window: ComparisonWindow) => void
  readonly onViewChange: (view: ComparisonView) => void
}

/**
 * The answer: each place at the window's two ends with the change between
 * them, the history as lines, every value as a table, and the hand-off to
 * the chart page. Which row is under the pointer is this band's own state —
 * the chart brings that line forward, and nothing outside the band (the
 * rail, the county map) needs to re-render for it.
 */
export function ComparisonResultBand({
  reading,
  range,
  matrix,
  meta,
  cadence,
  unitCode,
  indicatorName,
  refreshing,
  onWindowChange,
  onViewChange,
}: Props) {
  const [activeCode, setActiveCode] = useState<string>()
  const { territories, periods, lines, seriesLines, unit, unitLabel, view, mixedLevels, unusedPeriods } = reading
  const from = reading.windowFrom ?? ''
  const to = reading.windowTo ?? ''
  const windowPeriods = periods.slice(range.from, range.to + 1)
  const dataset = meta.code
  const unitWord = hubUnitWord(unit, unitLabel)
  const chartUnit = unitWord || (unit === 'count' ? t`număr` : (unitLabel ?? ''))

  const rows: ComparisonStandingRow[] = territories.map((territory) => {
    const row = matrix.rows.find((entry) => entry.code === territory.code)
    const values = lines.get(territory.code) ?? null
    const start = values?.[range.from] ?? null
    const end = values?.[range.to] ?? null
    return {
      code: territory.code,
      token: territory.token,
      level: territory.level,
      name: territory.name,
      kind: territory.kind,
      color: territory.color,
      // A territory just added has no row until its read lands.
      availability: row?.availability ?? (refreshing ? 'PENDING' : 'EMPTY'),
      from: start,
      to: end,
      change: start !== null && end !== null ? hubChange(start, end, unit) : null,
      detailSearch: {
        teritoriu: territory.level === 'LAU' ? `siruta:${territory.code}` : `cod:${territory.code}`,
        ...(row?.sourceSelection ?? matrix.sharedSelection),
        ...(cadence ? { frecventa: cadence } : {}),
        din: Number(from.slice(0, 4)),
        pana: Number(to.slice(0, 4)),
      },
    }
  })

  const chartLines = territories.flatMap((territory) => {
    const values = lines.get(territory.code)
    if (!values) return []
    const shown = view === 'schimbare' ? changeLine(values, values[range.from] ?? null, unit) : values
    return [{ code: territory.code, label: territory.name, color: territory.color, values: shown.slice(range.from, range.to + 1) }]
  })
  const digits = sharedDecimals(seriesLines.flatMap((values) => values.filter((value): value is number => value !== null)))
  const withoutBase = view === 'schimbare' ? rows.filter((row) => row.availability === 'SERIES' && row.from === null) : []

  // Built once per selection: the chart document carries timestamps, and a
  // fresh one on every render would give the link a new address each time.
  const chart = useMemo(() => {
    if (!cadence || !isInsChartPeriodicity(cadence) || !unitCode) return null
    const series = territories.flatMap((territory) => {
      const values = lines.get(territory.code)
      const run = values ? chartableRun(values, range) : null
      const runFrom = run ? periods[run.from] : undefined
      const runTo = run ? periods[run.to] : undefined
      return runFrom && runTo
        ? [{ code: territory.code, level: territory.level, label: territory.name, color: territory.hex, from: runFrom, to: runTo }]
        : []
    })
    if (series.length === 0) return null
    return buildInsComparisonChartLink({
      datasetCode: matrix.descriptor.code,
      title: indicatorName ?? matrix.descriptor.code,
      cadence,
      unitCode,
      // The unit as the page prints it, so the chart's axis says „persoane",
      // never the API's placeholder („count", „other"). A count prints no word
      // beside its figures; the axis still needs one.
      unit: chartUnit,
      classificationPins: matrix.sharedSelection.clasificari,
      series,
    })
  }, [matrix, range, cadence, unitCode, territories, lines, periods, indicatorName, chartUnit])

  return (
    <section aria-labelledby="comparison-result-title" aria-busy={refreshing} className={statisticsTheme.band}>
      <div className={statisticsTheme.bandHeader}>
        <h2 id="comparison-result-title" className={statisticsTheme.sectionLabel}>
          <Trans>Rezultat</Trans>
        </h2>
        <MonoLabel className="text-muted-foreground">
          {[unitWord === '%' ? t`procente` : unitWord, cadence ? periodicityLabel(cadence) : null].filter(Boolean).join(' · ')}
        </MonoLabel>
      </div>

      <div className={cn(statisticsTheme.bandBody, 'transition-opacity', refreshing && 'opacity-60')}>
        {unusedPeriods.length > 0 ? (
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            <Trans>
              Adresa cere {unusedPeriods.map(formatHubPeriod).join(', ')}, fără loc în seria aceasta; comparația arată{' '}
              {formatHubPeriod(from)}–{formatHubPeriod(to)}.
            </Trans>
          </p>
        ) : null}
        <ComparisonStandings
          datasetCode={dataset}
          rows={rankStandings(rows, view)}
          periods={periods}
          window={range}
          unit={unit}
          unitLabel={unitLabel}
          onWindowChange={onWindowChange}
          onActiveChange={setActiveCode}
        />
      </div>

      {chartLines.length > 0 ? (
        <div className={cn('border-t border-border/70 px-4 pb-5 pt-4 transition-opacity md:px-5', refreshing && 'opacity-60')}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              {view === 'schimbare' ? (
                <Trans>Cât a crescut sau a scăzut fiecare loc față de {formatHubPeriod(from)}.</Trans>
              ) : mixedLevels && isAdditiveUnit(unit) ? (
                <Trans>Locurile au mărimi diferite: schimbarea le compară mai bine decât valorile.</Trans>
              ) : (
                <Trans>Valorile publicate, perioadă cu perioadă.</Trans>
              )}
            </p>
            <HubIndicatorToggle
              label={t`Ce arată graficul`}
              value={view}
              onChange={onViewChange}
              options={[
                { key: 'valori', label: t`Valori` },
                { key: 'schimbare', label: t`Schimbare` },
              ]}
            />
          </div>
          <ComparisonLinesChart
            label={
              view === 'schimbare'
                ? t`${indicatorName ?? dataset}, schimbarea față de ${formatHubPeriod(from)}`
                : t`${indicatorName ?? dataset}, ${formatHubPeriod(from)}–${formatHubPeriod(to)}`
            }
            periods={windowPeriods}
            lines={chartLines}
            zero={view === 'schimbare'}
            // Only a territory with a line to bring forward; a row without one would fade them all.
            highlight={chartLines.some((line) => line.code === activeCode) ? activeCode : undefined}
            format={(value) =>
              view === 'schimbare'
                ? formatHubChange(value, unit)
                : (({ value: figure, unit: word }) => (word && word !== '%' ? `${figure} ${word}` : figure))(
                    formatHubValue(value, unit, unitLabel, { digits }),
                  )
            }
            formatTick={(tick) =>
              view === 'schimbare'
                ? formatHubChange(tick, unit, sharedDecimals([tick]))
                : formatHubValue(tick, unit, unitLabel, { compact: true, digits: sharedDecimals([tick]) }).value
            }
          />
          {withoutBase.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans>
                Fără valoare în {formatHubPeriod(from)}, deci fără schimbare: {withoutBase.map((row) => row.name).join(', ')}.
              </Trans>
            </p>
          ) : null}
        </div>
      ) : null}

      <Collapsible className="border-t border-border/70">
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-5">
          <Trans>Toate valorile, perioadă cu perioadă</Trans>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ComparisonTable
            matrix={matrix}
            series={territories.map((territory) => ({ code: territory.code, label: territory.name, color: territory.color, level: territory.level }))}
            selectedPeriod={to}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-5">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={statisticsTheme.provenanceChip}>{dataset}</span>
          <DetailSourceLine datasetCode={dataset} sourceLastUpdate={meta.source_last_update ?? null} />
        </span>
        {chart ? (
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5 self-start sm:self-auto">
            <Link {...chart}>
              <Trans>Deschide în Grafice</Trans>
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}
