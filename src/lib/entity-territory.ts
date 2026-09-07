import type { EntityDetailsData } from '@/lib/api/entities'

type MapEntity = Pick<EntityDetailsData, 'entity_type' | 'is_territorial_executive' | 'uat'>

/** Native territory identity takes precedence over legacy entity type labels. */
export function isCountyCouncilEntity(entity: MapEntity | null | undefined): boolean {
  if (!entity) return false
  if (entity.is_territorial_executive !== undefined) {
    return entity.is_territorial_executive === true && entity.uat?.level === 'county'
  }
  return entity.entity_type === 'admin_county_council'
}
