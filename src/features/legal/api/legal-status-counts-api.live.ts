import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legalStatusActCountsSchema,
  type LegalStatusActCounts,
} from '@/schemas/legal'

/**
 * Live adapter for the headline counts — `legalActCounts(groupBy: STATUS)`,
 * ONE round-trip where the overview query used to carry four aliased
 * `legalActs(filter: { status }).totalCount` calls.
 *
 * STATUS **partitions the corpus exactly** — verified live 2026-08-26: the 7
 * buckets (in-vigoare 194 924, abrogat 22 125, modificat 6 542,
 * abrogat-partial 762, iesit-din-vigoare 124, suspendat 55, necunoscut 7)
 * sum to 224 539, which is precisely `legalActs.totalCount`. Each derivation
 * below therefore equals the filter it retired, verified against it live the
 * same night:
 *
 *  - `inVigoare` = the `in-vigoare` bucket;
 *  - `modificat` = the `modificat` bucket;
 *  - `abrogat`   = `abrogat` + `abrogat-partial` (the retired filter was
 *    `status: { in: ["abrogat", "abrogat-partial"] }`);
 *  - `total`     = the sum of ALL buckets, known or not — the server's
 *    `LegalActCountsResult` carries no `total` field (introspected
 *    2026-08-26), so the partition property is what makes the sum exact.
 *
 * Three deliberate absences in the query, mirroring the domain adapter: no
 * `filter` (the unfiltered buckets are what equal the retired counts), no
 * `topN` (the default 20 covers the whole 7-value vocabulary — measured
 * `bucketsTruncated: false`, `otherCount: 0`), no `label` (display labels
 * are the client's).
 *
 * The 0-vs-unknown contract is the domain grid's: a COMPLETE response
 * (nothing truncated, nothing folded into "other") proves an absent status
 * has zero acts — a true 0. Anything less leaves the affected numbers
 * ABSENT: a truncated response makes an omitted bucket unknowable, a
 * malformed bucket was served so it is never zero-filled, and `total` /
 * `abrogat` are only as known as every bucket they sum. The strip renders
 * nothing — never 0 — for an absent field.
 */
const STATUS_COUNTS_QUERY = /* GraphQL */ `
  query LegislationStatusCounts {
    legalActCounts(groupBy: STATUS) {
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

export async function fetchStatusActCountsLive(
  options: { readonly signal?: AbortSignal } = {},
): Promise<LegalStatusActCounts> {
  const data = await graphqlQuery<{ legalActCounts: Raw }>(
    STATUS_COUNTS_QUERY,
    undefined,
    {
      operationName: 'legislationStatusCounts',
      auth: 'none',
      signal: options.signal,
    },
  )

  const result = rec(data.legalActCounts)
  const buckets = Array.isArray(result.buckets) ? result.buckets : []
  const complete = result.bucketsTruncated === false && result.otherCount === 0

  const byStatus = new Map<string, number>()
  const servedKeys = new Set<string>()
  let malformed = false
  let sum = 0
  for (const bucket of buckets) {
    const { key, count } = rec(bucket)
    if (typeof key === 'string') servedKeys.add(key)
    if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
      const value = Math.trunc(count)
      // An unknown status key still counts acts — the partition is over the
      // WHOLE corpus — so it feeds `total` even though no named tile shows it.
      sum += value
      if (typeof key === 'string') byStatus.set(key, value)
    } else {
      // Served but unusable: this key is not zero-fillable, and any sum over
      // the buckets (total, abrogat) no longer covers the corpus.
      malformed = true
    }
  }

  // A bucket the complete partition omits provably holds zero acts; under
  // truncation an absent bucket stays unknown — 0 and "unknown" are
  // different claims. A present bucket is exact either way; a served-but-
  // malformed one is neither present nor absent, so it stays unknown.
  const statusCount = (key: string): number | undefined =>
    byStatus.get(key) ??
    (complete && !servedKeys.has(key) ? 0 : undefined)

  const abrogat = statusCount('abrogat')
  const abrogatPartial = statusCount('abrogat-partial')

  return legalStatusActCountsSchema.parse({
    ...(complete && !malformed && { total: sum }),
    ...(statusCount('in-vigoare') !== undefined && {
      inVigoare: statusCount('in-vigoare'),
    }),
    ...(statusCount('modificat') !== undefined && {
      modificat: statusCount('modificat'),
    }),
    ...(abrogat !== undefined &&
      abrogatPartial !== undefined && { abrogat: abrogat + abrogatPartial }),
  })
}
