import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

/**
 * Dataset ids that back the legal domain.
 * - `legal-portal-legislativ`: national legal acts, relationships, summaries.
 * - `legal-monitorul-oficial`: Official Gazette issue metadata + coverage.
 */
export const LEGAL_DATASET_IDS = [
  'legal-portal-legislativ',
  'legal-monitorul-oficial',
] as const

export function isLegalMockEnabled(): boolean {
  return LEGAL_DATASET_IDS.some((id) => isMockDataEnabled(id))
}
