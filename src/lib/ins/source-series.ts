import {
  insSourceDescriptorSchema,
  insSourceObservationSchema,
  type InsSourceDescriptor,
} from './source-contract'

export type InsSourceSeriesResult =
  | { readonly status: 'EMPTY' }
  | {
      readonly status: 'INVALID'
      readonly reason:
        'DESCRIPTOR' | 'OBSERVATION' | 'SOURCE_COORDINATES' | 'DUPLICATE_CELL'
    }
  | { readonly status: 'AMBIGUOUS' }
  | {
      readonly status: 'SERIES'
      readonly identity: string
      readonly anyQualified: boolean
      /** Complete URL selection, including geographic dimensions; preserves explicit territory filters. */
      readonly selection: {
        readonly clasificari: readonly string[]
        readonly unitate: string
      }
    }

const classificationIndexes = (descriptor: InsSourceDescriptor): number[] =>
  descriptor.dimensions
    .filter(
      (dimension) =>
        dimension.type === 'CLASSIFICATION' || dimension.type === 'TERRITORIAL',
    )
    .map((dimension) => dimension.index)
    .sort((left, right) => left - right)

/**
 * Inspect a complete vector (or explicitly truncated dashboard) without choosing
 * defaults, aggregating, fetching or discarding original observations. Callers
 * retain all cells and their geographic qualifications for display and export.
 */
export function inspectSourceSeries(input: {
  readonly descriptor: unknown
  readonly observations: readonly unknown[]
}): InsSourceSeriesResult {
  const parsedDescriptor = insSourceDescriptorSchema.safeParse(input.descriptor)
  if (!parsedDescriptor.success)
    return { status: 'INVALID', reason: 'DESCRIPTOR' }
  const descriptor = parsedDescriptor.data
  const expected = classificationIndexes(descriptor)
  const geographic = descriptor.dimensions
    .filter((d) => d.type === 'TERRITORIAL')
    .map((d) => d.index)
    .sort((a, b) => a - b)
  const identities = new Set<string>()
  const cells = new Set<string>()
  const ids = new Set<string>()
  let anyQualified = false
  let selection: { clasificari: string[]; unitate: string } | undefined

  for (const raw of input.observations) {
    const parsed = insSourceObservationSchema.safeParse(raw)
    if (!parsed.success) return { status: 'INVALID', reason: 'OBSERVATION' }
    const row = parsed.data
    const coordinates = row.classifications
      .map(
        (item) => [Number(item.type_code.slice(1)), Number(item.code)] as const,
      )
      .sort((left, right) => left[0] - right[0])
    if (
      row.dataset_code !== descriptor.code ||
      coordinates.length !== expected.length ||
      coordinates.some((coordinate, index) => coordinate[0] !== expected[index])
    ) {
      return { status: 'INVALID', reason: 'SOURCE_COORDINATES' }
    }
    const expectedGeography = coordinates.filter((pair) =>
      geographic.includes(pair[0]),
    )
    const geography = row.dimensions.geography
    if (
      geographic.length === 0
        ? geography !== null
        : geography === null ||
          JSON.stringify(geography.pairs) !== JSON.stringify(expectedGeography)
    ) {
      return { status: 'INVALID', reason: 'SOURCE_COORDINATES' }
    }
    anyQualified ||= geography?.qualified === true
    const identity = JSON.stringify([
      row.dataset_code,
      row.unit.code,
      coordinates,
    ])
    const cell = JSON.stringify([
      identity,
      row.time_period.periodicity,
      row.time_period.iso_period,
    ])
    if (ids.has(row.id) || cells.has(cell))
      return { status: 'INVALID', reason: 'DUPLICATE_CELL' }
    ids.add(row.id)
    cells.add(cell)
    identities.add(identity)
    selection = {
      clasificari: coordinates.map(([index, code]) => `D${index}:${code}`),
      unitate: row.unit.code,
    }
  }
  if (identities.size === 0) return { status: 'EMPTY' }
  if (identities.size > 1) return { status: 'AMBIGUOUS' }
  // Every successful row sets both its identity and complete selection.
  const identity = identities.values().next().value
  if (identity === undefined || selection === undefined)
    return { status: 'EMPTY' }
  return { status: 'SERIES', identity, selection, anyQualified }
}

/** Validate one inspected source row before creating its complete URL selection. */
export function sourceRowSelection(descriptor: unknown, observation: unknown) {
  const inspected = inspectSourceSeries({
    descriptor,
    observations: [observation],
  })
  return inspected.status === 'SERIES' ? inspected.selection : null
}
