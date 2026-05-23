import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

const PRIVATE_COMPANY_DATASET_IDS = [
  'private-companies',
  'private-companies-onrc',
  'private-companies-anaf',
] as const

export function isPrivateCompanyMockEnabled(): boolean {
  return PRIVATE_COMPANY_DATASET_IDS.some((id) => isMockDataEnabled(id))
}
