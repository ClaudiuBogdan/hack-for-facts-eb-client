import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { graphqlQuery } from '@/lib/graphql/graphql-client'

/**
 * The enterprise page prototype's live read, through the dev server's proxy:
 * the public-enterprise profile with every indicator page, the SEAP counts as
 * buyer and seller, then each controlling authority's budget record and the
 * other enterprises the lists give it. The company side (status, statements)
 * is the company page's own read (`usePrivateCompanyProfile`), so the two
 * pages show the same figures. Every value is the API's; a missing one stays
 * null.
 */

const indicatorSchema = z.object({
  year: z.number(),
  sourceSheet: z.string(),
  version: z.string(),
  indicatorKey: z.string(),
  kpiCode: z.string().nullable(),
  indicatorName: z.string(),
  measureUnit: z.string().nullable(),
  valueKind: z.enum(['number', 'boolean', 'text', 'empty']),
  rawValue: z.string().nullable(),
  numericValue: z.string().nullable(),
  booleanValue: z.boolean().nullable(),
})
export type IndicatorCell = z.infer<typeof indicatorSchema>

const connectionSchema = z.object({
  snapshotId: z.string().nullable().optional(),
  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
  edges: z.array(z.object({ node: indicatorSchema })),
})

const observationSchema = z.object({
  sourceFamily: z.enum(['amepip_company_year', 'amepip_form_group', 's1001', 'json_apt']),
  observedYear: z.number().nullable(),
  statusRaw: z.string().nullable(),
  statusNormalized: z.string().nullable(),
  observedName: z.string().nullable(),
  sourceUrl: z.string().nullable(),
})
export type Observation = z.infer<typeof observationSchema>

const edgeSchema = z.object({
  sourceFamily: z.enum(['s1001', 'json_apt']),
  authorityCui: z.string().nullable(),
  authorityName: z.string().nullable(),
  authorityLevel: z.string(),
  aptTypeId: z.number().nullable(),
  enterpriseStatusRaw: z.string().nullable(),
  sourceUrl: z.string().nullable(),
})
export type ControlEdge = z.infer<typeof edgeSchema>

const sourceSchema = z.object({
  family: z.enum(['amepip', 's1001', 'json_apt']),
  laneStatus: z.enum(['available', 'partial', 'unavailable']),
  observedAt: z.string().nullable(),
  sourceLastModifiedAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
})
export type SourceLane = z.infer<typeof sourceSchema>

const profileSchema = z.object({
  cui: z.string(),
  isCurrentMember: z.boolean(),
  currentFamilies: z.array(z.string()),
  organization: z.object({ name: z.string(), kind: z.string() }).nullable(),
  registryObservations: z.array(observationSchema),
  authorityEdges: z.array(edgeSchema),
  sources: z.array(sourceSchema),
  indicators: connectionSchema,
})
export type EnterpriseProfile = z.infer<typeof profileSchema>

const countSchema = z.object({ blocks: z.array(z.object({ recordCount: z.string().nullable() })) }).nullable()

const pageSchema = z.object({
  publicEnterprise: profileSchema.nullable(),
  buyerDirect: countSchema,
  buyerAwards: countSchema,
  sellerDirect: countSchema,
  sellerAwards: countSchema,
})

const entitySchema = z
  .object({
    organization: z.object({ name: z.string() }).nullable(),
    territory: z.object({ kind: z.string().nullable(), name: z.string().nullable(), countyName: z.string().nullable() }).nullable(),
    reference: z.object({ entityType: z.string().nullable() }).nullable(),
    budget: z.object({ presence: z.boolean() }).nullable(),
  })
  .nullable()
export type AuthorityEntity = z.infer<typeof entitySchema>

const peersSchema = z.object({
  total: z.number(),
  items: z.array(z.object({ cui: z.string(), organization: z.object({ name: z.string() }).nullable() })),
})
export type AuthorityPeers = z.infer<typeof peersSchema>

export type AuthorityRead = { readonly entity: AuthorityEntity; readonly peers: AuthorityPeers | null }

/** SEAP record counts, 2019–2026; null where the API answered without one. */
export type SeapCounts = {
  readonly buyerDirect: number | null
  readonly buyerAwards: number | null
  readonly sellerDirect: number | null
  readonly sellerAwards: number | null
}

export type EnterpriseRead = {
  readonly cui: string
  /** Null: the CUI is not a public-enterprise anchor. */
  readonly profile: EnterpriseProfile | null
  readonly indicators: readonly IndicatorCell[]
  readonly indicatorSnapshot: string | null
  readonly seap: SeapCounts
  readonly authorities: Readonly<Record<string, AuthorityRead>>
  readonly readAt: string
}

export const SEAP_SPAN = { from: 2019, to: 2026 } as const

const IND = 'year sourceSheet version indicatorKey kpiCode indicatorName measureUnit valueKind rawValue numericValue booleanValue'
const SPAN = `from: "${SEAP_SPAN.from}-01", to: "${SEAP_SPAN.to}-12"`
const CUI = /^\d{2,10}$/u

/** The page's one read. The CUI is checked to be digits before it enters the document. */
function pageDocument(cui: string): string {
  return `query PublicEnterprisePage($cui: CUI!) {
    publicEnterprise(cui: $cui) {
      cui isCurrentMember currentFamilies
      organization { name kind }
      registryObservations { sourceFamily observedYear statusRaw statusNormalized observedName sourceUrl }
      authorityEdges { sourceFamily authorityCui authorityName authorityLevel aptTypeId enterpriseStatusRaw sourceUrl }
      sources { family laneStatus observedAt sourceLastModifiedAt sourceUrl }
      indicators(first: 100) { snapshotId pageInfo { hasNextPage endCursor } edges { node { ${IND} } } }
    }
    buyerDirect: procurementStats(scope: {authorityCui: "${cui}", grain: direct_acquisition, ${SPAN}}) { blocks { recordCount } }
    buyerAwards: procurementStats(scope: {authorityCui: "${cui}", grain: contract, recordKind: "contract_award", ${SPAN}}) { blocks { recordCount } }
    sellerDirect: procurementStats(scope: {supplierCui: "${cui}", grain: direct_acquisition, ${SPAN}}) { blocks { recordCount } }
    sellerAwards: procurementStats(scope: {supplierCui: "${cui}", grain: contract, recordKind: "contract_award", ${SPAN}}) { blocks { recordCount } }
  }`
}

const MORE_INDICATORS = `query PublicEnterpriseIndicators($cui: CUI!, $after: String) {
  publicEnterprise(cui: $cui) { indicators(first: 100, after: $after) { pageInfo { hasNextPage endCursor } edges { node { ${IND} } } } }
}`

/** Each authority's budget record and the enterprises the lists give it, in one request. */
function authoritiesDocument(cuis: readonly string[]): string {
  const fields = cuis.map(
    (cui, index) => `e${index}: entity(cui: "${cui}") { organization { name } territory { kind name countyName } reference { entityType } budget { presence } }
      p${index}: publicEnterprises(filter: { authorityCuis: { in: ["${cui}"] } }, pageSize: 100) { total items { cui organization { name } } }`,
  )
  return `query PublicEnterpriseAuthorities { ${fields.join('\n')} }`
}

const countOf = (read: z.infer<typeof countSchema>) => {
  const value = read?.blocks[0]?.recordCount
  return value === null || value === undefined ? null : Number(value)
}

export async function readEnterprise(cui: string, signal?: AbortSignal): Promise<EnterpriseRead> {
  if (!CUI.test(cui)) throw new Error('not a CUI')
  const options = (operationName: string) => ({ operationName, auth: 'none' as const, signal })
  const page = pageSchema.parse(await graphqlQuery(pageDocument(cui), { cui }, options('PublicEnterprisePage')))
  const profile = page.publicEnterprise
  const indicators = profile ? profile.indicators.edges.map((edge) => edge.node) : []
  let info = profile?.indicators.pageInfo ?? { hasNextPage: false, endCursor: null }
  while (info.hasNextPage) {
    const more = z
      .object({ publicEnterprise: z.object({ indicators: connectionSchema }).nullable() })
      .parse(await graphqlQuery(MORE_INDICATORS, { cui, after: info.endCursor }, options('PublicEnterpriseIndicators')))
    if (!more.publicEnterprise) break
    indicators.push(...more.publicEnterprise.indicators.edges.map((edge) => edge.node))
    info = more.publicEnterprise.indicators.pageInfo
  }
  const authorityCuis = [...new Set((profile?.authorityEdges ?? []).map((edge) => edge.authorityCui).filter((value): value is string => value !== null && CUI.test(value)))]
  let authorities: Record<string, AuthorityRead> = {}
  if (authorityCuis.length > 0) {
    const data = z.record(z.string(), z.unknown()).parse(await graphqlQuery(authoritiesDocument(authorityCuis), {}, options('PublicEnterpriseAuthorities')))
    authorities = Object.fromEntries(
      authorityCuis.map((authority, index) => [
        authority,
        { entity: entitySchema.parse(data[`e${index}`] ?? null), peers: peersSchema.nullable().parse(data[`p${index}`] ?? null) },
      ]),
    )
  }
  return {
    cui,
    profile,
    indicators,
    indicatorSnapshot: profile?.indicators.snapshotId ?? null,
    seap: { buyerDirect: countOf(page.buyerDirect), buyerAwards: countOf(page.buyerAwards), sellerDirect: countOf(page.sellerDirect), sellerAwards: countOf(page.sellerAwards) },
    authorities,
    readAt: new Date().toISOString(),
  }
}

export function useEnterpriseRead(cui: string) {
  return useQuery({
    queryKey: ['public-companies-prototype', 'enterprise', cui],
    queryFn: ({ signal }) => readEnterprise(cui, signal),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}
