import type { InsDatasetDetails } from '@/schemas/ins'
import type { StatisticsLatestValue } from '@/schemas/statistics'
import {
  insSourceLayoutSchema,
  isInsChartPeriodicity,
  insSourcePeriodicitySchema,
} from '@/lib/ins/source-contract'
import { parseSourcePins, parseSourceUnit } from '@/lib/ins/source-pins'
import { inspectSourceSeries } from '@/lib/ins/source-series'

/** Native defaults are proposals only; full source vectors decide each territory's eligibility. */
export function resolveComparisonDefaults(input: {
  readonly dataset: InsDatasetDetails
  readonly latest: readonly StatisticsLatestValue[]
  readonly classifications?: unknown
  readonly unit?: unknown
  readonly cadence?: unknown
}) {
  const descriptor = insSourceLayoutSchema.parse(input.dataset)
  const axes = new Set(
    descriptor.dimensions
      .filter((d) => d.type === 'CLASSIFICATION')
      .map((d) => `D${d.index}`),
  )
  const explicit =
    input.classifications !== undefined ||
    input.unit !== undefined ||
    input.cadence !== undefined
  const parsed = parseSourcePins(input.classifications, axes)
  const pins = new Map(parsed.pins)
  let unit = parseSourceUnit(input.unit)
  const parsedCadence = insSourcePeriodicitySchema.safeParse(input.cadence)
  let cadence =
    parsedCadence.success && isInsChartPeriodicity(parsedCadence.data)
      ? parsedCadence.data
      : null
  const issues: string[] = []
  if (!parsed.valid) issues.push('classifications')
  if (input.unit !== undefined && unit === null) issues.push('unit')
  if (input.cadence !== undefined && cadence === null) issues.push('cadence')
  if (!descriptor.dimensions.some((d) => d.type === 'TERRITORIAL'))
    issues.push('non-territorial')
  const candidates = input.latest.filter(
    (latest) =>
      latest.hasData && latest.matchStrategy !== 'AMBIGUOUS_GEOGRAPHY',
  )
  for (const latest of candidates) {
    const inspected = inspectSourceSeries({
      descriptor: latest.source?.descriptor,
      observations: [latest.source?.observation],
    })
    if (inspected.status !== 'SERIES' || inspected.anyQualified)
      throw new Error('Invalid native comparison default')
  }
  // Like detail, explicit source intent suppresses all implicit defaults. UI edits
  // materialize the full resolved selection, avoiding defaults from unrelated cells.
  if (!explicit && candidates.length > 0) {
    for (const axis of axes) {
      const values = candidates.map(
        (latest) =>
          latest.resolvedClassifications.find((c) => c.typeCode === axis)?.code,
      )
      const value = values[0]
      if (value !== undefined && values.every((v) => v === value))
        pins.set(axis, value)
    }
    const units = candidates.map((latest) => parseSourceUnit(latest.unitCode))
    if (units[0] !== null && units.every((u) => u === units[0])) unit = units[0]
    const cadences = candidates.map((latest) => latest.resolvedPeriodicity)
    const first = cadences[0]
    if (
      first &&
      isInsChartPeriodicity(first) &&
      cadences.every((c) => c === first)
    )
      cadence = first
  }
  const unresolvedAxes = [...axes].filter((axis) => !pins.has(axis))
  return {
    pins,
    unit,
    cadence,
    issues,
    unresolvedAxes,
    representative:
      !explicit &&
      candidates.some((v) => v.matchStrategy === 'REPRESENTATIVE_FALLBACK'),
    ready:
      issues.length === 0 &&
      unresolvedAxes.length === 0 &&
      unit !== null &&
      cadence !== null,
  }
}
