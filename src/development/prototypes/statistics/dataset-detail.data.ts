import { useMemo } from 'react'
import type { InsDatasetDetails, InsObservation } from '@/schemas/ins'
import type { StatisticsRelatedDataset } from '@/schemas/statistics'
import {
  filterExactCell,
  NATIONAL_ENTITY,
  observedYearSpan,
} from '@/features/statistics/lib/dataset-selection'
import { chooseRepresentativeCell } from '@/features/statistics/lib/representative-series'
import {
  useDatasetSeries,
  useDatasetTier0,
} from '@/features/statistics/hooks/use-dataset-detail'
import { hubUnitWord } from '@/features/statistics/lib/hub-format'
import { periodSortKey } from '@/features/statistics/lib/period'
import { tileUnit } from '@/features/statistics/lib/territory-groups'
import {
  buildTimeSeries,
  toChartValue,
  type TimeSeries,
} from '@/features/statistics/lib/time-series'

/**
 * The model every dataset-detail variant renders.
 *
 * Prototypes may not use the route, so this calls the feature's real hooks
 * with a fixed scope — the national series, no pins — and derives the summary
 * facts the variants argue about. That keeps the comparison honest: what is
 * being judged is the layout, not four different sets of made-up numbers.
 */

/** One end of the series, or one of its extremes. */
export type SeriesPoint = {
  readonly value: number
  readonly raw: string
  readonly period: string
}

export type SeriesStats = {
  readonly count: number
  readonly first: SeriesPoint | null
  readonly latest: SeriesPoint | null
  readonly previous: SeriesPoint | null
  readonly peak: SeriesPoint | null
  readonly trough: SeriesPoint | null
  readonly mean: number | null
  /** Percent change against the period before the latest one. */
  readonly changeVsPrevious: number | null
  /** Percent change across the whole observed span. */
  readonly changeVsFirst: number | null
  /** True when the latest value is the lowest the series has ever carried. */
  readonly latestIsTrough: boolean
  readonly latestIsPeak: boolean
}

export type DatasetPrototypeModel = {
  readonly code: string
  readonly dataset: InsDatasetDetails | null
  readonly rows: readonly InsObservation[]
  readonly span: { readonly from: number; readonly to: number } | null
  readonly chart: TimeSeries | null
  /** INS's own unit name, verbatim — the axis caption and the table use it. */
  readonly unitLabel: string | null
  /**
   * The unit as a Romanian WORD, for prose and for the figure beside the hero.
   * Empty for „Numar": „10 numar" is not a sentence, and the production hero
   * has always dropped it — `hubUnitWord` is where that rule lives.
   */
  readonly unitWord: string
  readonly stats: SeriesStats
  /**
   * What the shown series ACTUALLY covers, read off its own rows.
   *
   * Every variant printed a literal „TOTAL" for the classification axis. On a
   * matrix with no Total member — ADM101A's „Municipii" — that is a false
   * statement about the data on screen, which is the one thing a provenance
   * line may never be (DESIGN.md §Data Trust).
   */
  readonly scope: {
    readonly territory: string | null
    readonly members: readonly {
      readonly typeCode: string
      readonly typeName: string
      readonly valueName: string
    }[]
  }
  readonly totalCount: number
  readonly related: readonly StatisticsRelatedDataset[]
  readonly relatedTotalCount: number | null
  readonly sourceDescriptor: unknown
  readonly isLoading: boolean
  readonly isError: boolean
}

const EMPTY_STATS: SeriesStats = {
  count: 0,
  first: null,
  latest: null,
  previous: null,
  peak: null,
  trough: null,
  mean: null,
  changeVsPrevious: null,
  changeVsFirst: null,
  latestIsTrough: false,
  latestIsPeak: false,
}

/**
 * One point, parsed EXACTLY as the chart parses it.
 *
 * `toChartValue` is the chart's own reader, and reusing it is the whole point:
 * `Number.parseFloat('0oops')` is `0`, so a summary built on `parseFloat` would
 * report a latest of 0 and a new minimum for a row the figure below it draws as
 * a gap. The summary and the figure must never disagree about what a value is.
 */
function toPoint(row: InsObservation): SeriesPoint | null {
  const raw = row.value
  if (raw === null) return null
  const value = toChartValue(raw)
  if (value === null) return null
  return { value, raw, period: row.time_period.iso_period }
}

/**
 * Percent change, or null when the base cannot carry one.
 *
 * The result is checked for finiteness, not just the inputs: `-1e308 → 1e308`
 * is a perfectly ordinary +200%, but computing it overflows to `Infinity`, and
 * „+∞%" is a worse answer than no answer.
 */
function percentChange(from: number, to: number): number | null {
  if (from === 0) return null
  const change = ((to - from) / Math.abs(from)) * 100
  return Number.isFinite(change) ? change : null
}

export function summarize(rows: readonly InsObservation[]): SeriesStats {
  const points = rows
    .map(toPoint)
    .filter((point): point is SeriesPoint => point !== null)
  // `count` is USABLE observations, never the row count: a series of four
  // unreadable rows reported „4 observații" and dropped to „1" the moment one
  // of them became readable.
  if (points.length === 0) return EMPTY_STATS

  let peak = points[0]!
  let trough = points[0]!
  let sum = 0
  for (const point of points) {
    if (point.value > peak.value) peak = point
    if (point.value < trough.value) trough = point
    sum += point.value
  }

  const latest = points[points.length - 1]!
  const previous = points.length > 1 ? points[points.length - 2]! : null
  const first = points[0]!

  return {
    count: points.length,
    first,
    latest,
    previous,
    peak,
    trough,
    // A sum can overflow where every term was finite; an „∞" mean is not a fact.
    mean: Number.isFinite(sum) ? sum / points.length : null,
    changeVsPrevious: previous
      ? percentChange(previous.value, latest.value)
      : null,
    changeVsFirst:
      points.length > 1 ? percentChange(first.value, latest.value) : null,
    latestIsTrough: latest.value === trough.value && points.length > 1,
    latestIsPeak: latest.value === peak.value && points.length > 1,
  }
}

/** The national series of one INS matrix, plus its summary facts. */
export function useDatasetPrototypeModel(code: string): DatasetPrototypeModel {
  const normalized = code.trim().toUpperCase()

  const tier0Query = useDatasetTier0({
    code: normalized,
    entity: NATIONAL_ENTITY,
    entityKey: 'prototype-national',
  })
  const dataset = tier0Query.data?.dataset ?? null

  /**
   * The context code is IN the cache key, not just in the request.
   *
   * There is no route loader here, so the first render has no dataset and the
   * series would go out with `contextCode: null` — which skips the related
   * probe. The metadata arriving a moment later changed neither the key nor
   * `enabled`, so the empty related list stayed fresh for the full 24-hour
   * stale time. Keying on it makes the second read a different query.
   */
  const contextCode = dataset?.context_code ?? null
  const seriesQuery = useDatasetSeries({
    code: normalized,
    scopeKey: `prototype-national|${contextCode ?? ''}`,
    filter: { territoryLevels: ['NATIONAL'] },
    contextCode,
    enabled: normalized.length > 0,
  })

  /**
   * One cell, not the whole national slab.
   *
   * A matrix with classification axes answers a bare national read with every
   * combination at once — several values per year, which is not a series and
   * cannot be charted. The page solves this by picking a representative cell;
   * the prototypes reuse THAT function rather than inventing a second rule, so
   * a variant opened with `?cod=POP107D` shows the series the real page shows.
   */
  const rows = useMemo(() => {
    const observations = seriesQuery.data?.observations ?? []
    const descriptor = seriesQuery.data?.sourceDescriptor
    const cell = descriptor
      ? chooseRepresentativeCell({ descriptor, observations })
      : null

    const cellRows = cell
      ? filterExactCell(observations, cell.classifications).filter(
          (row) =>
            (cell.unitCode === null || row.unit?.code === cell.unitCode) &&
            (cell.periodicity === null ||
              row.time_period.periodicity === cell.periodicity),
        )
      : observations

    return [...cellRows].sort(
      (left, right) =>
        periodSortKey(left.time_period) - periodSortKey(right.time_period),
    )
  }, [seriesQuery.data])

  const span = useMemo(() => observedYearSpan(rows), [rows])
  const stats = useMemo(() => summarize(rows), [rows])

  const chart = useMemo(() => {
    if (!span || rows.length === 0) return null
    const periodicity = rows[rows.length - 1]!.time_period.periodicity
    if (periodicity !== 'ANNUAL' && periodicity !== 'QUARTERLY' && periodicity !== 'MONTHLY')
      return null
    return buildTimeSeries({
      observations: rows,
      periodicity,
      from: span.from,
      to: span.to,
    })
  }, [rows, span])

  const sample = rows[rows.length - 1] ?? null

  const scope = useMemo(
    () => ({
      // INS names its national row „TOTAL". Printing that under the heading
      // „Teritoriu" says nothing; the production page has always rendered the
      // unpinned national case as „România" and shown the row's own name only
      // for a real sub-national territory.
      territory:
        sample?.territory?.level === 'NATIONAL'
          ? 'România'
          : (sample?.territory?.name_ro ?? null),
      members: (sample?.classifications ?? []).flatMap((classification) => {
        const typeCode = classification.type_code?.trim()
        if (!typeCode) return []
        return [
          {
            typeCode,
            typeName: classification.type_name_ro?.trim() || typeCode,
            valueName:
              classification.name_ro?.trim() ||
              classification.code?.trim() ||
              typeCode,
          },
        ]
      }),
    }),
    [sample],
  )

  const unitLabel = sample?.unit?.name_ro ?? sample?.unit?.symbol ?? null
  const unitWord = hubUnitWord(
    tileUnit({
      unitSymbol: sample?.unit?.symbol ?? null,
      unitNameRo: sample?.unit?.name_ro ?? null,
    }),
    unitLabel,
  )

  return {
    code: normalized,
    dataset,
    rows,
    span,
    chart,
    unitLabel,
    unitWord,
    stats,
    scope,
    totalCount: seriesQuery.data?.totalCount ?? rows.length,
    related: seriesQuery.data?.related ?? [],
    relatedTotalCount: seriesQuery.data?.relatedTotalCount ?? null,
    sourceDescriptor: seriesQuery.data?.sourceDescriptor,
    isLoading: tier0Query.isLoading || seriesQuery.isLoading,
    isError: tier0Query.isError || seriesQuery.isError,
  }
}
