const COUNTY_ENTITY_TYPE = 'admin_county_council'

export type EntitySelectionBehavior =
  | 'navigate-to-entity'
  | 'navigate-to-preferred-entity'
  | 'callback-only'

type EntityNavigationTargetInput = {
  readonly cui: string
  readonly entityType?: string | null
  readonly isUat?: boolean | null
}

export function buildEntityDetailsPath(cui: string): string {
  return `/entities/${encodeURIComponent(cui.trim())}`
}

export function isNonCountyUatEntity(
  input: EntityNavigationTargetInput,
): boolean {
  return input.isUat === true && input.entityType !== COUNTY_ENTITY_TYPE
}

export function buildPreferredEntityPath(
  input: EntityNavigationTargetInput,
): string {
  return buildEntityDetailsPath(input.cui)
}

export function buildEntitySelectionPath(
  input: EntityNavigationTargetInput,
  selectionBehavior: EntitySelectionBehavior,
): string {
  if (selectionBehavior === 'navigate-to-entity') {
    return buildEntityDetailsPath(input.cui)
  }

  return buildPreferredEntityPath(input)
}
