import {
  hasSourcePinIntent,
  parseSourcePins,
  parseSourceUnit,
  sourcePinsFilter,
} from '@/lib/ins/source-pins'
import {
  insSourceLayoutSchema,
  insSourceMemberCodeSchema,
} from '@/lib/ins/source-contract'
import type {
  InsDatasetDetails,
  InsDimension,
  InsEntitySelectorInput,
  InsObservationFilterInput,
} from '@/schemas/ins'
import type {
  StatisticsDatasetDetailSearch,
  StatisticsLatestValue,
} from '@/schemas/statistics'
import type { RepresentativeCell } from './representative-series'
import {
  buildSeriesFilter,
  NATIONAL_ENTITY,
  parseTerritoryPin,
  territoryPinToEntity,
  type EffectiveScope,
} from './dataset-selection'

export type SourceSelectionIssue =
  'territory' | 'classifications' | 'unit' | 'descriptor'

/** A metadata-only bootstrap cannot silently obtain national defaults for explicit source pins. */
export function detailBootstrapEntity(
  search: StatisticsDatasetDetailSearch,
): InsEntitySelectorInput | null {
  if (hasSourcePinIntent(search.clasificari) || search.unitate !== undefined)
    return null
  if (search.teritoriu === undefined) return NATIONAL_ENTITY
  const pin = parseTerritoryPin(search.teritoriu)
  const entity = territoryPinToEntity(pin)
  return entity &&
    (!entity.sirutaCode || /^[1-9][0-9]*$/.test(entity.sirutaCode))
    ? entity
    : null
}

/** Editing one source axis must preserve unrelated malformed URL entries. */
export function editSourcePin(
  input: unknown,
  type: string,
  value: string | null,
): unknown {
  if (input !== undefined && !Array.isArray(input)) return input
  const pins: unknown[] = (input ?? []) as unknown[]
  const remaining = pins.filter(
    (raw) => typeof raw !== 'string' || raw.split(':')[0] !== type,
  )
  if (value !== null) remaining.push(`${type}:${value}`)
  return remaining.length ? remaining : undefined
}

/** Shared loader/page decision. Syntax validation never claims source member existence. */
export function resolveDetailSelection(params: {
  search: StatisticsDatasetDetailSearch
  dataset: InsDatasetDetails | null
  latest: StatisticsLatestValue | null
  /**
   * A cell chosen from the observations when the server resolved none
   * (`chooseRepresentativeCell`). It fills gaps exactly as the server's own
   * pick does — after it, before anything the reader pinned — and lands in
   * `defaultedTypes`, so the sentence marks it as a default rather than as a
   * choice.
   */
  representative?: RepresentativeCell | null
  /**
   * What a `teritoriu` does beside a pinned geography axis.
   *
   * `axis` — the detail page. The pinned axis member names the place, so
   * `teritoriu` only seeds a geography nothing has pinned yet (the hub map, a
   * territory page link in with it) and is ignored once the reader pins the
   * axis. Both at once could only agree or empty the page: ACC101B read
   * `teritoriu=cod:AB` beside an axis pinned to Arad and drew nothing.
   *
   * `intersect` — an entity page. There the territory is the page's subject,
   * fixed whatever the axes are pinned to, and it stays in every read as a
   * guard: no row outside the entity may be shown.
   */
  territoryBesidePinnedGeography?: 'axis' | 'intersect'
}): {
  scope: EffectiveScope
  filter: InsObservationFilterInput | null
  issues: readonly SourceSelectionIssue[]
  unresolvedDimensions: readonly InsDimension[]
  canDerive: boolean
  /**
   * True when the read cannot be sent at all yet. `insObservations` refuses a
   * non-geographic matrix with neither a classification pin nor a unit —
   * „needs a classification pin or a unit for a non-geographic dataset" — and
   * a matrix like ACC102C has no territorial axis to stand in for one. With
   * no server-resolved default there is nothing to anchor the read on, so the
   * page has to find a unit before it can ask for anything.
   */
  needsSourceAnchor: boolean
} {
  const {
    search,
    dataset,
    latest,
    representative,
    territoryBesidePinnedGeography = 'axis',
  } = params
  const issues = new Set<SourceSelectionIssue>()
  const dimensions = dataset?.dimensions ?? []
  const axes = dimensions.filter(
    (d) => d.type === 'CLASSIFICATION' || d.type === 'TERRITORIAL',
  )
  const geoAxes = new Set(
    dimensions
      .filter((d) => d.type === 'TERRITORIAL')
      .map((d) => `D${d.index}`),
  )
  const declaredAxes = new Set(axes.map((d) => `D${d.index}`))
  if (!dataset || !insSourceLayoutSchema.safeParse(dataset).success)
    issues.add('descriptor')

  const parsedPins = parseSourcePins(search.clasificari, declaredAxes)
  const explicit = parsedPins.pins
  if (!parsedPins.valid) issues.add('classifications')
  const explicitGeo = [...explicit.keys()].some((type) => geoAxes.has(type))

  const axisNamesTerritory =
    explicitGeo && territoryBesidePinnedGeography === 'axis'
  const territory = axisNamesTerritory
    ? null
    : parseTerritoryPin(search.teritoriu)
  const territoryEntity = territoryPinToEntity(territory)
  if (
    !axisNamesTerritory &&
    search.teritoriu !== undefined &&
    (!territory ||
      !territoryEntity ||
      (territoryEntity.sirutaCode !== undefined &&
        !/^[1-9][0-9]*$/.test(territoryEntity.sirutaCode)))
  )
    issues.add('territory')
  const classifications = new Map<string, string>()
  const defaultedTypes = new Set<string>()
  if (latest?.hasData && latest.matchStrategy !== 'AMBIGUOUS_GEOGRAPHY') {
    for (const entry of latest.resolvedClassifications) {
      if (
        declaredAxes.has(entry.typeCode) &&
        insSourceMemberCodeSchema.safeParse(entry.code).success &&
        !(explicitGeo && geoAxes.has(entry.typeCode))
      ) {
        classifications.set(entry.typeCode, entry.code)
        defaultedTypes.add(entry.typeCode)
      }
    }
  }
  if (representative) {
    for (const [type, code] of representative.classifications) {
      if (
        !classifications.has(type) &&
        declaredAxes.has(type) &&
        insSourceMemberCodeSchema.safeParse(code).success &&
        !(explicitGeo && geoAxes.has(type))
      ) {
        classifications.set(type, code)
        defaultedTypes.add(type)
      }
    }
  }
  for (const [type, value] of explicit) {
    classifications.set(type, value)
    defaultedTypes.delete(type)
  }
  const unitCode =
    search.unitate === undefined
      ? (parseSourceUnit(latest?.unitCode) ??
        parseSourceUnit(representative?.unitCode))
      : parseSourceUnit(search.unitate)
  if (search.unitate !== undefined && unitCode === null) issues.add('unit')
  const scope: EffectiveScope = {
    territory,
    territoryMode: territory
      ? 'explicit'
      : explicitGeo
        ? 'source-coordinates'
        : 'national-default',
    territoryDefaulted: search.teritoriu === undefined && !explicitGeo,
    classifications,
    defaultedTypes,
    unitCode,
    unitDefaulted: search.unitate === undefined && unitCode !== null,
    periodicity:
      search.frecventa ??
      (dataset?.periodicity.length === 1
        ? dataset.periodicity[0]
        // A matrix declaring several cadences and resolving none left the page
        // with a complete coordinate it still could not draw.
        : (latest?.resolvedPeriodicity ??
          representative?.periodicity ??
          null)),
  }
  const unresolvedDimensions = axes.filter(
    (d) => !classifications.has(`D${d.index}`),
  )
  const incompleteGeo =
    explicitGeo && [...geoAxes].some((type) => !explicit.has(type))
  const needsSourceAnchor =
    geoAxes.size === 0 && classifications.size === 0 && unitCode === null
  // The legacy two-list representation loses pairing when IDs repeat across axes.
  const filter = buildSeriesFilter({ ...scope, classifications: new Map() })
  if (classifications.size > 0)
    filter.sourcePins = sourcePinsFilter(classifications)
  return {
    scope,
    filter: issues.size || incompleteGeo || needsSourceAnchor ? null : filter,
    issues: [...issues],
    unresolvedDimensions,
    canDerive:
      issues.size === 0 &&
      !incompleteGeo &&
      unresolvedDimensions.length === 0 &&
      unitCode !== null,
    needsSourceAnchor,
  }
}
