import type {
  InsDimension,
  InsEntitySelectorInput,
  InsObservation,
  InsObservationFilterInput,
  InsPeriodicity,
  InsTerritoryLevel,
} from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsLatestValue,
} from '@/schemas/statistics'

/**
 * The selection model behind `/statistici/seturi/$cod`.
 *
 * Every pin the user makes lives in the URL as an opaque `"KIND:VALUE"` string,
 * and every server filter is derived from those strings here. Keeping the codec
 * and the `InsObservationFilterInput` builder in one pure module means a shared
 * link and a live query can never disagree about what is pinned.
 *
 * Native detail selections use dataset-scoped Dn/member identities and are
 * validated by source-selection.ts. The permissive codecs below also support
 * comparison links until that surface completes its native migration.
 */

/** A partial URL-state write: every control patches exactly one key. */
export type DetailSearchPatch = Partial<StatisticsDatasetDetailSearch>

/** Rows per observations table page. */
export const DETAIL_PAGE_SIZE = 50

/** Options fetched per dimension-combobox page. Never load-all. */
export const DIMENSION_PAGE_SIZE = 20

/** Hard cap on chart points, before gap injection trims to the recent window. */
export const CHART_MAX_POINTS = 200

export interface ClassificationPin {
  readonly typeCode: string
  readonly valueCode: string
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
export function parseClassificationPin(pin: unknown): ClassificationPin | null {
  if (typeof pin !== 'string') return null
  const separator = pin.indexOf(':')
  if (separator <= 0 || separator === pin.length - 1) return null

  const typeCode = pin.slice(0, separator)
  const valueCode = pin.slice(separator + 1)
  if (valueCode.includes(':')) return null

  return { typeCode, valueCode }
}

export function encodeClassificationPin(pin: ClassificationPin): string {
  return `${pin.typeCode}:${pin.valueCode}`
}

/** Decodes the pin list, dropping malformed entries and later duplicates of a type. */
export function parseClassificationPins(
  pins: unknown,
): readonly ClassificationPin[] {
  if (!pins || !Array.isArray(pins)) return []

  const byType = new Map<string, ClassificationPin>()
  for (const raw of pins) {
    if (typeof raw !== 'string') continue
    const parsed = parseClassificationPin(raw)
    if (!parsed) continue
    if (byType.has(parsed.typeCode)) continue
    byType.set(parsed.typeCode, parsed)
  }

  return [...byType.values()]
}

/** Lookup of pinned value by classification type. */
export function classificationPinMap(
  pins: unknown,
): ReadonlyMap<string, string> {
  return new Map(
    parseClassificationPins(pins).map((pin) => [pin.typeCode, pin.valueCode]),
  )
}

/**
 * Keyed upsert: selecting `SEXE:feminin` when `SEXE:total` is pinned replaces
 * it. Appending would ask the server for two mutually exclusive values of the
 * same dimension and silently return the union.
 */
export function upsertClassificationPin(
  pins: unknown,
  next: ClassificationPin,
): readonly string[] {
  const existing = parseClassificationPins(pins)
  const replaced = existing.some((pin) => pin.typeCode === next.typeCode)

  const merged = replaced
    ? existing.map((pin) => (pin.typeCode === next.typeCode ? next : pin))
    : [...existing, next]

  return merged.map(encodeClassificationPin)
}

/** Removes the pin for one classification type, keeping the rest in order. */
export function removeClassificationPin(
  pins: unknown,
  type: string,
): readonly string[] {
  return parseClassificationPins(pins)
    .filter((pin) => pin.typeCode !== type)
    .map(encodeClassificationPin)
}

/**
 * Decodes `"siruta:54975"` (LAU) or `"cod:CJ"` (NUTS3). The two forms land on
 * different `InsObservationFilterInput` fields, which is why the kind is part
 * of the URL rather than inferred from the value's shape.
 */
export function parseTerritoryPin(pin: unknown): TerritoryPin | null {
  // Raw search values leak past validateSearch with their parsed type.
  if (!pin || typeof pin !== 'string') return null

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
// Server filter
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tier-0 resolution (server-resolved defaults + effective scope)
// ---------------------------------------------------------------------------

/** Rows fetched for the resolved series (also the table's backing rows). */
export const SERIES_MAX_ROWS = 1000

export const NATIONAL_ENTITY: InsEntitySelectorInput = {
  territoryCode: 'RO',
  territoryLevel: 'NATIONAL',
}

/**
 * Recognize canonical Romanian NUTS levels without inferring geographic
 * coverage. Unknown shapes stay invalid; the server still resolves identity.
 */
export function inferCodTerritoryLevel(
  value: string,
): InsTerritoryLevel | null {
  const trimmed = value.trim()
  if (trimmed.toUpperCase() === 'RO') return 'NATIONAL'
  if (/^RO[1-4]$/i.test(trimmed)) return 'NUTS1'
  if (/^RO(?:11|12|21|22|31|32|41|42)$/i.test(trimmed)) return 'NUTS2'
  if (/^[A-Za-z]{1,2}$/.test(trimmed)) return 'NUTS3'
  if (/^\d+$/.test(trimmed)) return 'LAU'
  return null
}

/**
 * Maps a territory pin to the `insLatestDatasetValues` entity selector.
 * Invalid pins yield null → the caller falls back to the national entity.
 */
export function territoryPinToEntity(
  pin: TerritoryPin | null,
): InsEntitySelectorInput | null {
  if (!pin) return null
  if (pin.kind === 'siruta') return { sirutaCode: pin.value }

  const level = inferCodTerritoryLevel(pin.value)
  if (level === null) return null
  if (level === 'LAU') return { sirutaCode: pin.value }
  return { territoryCode: pin.value.toUpperCase(), territoryLevel: level }
}

function singlePeriodicity(
  periodicity: readonly string[] | undefined,
): InsPeriodicity | null {
  return periodicity?.length === 1 ? (periodicity[0] as InsPeriodicity) : null
}

export interface EffectiveScope {
  /** The territory pin, or null = the national default. */
  readonly territory: TerritoryPin | null
  readonly territoryMode?:
    'explicit' | 'national-default' | 'source-coordinates'
  readonly territoryDefaulted: boolean
  /** type code → value code: URL pins over server-resolved defaults. */
  readonly classifications: ReadonlyMap<string, string>
  /** The classification types whose value came from the resolved default. */
  readonly defaultedTypes: ReadonlySet<string>
  readonly unitCode: string | null
  readonly unitDefaulted: boolean
  readonly periodicity: InsPeriodicity | null
}

/**
 * The effective tier-0 scope: URL pins where present, server-resolved
 * defaults everywhere else. Defaults are display-marked (defaultedTypes,
 * territoryDefaulted) and never written into the URL.
 */
export function buildEffectiveScope(params: {
  readonly search: StatisticsDatasetDetailSearch
  readonly latest: StatisticsLatestValue | null
}): EffectiveScope {
  const { search, latest } = params

  const rawTerritory = parseTerritoryPin(search.teritoriu)
  // Unknown cod: level (e.g. RO99) is treated as no pin — never guessed.
  const territory =
    rawTerritory?.kind === 'cod' &&
    inferCodTerritoryLevel(rawTerritory.value) === null
      ? null
      : rawTerritory
  const pinned = classificationPinMap(search.clasificari)

  const classifications = new Map<string, string>()
  const defaultedTypes = new Set<string>()

  for (const resolved of latest?.resolvedClassifications ?? []) {
    classifications.set(resolved.typeCode, resolved.code)
    defaultedTypes.add(resolved.typeCode)
  }
  for (const [typeCode, value] of pinned) {
    classifications.set(typeCode, value)
    defaultedTypes.delete(typeCode)
  }

  const unitCode =
    typeof search.unitate === 'string'
      ? search.unitate
      : (latest?.unitCode ?? null)

  return {
    territory,
    territoryDefaulted: territory === null,
    classifications,
    defaultedTypes,
    unitCode,
    unitDefaulted: !search.unitate && unitCode !== null,
    // Explicit product rule, never string grammar: the URL pin, else the
    // dataset's only cadence, else MONTHLY when offered (the freshest view),
    // else the resolved observation's own periodicity FIELD.
    periodicity:
      search.frecventa ??
      (singlePeriodicity(latest?.periodicity) ||
        (latest?.periodicity?.includes('MONTHLY') ? 'MONTHLY' : null) ||
        latest?.resolvedPeriodicity ||
        null),
  }
}

/**
 * The series/table filter for an effective scope. Always territory-scoped
 * (national by default) so it can never issue the unscoped 23.6M-row query.
 *
 * Both classification lists are sent when every type code is a real server
 * code (type-aware AND). The server's semantics share ONE value set across
 * types, so a multi-type scope can still match sibling cells —
 * {@link filterExactCell} makes the single-cell guarantee client-side.
 */
export function buildSeriesFilter(
  scope: EffectiveScope,
): InsObservationFilterInput {
  const filter: InsObservationFilterInput = {}

  if (scope.territory?.kind === 'siruta') {
    filter.sirutaCodes = [scope.territory.value]
  } else if (scope.territory?.kind === 'cod') {
    const level = inferCodTerritoryLevel(scope.territory.value)
    if (level === 'LAU') {
      filter.sirutaCodes = [scope.territory.value]
    } else if (level !== null) {
      filter.territoryCodes = [scope.territory.value.toUpperCase()]
      filter.territoryLevels = [level]
    } else {
      // Unknown cod: shape (e.g. RO99) — rejected, never guessed.
      filter.territoryLevels = ['NATIONAL']
    }
  } else if (scope.territoryMode !== 'source-coordinates') {
    filter.territoryLevels = ['NATIONAL']
  }

  if (scope.classifications.size > 0) {
    filter.classificationValueCodes = [
      ...new Set(scope.classifications.values()),
    ]
    const typeCodes = [...scope.classifications.keys()]
    if (typeCodes.every((code) => !code.startsWith('DIM'))) {
      filter.classificationTypeCodes = typeCodes
    }
  }

  if (scope.unitCode) {
    filter.unitCodes = [scope.unitCode]
  }

  return filter
}

/**
 * Keeps only the rows of the EXACT resolved cell: for every classification
 * type in scope, the row carries that type with the scoped value. This is the
 * guarantee the server filter cannot make (shared value set across types).
 */
export function filterExactCell(
  observations: readonly InsObservation[],
  classifications: ReadonlyMap<string, string>,
): readonly InsObservation[] {
  if (classifications.size === 0) return observations

  return observations.filter((observation) => {
    for (const [typeCode, valueCode] of classifications) {
      const match = (observation.classifications ?? []).find(
        (classification) => classification.type_code === typeCode,
      )
      if (!match || match.code !== valueCode) return false
    }
    return true
  })
}

/**
 * The canonical scope key: ONE serialization consumed by loaderDeps, query
 * keys, and initialData matching, so they can never drift apart. `din`/`pana`
 * window client-side and `pagina` pages client-side — neither enters the key.
 */
export function detailScopeKey(search: StatisticsDatasetDetailSearch): string {
  // frecventa and din/pana window CLIENT-side; pagina pages client-side —
  // none of them belongs in the fetch identity.
  return JSON.stringify({
    contract: 'native-source-selection-v1',
    // Undefined is omitted; explicit null is invalid input with a distinct key.
    teritoriu: search.teritoriu,
    clasificari: search.clasificari,
    unitate: search.unitate,
  })
}

/** The observed year span of fetched rows — never the catalog `year_range`. */
export function observedYearSpan(
  observations: readonly InsObservation[],
): { readonly from: number; readonly to: number } | null {
  let from = Number.POSITIVE_INFINITY
  let to = Number.NEGATIVE_INFINITY
  for (const observation of observations) {
    from = Math.min(from, observation.time_period.year)
    to = Math.max(to, observation.time_period.year)
  }
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null
  return { from, to }
}

// ---------------------------------------------------------------------------
// Comparison territory tokens (shared with /statistici/comparatii)
// ---------------------------------------------------------------------------

/**
 * A compared territory as the URL carries it: a discriminated token
 * (`siruta:54975` | `cod:CJ` | `cod:RO`) resolved to the territory CODE the
 * observation filter speaks, plus its DETERMINISTIC level (derived from the
 * token shape, so an empty result row still knows its level). A LAU's code IS
 * its SIRUTA code — one `territoryCodes` filter serves mixed levels; filter
 * keys AND together, so `sirutaCodes` must never be mixed in.
 */
export interface ComparisonTerritoryToken {
  readonly token: string
  readonly code: string
  readonly level: 'NATIONAL' | 'NUTS3' | 'LAU'
}

/**
 * Normalizes one URL entry: bare digits are a legacy SIRUTA-only link. Raw
 * search values leak past validateSearch with their parsed type, so numbers
 * are accepted and coerced; everything else non-string is rejected.
 */
export function parseComparisonToken(
  raw: unknown,
): ComparisonTerritoryToken | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const trimmed = String(raw).trim()
  if (/^\d{1,6}$/.test(trimmed)) {
    return { token: `siruta:${trimmed}`, code: trimmed, level: 'LAU' }
  }
  const match = /^(siruta|cod):([A-Za-z0-9]+)$/.exec(trimmed)
  if (!match) return null
  if (match[1] === 'siruta') {
    if (!/^\d{1,6}$/.test(match[2])) return null
    return { token: `siruta:${match[2]}`, code: match[2], level: 'LAU' }
  }
  const level = inferCodTerritoryLevel(match[2])
  // Region comparisons need matching labels and picker support before admission.
  if (level === null || level === 'NUTS1' || level === 'NUTS2') return null
  if (level === 'LAU') {
    return { token: `siruta:${match[2]}`, code: match[2], level: 'LAU' }
  }
  const code = match[2].toUpperCase()
  return { token: `cod:${code}`, code, level }
}

/** Parses the URL list, dropping malformed entries and duplicate codes. */
export function parseComparisonTokens(
  raw: readonly unknown[] | unknown,
): readonly ComparisonTerritoryToken[] {
  // A lone string (`?teritorii=siruta:54975` without brackets) is a list of one.
  const entries = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  const byCode = new Map<string, ComparisonTerritoryToken>()
  for (const entry of entries) {
    const parsed = parseComparisonToken(entry)
    if (!parsed || byCode.has(parsed.code)) continue
    byCode.set(parsed.code, parsed)
  }
  return [...byCode.values()]
}
