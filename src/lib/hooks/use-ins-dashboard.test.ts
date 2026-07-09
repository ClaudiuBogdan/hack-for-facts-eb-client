import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/ins', () => ({
  getInsContexts: vi.fn(),
  getInsDatasetDimensions: vi.fn(),
  getInsDatasetHistory: vi.fn(),
  getInsDatasetsCatalog: vi.fn(),
  getInsObservationsSnapshotByDatasets: vi.fn(),
}))

import {
  insDatasetDimensionsQueryOptions,
  insDatasetHistoryQueryOptions,
} from './use-ins-dashboard'
import { getInsDatasetDimensions, getInsDatasetHistory } from '@/lib/api/ins'

describe('use-ins-dashboard query options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables history query when dataset code is empty', () => {
    const options = insDatasetHistoryQueryOptions({
      datasetCode: '',
      filter: { sirutaCodes: ['143450'] },
    })

    expect(options.enabled).toBe(false)
  })

  it('calls history API query function when enabled', async () => {
    vi.mocked(getInsDatasetHistory).mockResolvedValue({
      observations: [],
      totalCount: 0,
      partial: false,
    })

    const options = insDatasetHistoryQueryOptions({
      datasetCode: 'POP107D',
      filter: { sirutaCodes: ['143450'] },
      enabled: true,
    })

    await (options.queryFn as () => Promise<unknown>)()
    expect(getInsDatasetHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetCode: 'POP107D',
        filter: { sirutaCodes: ['143450'] },
      })
    )
  })

  it('disables dimensions query when dataset code is empty', () => {
    const options = insDatasetDimensionsQueryOptions({
      datasetCode: '',
    })

    expect(options.enabled).toBe(false)
  })

  it('calls dimensions API query function when enabled', async () => {
    vi.mocked(getInsDatasetDimensions).mockResolvedValue({
      datasetCode: 'SAN104B',
      dimensions: [],
    })

    const options = insDatasetDimensionsQueryOptions({
      datasetCode: 'san104b',
      enabled: true,
    })

    await (options.queryFn as () => Promise<unknown>)()
    expect(getInsDatasetDimensions).toHaveBeenCalledWith('SAN104B')
  })
})
