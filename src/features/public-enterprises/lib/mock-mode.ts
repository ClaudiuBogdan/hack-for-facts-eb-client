import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

/**
 * Dataset ids backing the public enterprise lanes. Mock-first only for now —
 * the AMEPIP core scraper is live but the client API is not connected yet, and
 * the supplemental lanes are deploy-gated.
 */
const PUBLIC_ENTERPRISE_DATASET_IDS = [
  'soe-amepip',
  'soe-regas-state-aid',
  'soe-controlling-authority',
  'soe-bvb-market',
  'soe-sanctions',
  'soe-governance-docs',
] as const

export function isPublicEnterpriseMockEnabled(): boolean {
  return PUBLIC_ENTERPRISE_DATASET_IDS.some((id) => isMockDataEnabled(id))
}
