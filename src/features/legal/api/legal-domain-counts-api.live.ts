import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legalDomainActCountsSchema,
  legalDomainSlugSchema,
  type LegalDomainActCounts,
  type LegalDomainSlug,
} from '@/schemas/legal'

/**
 * Live adapter for the domain grid's counts — `legalActCounts(groupBy:
 * DOMAIN)`, the aggregate main-page.md §6.2 asked for (live since
 * 2026-08-26): all 16 cells from ONE round-trip, where a numbered grid used
 * to cost 16 per-cell `totalCount` queries.
 *
 * Three deliberate absences in the query:
 *  - no `filter`: the aggregate inherits the canonical-document-only join the
 *    `domain` filter compiles against, so an unfiltered bucket equals the
 *    `legalActs(filter: { domain })` totalCount behind the cell's click —
 *    verified live for administratie / mediu / energie /
 *    telecomunicatii-si-digital on 2026-08-26. Do not "broaden" it.
 *  - no `topN`: the default (20) covers the whole 16-value vocabulary —
 *    measured `bucketsTruncated: false`, `otherCount: 0`.
 *  - no `label`: the server serves null for DOMAIN; display labels are owned
 *    by the client (`lib/legal-domains.ts`).
 */
const DOMAIN_COUNTS_QUERY = /* GraphQL */ `
  query LegislationDomainCounts {
    legalActCounts(groupBy: DOMAIN) {
      bucketsTruncated
      otherCount
      buckets {
        key
        count
      }
    }
  }
`

type Raw = Record<string, unknown>

const rec = (value: unknown): Raw =>
  value && typeof value === 'object' ? (value as Raw) : {}

export async function fetchDomainActCountsLive(
  options: { readonly signal?: AbortSignal } = {},
): Promise<LegalDomainActCounts> {
  const data = await graphqlQuery<{ legalActCounts: Raw }>(
    DOMAIN_COUNTS_QUERY,
    undefined,
    {
      operationName: 'legislationDomainCounts',
      auth: 'none',
      signal: options.signal,
    },
  )

  const result = rec(data.legalActCounts)
  const buckets = Array.isArray(result.buckets) ? result.buckets : []

  const counts: Partial<Record<LegalDomainSlug, number>> = {}
  const servedKeys = new Set<string>()
  for (const bucket of buckets) {
    const { key, count } = rec(bucket)
    if (typeof key === 'string') servedKeys.add(key)
    // An unknown key is tolerated, never fatal: the vocabulary is controlled
    // in the pipeline, not at this boundary, and a 17th value has no cell to
    // render into anyway.
    const slug = legalDomainSlugSchema.safeParse(key)
    if (!slug.success) continue
    if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
      counts[slug.data] = Math.trunc(count)
    }
  }

  // A COMPLETE group-by (nothing truncated, nothing folded into "other")
  // proves an absent slug has zero acts — a true 0. Under truncation an
  // absent slug stays absent: 0 and "unknown" are different claims, and the
  // grid renders nothing for the latter. Slugs whose bucket arrived malformed
  // were served, so they are never zero-filled either.
  if (result.bucketsTruncated === false && result.otherCount === 0) {
    for (const slug of legalDomainSlugSchema.options) {
      if (!servedKeys.has(slug)) counts[slug] = 0
    }
  }

  return legalDomainActCountsSchema.parse(counts)
}
