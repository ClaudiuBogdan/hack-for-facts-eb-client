import type { EntityDetailsData } from '@/lib/api/entities'

type PopulationEntity = Pick<EntityDetailsData, 'is_territorial_executive' | 'is_uat' | 'uat'>

/** Old API DTOs lack the new flag; an explicit false or null never falls back. */
export function supportsEntityPopulation(
  entity: PopulationEntity | null | undefined,
): entity is PopulationEntity & { uat: { population: number } } {
  if (!entity) return false
  const executive = entity.is_territorial_executive === undefined
    ? entity.is_uat
    : entity.is_territorial_executive
  const population = entity.uat?.population
  return executive === true && typeof population === 'number' && Number.isFinite(population) && population > 0
}
