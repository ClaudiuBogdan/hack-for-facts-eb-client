import type {
  InsDimension,
  InsObservationFilterInput,
  InsPeriodicity,
} from '@/schemas/ins'
import type { StatisticsDatasetDetailSearch } from '@/schemas/statistics'

/**
 * The selection model behind `/statistici/seturi/$cod`.
 *
 * Every pin the user makes lives in the URL as an opaque `"KIND:VALUE"` string,
 * and every server filter is derived from those strings here. Keeping the codec
 * and the `InsObservationFilterInput` builder in one pure module means a shared
 * link and a live query can never disagree about what is pinned.
 *
 * The pins carry **domain codes** (`SEXE:total`, `siruta:54975`), never
 * `nom_item_id` surrogate keys — those are dimension-value row ids and are
 * meaningless outside the dataset that produced them.
 */

/** Rows per observations table page. */
export const DETAIL_PAGE_SIZE = 50

/** Options fetched per dimension-combobox page. Never load-all. */
export const DIMENSION_PAGE_SIZE = 20

/** Hard cap on chart points, before gap injection trims to the recent window. */
export const CHART_MAX_POINTS = 200

/** Hard cap on exported rows. */
export const CSV_MAX_ROWS = 10_000

export interface ClassificationPin {
  readonly type: string
  readonly value: string
}

export type TerritoryPin =
  | { readonly kind: 'siruta'; readonly value: string }
  | { readonly kind: 'cod'; readonly value: string }

// ---------------------------------------------------------------------------
// Codec
// ---------------------------------------------------------------------------

/**
 * Decodes `"SEXE:total"`. Returns `null` for anything that isn't exactly one
 * non-empty type and one non-empty value, so a hand-mangled URL degrades to
 * "that pin is not applied" rather than to a filter nobody asked for.
 */
export function parseClassificationPin(pin: string): ClassificationPin | null {
  const separator = pin.indexOf(':')
  if (separator <= 0 || separator === pin.length - 1) return null

  const type = pin.slice(0, separator)
  const value = pin.slice(separator + 1)
  if (value.includes(':')) return null

  return { type, value }
}

export function encodeClassificationPin(pin: ClassificationPin): string {
  return `${pin.type}:${pin.value}`
}

/** Decodes the pin list, dropping malformed entries and later duplicates of a type. */
export function parseClassificationPins(
  pins: readonly string[] | undefined,
): readonly ClassificationPin[] {
  if (!pins) return []

  const byType = new Map<string, ClassificationPin>()
  for (const raw of pins) {
    const parsed = parseClassificationPin(raw)
    if (!parsed) continue
    if (byType.has(parsed.type)) continue
    byType.set(parsed.type, parsed)
  }

  return [...byType.values()]
}

/** Lookup of pinned value by classification type. */
export function classificationPinMap(
  pins: readonly string[] | undefined,
): ReadonlyMap<string, string> {
  return new Map(
    parseClassificationPins(pins).map((pin) => [pin.type, pin.value]),
  )
}

/**
 * Keyed upsert: selecting `SEXE:feminin` when `SEXE:total` is pinned replaces
 * it. Appending would ask the server for two mutually exclusive values of the
 * same dimension and silently return the union.
 */
export function upsertClassificationPin(
  pins: readonly string[] | undefined,
  next: ClassificationPin,
): readonly string[] {
  const existing = parseClassificationPins(pins)
  const replaced = existing.some((pin) => pin.type === next.type)

  const merged = replaced
    ? existing.map((pin) => (pin.type === next.type ? next : pin))
    : [...existing, next]

  return merged.map(encodeClassificationPin)
}

/** Removes the pin for one classification type, keeping the rest in order. */
export function removeClassificationPin(
  pins: readonly string[] | undefined,
  type: string,
): readonly string[] {
  return parseClassificationPins(pins)
    .filter((pin) => pin.type !== type)
    .map(encodeClassificationPin)
}

/**
 * Decodes `"siruta:54975"` (LAU) or `"cod:CJ"` (NUTS3). The two forms land on
 * different `InsObservationFilterInput` fields, which is why the kind is part
 * of the URL rather than inferred from the value's shape.
 */
export function parseTerritoryPin(
  pin: string | undefined,
): TerritoryPin | null {
  if (!pin) return null

  const match = /^(siruta|cod):([A-Za-z0-9]+)$/.exec(pin)
  if (!match) return null

  return match[1] === 'siruta'
    ? { kind: 'siruta', value: match[2] }
    : { kind: 'cod', value: match[2] }
}

export function encodeTerritoryPin(pin: TerritoryPin): string {
  return `${pin.kind}:${pin.value}`
}

/**
 * A dimension value is a territory pin when it carries a SIRUTA code; county
 * and region rows only have a territory `code`.
 */
export function territoryPinFromValue(territory: {
  readonly siruta_code?: string | null
  readonly code?: string | null
}): TerritoryPin | null {
  const siruta = territory.siruta_code?.trim()
  if (siruta) return { kind: 'siruta', value: siruta }

  const code = territory.code?.trim()
  if (code) return { kind: 'cod', value: code }

  return null
}

// ---------------------------------------------------------------------------
// Dimension helpers
// ---------------------------------------------------------------------------

export function dimensionsOfType(
  dimensions: readonly InsDimension[] | null | undefined,
  type: InsDimension['type'],
): readonly InsDimension[] {
  return (dimensions ?? []).filter((dimension) => dimension.type === type)
}

/**
 * The classification type code a CLASSIFICATION dimension pins into. Falls back
 * to the dimension index so a dataset whose `classification_type` the server
 * left null still gets a stable, collision-free URL key.
 */
export function classificationTypeCode(dimension: InsDimension): string {
  const code = dimension.classification_type?.code?.trim()
  return code && code.length > 0 ? code : `DIM${dimension.index}`
}

/** INS labels its aggregate option "Total" — the only auto-pin we make. */
export function isTotalOption(label: string | null | undefined): boolean {
  return /^total/i.test((label ?? '').trim())
}

// ---------------------------------------------------------------------------
// The enabled guard
// ---------------------------------------------------------------------------

export interface ObservationScope {
  readonly dimensions: readonly InsDimension[] | null | undefined
  readonly search: Pick<StatisticsDatasetDetailSearch, 'teritoriu' | 'clasificari'>
}

/**
 * Whether the observations query may run.
 *
 * `insObservations` scans a 23.6M-row fact table. An unscoped query is a
 * 30-second server timeout, not a slow render, so the query is `enabled` only
 * when the request is narrow enough to hit an index:
 *
 * 1. a territory is pinned, or
 * 2. the dataset has no TERRITORIAL dimension (it is already national), or
 * 3. every CLASSIFICATION dimension is pinned.
 *
 * Case 3 requires at least one classification dimension: a dataset with a
 * territorial dimension and no classifications would otherwise pass on a
 * vacuous "all zero of them are pinned".
 *
 * An unknown dimension list (null, or empty because the detail query has not
 * resolved) is treated as "not safe", not as case 2. Absence of evidence that
 * the dataset is territorial is not evidence that it isn't, and guessing wrong
 * costs a 30-second timeout. A dataset with genuinely zero dimensions has no
 * observations to show anyway.
 */
export function isObservationsQueryEnabled(scope: ObservationScope): boolean {
  const dimensions = scope.dimensions ?? []
  if (dimensions.length === 0) return false

  if (parseTerritoryPin(scope.search.teritoriu)) return true

  const territorial = dimensionsOfType(dimensions, 'TERRITORIAL')
  if (territorial.length === 0) return true

  return areAllClassificationsPinned(scope)
}

/** True when the dataset has classification dimensions and each one is pinned. */
export function areAllClassificationsPinned(scope: ObservationScope): boolean {
  const classifications = dimensionsOfType(scope.dimensions, 'CLASSIFICATION')
  if (classifications.length === 0) return false

  const pinned = classificationPinMap(scope.search.clasificari)
  return classifications.every((dimension) =>
    pinned.has(classificationTypeCode(dimension)),
  )
}

/** Which pins the user still has to make. Drives the scope prompt copy. */
export function missingScopeRequirements(scope: ObservationScope): {
  readonly needsTerritory: boolean
  readonly missingClassificationTypes: readonly string[]
} {
  const pinned = classificationPinMap(scope.search.clasificari)
  const missingClassificationTypes = dimensionsOfType(
    scope.dimensions,
    'CLASSIFICATION',
  )
    .filter((dimension) => !pinned.has(classificationTypeCode(dimension)))
    .map(classificationTypeCode)

  return {
    needsTerritory:
      dimensionsOfType(scope.dimensions, 'TERRITORIAL').length > 0 &&
      !parseTerritoryPin(scope.search.teritoriu),
    missingClassificationTypes,
  }
}

/**
 * A chart of one series needs a single value per period, so it draws only once
 * the scope collapses the dataset to one cell per period: one territory (or
 * none to pick), every classification pinned, and one unit.
 */
export function isSeriesFullyPinned(params: {
  readonly dimensions: readonly InsDimension[] | null | undefined
  readonly search: StatisticsDatasetDetailSearch
}): boolean {
  const { dimensions, search } = params

  const territorial = dimensionsOfType(dimensions, 'TERRITORIAL')
  if (territorial.length > 0 && !parseTerritoryPin(search.teritoriu)) return false

  const classifications = dimensionsOfType(dimensions, 'CLASSIFICATION')
  if (classifications.length > 0) {
    const pinned = classificationPinMap(search.clasificari)
    const allPinned = classifications.every((dimension) =>
      pinned.has(classificationTypeCode(dimension)),
    )
    if (!allPinned) return false
  }

  const units = dimensionsOfType(dimensions, 'UNIT_OF_MEASURE')
  if (units.length > 0 && !search.unitate) return false

  return true
}

// ---------------------------------------------------------------------------
// Server filter
// ---------------------------------------------------------------------------

/** Zero-based offset for the requested observations page. */
export function detailOffset(search: StatisticsDatasetDetailSearch): number {
  const page = search.pagina ?? 1
  return (page - 1) * DETAIL_PAGE_SIZE
}

/** Effective `[from, to]` year window: URL pins, clamped to the dataset's range. */
export function resolveYearWindow(params: {
  readonly search: Pick<StatisticsDatasetDetailSearch, 'din' | 'pana'>
  readonly yearRange: readonly number[] | null | undefined
}): { readonly from: number; readonly to: number } | null {
  const range = params.yearRange
  const datasetFrom = range && range.length > 0 ? Math.min(...range) : null
  const datasetTo = range && range.length > 0 ? Math.max(...range) : null

  const from = params.search.din ?? datasetFrom
  const to = params.search.pana ?? datasetTo
  if (from === null || to === null) return null

  return from <= to ? { from, to } : { from: to, to: from }
}

/** The dataset's periodicity to draw at: the URL pin, else its only one. */
export function resolvePeriodicity(params: {
  readonly search: Pick<StatisticsDatasetDetailSearch, 'frecventa'>
  readonly periodicity: readonly InsPeriodicity[] | null | undefined
}): InsPeriodicity | null {
  if (params.search.frecventa) return params.search.frecventa

  const available = params.periodicity ?? []
  return available.length === 1 ? available[0] : null
}

/**
 * Builds the `InsObservationFilterInput` for the current URL state.
 *
 * `cod:` territory pins are NUTS3 county codes, so they carry an explicit
 * `territoryLevels` — without it `territoryCodes: ['CJ']` would also match a
 * LAU whose code happens to collide.
 */
export function buildObservationFilter(params: {
  readonly search: StatisticsDatasetDetailSearch
  readonly yearRange?: readonly number[] | null
}): InsObservationFilterInput {
  const { search } = params
  const filter: InsObservationFilterInput = {}

  const territory = parseTerritoryPin(search.teritoriu)
  if (territory?.kind === 'siruta') {
    filter.sirutaCodes = [territory.value]
  } else if (territory?.kind === 'cod') {
    filter.territoryCodes = [territory.value]
    filter.territoryLevels = ['NUTS3']
  }

  // `InsObservationFilterInput` takes a flat list of value codes, so two
  // dimensions that both name their aggregate `total` collapse to one entry.
  // Deduplicating keeps the request honest about that rather than sending a
  // list the server would read as a repeated constraint.
  const classifications = parseClassificationPins(search.clasificari)
  if (classifications.length > 0) {
    filter.classificationValueCodes = [
      ...new Set(classifications.map((pin) => pin.value)),
    ]
  }

  if (search.unitate) {
    filter.unitCodes = [search.unitate]
  }

  const window = resolveYearWindow({ search, yearRange: params.yearRange })
  if (window && (search.din !== undefined || search.pana !== undefined)) {
    filter.period = {
      type: 'YEAR',
      selection: {
        interval: {
          start: `${window.from}`,
          end: `${window.to}`,
        },
      },
    }
  }

  return filter
}
