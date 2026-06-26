import { describe, expect, it } from 'vitest'
import type { InsDataset } from '@/schemas/ins'
import {
  buildCoverageFromCatalog,
  buildDocsFallbackCoverage,
} from './coverage'

const baseDataset: InsDataset = {
  id: 'dataset:POP107D',
  code: 'POP107D',
  name_ro: 'Populație',
  name_en: null,
  definition_ro: null,
  definition_en: null,
  periodicity: ['ANNUAL'],
  year_range: [2020, 2024],
  dimension_count: 4,
  has_uat_data: true,
  has_county_data: true,
  has_siruta: true,
  sync_status: 'full',
  last_sync_at: null,
  context_code: null,
  context_name_ro: null,
  context_name_en: null,
  context_path: null,
  metadata: null,
}

describe('statistics coverage helpers', () => {
  it('builds docs fallback coverage from the 27/1898 contract', () => {
    expect(buildDocsFallbackCoverage()).toEqual({
      availableDatasetCount: 27,
      totalDatasetCount: 1898,
      catalogOnlyDatasetCount: 1871,
      partial: false,
    })
  })

  it('counts available datasets from full catalog nodes', () => {
    const coverage = buildCoverageFromCatalog({
      datasets: [
        baseDataset,
        { ...baseDataset, id: 'dataset:TUR101C', code: 'TUR101C', sync_status: 'PENDING' },
      ],
      totalCount: 2,
      hasNextPage: false,
    })

    expect(coverage.availableDatasetCount).toBe(1)
    expect(coverage.totalDatasetCount).toBe(2)
    expect(coverage.catalogOnlyDatasetCount).toBe(1)
    expect(coverage.partial).toBe(false)
  })

  it('marks truncated catalog pages as partial', () => {
    const coverage = buildCoverageFromCatalog({
      datasets: [baseDataset],
      totalCount: 10,
      hasNextPage: true,
    })

    expect(coverage.availableDatasetCount).toBe(1)
    expect(coverage.totalDatasetCount).toBe(10)
    expect(coverage.partial).toBe(true)
  })
})
