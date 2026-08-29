import type { LegalActCounts } from '@/schemas/legal'

/**
 * Headline-counts fixture — the REAL production values behind
 * `legalActCounts(groupBy: STATUS)`, measured live 2026-08-26, so the strip
 * and the chips are exercised at true magnitude: the 7 status buckets summed
 * to 224 539 (= `legalActs.totalCount`), with `abrogat` folding the
 * `abrogat` (22 125) and `abrogat-partial` (762) buckets exactly like the
 * live derivation.
 *
 * Typed as the FULL `LegalActCounts` on purpose: the fixture models the
 * measured complete partition, where every number is known.
 */
export const legislationStatusCountsFixture: LegalActCounts = {
  total: 224_539,
  inVigoare: 194_924,
  modificat: 6_542,
  abrogat: 22_887,
}
