import type { LegalDomainActCounts } from '@/schemas/legal'

/**
 * `legalActCounts(groupBy: DOMAIN)` fixture — the REAL buckets served by the
 * live API (2026-08-26): all 16 domain values, `bucketsTruncated: false`,
 * `otherCount: 0`. The values sum to 502 844 against a corpus of 224 539
 * acts — the domain overlap the grid's footnote discloses is IN the fixture,
 * so the mock render carries exactly the property the copy warns about.
 */
export const legislationDomainCountsFixture: LegalDomainActCounts = {
  administratie: 109969,
  'fiscal-si-bugetar': 63945,
  justitie: 62364,
  'economie-si-comert': 51249,
  'munca-si-protectie-sociala': 28000,
  'proprietate-si-urbanism': 27581,
  sanatate: 23109,
  'aparare-si-securitate': 22471,
  transport: 20925,
  educatie: 19060,
  mediu: 18126,
  agricultura: 15034,
  energie: 13532,
  cultura: 13360,
  'telecomunicatii-si-digital': 6950,
  altele: 7169,
}
