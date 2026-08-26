import {
  legalDomainActCountsSchema,
  type LegalDomainActCounts,
} from '@/schemas/legal'
import { legislationDomainCountsFixture } from '../mocks/fixtures/legislation-domain-counts'

/**
 * Fixtures are parsed through the same Zod schema the live adapter uses, so a
 * drift between fixture and contract fails here rather than in the UI.
 */
export async function fetchDomainActCountsMock(): Promise<LegalDomainActCounts> {
  return legalDomainActCountsSchema.parse(legislationDomainCountsFixture)
}
