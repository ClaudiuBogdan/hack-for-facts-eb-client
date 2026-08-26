import {
  legalStatusActCountsSchema,
  type LegalStatusActCounts,
} from '@/schemas/legal'
import { legislationStatusCountsFixture } from '../mocks/fixtures/legislation-status-counts'

/**
 * Fixtures are parsed through the same Zod schema the live adapter uses, so a
 * drift between fixture and contract fails here rather than in the UI.
 */
export async function fetchStatusActCountsMock(): Promise<LegalStatusActCounts> {
  return legalStatusActCountsSchema.parse(legislationStatusCountsFixture)
}
