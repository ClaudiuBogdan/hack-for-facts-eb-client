import { legislationFreshnessSchema, type LegislationFreshness } from '@/schemas/legal'
import { legislationFreshnessFixture } from '../mocks/fixtures/legislation-freshness'

/** Parsed through the live adapter's schema, so fixture drift fails here. */
export async function fetchLegislationFreshnessMock(): Promise<LegislationFreshness> {
  return legislationFreshnessSchema.parse(legislationFreshnessFixture)
}
