import { isInsChartPeriodicity } from '@/lib/ins/source-contract'
import { sourceRowSelection } from '@/lib/ins/source-series'
import type { InsObservation, InsPeriodicity } from '@/schemas/ins'

/** One complete INS cell: a value for every classification axis, plus a unit. */
export interface RepresentativeCell {
  readonly classifications: ReadonlyMap<string, string>
  readonly unitCode: string
  /**
   * The cadence to read the cell at. A matrix that declares both ANNUAL and
   * QUARTERLY has no cadence of its own, and with no server-resolved default
   * the page had a complete coordinate and still could not draw it: a series
   * cannot mix cadences, so an unresolved one blocks the chart exactly like a
   * missing axis. `null` when the cell's rows carry none a chart can use.
   */
  readonly periodicity: InsPeriodicity | null
}

/**
 * INS writes its aggregate member as „Total", „TOTAL" or „Total " depending on
 * the matrix. Matching on the name is a heuristic and is treated as one: what
 * it picks is marked in the UI as a default, never as the reader's choice.
 */
function isTotalMember(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === 'total'
}

function identityKey(observation: InsObservation): string {
  const coordinates = [...(observation.classifications ?? [])]
    .map((item) => `${item.type_code}:${item.code}`)
    .sort()
  return JSON.stringify([observation.unit?.code ?? null, coordinates])
}

/**
 * An identity's member codes, lowest axis first, as a comparable tuple. Only a
 * tie-break, and only for determinism: INS numbers a nomenclature's members in
 * its own published order, so the lowest codes are its first-declared — and,
 * more importantly, the same answer every time, whatever order the server
 * returned the rows in. The whole tuple is compared, not its sum: {D0:1,D1:4}
 * and {D0:2,D1:3} both sum to 5 and are different cells.
 */
function memberCodes(observation: InsObservation): readonly number[] {
  return [...(observation.classifications ?? [])]
    .sort((left, right) =>
      (left.type_code ?? '').localeCompare(right.type_code ?? ''),
    )
    .map((item) => {
      const code = Number(item.code)
      return Number.isFinite(code) ? code : Number.MAX_SAFE_INTEGER
    })
}

/**
 * The cadence to read a cell at: one a chart can draw, with the most rows
 * behind it, and — where those tie — the one reaching furthest.
 */
function chooseCadence(rows: readonly InsObservation[]): InsPeriodicity | null {
  const cadences = new Map<
    InsPeriodicity,
    { rows: number; latest: string }
  >()
  for (const row of rows) {
    const cadence = row.time_period.periodicity
    const existing = cadences.get(cadence)
    const period = row.time_period.iso_period
    if (existing) {
      existing.rows += 1
      if (period > existing.latest) existing.latest = period
      continue
    }
    cadences.set(cadence, { rows: 1, latest: period })
  }

  const ranked = [...cadences.entries()].sort(
    ([leftCadence, left], [rightCadence, right]) =>
      Number(isInsChartPeriodicity(rightCadence)) -
        Number(isInsChartPeriodicity(leftCadence)) ||
      right.rows - left.rows ||
      right.latest.localeCompare(left.latest) ||
      leftCadence.localeCompare(rightCadence),
  )
  const best = ranked[0]?.[0]
  return best && isInsChartPeriodicity(best) ? best : null
}

/** Lexicographic on the tuple, then on the unit — a total order, never 0. */
function compareTieBreak(
  left: { codes: readonly number[]; unit: string },
  right: { codes: readonly number[]; unit: string },
): number {
  const length = Math.max(left.codes.length, right.codes.length)
  for (let index = 0; index < length; index += 1) {
    const difference =
      (left.codes[index] ?? Number.MAX_SAFE_INTEGER) -
      (right.codes[index] ?? Number.MAX_SAFE_INTEGER)
    if (difference !== 0) return difference
  }
  return left.unit.localeCompare(right.unit)
}

/**
 * The series to show when the server resolved none.
 *
 * `insLatestDatasetValues` answers `NO_DATA` for any matrix without a row at
 * the requested entity — ADM101A's territorial axis holds macroregions and
 * counties and no national total, so a page that waited for the server's pick
 * showed a filter prompt over 50 perfectly good observations. This chooses a
 * cell from the observations already fetched instead.
 *
 * The pick, in order: the identity whose members are INS's own „Total" on the
 * most axes; then the one with the most published periods, because a default
 * that draws a line is worth more than one that draws a point; then the one
 * reaching the latest period; then the lowest member codes and unit, which is
 * INS's own declaration order and makes the answer independent of the order
 * the server happened to return the rows in.
 *
 * Returns `null` when nothing is safe to pick — no rows, or no row that is a
 * valid complete source coordinate. The caller then keeps asking the reader.
 */
export function chooseRepresentativeCell(input: {
  readonly descriptor: unknown
  readonly observations: readonly InsObservation[]
}): RepresentativeCell | null {
  const groups = new Map<
    string,
    {
      rows: InsObservation[]
      totals: number
      latest: string
      codes: readonly number[]
      unit: string
    }
  >()

  for (const observation of input.observations) {
    if (observation.value === null) continue
    const key = identityKey(observation)
    const existing = groups.get(key)
    const period = observation.time_period.iso_period
    if (existing) {
      existing.rows.push(observation)
      if (period > existing.latest) existing.latest = period
      continue
    }
    groups.set(key, {
      rows: [observation],
      totals: (observation.classifications ?? []).filter((item) =>
        isTotalMember(item.name_ro),
      ).length,
      latest: period,
      codes: memberCodes(observation),
      unit: observation.unit?.code ?? '',
    })
  }

  const ranked = [...groups.values()].sort(
    (left, right) =>
      right.totals - left.totals ||
      right.rows.length - left.rows.length ||
      right.latest.localeCompare(left.latest) ||
      compareTieBreak(left, right),
  )

  for (const group of ranked) {
    // `sourceRowSelection` is the gate: it rejects a row whose coordinates do
    // not cover every declared axis, which is exactly the row we must not
    // silently adopt as a default.
    const selection = sourceRowSelection(input.descriptor, group.rows[0])
    if (!selection) continue
    const classifications = new Map<string, string>()
    for (const pin of selection.clasificari) {
      const [type, code] = pin.split(':')
      if (type && code) classifications.set(type, code)
    }
    // No size check: a matrix whose only axes are time and unit is a valid
    // source layout, and `sourceRowSelection` has already said so. Discarding
    // its empty coordinate would leave such a page permanently unresolved.
    return {
      classifications,
      unitCode: selection.unitate,
      periodicity: chooseCadence(group.rows),
    }
  }

  return null
}

/** Whether two picks name the same cell — used to keep the choice stable. */
export function sameRepresentativeCell(
  left: RepresentativeCell | null,
  right: RepresentativeCell | null,
): boolean {
  if (left === null || right === null) return left === right
  if (left.unitCode !== right.unitCode) return false
  if (left.periodicity !== right.periodicity) return false
  if (left.classifications.size !== right.classifications.size) return false
  for (const [type, code] of left.classifications) {
    if (right.classifications.get(type) !== code) return false
  }
  return true
}
