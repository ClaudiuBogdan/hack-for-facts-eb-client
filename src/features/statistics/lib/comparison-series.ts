import type { InsObservation, InsTimePeriod } from '@/schemas/ins'
import { periodSortKey } from './period'

/**
 * Pure derivation layer for the local comparisons page.
 *
 * The page issues exactly ONE `insObservations` request per
 * (dataset × territories × pins) combination and derives the table, both
 * charts and the period dropdown from that single flat observation list.
 * Everything in this module is therefore a total function of that list —
 * changing the selected period never needs a new request.
 *
 * Two invariants are load-bearing:
 *
 * 1. Periods are ordered with {@link periodSortKey}, which sorts on the
 *    structured `year`/`quarter`/`month` fields rather than on the ISO string.
 *    String order happens to agree with chronology for the shapes INS emits,
 *    but only by accident of zero-padding; ordering the numbers we were given
 *    is what stays true. (A dataset has a single periodicity, so quarterly and
 *    monthly periods never actually coexist in one series — the relative order
 *    of `"2024-Q1"` and `"2024-03"` is undefined, not a requirement.)
 * 2. A missing (territory, period) pair stays missing. It is never backfilled
 *    from a neighbouring period — a territory that has no 2024 figure
 *    genuinely has no 2024 figure, and the UI must say so.
 */

/** Lower bound before a comparison is meaningful (one line is not a comparison). */
export const MIN_COMPARISON_TERRITORIES = 2

/** Upper bound, matching `statisticsComparisonsSearchSchema.teritorii`. */
export const MAX_COMPARISON_TERRITORIES = 6

/** One selectable period, carrying the numeric key it was sorted by. */
export interface ComparisonPeriodOption {
  readonly isoPeriod: string
  readonly sortKey: number
  readonly period: InsTimePeriod
}

/**
 * A single observed cell. `value` is kept as the verbatim Decimal string the
 * server sent — table cells print it unchanged so no precision is lost to a
 * float round-trip.
 */
export interface ComparisonCell {
  readonly isoPeriod: string
  readonly value: string | null
  readonly valueStatus: string | null
}

/**
 * A compared territory as the URL carries it: a discriminated token
 * (`siruta:54975` | `cod:CJ` | `cod:RO`) resolved to the territory CODE the
 * observation filter speaks. A LAU's code IS its SIRUTA code (M0-verified),
 * so one `territoryCodes` filter serves mixed levels in one query — filter
 * keys AND together, so `sirutaCodes` must never be mixed in.
 */
export interface ComparisonTerritoryToken {
  readonly token: string
  readonly code: string
}

/** Normalizes one URL entry: bare digits are a legacy SIRUTA-only link. */
export function parseComparisonToken(raw: unknown): ComparisonTerritoryToken | null {
  // Raw search values leak past validateSearch with their parsed type — a
  // shared URL with unquoted numbers delivers numbers, not strings.
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const trimmed = String(raw).trim()
  if (/^\d{1,6}$/.test(trimmed)) {
    return { token: `siruta:${trimmed}`, code: trimmed }
  }
  const match = /^(siruta|cod):([A-Za-z0-9]+)$/.exec(trimmed)
  if (!match) return null
  const code = match[1] === 'cod' && /^[A-Za-z]+$/.test(match[2])
    ? match[2].toUpperCase()
    : match[2]
  return { token: `${match[1]}:${code}`, code }
}

/** Parses the URL list, dropping malformed entries and duplicate codes. */
export function parseComparisonTokens(
  raw: readonly unknown[] | undefined,
): readonly ComparisonTerritoryToken[] {
  const byCode = new Map<string, ComparisonTerritoryToken>()
  for (const entry of Array.isArray(raw) ? raw : []) {
    const parsed = parseComparisonToken(entry)
    if (!parsed || byCode.has(parsed.code)) continue
    byCode.set(parsed.code, parsed)
  }
  return [...byCode.values()]
}

/** One territory row: its identity plus the cells it actually has. */
export interface ComparisonTerritoryRow {
  readonly code: string
  readonly name: string | null
  readonly cells: Readonly<Record<string, ComparisonCell>>
}

/** The territory × period matrix both charts and the table read from. */
export interface ComparisonMatrix {
  readonly periods: readonly ComparisonPeriodOption[]
  readonly rows: readonly ComparisonTerritoryRow[]
  readonly unitSymbol: string | null
}

/**
 * Every distinct period in the observation list, ascending (oldest first).
 * The last entry is therefore the latest period.
 */
export function buildPeriodOptions(
  observations: readonly InsObservation[],
): readonly ComparisonPeriodOption[] {
  const byIso = new Map<string, ComparisonPeriodOption>()

  for (const observation of observations) {
    const period = observation.time_period
    if (!period || byIso.has(period.iso_period)) continue
    byIso.set(period.iso_period, {
      isoPeriod: period.iso_period,
      sortKey: periodSortKey(period),
      period,
    })
  }

  return [...byIso.values()].sort((a, b) => a.sortKey - b.sortKey)
}

/**
 * Resolves the period to display: the requested one when the data actually
 * contains it, otherwise the latest available. A period from a stale deep link
 * degrades to "latest" rather than to an all-empty view.
 */
export function resolveSelectedPeriod(
  periods: readonly ComparisonPeriodOption[],
  requested: string | undefined,
): string | null {
  if (periods.length === 0) return null

  if (requested && periods.some((option) => option.isoPeriod === requested)) {
    return requested
  }

  return periods[periods.length - 1].isoPeriod
}

/**
 * Folds a flat observation list into the territory × period matrix.
 *
 * Rows follow `territoryCodes` order, so the chart colour assigned to a territory
 * follows the territory and not its rank — removing a chip never repaints the
 * survivors that stay ahead of it. A territory with zero observations still
 * gets a row (all cells missing), because "we asked and there was nothing" is
 * a result the user needs to see.
 *
 * Territory names are read off the observations themselves; the single fetch
 * already carries `territory.name_ro`, so no extra lookup is needed.
 */
export function buildComparisonMatrix(params: {
  readonly observations: readonly InsObservation[]
  readonly territoryCodes: readonly string[]
}): ComparisonMatrix {
  const { observations, territoryCodes } = params

  const cellsByCode = new Map<string, Record<string, ComparisonCell>>()
  const nameByCode = new Map<string, string>()
  let unitSymbol: string | null = null

  for (const code of territoryCodes) {
    cellsByCode.set(code, {})
  }

  for (const observation of observations) {
    // The territory CODE is the universal key: for LAU rows it equals the
    // SIRUTA code; county and national rows have no SIRUTA at all.
    const code =
      observation.territory?.code?.trim() ||
      observation.territory?.siruta_code?.trim()
    if (!code) continue

    const cells = cellsByCode.get(code)
    if (!cells) continue

    const rawName = observation.territory?.name_ro?.trim()
    // The API names the national row "TOTAL" — render the country.
    const name = code === 'RO' ? 'România' : rawName
    if (name && !nameByCode.has(code)) {
      nameByCode.set(code, name)
    }

    unitSymbol ??= observation.unit?.symbol?.trim() || null

    const isoPeriod = observation.time_period?.iso_period
    if (!isoPeriod) continue

    // First observation wins. With classifications pinned there is exactly one
    // row per (territory, period); a duplicate would mean an under-pinned
    // filter, and silently summing them would invent a figure.
    if (isoPeriod in cells) continue

    cells[isoPeriod] = {
      isoPeriod,
      value: observation.value,
      valueStatus: observation.value_status ?? null,
    }
  }

  return {
    periods: buildPeriodOptions(observations),
    unitSymbol,
    rows: territoryCodes.map((code) => ({
      code,
      name: nameByCode.get(code) ?? null,
      cells: cellsByCode.get(code) ?? {},
    })),
  }
}

/** The cell for a period, or `null` when this territory has no such period. */
export function getComparisonCell(
  row: ComparisonTerritoryRow,
  isoPeriod: string | null,
): ComparisonCell | null {
  if (!isoPeriod) return null
  return row.cells[isoPeriod] ?? null
}

/**
 * Converts a wire Decimal string into a plottable number.
 *
 * Anything that is not a finite number — `null`, an empty string, a
 * confidentiality marker like `":"` — becomes `null`, which Recharts renders
 * as a gap when the series has `connectNulls={false}`. It never becomes 0:
 * "no data" and "zero" are different claims.
 */
export function toChartValue(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null

  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : null
}

/** One bar: a territory's value at the selected period. */
export interface ComparisonBarDatum {
  readonly code: string
  readonly name: string | null
  readonly value: number | null
}

/** Territories at one period, in selection order. */
export function buildBarSeries(
  matrix: ComparisonMatrix,
  isoPeriod: string | null,
): readonly ComparisonBarDatum[] {
  return matrix.rows.map((row) => ({
    code: row.code,
    name: row.name,
    value: toChartValue(getComparisonCell(row, isoPeriod)?.value),
  }))
}

/**
 * Recharts data keys must be flat object properties. Prefixing keeps a SIRUTA
 * code from ever colliding with the `isoPeriod` axis key.
 */
export function lineSeriesKey(siruta: string): string {
  return `siruta_${siruta}`
}

/** One x-position of the line chart: a period and every territory's value there. */
export type ComparisonLinePoint = {
  readonly isoPeriod: string
} & Record<string, string | number | null>

/**
 * All periods × all territories, oldest first. Missing cells are emitted as
 * explicit `null`s rather than omitted keys, so `connectNulls={false}` breaks
 * the line exactly where the data breaks.
 */
export function buildLineSeries(
  matrix: ComparisonMatrix,
): readonly ComparisonLinePoint[] {
  return matrix.periods.map((option) => {
    const point: Record<string, string | number | null> = {
      isoPeriod: option.isoPeriod,
    }

    for (const row of matrix.rows) {
      point[lineSeriesKey(row.code)] = toChartValue(
        getComparisonCell(row, option.isoPeriod)?.value,
      )
    }

    return point as ComparisonLinePoint
  })
}

// ---------------------------------------------------------------------------
// Classification pins (`"TYPE:VALUE"` in the URL)
// ---------------------------------------------------------------------------

/** A classification pin split into its dimension type and its value code. */
export interface ClassificationPin {
  readonly typeCode: string
  readonly valueCode: string
}

/** Parses `"SEX:TOTAL"`. Returns `null` for anything not in that shape. */
export function parseClassificationPin(pin: string): ClassificationPin | null {
  const separator = pin.indexOf(':')
  if (separator <= 0 || separator === pin.length - 1) return null

  return {
    typeCode: pin.slice(0, separator),
    valueCode: pin.slice(separator + 1),
  }
}

/** Encodes a pin back into its URL form. */
export function formatClassificationPin(pin: ClassificationPin): string {
  return `${pin.typeCode}:${pin.valueCode}`
}

/**
 * Upserts a pin keyed by its dimension type: picking a second value for a
 * dimension replaces the first rather than adding a contradictory filter.
 */
export function upsertClassificationPin(
  pins: readonly string[],
  next: ClassificationPin,
): readonly string[] {
  const others = pins.filter((pin) => parseClassificationPin(pin)?.typeCode !== next.typeCode)
  return [...others, formatClassificationPin(next)]
}

/** Removes every pin belonging to a dimension type. */
export function removeClassificationPin(
  pins: readonly string[],
  typeCode: string,
): readonly string[] {
  return pins.filter((pin) => parseClassificationPin(pin)?.typeCode !== typeCode)
}

/** A selectable classification value. */
export interface ClassificationOptionLike {
  readonly code: string
  readonly label: string
}

/**
 * The option a dimension defaults to when the URL pins nothing for it.
 *
 * INS classification dimensions almost always carry a "Total" option, and
 * comparing territories on an unpinned dimension would silently mix its
 * members. Preferring `/^total/i` keeps the default honest; when there is no
 * such option the caller must ask the user rather than pick arbitrarily.
 */
export function pickAutoPinnedOption<T extends ClassificationOptionLike>(
  options: readonly T[],
): T | null {
  return options.find((option) => /^total/i.test(option.label.trim())) ?? null
}

/** A classification dimension with its (bounded) option list. */
export interface ClassificationDimensionLike {
  readonly typeCode: string
  readonly options: readonly ClassificationOptionLike[]
}

/**
 * The pins actually sent to the server: the URL's pins, plus an auto-pinned
 * "Total" for every dimension the URL left unpinned.
 *
 * Auto-pins are derived, not written back to the URL — the same dataset always
 * resolves to the same defaults, so a link stays short and still restores the
 * exact view. Pins for dimensions this dataset does not have are dropped, which
 * is what makes a link copied from one dataset degrade safely on another.
 */
export function resolveEffectiveClassificationPins(params: {
  readonly dimensions: readonly ClassificationDimensionLike[]
  readonly urlPins: readonly string[]
}): readonly ClassificationPin[] {
  const { dimensions, urlPins } = params

  const pinnedByType = new Map<string, ClassificationPin>()
  for (const raw of urlPins) {
    const pin = parseClassificationPin(raw)
    if (pin) pinnedByType.set(pin.typeCode, pin)
  }

  const resolved: ClassificationPin[] = []

  for (const dimension of dimensions) {
    const pinned = pinnedByType.get(dimension.typeCode)
    if (pinned && dimension.options.some((option) => option.code === pinned.valueCode)) {
      resolved.push(pinned)
      continue
    }

    const auto = pickAutoPinnedOption(dimension.options)
    if (auto) {
      resolved.push({ typeCode: dimension.typeCode, valueCode: auto.code })
    }
  }

  return resolved
}
