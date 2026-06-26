const COUNTY_ENTITY_TYPE = 'admin_county_council'
const PUBLIC_ENTERPRISE_ENTITY_TYPE = 'public_enterprise'

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

export function buildPublicEnterprisePath(cui: string): string {
  return `/intreprinderi-publice/${encodeURIComponent(cui.trim())}`
}

export function isNonCountyUatEntity(
  input: EntityNavigationTargetInput,
): boolean {
  return input.isUat === true && input.entityType !== COUNTY_ENTITY_TYPE
}

export function buildPreferredEntityPath(
  input: EntityNavigationTargetInput,
): string {
  if (input.entityType === PUBLIC_ENTERPRISE_ENTITY_TYPE) {
    return buildPublicEnterprisePath(input.cui)
  }

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
