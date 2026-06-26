import { describe, expect, it } from 'vitest'
import {
  datasetRequestPayloadSchema,
  parseStatisticsLandingSearch,
  parseStatisticsTerritoryHubSearch,
} from './statistics'

describe('statistics route search schemas', () => {
  describe('statisticsTerritoryHubSearchSchema', () => {
    it('returns an empty search state when no search is provided', () => {
      const parsed = parseStatisticsTerritoryHubSearch({})
      expect(parsed).toEqual({})
    })

    it('preserves a valid period filter', () => {
      const parsed = parseStatisticsTerritoryHubSearch({
        period: '2024-Q1',
      })
      expect(parsed.period).toBe('2024-Q1')
    })

    it('preserves valid annual, quarterly, and monthly period filters', () => {
      expect(parseStatisticsTerritoryHubSearch({ period: '2024' })).toEqual({
        period: '2024',
      })
      expect(parseStatisticsTerritoryHubSearch({ period: '2024-Q2' })).toEqual({
        period: '2024-Q2',
      })
      expect(parseStatisticsTerritoryHubSearch({ period: '2024-03' })).toEqual({
        period: '2024-03',
      })
    })

    it('degrades latest to an empty search state', () => {
      expect(parseStatisticsTerritoryHubSearch({ period: 'latest' })).toEqual({})
    })

    it('degrades a non-string period to no filter via .catch', () => {
      const parsed = parseStatisticsTerritoryHubSearch({
        period: { year: 2024 },
      })
      expect(parsed).toEqual({})
    })

    it('degrades an invalid period format to no filter via .catch', () => {
      const parsed = parseStatisticsTerritoryHubSearch({
        period: 'not-a-period',
      })
      expect(parsed).toEqual({})
    })

    it('degrades a completely invalid object shape to defaults via .catch', () => {
      const parsed = parseStatisticsTerritoryHubSearch('not-an-object' as unknown as Record<string, unknown>)
      expect(parsed).toEqual({})
    })
  })

  describe('statisticsLandingSearchSchema', () => {
    it('applies undefined defaults when no search is provided', () => {
      const parsed = parseStatisticsLandingSearch({})
      expect(parsed).toEqual({})
    })
  })

  describe('datasetRequestPayloadSchema', () => {
    it('accepts a minimal payload with only a dataset code', () => {
      const parsed = datasetRequestPayloadSchema.parse({
        datasetCode: 'TUR101C',
      })
      expect(parsed.datasetCode).toBe('TUR101C')
      expect(parsed.siruta).toBeUndefined()
      expect(parsed.contactEmail).toBeUndefined()
    })

    it('rejects an empty dataset code', () => {
      expect(() =>
        datasetRequestPayloadSchema.parse({ datasetCode: '' }),
      ).toThrow()
    })

    it('rejects an invalid contact email', () => {
      expect(() =>
        datasetRequestPayloadSchema.parse({
          datasetCode: 'TUR101C',
          contactEmail: 'not-an-email',
        }),
      ).toThrow()
    })
  })
})
