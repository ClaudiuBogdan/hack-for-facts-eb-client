import { graphqlQuery } from '@/lib/graphql/graphql-client'

export type BudgetDimension =
  | 'functionalClassifications'
  | 'economicClassifications'
  | 'budgetSectors'
  | 'fundingSources'

interface DimensionPage<T> {
  nodes: T[]
  pageInfo: { totalCount: number; hasNextPage: boolean }
}

/** Collect a complete small catalog; server page limits never imply completeness. */
export async function fetchBudgetDimensionNodes<T>(
  query: string,
  field: BudgetDimension,
  variables: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T[]> {
  // Request sizes match current server caps; pageInfo determines completeness.
  const limit = field === 'budgetSectors' || field === 'fundingSources' ? 200 : 2000
  const identityField = field === 'budgetSectors' ? 'sector_id' : field === 'fundingSources' ? 'source_id' : 'code'
  const identities = new Set<string>()
  const nodes: T[] = []
  let totalCount: number | undefined
  for (;;) {
    const data = await graphqlQuery<Record<BudgetDimension, DimensionPage<T>>>(
      query,
      { ...variables, limit, offset: nodes.length },
      { signal, auth: 'none' },
    )
    const page = data[field]
    const count = page?.pageInfo?.totalCount
    if (!Array.isArray(page?.nodes) || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Invalid ${field} catalog page`)
    }
    if (totalCount !== undefined && count !== totalCount) {
      throw new Error(`${field} catalog changed during pagination; retry the request`)
    }
    totalCount = count
    for (const node of page.nodes) {
      const identity: unknown = typeof node === 'object' && node !== null ? Reflect.get(node, identityField) : undefined
      if (typeof identity !== 'string' || identity.length === 0 || identities.has(identity)) {
        throw new Error(`Invalid or duplicate ${field} catalog identity`)
      }
      identities.add(identity)
    }
    nodes.push(...page.nodes)
    if (nodes.length > count || page.pageInfo.hasNextPage !== (nodes.length < count)) {
      throw new Error(`Incomplete ${field} catalog pagination`)
    }
    if (!page.pageInfo.hasNextPage) return nodes
    if (page.nodes.length === 0) throw new Error(`Stalled ${field} catalog pagination`)
  }
}
