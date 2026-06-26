import { isMockDataEnabled } from '@/lib/scraper-references/mock-mode'

const JUSTICE_DATASET_IDS = ['legal-judicial-cases'] as const

export function isJusticeMockEnabled(): boolean {
  return JUSTICE_DATASET_IDS.some((id) => isMockDataEnabled(id))
}
