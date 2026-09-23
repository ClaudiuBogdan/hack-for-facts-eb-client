import { t } from '@lingui/core/macro'
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
    const name = code === 'RO' ? t`România` : rawName
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

// ---------------------------------------------------------------------------
// Classification pins — ONE canonical codec, shared with the detail surface.
// ---------------------------------------------------------------------------

export {
  encodeClassificationPin as formatClassificationPin,
  parseClassificationPin,
  parseClassificationPins,
  parseComparisonToken,
  parseComparisonTokens,
  removeClassificationPin,
  upsertClassificationPin,
  type ClassificationPin,
  type ComparisonTerritoryToken,
} from './dataset-selection'

/** A selectable classification value. */
export interface ClassificationOptionLike {
  readonly code: string
  readonly label: string
}

