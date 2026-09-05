import { t } from '@lingui/core/macro'
import { fetchInsSourceVector } from '@/features/statistics/api/graphql/ins-source-fetcher'
import type { DataValidationError } from '@/lib/chart-data-validation'
import { createLogger } from '@/lib/logger'
import { getUserLocale } from '@/lib/utils'
import {
  insSourceDimensionCodeSchema,
  insSourceMemberCodeSchema,
  isInsChartPeriodicity,
} from '@/lib/ins/source-contract'
import { inspectSourceSeries } from '@/lib/ins/source-series'
import type { AnalyticsSeries, InsSeriesConfiguration } from '@/schemas/charts'
import type {
  InsObservationFilterInput,
  NativeInsObservation,
} from '@/schemas/ins'
import type { ReportPeriodInput, ReportPeriodType } from '@/schemas/reporting'

export interface InsSeriesMapperInput {
  series: InsSeriesConfiguration
  signal?: AbortSignal
}
export interface InsSeriesMappingResult {
  series: AnalyticsSeries | null
  warnings: DataValidationError[]
  retryable?: boolean
}
export interface InsSeriesRuntimeMapper {
  mapSeries(input: InsSeriesMapperInput): Promise<InsSeriesMappingResult>
}

const logger = createLogger('ins-chart-series')

function unavailable(
  series: InsSeriesConfiguration,
  message: string,
): InsSeriesMappingResult {
  return {
    series: null,
    warnings: [{ type: 'missing_data', seriesId: series.id, message }],
  }
}

function validPeriodDate(date: string, type: ReportPeriodType): boolean {
  if (type === 'YEAR') return /^\d{4}$/.test(date)
  if (type === 'QUARTER') return /^\d{4}-Q[1-4]$/.test(date)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(date)
}

/** Invalid saved selections stay visible; never drop dates to broaden the request. */
function validPeriod(
  period: InsSeriesConfiguration['period'],
): period is ReportPeriodInput | undefined {
  if (!period) return true
  if (period.selection.interval) {
    const { start, end } = period.selection.interval
    return (
      validPeriodDate(start, period.type) &&
      validPeriodDate(end, period.type) &&
      start <= end
    )
  }
  const dates = period.selection.dates
  return (
    dates !== undefined &&
    dates.length > 0 &&
    dates.every((date) => validPeriodDate(date, period.type))
  )
}

function validSourceSelection(series: InsSeriesConfiguration): boolean {
  return (
    (series.unitCodes ?? []).every(
      (code) => insSourceMemberCodeSchema.safeParse(code).success,
    ) &&
    Object.entries(series.classificationSelections ?? {}).every(
      ([dimension, codes]) =>
        insSourceDimensionCodeSchema.safeParse(dimension).success &&
        codes.length > 0 &&
        codes.every(
          (code) => insSourceMemberCodeSchema.safeParse(code).success,
        ),
    )
  )
}

function observationFilter(
  series: InsSeriesConfiguration,
): InsObservationFilterInput {
  // Omit hasValue: native false means null-only. Identity must include missing cells.
  const filter: InsObservationFilterInput = {}
  if (series.territoryCodes?.length)
    filter.territoryCodes = series.territoryCodes
  if (series.sirutaCodes?.length) filter.sirutaCodes = series.sirutaCodes
  if (series.unitCodes?.length) filter.unitCodes = series.unitCodes
  if (series.period && validPeriod(series.period)) filter.period = series.period
  const selections = Object.entries(series.classificationSelections ?? {})
  if (selections.length > 0) {
    filter.classificationTypeCodes = selections.map(([dimension]) => dimension)
    filter.classificationValueCodes = [
      ...new Set(selections.flatMap(([, codes]) => codes)),
    ]
  }
  return filter
}

/** The wire filter is a union of members; preserve the saved per-dimension AND locally. */
function matchesSelection(
  row: NativeInsObservation,
  selections: Record<string, string[]>,
): boolean {
  return Object.entries(selections).every(([dimension, codes]) =>
    row.classifications.some(
      (item) => item.type_code === dimension && codes.includes(item.code),
    ),
  )
}

function unitLabel(row: NativeInsObservation): string {
  const unit = row.unit
  const name =
    getUserLocale() === 'en'
      ? unit.name_en || unit.name_ro
      : unit.name_ro || unit.name_en
  return unit.symbol || name || unit.code
}

function periodOrdinal(label: string, type: ReportPeriodType): number {
  const year = Number(label.slice(0, 4))
  if (type === 'YEAR') return year
  if (type === 'QUARTER') return year * 4 + Number(label.slice(6)) - 1
  return year * 12 + Number(label.slice(5)) - 1
}

function completePeriods(
  labels: string[],
  type: ReportPeriodType,
  period: InsSeriesConfiguration['period'],
): boolean {
  if (period && period.type !== type) return false
  if (period?.selection.dates) {
    const expected = new Set(period.selection.dates)
    return (
      labels.length === expected.size &&
      labels.every((label) => expected.has(label))
    )
  }
  const first = labels[0]
  const last = labels[labels.length - 1]
  if (!first || !last) return false
  const start = period?.selection.interval?.start ?? first
  const end = period?.selection.interval?.end ?? last
  return (
    first === start &&
    last === end &&
    labels.length === periodOrdinal(end, type) - periodOrdinal(start, type) + 1
  )
}

export async function mapInsSeriesToAnalyticsSeries(
  series: InsSeriesConfiguration,
  signal?: AbortSignal,
): Promise<InsSeriesMappingResult> {
  if (!series.datasetCode)
    return unavailable(series, t`Select an INS dataset to display this series.`)
  if (!validPeriod(series.period) || !validSourceSelection(series)) {
    return unavailable(
      series,
      t`The saved INS selection is invalid. Edit its period, source coordinates or unit.`,
    )
  }

  let vector
  try {
    vector = await fetchInsSourceVector({
      datasetCode: series.datasetCode,
      filter: observationFilter(series),
      pageSize: 1000,
      maxPages: 30,
      signal,
    })
  } catch {
    signal?.throwIfAborted()
    logger.warn('INS chart complete-vector request failed', {
      seriesId: series.id,
      datasetCode: series.datasetCode,
    })
    return {
      ...unavailable(
        series,
        t`The complete INS series could not be loaded. Retry before using its values.`,
      ),
      retryable: true,
    }
  }
  // Validate every fetched cell before filtering, so malformed coordinates cannot disappear.
  if (inspectSourceSeries(vector).status === 'INVALID') {
    return unavailable(
      series,
      t`The INS response has incomplete or conflicting source coordinates.`,
    )
  }
  const observations = vector.observations.filter((row) =>
    matchesSelection(row, series.classificationSelections ?? {}),
  )
  const inspected = inspectSourceSeries({
    descriptor: vector.descriptor,
    observations,
  })
  if (inspected.status === 'AMBIGUOUS') {
    return unavailable(
      series,
      t`Multiple INS source series match this selection. Choose one complete source series; sum, average and first cannot resolve alternatives.`,
    )
  }
  if (inspected.status === 'INVALID') {
    return unavailable(
      series,
      t`The INS response has incomplete or conflicting source coordinates.`,
    )
  }
  if (inspected.status === 'EMPTY') {
    return unavailable(series, t`No INS observations match this selection.`)
  }
  if (inspected.anyQualified) {
    return unavailable(
      series,
      t`This INS series has geographic qualifications. Inspect the source rows before comparing its values.`,
    )
  }
  const periodicities = [
    ...new Set(observations.map((row) => row.time_period.periodicity)),
  ]
  const periodicity = periodicities[0]
  if (
    periodicities.length !== 1 ||
    !periodicity ||
    !isInsChartPeriodicity(periodicity)
  ) {
    return unavailable(
      series,
      t`Select one supported INS frequency: annual, quarterly or monthly. Other frequencies remain available in source rows.`,
    )
  }

  const periodType = {
    ANNUAL: 'YEAR',
    QUARTERLY: 'QUARTER',
    MONTHLY: 'MONTH',
  } as const
  const points: { x: string; y: number }[] = []
  for (const row of observations) {
    if (!validPeriodDate(row.time_period.iso_period, periodType[periodicity])) {
      return unavailable(
        series,
        t`The INS response contains a period that does not match its frequency.`,
      )
    }
    const value = row.value?.trim()
    const number =
      value && /^-?[0-9]+(?:[.,][0-9]+)?$/.test(value)
        ? Number(value.replace(',', '.'))
        : NaN
    // AnalyticsSeries has no null points: dropping a missing cell would draw a false continuous line.
    if (!Number.isFinite(number)) {
      return unavailable(
        series,
        t`This INS series contains missing or invalid values. Inspect source rows; the chart cannot represent these gaps.`,
      )
    }
    points.push({ x: row.time_period.iso_period, y: number })
  }
  points.sort((left, right) => left.x.localeCompare(right.x))
  if (
    !completePeriods(
      points.map((point) => point.x),
      periodType[periodicity],
      series.period,
    )
  ) {
    return unavailable(
      series,
      t`This INS series is missing expected periods. Inspect source rows; the chart cannot represent these gaps.`,
    )
  }
  return {
    series: {
      seriesId: series.id,
      xAxis: {
        name: t`Period`,
        type: 'STRING',
        unit: { ANNUAL: 'year', QUARTERLY: 'quarter', MONTHLY: 'month' }[
          periodicity
        ],
      },
      yAxis: {
        name: t`Value`,
        type: 'FLOAT',
        unit: series.unit || unitLabel(observations[0]),
      },
      data: points,
    },
    warnings: [],
  }
}

export const insSeriesRuntimeMapper: InsSeriesRuntimeMapper = {
  mapSeries: ({ series, signal }) =>
    mapInsSeriesToAnalyticsSeries(series, signal),
}
