import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import {
  inspectSourceSeries,
  type InsSourceSeriesResult,
} from '@/lib/ins/source-series'
import type { InsObservation, InsPeriodicity } from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsDatasetSeries,
} from '@/schemas/statistics'
import {
  filterExactCell,
  observedYearSpan,
  type EffectiveScope,
  type YearSpan,
} from './dataset-selection'
import { periodSortKey } from './period'
import { summarizeSeries, type SeriesStats } from './series-stats'
import { buildTimeSeries, type TimeSeries } from './time-series'

/**
 * Why the band shows no figure although the read answered.
 *
 * - `window`: rows exist at this cadence, and the years pinned in the
 *   address leave none of them on screen.
 * - `cadence`: rows exist, none at the cadence chosen.
 * - `territory`: no rows, and a territory from the address narrowed the read.
 * - `selection`: no rows, and the address pins members or a unit.
 * - `none`: no rows, nothing pinned.
 */
export type DetailEmptyReason =
  | 'window'
  | 'cadence'
  | 'territory'
  | 'selection'
  | 'none'

export interface DetailSeriesView {
  /** The rows of the exact cell, oldest first. */
  readonly exactRows: readonly InsObservation[]
  readonly source: InsSourceSeriesResult | null
  /** The rows cannot be drawn as one series: unresolved, ambiguous, qualified, or invalid. */
  readonly sourceUnavailable: boolean
  readonly periodicity: InsPeriodicity
  readonly periodicityRows: readonly InsObservation[]
  /** The years the rows cover at this cadence. Null before any row. */
  readonly observedSpan: YearSpan | null
  /** The years on screen, always inside the observed span. Null before any row. */
  readonly yearWindow: YearSpan | null
  /** The window the address asked for when it lies wholly outside the span; the span is shown instead. */
  readonly yearWindowOutside: YearSpan | null
  readonly windowedRows: readonly InsObservation[]
  readonly chartSeries: TimeSeries | null
  /** The latest published cell in the window, readable or not. */
  readonly latestSourceRow: InsObservation | null
  /** The facts beside the figure, over the rows the chart draws. */
  readonly windowStats: SeriesStats
  /** The rows can be archived: a complete cell, or an inspection page that ended. */
  readonly completeSourceSelection: boolean
  readonly sampleRow: InsObservation | null
  /** Set only when the read answered and the band has no figure to show. */
  readonly emptyReason: DetailEmptyReason | null
}

/**
 * Everything the series band shows, derived from the rows and the address.
 *
 * A pure function of its inputs, so every edge — a window past the series,
 * a cadence the rows do not carry, a cell with no rows — is a table test
 * rather than a page render.
 *
 * The window is the address's `din`/`pana` cut to the observed span: a year
 * past the series does not empty the chart, it stops at the series' own
 * edge. A window that lies wholly outside the span shows the whole span
 * instead and says so (`yearWindowOutside`), because a link that asks for
 * 2030–2035 of a series that ends in 2026 wants the series, not a blank.
 */
export function deriveDetailSeriesView(params: {
  readonly series: StatisticsDatasetSeries | undefined
  readonly scope: EffectiveScope
  readonly canDerive: boolean
  readonly search: StatisticsDatasetDetailSearch
  /** The read succeeded; only then is an empty band a fact rather than a wait. */
  readonly answered: boolean
}): DetailSeriesView {
  const { series, scope, canDerive, search, answered } = params

  const exactRows = series
    ? [...filterExactCell(series.observations, scope.classifications)].sort(
        (left, right) => periodSortKey(left.time_period) - periodSortKey(right.time_period),
      )
    : []
  const source = series?.sourceDescriptor
    ? inspectSourceSeries({ descriptor: series.sourceDescriptor, observations: exactRows })
    : null
  const sourceUnavailable =
    !canDerive ||
    scope.periodicity === null ||
    source === null ||
    source.status === 'INVALID' ||
    source.status === 'AMBIGUOUS' ||
    (source.status === 'SERIES' && source.anyQualified)

  // The fallback reads the observation's own cadence FIELD, never grammar.
  const periodicity: InsPeriodicity =
    scope.periodicity ?? exactRows[exactRows.length - 1]?.time_period.periodicity ?? 'ANNUAL'
  const periodicityRows =
    scope.periodicity === null
      ? exactRows
      : exactRows.filter((row) => row.time_period.periodicity === scope.periodicity)

  const observedSpan = observedYearSpan(periodicityRows)
  const window = resolveYearWindow(observedSpan, search)
  const windowedRows = window.yearWindow
    ? periodicityRows.filter(
        (row) => row.time_period.year >= window.yearWindow!.from && row.time_period.year <= window.yearWindow!.to,
      )
    : periodicityRows

  const chartSeries =
    sourceUnavailable || !isInsChartPeriodicity(periodicity) || !window.yearWindow || windowedRows.length === 0
      ? null
      : buildTimeSeries({
          observations: windowedRows,
          periodicity,
          from: window.yearWindow.from,
          to: window.yearWindow.to,
        })

  // The latest published cell remains latest even when its value is unavailable.
  const latestSourceRow = sourceUnavailable ? null : (windowedRows[windowedRows.length - 1] ?? null)

  // A terminal inspection page may contain several complete source identities.
  // Such rows can be archived faithfully even though they cannot form one chart.
  const completeSourceSelection =
    series?.readMode === 'complete' ||
    (series?.readMode === 'inspection' && series.inspectionTruncated === false)

  return {
    exactRows,
    source,
    sourceUnavailable,
    periodicity,
    periodicityRows,
    observedSpan,
    ...window,
    windowedRows,
    chartSeries,
    latestSourceRow,
    windowStats: summarizeSeries(windowedRows),
    completeSourceSelection,
    sampleRow: exactRows[0] ?? null,
    emptyReason:
      !answered || !series || windowedRows.length > 0
        ? null
        : periodicityRows.length > 0
          ? 'window'
          : exactRows.length > 0
            ? 'cadence'
            : scope.territory !== null
              ? 'territory'
              : search.clasificari !== undefined || search.unitate !== undefined
                ? 'selection'
                : 'none',
  }
}

function resolveYearWindow(
  span: YearSpan | null,
  search: StatisticsDatasetDetailSearch,
): Pick<DetailSeriesView, 'yearWindow' | 'yearWindowOutside'> {
  if (!span) return { yearWindow: null, yearWindowOutside: null }
  // Two reversed bounds swap rather than producing an empty window; a single
  // bound is what the address said, so a start past the series is not read
  // as an end before it.
  const requested =
    search.din !== undefined && search.pana !== undefined
      ? search.din <= search.pana
        ? { from: search.din, to: search.pana }
        : { from: search.pana, to: search.din }
      : { from: search.din ?? span.from, to: search.pana ?? span.to }
  const from = Math.max(requested.from, span.from)
  const to = Math.min(requested.to, span.to)
  if (from > to)
    return {
      yearWindow: span,
      // The years as the address gave them: a lone bound names one year.
      yearWindowOutside: {
        from: search.din ?? requested.to,
        to: search.pana ?? requested.from,
      },
    }
  return {
    yearWindow: { from, to },
    yearWindowOutside: null,
  }
}
