import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the logger module before importing entities
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock the graphql module
vi.mock('./graphql', () => ({
  graphqlRequest: vi.fn(),
}))

import {
  filterLineItems,
  getEntityDetails,
  getEntityRelationships,
  getEntityReports,
  getReportsConnection,
  getEntityExecutionLineItems,
  searchEntities,
  type ExecutionLineItem
} from './entities'
import { graphqlRequest } from './graphql'

// Helper to create mock line items
function createLineItem(overrides: Partial<ExecutionLineItem> = {}): ExecutionLineItem {
  return {
    line_item_id: 'test-id',
    account_category: 'ch',
    funding_source_id: 1,
    ytd_amount: 1000,
    quarterly_amount: 250,
    monthly_amount: 100,
    amount: 1000,
    ...overrides,
  }
}

describe('entities api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEntityDetails', () => {
    const mockParams = {
      cui: '123456',
      reportPeriod: { type: 'YEAR', selection: { interval: { start: '2024', end: '2024' } } } as const,
      normalization: 'total' as const,
      currency: 'RON' as const,
    }

    it('should fetch and return entity details successfully', async () => {
      const mockResponse = {
        entity: {
          cui: '123456',
          name: 'Test Entity',
          incomeTrend: { seriesId: 'income', data: [] },
          expenseTrend: { seriesId: 'expense', data: [] },
          balanceTrend: { seriesId: 'balance', data: [] },
        }
      }
      
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await getEntityDetails(mockParams)

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('query GetEntityDetails'),
        expect.objectContaining({
          cui: '123456',
          normalization: 'total',
          currency: 'RON'
        })
      )
      expect(result).toEqual(mockResponse.entity)
    })

    it('should handle null response from graphql', async () => {
      vi.mocked(graphqlRequest).mockResolvedValue({ entity: null })

      const result = await getEntityDetails(mockParams)

      expect(result).toBeNull()
    })

    it('should rethrow errors', async () => {
      const error = new Error('API Error')
      vi.mocked(graphqlRequest).mockRejectedValue(error)

      await expect(getEntityDetails(mockParams)).rejects.toThrow('API Error')
    })
  })

  describe('getEntityRelationships', () => {
    it('should return children and parents', async () => {
      const mockResponse = {
        entity: {
          children: [{ cui: '111', name: 'Child' }],
          parents: [{ cui: '222', name: 'Parent' }],
        }
      }
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await getEntityRelationships('123456')

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('query GetEntityRelationships'),
        { cui: '123456' }
      )
      expect(result).toEqual(mockResponse.entity)
    })

    it('should return empty arrays when response is null', async () => {
      vi.mocked(graphqlRequest).mockResolvedValue({ entity: null })

      const result = await getEntityRelationships('123456')

      expect(result).toEqual({ children: [], parents: [] })
    })
  })

  describe('getEntityReports', () => {
    it('should return reports connection', async () => {
      const mockResponse = {
        entity: {
          reports: {
            nodes: [{ report_id: '1' }],
            pageInfo: { totalCount: 1 }
          }
        }
      }
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await getEntityReports('123456')

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('query GetEntityReports'),
        expect.objectContaining({ cui: '123456' })
      )
      expect(result).toEqual(mockResponse.entity.reports)
    })

    it('should return null if entity not found', async () => {
      vi.mocked(graphqlRequest).mockResolvedValue({ entity: null })

      const result = await getEntityReports('123456')

      expect(result).toBeNull()
    })
  })

  describe('getReportsConnection', () => {
    it('should return reports connection', async () => {
      const mockResponse = {
        reports: {
          nodes: [{ report_id: '1' }],
          pageInfo: { totalCount: 1 }
        }
      }
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await getReportsConnection({})

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('query GetReports'),
        expect.any(Object)
      )
      expect(result).toEqual(mockResponse.reports)
    })
  })

  describe('getEntityExecutionLineItems', () => {
    const mockParams = {
      cui: '123456',
      reportPeriod: { type: 'YEAR', selection: { interval: { start: '2024', end: '2024' } } } as const,
      normalization: 'total' as const,
    }

    it('should fetch and merge execution line items', async () => {
      const mockResponse = {
        entity: {
          executionLineItemsCh: {
            nodes: [{ 
              line_item_id: '1', 
              account_category: 'ch',
              ytd_amount: 100,
              quarterly_amount: 25,
              monthly_amount: 10
            }]
          },
          executionLineItemsVn: {
            nodes: [{ 
              line_item_id: '2', 
              account_category: 'vn',
              ytd_amount: 200,
              quarterly_amount: 50,
              monthly_amount: 20
            }]
          }
        },
        fundingSources: { nodes: [] }
      }
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await getEntityExecutionLineItems(mockParams)

      expect(graphqlRequest).toHaveBeenCalled()
      expect(result.nodes).toHaveLength(2)
      // Verify amount mapping for YEAR type
      expect(result.nodes[0].amount).toBe(100)
      expect(result.nodes[1].amount).toBe(200)
    })

    it('should map amount correctly for monthly period', async () => {
      const mockResponse = {
        entity: {
          executionLineItemsCh: {
            nodes: [{ 
              line_item_id: '1', 
              monthly_amount: 10,
              ytd_amount: 100
            }]
          }
        }
      }
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await getEntityExecutionLineItems({
        ...mockParams,
        reportPeriod: { type: 'MONTH', selection: { interval: { start: '2024-01', end: '2024-01' } } }
      })

      expect(result.nodes[0].amount).toBe(10)
    })
  })

  describe('searchEntities', () => {
    it('should return search results', async () => {
      const mockResponse = {
        entities: {
          nodes: [{ cui: '123', name: 'Test' }]
        }
      }
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await searchEntities('test')

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('query EntitySearch'),
        expect.objectContaining({
          filter: expect.objectContaining({ search: 'test' }),
        })
      )
      expect(result).toEqual(mockResponse.entities.nodes)
    })

    it('applies UAT search filters for campaign selector', async () => {
      const mockResponse = {
        entities: {
          nodes: [
            { cui: '111', name: 'Judet Sibiu', entity_type: 'admin_county_council' },
            { cui: '123', name: 'Primaria Sibiu', entity_type: 'admin_municipality' },
          ]
        }
      }
      vi.mocked(graphqlRequest).mockResolvedValue(mockResponse)

      const result = await searchEntities('test', 8, { isUat: true, excludeCounty: true })

      expect(graphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('query EntitySearch'),
        expect.objectContaining({
          limit: 8,
          filter: expect.objectContaining({
            search: 'test',
            is_uat: true,
          }),
        }),
      )
      expect(result).toEqual([{ cui: '123', name: 'Primaria Sibiu', entity_type: 'admin_municipality' }])
    })

    it('should return empty array for empty search', async () => {
      const result = await searchEntities('  ')
      expect(result).toEqual([])
      expect(graphqlRequest).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      vi.mocked(graphqlRequest).mockRejectedValue(new Error('API Error'))
      await expect(searchEntities('test')).rejects.toThrow('API Error')
    })
  })
})

describe('filterLineItems', () => {
  const sampleItems: readonly ExecutionLineItem[] = [
    createLineItem({
      line_item_id: '1',
      economicClassification: { economic_code: '10.01', economic_name: 'Personnel' },
    }),
    createLineItem({
      line_item_id: '2',
      economicClassification: { economic_code: '10.02', economic_name: 'Salaries' },
    }),
    createLineItem({
      line_item_id: '3',
      economicClassification: { economic_code: '20.01', economic_name: 'Goods' },
    }),
    createLineItem({
      line_item_id: '4',
      economicClassification: { economic_code: '20.05', economic_name: 'Services' },
    }),
    createLineItem({
      line_item_id: '5',
      economicClassification: { economic_code: '30.01', economic_name: 'Capital' },
    }),
    createLineItem({
      line_item_id: '6',
      economicClassification: null,
      anomaly: 'MISSING_LINE_ITEM',
    }),
    createLineItem({
      line_item_id: '7',
      economicClassification: { economic_code: '10.03', economic_name: 'Bonuses' },
      anomaly: 'YTD_ANOMALY',
    }),
  ]

  describe('no filter', () => {
    it('returns all items when filter is undefined', () => {
      const result = filterLineItems(sampleItems, undefined)
      expect(result).toHaveLength(7)
    })

    it('returns all items when filter is empty string', () => {
      const result = filterLineItems(sampleItems, '')
      expect(result).toHaveLength(7)
    })
  })

  describe('economic:all filter', () => {
    it('returns all items', () => {
      const result = filterLineItems(sampleItems, 'economic:all')
      expect(result).toHaveLength(7)
    })
  })

  describe('economic:personal filter', () => {
    it('returns only items with economic code starting with 10', () => {
      const result = filterLineItems(sampleItems, 'economic:personal')

      expect(result).toHaveLength(3)
      expect(result.every((item) => item.economicClassification?.economic_code.startsWith('10'))).toBe(true)
    })
  })

  describe('economic:goods filter', () => {
    it('returns only items with economic code starting with 20', () => {
      const result = filterLineItems(sampleItems, 'economic:goods')

      expect(result).toHaveLength(2)
      expect(result.every((item) => item.economicClassification?.economic_code.startsWith('20'))).toBe(true)
    })
  })

  describe('economic:others filter', () => {
    it('returns items with economic code not starting with 10 or 20', () => {
      const result = filterLineItems(sampleItems, 'economic:others')

      // Should include 30.01 and the null classification item
      expect(result).toHaveLength(2)
      expect(
        result.every((item) => {
          const code = item.economicClassification?.economic_code || ''
          return !code.startsWith('10') && !code.startsWith('20')
        })
      ).toBe(true)
    })
  })

  describe('anomaly:missing filter', () => {
    it('returns only items with MISSING_LINE_ITEM anomaly', () => {
      const result = filterLineItems(sampleItems, 'anomaly:missing')

      expect(result).toHaveLength(1)
      expect(result[0]!.anomaly).toBe('MISSING_LINE_ITEM')
    })
  })

  describe('anomaly:value_changed filter', () => {
    it('returns only items with YTD_ANOMALY', () => {
      const result = filterLineItems(sampleItems, 'anomaly:value_changed')

      expect(result).toHaveLength(1)
      expect(result[0]!.anomaly).toBe('YTD_ANOMALY')
    })
  })

  describe('unknown filter', () => {
    it('returns all items for unknown filter values', () => {
      const result = filterLineItems(sampleItems, 'unknown:filter')
      expect(result).toHaveLength(7)
    })
  })

  describe('edge cases', () => {
    it('handles empty items array', () => {
      const result = filterLineItems([], 'economic:personal')
      expect(result).toHaveLength(0)
    })

    it('handles items with null economic classification', () => {
      const itemsWithNull: readonly ExecutionLineItem[] = [
        createLineItem({ line_item_id: '1', economicClassification: null }),
        createLineItem({
          line_item_id: '2',
          economicClassification: { economic_code: '10.01', economic_name: 'Test' },
        }),
      ]

      const personalResult = filterLineItems(itemsWithNull, 'economic:personal')
      expect(personalResult).toHaveLength(1)

      const othersResult = filterLineItems(itemsWithNull, 'economic:others')
      expect(othersResult).toHaveLength(1)
    })
  })
})
