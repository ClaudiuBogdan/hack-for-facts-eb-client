import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { legalResolveHitSchema, type LegalResolveHit } from '@/schemas/legal'

const RESOLVE_QUERY = /* GraphQL */ `
  query LegalResolve($dim: String!, $q: String!, $limit: Int!) {
    legalResolve(dim: $dim, q: $q, limit: $limit) {
      kind
      value
      label
      score
      hint
    }
  }
`

/**
 * Live citation/alias resolver (`legalResolve(dim: "act")`). Returns EVERY
 * candidate — 'codul fiscal' legitimately maps to two acts, and surfacing the
 * ambiguity is the contract; picking one silently is the one forbidden move.
 */
export async function resolveLegalActsLive(
  q: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<LegalResolveHit[]> {
  const data = await graphqlQuery<{ legalResolve: unknown[] }>(
    RESOLVE_QUERY,
    { dim: 'act', q, limit },
    { operationName: 'legalResolve', auth: 'none', signal },
  )
  const hits = Array.isArray(data.legalResolve) ? data.legalResolve : []
  return hits.map((hit) => {
    const raw = hit && typeof hit === 'object' ? (hit as Record<string, unknown>) : {}
    return legalResolveHitSchema.parse({
      kind: typeof raw.kind === 'string' ? raw.kind : 'act',
      value: String(raw.value ?? ''),
      label: typeof raw.label === 'string' ? raw.label : String(raw.value ?? ''),
      score: typeof raw.score === 'number' ? raw.score : null,
      hint: typeof raw.hint === 'string' ? raw.hint : null,
    })
  })
}
