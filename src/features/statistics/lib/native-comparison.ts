import {
  insSourceDescriptorSchema,
  isInsChartPeriodicity,
  type InsSourceDescriptor,
} from '@/lib/ins/source-contract'
import { inspectSourceSeries } from '@/lib/ins/source-series'
import { parseSourcePins, parseSourceUnit } from '@/lib/ins/source-pins'
import {
  periodAtOrdinal,
  periodOrdinal,
  validPeriodDate,
} from '@/lib/ins/source-periods'
import type {
  InsPeriodicity,
  InsTimePeriod,
  NativeInsObservation,
} from '@/schemas/ins'
import type { ReportPeriodType } from '@/schemas/reporting'
import type {
  ComparisonCell,
  ComparisonMatrix,
  ComparisonPeriodOption,
  ComparisonTerritoryRow,
} from './comparison-series'
import { periodSortKey } from './period'

export type NativeComparisonAvailability =
  'SERIES' | 'EMPTY' | 'AMBIGUOUS' | 'QUALIFIED'
export interface NativeComparisonRow extends ComparisonTerritoryRow {
  readonly availability: NativeComparisonAvailability
  readonly sourceSelection: {
    readonly clasificari: readonly string[]
    readonly unitate: string
  } | null
  readonly observations: readonly NativeInsObservation[]
}
export interface NativeComparisonMatrix extends ComparisonMatrix {
  readonly rows: readonly NativeComparisonRow[]
  readonly descriptor: InsSourceDescriptor
  readonly sharedSelection: {
    readonly clasificari: readonly string[]
    readonly unitate: string
  }
  readonly observations: readonly NativeInsObservation[]
}
export type ComparisonTerritory = {
  readonly code: string
  readonly level: string
}

const reportType = {
  ANNUAL: 'YEAR',
  QUARTERLY: 'QUARTER',
  MONTHLY: 'MONTH',
} as const

/** Publication and layout used for defaults must also describe the final vector. */
export function comparisonPublicationKey(
  descriptor: InsSourceDescriptor,
): string {
  return JSON.stringify([
    descriptor.code,
    descriptor.metadata.revision_id,
    descriptor.metadata.custody_sha256 ?? null,
    descriptor.metadata.transform_contract_sha256,
    [...descriptor.dimensions]
      .sort((a, b) => a.index - b.index)
      .map((dimension) => [
        dimension.index,
        dimension.type,
        dimension.classification_type?.code ?? null,
      ]),
  ])
}

function periodOption(
  label: string,
  cadence: InsPeriodicity,
): ComparisonPeriodOption {
  const period: InsTimePeriod = {
    iso_period: label,
    year: Number(label.slice(0, 4)),
    periodicity: cadence,
    ...(cadence === 'QUARTERLY' && { quarter: Number(label.slice(6)) }),
    ...(cadence === 'MONTHLY' && { month: Number(label.slice(5)) }),
  }
  return { isoPeriod: label, sortKey: periodSortKey(period), period }
}

function calendarPeriods(
  labels: readonly string[],
  cadence: InsPeriodicity,
  type: ReportPeriodType,
  requested: string | undefined,
): readonly ComparisonPeriodOption[] {
  if (requested !== undefined && !validPeriodDate(requested, type))
    throw new Error('Invalid requested comparison period')
  const ordinals = labels.map((label) => periodOrdinal(label, type))
  const periods: ComparisonPeriodOption[] = []
  if (ordinals.length > 0) {
    const from = ordinals.reduce((a, b) => Math.min(a, b))
    const to = ordinals.reduce((a, b) => Math.max(a, b))
    for (let ordinal = from; ordinal <= to; ordinal += 1)
      periods.push(periodOption(periodAtOrdinal(ordinal, type), cadence))
  }
  // A requested absent period stays selectable; it never silently becomes latest.
  if (
    requested !== undefined &&
    !periods.some((p) => p.isoPeriod === requested)
  )
    periods.push(periodOption(requested, cadence))
  return periods.sort((a, b) => a.sortKey - b.sortKey)
}

/**
 * Project one COMPLETE native vector. Caller collects pages before calling this.
 * Geographic alternatives are inspected across the whole history before cadence
 * selection. No row, source alternative or duplicate is discarded as a tie-break.
 */
export function projectNativeComparison(input: {
  readonly descriptor: unknown
  readonly expectedDescriptor?: InsSourceDescriptor
  readonly observations: readonly NativeInsObservation[]
  readonly territories: readonly ComparisonTerritory[]
  readonly classificationPins: unknown
  readonly unitCode: unknown
  readonly cadence: InsPeriodicity
  readonly requestedPeriod?: string
}): NativeComparisonMatrix {
  const descriptor = insSourceDescriptorSchema.parse(input.descriptor)
  if (
    input.expectedDescriptor &&
    comparisonPublicationKey(descriptor) !==
      comparisonPublicationKey(input.expectedDescriptor)
  )
    throw new Error(
      'INS comparison publication changed; refresh selection defaults',
    )
  if (!descriptor.dimensions.some((d) => d.type === 'TERRITORIAL'))
    throw new Error('INS dataset is not comparable by territory')
  if (!isInsChartPeriodicity(input.cadence))
    throw new Error('Select one supported INS comparison frequency')
  const type = reportType[input.cadence]
  const axes = new Set(
    descriptor.dimensions
      .filter((d) => d.type === 'CLASSIFICATION')
      .map((d) => `D${d.index}`),
  )
  const pins = parseSourcePins(input.classificationPins, axes)
  const unit = parseSourceUnit(input.unitCode)
  if (!pins.valid || pins.pins.size !== axes.size || unit === null)
    throw new Error('Incomplete or invalid shared INS comparison selection')
  const global = inspectSourceSeries({
    descriptor,
    observations: input.observations,
  })
  if (global.status === 'INVALID')
    throw new Error(`Invalid INS source vector: ${global.reason}`)
  const selected = new Map(
    input.territories.map((t) => [JSON.stringify([t.level, t.code]), t]),
  )
  if (
    selected.size !== input.territories.length ||
    new Set(input.territories.map((t) => t.code)).size !== selected.size
  )
    throw new Error('Duplicate INS comparison territories')
  const grouped = new Map<string, NativeInsObservation[]>()
  for (const row of input.observations) {
    // Invalid source periods are structural even when a territory is ambiguous
    // or the malformed cell belongs to a different chart cadence.
    if (isInsChartPeriodicity(row.time_period.periodicity)) {
      const rowType = reportType[row.time_period.periodicity]
      const label = row.time_period.iso_period
      if (!validPeriodDate(label, rowType))
        throw new Error('Invalid INS comparison source period')
      const expected = periodOption(label, row.time_period.periodicity).period
      if (
        row.time_period.year !== expected.year ||
        (row.time_period.quarter ?? null) !== (expected.quarter ?? null) ||
        (row.time_period.month ?? null) !== (expected.month ?? null)
      )
        throw new Error('INS comparison source period fields disagree')
    }
    const geography = row.dimensions.geography
    // Modern canonical scopes cannot return unresolved/contextual tuples. Never
    // attribute a cell by its context or silently discard an unselected source row.
    const resolved = geography?.resolvedTerritory
    const key = resolved && JSON.stringify([resolved.level, resolved.code])
    if (!key || !selected.has(key) || geography?.resolution !== 'EXACT')
      throw new Error(
        'INS comparison response is outside the requested territory scope',
      )
    if (
      row.territory &&
      (row.territory.code !== resolved.code ||
        row.territory.level !== resolved.level)
    )
      throw new Error('INS comparison territory interpretation disagrees')
    if (
      row.unit.code !== unit ||
      [...pins.pins].some(
        ([axis, member]) =>
          !row.classifications.some(
            (c) => c.type_code === axis && c.code === member,
          ),
      )
    )
      throw new Error(
        'INS comparison response is outside the requested source selection',
      )
    if (
      row.value !== null &&
      (typeof row.value !== 'string' ||
        !/^-?[0-9]+(?:\.[0-9]+)?$/.test(row.value))
    )
      throw new Error('Invalid INS comparison decimal value')
    const rows = grouped.get(key) ?? []
    rows.push(row)
    grouped.set(key, rows)
  }
  let unitLabel: string | null = null
  const labels = new Set<string>()
  const rows = input.territories.map<NativeComparisonRow>((territory) => {
    const observations =
      grouped.get(JSON.stringify([territory.level, territory.code])) ?? []
    const inspected = inspectSourceSeries({ descriptor, observations })
    if (inspected.status === 'INVALID')
      throw new Error(`Invalid INS source series: ${inspected.reason}`)
    const availability: NativeComparisonAvailability =
      inspected.status === 'SERIES'
        ? inspected.anyQualified
          ? 'QUALIFIED'
          : 'SERIES'
        : inspected.status
    const cells: Record<string, ComparisonCell> = {}
    if (availability === 'SERIES') {
      for (const row of observations) {
        if (row.time_period.periodicity !== input.cadence) continue
        const label = row.time_period.iso_period
        if (Object.prototype.hasOwnProperty.call(cells, label))
          throw new Error('Duplicate INS comparison cell')
        cells[label] = {
          isoPeriod: label,
          value: row.value,
          valueStatus: row.value_status ?? null,
        }
        labels.add(label)
        unitLabel ??= row.unit.symbol || row.unit.name_ro || row.unit.code
      }
    }
    return {
      code: territory.code,
      name:
        observations.find((row) => row.territory?.name_ro)?.territory
          ?.name_ro ?? null,
      cells,
      availability,
      sourceSelection:
        inspected.status === 'SERIES' ? inspected.selection : null,
      observations,
    }
  })
  return {
    descriptor,
    observations: input.observations,
    sharedSelection: {
      clasificari: [...pins.pins].map(([axis, member]) => `${axis}:${member}`),
      unitate: unit,
    },
    rows,
    unitSymbol: unitLabel,
    periods: calendarPeriods(
      [...labels],
      input.cadence,
      type,
      input.requestedPeriod,
    ),
  }
}
