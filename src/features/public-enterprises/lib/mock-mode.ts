import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

/**
 * The public-enterprise facade serves the complete profile fixture only when
 * the AMEPIP core catalog id is mocked. Supplemental lanes are represented in
 * profile lane metadata; they do not enable the whole surface by themselves.
 */
const PUBLIC_ENTERPRISE_CORE_DATASET_ID = 'soe-amepip'

export function isPublicEnterpriseMockEnabled(): boolean {
  return isMockDataEnabled(PUBLIC_ENTERPRISE_CORE_DATASET_ID)
}
