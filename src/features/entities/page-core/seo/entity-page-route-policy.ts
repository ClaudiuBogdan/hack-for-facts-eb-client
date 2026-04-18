import type { EntityPageRouteId, EntityPageRoutePolicy } from '../types'

export type ResolveEntityPageRoutePolicyInput = {
  readonly routeId: EntityPageRouteId
  readonly cui: string
}

export type EntityPageRouteHeadSearchContext = {
  readonly lang?: string
}

export type EntityPageRouteHeadContract<TSeoSnapshot = unknown> = {
  readonly cui: string
  readonly routePolicy: EntityPageRoutePolicy
  readonly requestOrigin?: string
  readonly localeSearchContext: EntityPageRouteHeadSearchContext
  readonly seoSnapshot?: TSeoSnapshot | null
}

export type ResolveEntityPageRouteHeadContractInput<TSeoSnapshot = unknown> = {
  readonly routeId: EntityPageRouteId
  readonly cui: string
  readonly requestOrigin?: string
  readonly localeSearchContext?: EntityPageRouteHeadSearchContext
  readonly seoSnapshot?: TSeoSnapshot | null
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

export function resolveEntityPageRouteHeadContract<TSeoSnapshot = unknown>(
  input: ResolveEntityPageRouteHeadContractInput<TSeoSnapshot>,
): EntityPageRouteHeadContract<TSeoSnapshot> {
  return {
    cui: input.cui,
    routePolicy: resolveEntityPageRoutePolicy(input),
    ...(input.requestOrigin ? { requestOrigin: input.requestOrigin } : {}),
    ...(input.seoSnapshot !== undefined ? { seoSnapshot: input.seoSnapshot } : {}),
    localeSearchContext: input.localeSearchContext ?? {},
  }
}
