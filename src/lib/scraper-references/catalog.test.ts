import { describe, expect, it } from 'vitest'

import {
  getScraperDatasetById,
  listMockFirstDatasets,
  resolveScrapperPath,
  SCRAPPER_DOC_PATHS,
} from './index'

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
})
