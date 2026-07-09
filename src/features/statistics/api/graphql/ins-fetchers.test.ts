import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@/lib/api/graphql', () => ({
  graphqlRequest: vi.fn(),
}))

import {
  getInsDatasetDimensions,
  getInsDatasetHistory,
  getInsDatasetsCatalog,
} from './ins-fetchers'
import { graphqlRequest } from '@/lib/api/graphql'

describe('ins fetchers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('paginates historical observations until completion', async () => {
    vi.mocked(graphqlRequest)
      .mockResolvedValueOnce({
        insObservations: {
          nodes: [
            {
              dataset_code: 'POP107D',
              value: '100',
              value_status: null,
              time_period: { iso_period: '2023', year: 2023, quarter: null, month: null, periodicity: 'ANNUAL' },
              territory: null,
              unit: null,
              classifications: [],
            },
          ],
          pageInfo: { totalCount: 2, hasNextPage: true, hasPreviousPage: false },
        },
      })
      .mockResolvedValueOnce({
        insObservations: {
          nodes: [
            {
              dataset_code: 'POP107D',
              value: '90',
              value_status: null,
              time_period: { iso_period: '2022', year: 2022, quarter: null, month: null, periodicity: 'ANNUAL' },
              territory: null,
              unit: null,
              classifications: [],
            },
          ],
          pageInfo: { totalCount: 2, hasNextPage: false, hasPreviousPage: true },
        },
      })

    const result = await getInsDatasetHistory({
      datasetCode: 'POP107D',
      filter: { sirutaCodes: ['143450'] },
      pageSize: 1,
      maxPages: 10,
    })

    expect(graphqlRequest).toHaveBeenCalledTimes(2)
    expect(result.totalCount).toBe(2)
    expect(result.partial).toBe(false)
    expect(result.observations).toHaveLength(2)
  })

  it('advances history offset by returned rows to avoid skips', async () => {
    vi.mocked(graphqlRequest)
      .mockResolvedValueOnce({
        insObservations: {
          nodes: [
            {
              dataset_code: 'POP107D',
              value: '100',
              value_status: null,
              time_period: { iso_period: '2025', year: 2025, quarter: null, month: null, periodicity: 'ANNUAL' },
              territory: null,
              unit: null,
              classifications: [],
            },
            {
              dataset_code: 'POP107D',
              value: '99',
              value_status: null,
              time_period: { iso_period: '2024', year: 2024, quarter: null, month: null, periodicity: 'ANNUAL' },
              territory: null,
              unit: null,
              classifications: [],
            },
          ],
          pageInfo: { totalCount: 3, hasNextPage: true, hasPreviousPage: false },
        },
      })
      .mockResolvedValueOnce({
        insObservations: {
          nodes: [
            {
              dataset_code: 'POP107D',
              value: '98',
              value_status: null,
              time_period: { iso_period: '2023', year: 2023, quarter: null, month: null, periodicity: 'ANNUAL' },
              territory: null,
              unit: null,
              classifications: [],
            },
          ],
          pageInfo: { totalCount: 3, hasNextPage: false, hasPreviousPage: true },
        },
      })

    const result = await getInsDatasetHistory({
      datasetCode: 'POP107D',
      filter: { sirutaCodes: ['143450'] },
      pageSize: 1000,
      maxPages: 10,
    })

    expect(graphqlRequest).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('query InsDatasetHistory'),
      expect.objectContaining({
        datasetCode: 'POP107D',
        limit: 1000,
        offset: 0,
      })
    )
    expect(graphqlRequest).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('query InsDatasetHistory'),
      expect.objectContaining({
        datasetCode: 'POP107D',
        limit: 1000,
        offset: 2,
      })
    )

    expect(result.partial).toBe(false)
    expect(result.observations).toHaveLength(3)
  })

  it('forwards catalog filters to GraphQL', async () => {
    vi.mocked(graphqlRequest).mockResolvedValue({
      insDatasets: {
        nodes: [],
        pageInfo: { totalCount: 0, hasNextPage: false, hasPreviousPage: false },
      },
    })

    await getInsDatasetsCatalog({
      filter: { hasCountyData: true, rootContextCode: '2' },
      limit: 50,
      offset: 0,
    })

    expect(graphqlRequest).toHaveBeenCalledWith(
      expect.stringContaining('query InsDatasets'),
      expect.objectContaining({
        filter: { hasCountyData: true, rootContextCode: '2' },
        limit: 50,
        offset: 0,
      })
    )
  })

  it('loads dataset dimensions for selector ordering', async () => {
    vi.mocked(graphqlRequest).mockResolvedValue({
      insDatasets: {
        nodes: [
          {
            code: 'SAN104B',
            dimensions: [
              {
                index: 0,
                type: 'CLASSIFICATION',
                label_ro: 'Categorii',
                label_en: null,
                classification_type: { code: 'CAT', name_ro: 'Categorii', name_en: null },
              },
            ],
          },
        ],
      },
    })

    const result = await getInsDatasetDimensions('SAN104B')

    expect(graphqlRequest).toHaveBeenCalledWith(
      expect.stringContaining('query InsDatasetDimensions'),
      expect.objectContaining({ datasetCode: 'SAN104B' })
    )
    expect(result).toEqual({
      datasetCode: 'SAN104B',
      dimensions: [
        {
          index: 0,
          type: 'CLASSIFICATION',
          label_ro: 'Categorii',
          label_en: null,
          classification_type: { code: 'CAT', name_ro: 'Categorii', name_en: null },
        },
      ],
    })
  })
})
