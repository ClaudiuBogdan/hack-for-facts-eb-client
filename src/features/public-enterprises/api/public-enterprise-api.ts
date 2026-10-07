import { z } from 'zod'

import { graphqlQuery, isGraphQLInvalidInput } from '@/lib/graphql/graphql-client'
import { throwIfCancelled } from '@/lib/ssr/deadline-signal'
import { isCanonicalCui } from '../lib/enterprise-cui'
import {
  publicEnterpriseAuthorityEntitySchema,
  publicEnterpriseIndicatorPageSchema,
  publicEnterprisePeersSchema,
  publicEnterpriseProfileSchema,
  type PublicEnterpriseAuthorityRead,
  type PublicEnterpriseIndicator,
  type PublicEnterpriseRead,
} from '@/schemas/public-enterprise-profile'

/**
 * One public enterprise's read for its page: the profile with every AMEPIP
 * indicator page, then each controlling authority's budget record and the
 * other enterprises the lists give it. The profile decides the page; a failed
 * indicator or authority read leaves that part unknown (`null`) and marks the
 * read partial, so the page says so and the render is not cached.
 */

/** The API's page size cap. */
const PAGE_SIZE = 100
/** The most indicator pages read: 258 cells is the largest enterprise today (design note §12.2). */
const MAX_INDICATOR_PAGES = 10

const INDICATOR_FIELDS = 'year sourceSheet version indicatorKey kpiCode indicatorName measureUnit valueKind rawValue numericValue booleanValue'

export const PUBLIC_ENTERPRISE_PROFILE_QUERY = `query PublicEnterpriseProfile($cui: CUI!) {
  publicEnterprise(cui: $cui) {
    cui
    isCurrentMember
    currentFamilies
    organization { name }
    registryObservations { sourceFamily observedYear statusRaw sourceUrl }
    authorityEdges { sourceFamily authorityCui authorityName authorityLevel enterpriseStatusRaw }
    sources { family laneStatus observedAt sourceLastModifiedAt sourceUrl }
    indicators(first: ${PAGE_SIZE}) { snapshotId pageInfo { hasNextPage endCursor } edges { node { ${INDICATOR_FIELDS} } } }
  }
}`

export const PUBLIC_ENTERPRISE_INDICATORS_QUERY = `query PublicEnterpriseIndicators($cui: CUI!, $after: String) {
  publicEnterprise(cui: $cui) {
    indicators(first: ${PAGE_SIZE}, after: $after) { snapshotId pageInfo { hasNextPage endCursor } edges { node { ${INDICATOR_FIELDS} } } }
  }
}`

/** Each authority's budget record and the enterprises the lists give it, in one request, one alias pair per authority. */
export function publicEnterpriseAuthoritiesQuery(count: number): string {
  const variables = Array.from({ length: count }, (_, index) => `$a${index}: CUI!, $p${index}: [String!]`).join(', ')
  const fields = Array.from(
    { length: count },
    (_, index) => `e${index}: entity(cui: $a${index}) { organization { name } territory { kind } reference { entityType } budget { presence } }
    p${index}: publicEnterprises(filter: { authorityCuis: { in: $p${index} } }, pageSize: ${PAGE_SIZE}) { total items { cui organization { name } } }`,
  )
  return `query PublicEnterpriseAuthorities(${variables}) {\n    ${fields.join('\n    ')}\n  }`
}

/** The API's reads stay under 50 aliases per request: two per authority. */
const MAX_AUTHORITIES = 20

const profileResponseSchema = z.object({
  publicEnterprise: publicEnterpriseProfileSchema.extend({ indicators: publicEnterpriseIndicatorPageSchema }).nullable(),
})

const indicatorsResponseSchema = z.object({
  publicEnterprise: z.object({ indicators: publicEnterpriseIndicatorPageSchema }).nullable(),
})

type Options = { readonly signal?: AbortSignal }

/**
 * Every indicator page after the first. Null when one fails, the snapshot
 * changes under the cursor (a cursor is pinned to it), or the pages do not
 * end: the cells are then unknown, never a short list.
 */
async function readRemainingIndicators(
  cui: string,
  first: z.infer<typeof publicEnterpriseIndicatorPageSchema>,
  { signal }: Options,
): Promise<readonly PublicEnterpriseIndicator[] | null> {
  const cells = first.edges.map((edge) => edge.node)
  let page = first
  for (let read = 1; page.pageInfo.hasNextPage; read += 1) {
    if (read >= MAX_INDICATOR_PAGES || !page.pageInfo.endCursor) return null
    try {
      const data = indicatorsResponseSchema.parse(
        await graphqlQuery(PUBLIC_ENTERPRISE_INDICATORS_QUERY, { cui, after: page.pageInfo.endCursor }, { operationName: 'PublicEnterpriseIndicators', auth: 'none', signal }),
      )
      const next = data.publicEnterprise?.indicators
      if (!next || next.snapshotId !== first.snapshotId) return null
      cells.push(...next.edges.map((edge) => edge.node))
      page = next
    } catch {
      // A reader who left: the abort goes through. A deadline or a failure: the cells are unknown.
      throwIfCancelled(signal)
      return null
    }
  }
  return cells
}

/** The authorities' records and their enterprises; null when the read fails. */
async function readAuthorities(cuis: readonly string[], { signal }: Options): Promise<Readonly<Record<string, PublicEnterpriseAuthorityRead>> | null> {
  if (cuis.length === 0) return {}
  if (cuis.length > MAX_AUTHORITIES) return null
  const variables = Object.fromEntries(cuis.flatMap((cui, index) => [[`a${index}`, cui], [`p${index}`, [cui]]]))
  try {
    const data = z
      .record(z.string(), z.unknown())
      .parse(await graphqlQuery(publicEnterpriseAuthoritiesQuery(cuis.length), variables, { operationName: 'PublicEnterpriseAuthorities', auth: 'none', signal }))
    return Object.fromEntries(
      cuis.map((cui, index) => [
        cui,
        { entity: publicEnterpriseAuthorityEntitySchema.parse(data[`e${index}`] ?? null), peers: publicEnterprisePeersSchema.parse(data[`p${index}`]) },
      ]),
    )
  } catch {
    throwIfCancelled(signal)
    return null
  }
}

export async function fetchPublicEnterprise(cui: string, { signal }: Options = {}): Promise<PublicEnterpriseRead> {
  const none: PublicEnterpriseRead = { cui, profile: null, indicators: null, authorities: null, partial: false }
  let answer: unknown
  try {
    answer = await graphqlQuery(PUBLIC_ENTERPRISE_PROFILE_QUERY, { cui }, { operationName: 'PublicEnterpriseProfile', auth: 'none', signal })
  } catch (error) {
    // A CUI the API refuses as malformed is no anchor: the page's 404, not a failed read.
    if (isGraphQLInvalidInput(error)) return none
    throw error
  }
  const found = profileResponseSchema.parse(answer).publicEnterprise
  if (!found) return none
  const { indicators: firstPage, ...profile } = found
  const authorityCuis = [...new Set(profile.authorityEdges.map((edge) => edge.authorityCui).filter((value): value is string => value !== null && isCanonicalCui(value)))]
  const [indicators, authorities] = await Promise.all([readRemainingIndicators(cui, firstPage, { signal }), readAuthorities(authorityCuis, { signal })])
  // A lane the API reports unavailable leaves its part unread: the render is not cached and the next visit reads again.
  const lanesDown = profile.sources.some((source) => source.laneStatus === 'unavailable')
  return { cui, profile, indicators, authorities, partial: indicators === null || authorities === null || lanesDown }
}
