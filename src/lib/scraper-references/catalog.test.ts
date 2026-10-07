import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getScraperDatasetById,
  isMockDataEnabled,
  listMockFirstDatasets,
  resolveScrapperPath,
  SCRAPPER_DOC_PATHS,
  scraperDatasetCatalog,
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

  it('keeps implemented mock-first catalog entries wired to client paths', () => {
    const entries = [
      [
        'public-investments',
        'src/features/public-investments/',
        'src/schemas/public-investments.ts',
      ],
      [
        'investments-anghel-saligny',
        'src/features/public-investments/',
        'src/schemas/public-investments.ts',
      ],
      [
        'investments-pndl',
        'src/features/public-investments/',
        'src/schemas/public-investments.ts',
      ],
      ['elections', 'src/features/elections/', 'src/schemas/elections.ts'],
    ] as const

    for (const [datasetId, featurePath, schemaPath] of entries) {
      const entry = getScraperDatasetById(datasetId)

      expect(entry, datasetId).toBeDefined()
      expect(entry?.mockDataAvailable, datasetId).toBe(true)
      expect(entry?.clientFeaturePaths, datasetId).toContain(featurePath)
      expect(entry?.clientSchemaPaths, datasetId).toContain(schemaPath)
    }
  })

  it('registers the public-enterprise lanes the API serves as live, without mocks', () => {
    for (const datasetId of ['soe-amepip', 'soe-controlling-authority']) {
      const entry = getScraperDatasetById(datasetId)

      expect(entry?.apiReady, datasetId).toBe(true)
      expect(entry?.mockDataAvailable, datasetId).toBe(false)
      expect(entry?.clientFeaturePaths, datasetId).toContain('src/features/public-enterprises/')
    }
    for (const datasetId of ['soe-regas-state-aid', 'soe-bvb-market', 'soe-sanctions', 'soe-governance-docs']) {
      const entry = getScraperDatasetById(datasetId)

      expect(entry?.apiReady, datasetId).toBe(false)
      expect(entry?.mockDataAvailable, datasetId).toBe(false)
    }
  })

  it('does not register duplicate dataset ids', () => {
    const ids = scraperDatasetCatalog.map((entry) => entry.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('marks elections as privacy-sensitive because candidacy data names people', () => {
    expect(getScraperDatasetById('elections')?.privacySensitive).toBe(true)
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
