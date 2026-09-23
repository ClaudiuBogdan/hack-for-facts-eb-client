import { useMemo } from 'react'
import { t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import type { StatisticsHubUnit } from '@/schemas/statistics'
import { comparisonSeriesColor, comparisonSeriesHex } from '../components/comparison-palette'
import { comparisonPlaceName } from '../lib/comparison-format'
import { MAX_COMPARISON_TERRITORIES } from '../lib/comparison-territories'
import {
  defaultComparisonView,
  defaultComparisonWindow,
  lineValues,
  resolveComparisonView,
  resolveComparisonWindow,
  type ComparisonView,
  type ComparisonWindow,
} from '../lib/comparison-view'
import type { ComparisonTerritoryToken } from '../lib/dataset-selection'
import { hubUnitOf } from '../lib/hub-format'
import type { NativeComparisonMatrix } from '../lib/native-comparison'
import { useComparisonTerritoryNames } from './use-comparisons'

/** A compared territory as the page names and colours it, in selection order. */
export interface ComparisonReadingTerritory extends ComparisonTerritoryToken {
  readonly name: string
  readonly kind: string
  /** The palette's CSS colour, for the page's own elements. */
  readonly color: string
  /** The same colour as hex, for the chart document the page hands off. */
  readonly hex: string
}

export interface ComparisonReading {
  readonly territories: readonly ComparisonReadingTerritory[]
  /** The period axis, oldest first. */
  readonly periods: readonly string[]
  /** Each territory's values along the axis; null for a row that is not a series. */
  readonly lines: ReadonlyMap<string, readonly (number | null)[] | null>
  /** The compared territories' lines only, for the window's default and the shared decimals. */
  readonly seriesLines: readonly (readonly (number | null)[])[]
  readonly range: ComparisonWindow | null
  readonly unit: StatisticsHubUnit
  readonly unitLabel: string | null
  readonly view: ComparisonView
  readonly mixedLevels: boolean
  readonly windowFrom: string | null
  readonly windowTo: string | null
  /** An end the URL names that the axis cannot use: said, not silently swapped. */
  readonly unusedPeriods: readonly string[]
}

/**
 * The reading the page makes of one comparison: who is compared (named,
 * kinded, coloured), the numbers along the period axis, the window on it,
 * the unit and the view. Every value here is a projection of the matrix
 * and the URL; nothing is read.
 */
export function useComparisonReading(params: {
  readonly tokens: readonly ComparisonTerritoryToken[]
  readonly matrix: NativeComparisonMatrix | null
  readonly requestedWindow: { readonly from: string | undefined; readonly to: string | undefined }
  readonly requestedView: unknown
}): ComparisonReading {
  const { tokens, matrix, requestedWindow, requestedView } = params
  const resolvedNames = useComparisonTerritoryNames(tokens, matrix)

  const territories = useMemo(() => {
    const nameByCode = new Map((matrix?.rows ?? []).map((row) => [row.code, row.name] as const))
    return tokens.slice(0, MAX_COMPARISON_TERRITORIES).map((entry, index): ComparisonReadingTerritory => {
      const raw = nameByCode.get(entry.code) ?? resolvedNames.get(entry.code) ?? entry.code
      const place =
        entry.level === 'NATIONAL'
          ? { name: t`România`, kind: t`țară` }
          : entry.level === 'NUTS3'
            ? { name: countyNameRo(entry.code) ?? comparisonPlaceName(raw).name, kind: t`județ` }
            : (({ name, kind }) => ({ name, kind: kind ?? t`localitate` }))(comparisonPlaceName(raw))
      return { ...entry, ...place, color: comparisonSeriesColor(index), hex: comparisonSeriesHex(index) }
    })
  }, [matrix, tokens, resolvedNames])

  const periods = useMemo(() => matrix?.periods.map((period) => period.isoPeriod) ?? [], [matrix])
  const lines = useMemo(
    () =>
      new Map(
        (matrix?.rows ?? []).map((row) => [row.code, row.availability === 'SERIES' ? lineValues(row.cells, periods) : null] as const),
      ),
    [matrix, periods],
  )
  // The compared territories' lines only: while a removal loads, the reading
  // on screen still holds the removed one.
  const seriesLines = useMemo(
    () =>
      territories.flatMap((territory) => {
        const values = lines.get(territory.code)
        return values ? [values] : []
      }),
    [territories, lines],
  )
  const range = useMemo(
    () => resolveComparisonWindow(periods, { from: requestedWindow.from, to: requestedWindow.to }, defaultComparisonWindow(seriesLines)),
    [periods, requestedWindow.from, requestedWindow.to, seriesLines],
  )
  const unitRow = matrix?.observations.find((row) => row.unit.code === matrix.sharedSelection.unitate)?.unit
  const unit = hubUnitOf({ unitSymbol: unitRow?.symbol ?? null, unitCode: unitRow?.code ?? null, unitNameRo: unitRow?.name_ro ?? null })
  const unitLabel = unitRow ? (unitRow.name_ro ?? unitRow.symbol ?? null) : null
  const comparedLevels = territories.filter((territory) => lines.get(territory.code)).map((territory) => territory.level)
  const view = resolveComparisonView(requestedView, defaultComparisonView(comparedLevels, unit))
  const windowFrom = range ? (periods[range.from] ?? null) : null
  const windowTo = range ? (periods[range.to] ?? null) : null
  const unusedPeriods = [requestedWindow.from, requestedWindow.to].filter(
    (period): period is string => period !== undefined && period !== windowFrom && period !== windowTo,
  )

  return {
    territories,
    periods,
    lines,
    seriesLines,
    range,
    unit,
    unitLabel,
    view,
    mixedLevels: new Set(comparedLevels).size > 1,
    windowFrom,
    windowTo,
    unusedPeriods,
  }
}
