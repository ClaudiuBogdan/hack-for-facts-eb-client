import type { EntityPageRouteId, EntityPageRoutePolicy } from '../types'

export type ResolveEntityPageRoutePolicyInput = {
  readonly routeId: EntityPageRouteId
  readonly cui: string
}

type EntityPageRoutePolicyDefinition = {
  readonly pathnameSegment: string
  readonly canonicalOwnerRouteId: EntityPageRouteId
  readonly shareImageOwnerRouteId: EntityPageRouteId
  readonly isIndexable: boolean
}

const ENTITY_PAGE_ROUTE_POLICY_DEFINITIONS = {
  entities: {
    pathnameSegment: 'entities',
    canonicalOwnerRouteId: 'entities',
    shareImageOwnerRouteId: 'entities',
    isIndexable: true,
  },
  primarie: {
    pathnameSegment: 'primarie',
    canonicalOwnerRouteId: 'entities',
    shareImageOwnerRouteId: 'entities',
    isIndexable: false,
  },
} as const satisfies Record<EntityPageRouteId, EntityPageRoutePolicyDefinition>

function encodeEntityPageCui(cui: string): string {
  return encodeURIComponent(cui.trim())
}

function getEntityPageRoutePolicyDefinition(
  routeId: EntityPageRouteId,
): EntityPageRoutePolicyDefinition {
  return ENTITY_PAGE_ROUTE_POLICY_DEFINITIONS[routeId]
}

function buildEntityPageRoutePathname(
  routeId: EntityPageRouteId,
  cui: string,
): string {
  const { pathnameSegment } = getEntityPageRoutePolicyDefinition(routeId)
  return `/${pathnameSegment}/${encodeEntityPageCui(cui)}`
}

export function resolveEntityPageCanonicalPathname(
  input: ResolveEntityPageRoutePolicyInput,
): string {
  const { canonicalOwnerRouteId } = getEntityPageRoutePolicyDefinition(input.routeId)
  return buildEntityPageRoutePathname(canonicalOwnerRouteId, input.cui)
}

export function resolveEntityPageShareImagePathname(
  input: ResolveEntityPageRoutePolicyInput,
): string {
  const { shareImageOwnerRouteId } = getEntityPageRoutePolicyDefinition(input.routeId)
  return `${buildEntityPageRoutePathname(shareImageOwnerRouteId, input.cui)}/share-image.png`
}

export function resolveEntityPageIndexability(
  input: ResolveEntityPageRoutePolicyInput,
): boolean {
  return getEntityPageRoutePolicyDefinition(input.routeId).isIndexable
}

export function resolveEntityPageRoutePolicy(
  input: ResolveEntityPageRoutePolicyInput,
): EntityPageRoutePolicy {
  return {
    routeId: input.routeId,
    canonicalPathname: resolveEntityPageCanonicalPathname(input),
    shareImagePathname: resolveEntityPageShareImagePathname(input),
    isIndexable: resolveEntityPageIndexability(input),
  }
}
