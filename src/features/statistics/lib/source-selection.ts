import {
  insSourceDimensionCodeSchema,
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
import {
  buildSeriesFilter,
  NATIONAL_ENTITY,
  parseTerritoryPin,
  territoryPinToEntity,
  type EffectiveScope,
} from './dataset-selection'

export type SourceSelectionIssue =
  'territory' | 'classifications' | 'unit' | 'descriptor'

function sourceUnit(input: unknown): string | null {
  const candidate =
    typeof input === 'number' && Number.isSafeInteger(input)
      ? String(input)
      : input
  const parsed = insSourceMemberCodeSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

/** A metadata-only bootstrap cannot silently obtain national defaults for explicit source pins. */
export function detailBootstrapEntity(
  search: StatisticsDatasetDetailSearch,
): InsEntitySelectorInput | null {
  if (search.clasificari !== undefined || search.unitate !== undefined)
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
}): {
  scope: EffectiveScope
  filter: InsObservationFilterInput | null
  issues: readonly SourceSelectionIssue[]
  unresolvedDimensions: readonly InsDimension[]
  canDerive: boolean
} {
  const { search, dataset, latest } = params
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

  const territory = parseTerritoryPin(search.teritoriu)
  const territoryEntity = territoryPinToEntity(territory)
  if (
    search.teritoriu !== undefined &&
    (!territory ||
      !territoryEntity ||
      (territoryEntity.sirutaCode !== undefined &&
        !/^[1-9][0-9]*$/.test(territoryEntity.sirutaCode)))
  )
    issues.add('territory')

  const explicit = new Map<string, string>()
  if (search.clasificari !== undefined) {
    if (
      !Array.isArray(search.clasificari) ||
      search.clasificari.length === 0 ||
      search.clasificari.length > 7
    ) {
      issues.add('classifications')
    } else {
      for (const raw of search.clasificari) {
        const parts = typeof raw === 'string' ? raw.split(':') : []
        const [type, value] = parts
        if (
          parts.length !== 2 ||
          !insSourceDimensionCodeSchema.safeParse(type).success ||
          !insSourceMemberCodeSchema.safeParse(value).success ||
          !declaredAxes.has(type) ||
          explicit.has(type)
        ) {
          issues.add('classifications')
        } else explicit.set(type, value)
      }
    }
  }
  const explicitGeo = [...explicit.keys()].some((type) => geoAxes.has(type))
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
  for (const [type, value] of explicit) {
    classifications.set(type, value)
    defaultedTypes.delete(type)
  }
  const unitCode =
    search.unitate === undefined
      ? sourceUnit(latest?.unitCode)
      : sourceUnit(search.unitate)
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
        : (latest?.resolvedPeriodicity ?? null)),
  }
  const unresolvedDimensions = axes.filter(
    (d) => !classifications.has(`D${d.index}`),
  )
  const incompleteGeo =
    explicitGeo && [...geoAxes].some((type) => !explicit.has(type))
  // The legacy two-list representation loses pairing when IDs repeat across axes.
  const filter = buildSeriesFilter({ ...scope, classifications: new Map() })
  if (classifications.size > 0)
    filter.sourcePins = [...classifications]
      .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
      .map(([type, memberCode]) => ({
        dimensionIndex: Number(type.slice(1)),
        memberCode,
      }))
  return {
    scope,
    filter: issues.size || incompleteGeo ? null : filter,
    issues: [...issues],
    unresolvedDimensions,
    canDerive:
      issues.size === 0 &&
      !incompleteGeo &&
      unresolvedDimensions.length === 0 &&
      unitCode !== null,
  }
}
