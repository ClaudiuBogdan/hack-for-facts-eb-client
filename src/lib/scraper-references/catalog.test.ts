import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getScraperDatasetById,
  isMockDataEnabled,
  listMockFirstDatasets,
  resolveScrapperPath,
  SCRAPPER_DOC_PATHS,
} from './index'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('scraper-references', () => {
  it('resolves known dataset entries', () => {
    const pnrr = getScraperDatasetById('pnrr-projects')

    expect(pnrr).toBeDefined()
    expect(pnrr?.clientFeaturePaths).toContain('src/features/pnrr/')
    expect(pnrr?.joinKeys).toContain('id_angajament')
  })

  it('lists datasets that still need mock-first work', () => {
    const mockFirst = listMockFirstDatasets()

    expect(mockFirst.some((entry) => entry.id === 'political-map-schema')).toBe(
      true,
    )
    expect(mockFirst.some((entry) => entry.id === 'budget-execution')).toBe(
      false,
    )
  })

  it('builds scrapper doc paths from the configured repo root', () => {
    expect(resolveScrapperPath(SCRAPPER_DOC_PATHS.sourceInventory)).toBe(
      '../hack-for-facts-eb-scrapper/experimental/docs/source-inventory.md',
    )
  })

  it('supports the scoped mock dataset wildcard', () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
    vi.stubEnv('VITE_MOCK_DATASETS', 'all')

    expect(isMockDataEnabled('public-investments')).toBe(true)
    expect(isMockDataEnabled('investments-anghel-saligny')).toBe(true)
  })

  it('matches scoped mock dataset ids case-insensitively', () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
    vi.stubEnv('VITE_MOCK_DATASETS', ' INVESTMENTS-ANGHEL-SALIGNY ')

    expect(isMockDataEnabled('investments-anghel-saligny')).toBe(true)
    expect(isMockDataEnabled('investments-pndl')).toBe(false)
  })
})
