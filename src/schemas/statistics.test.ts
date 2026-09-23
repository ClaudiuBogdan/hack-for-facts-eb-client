import { describe, expect, it } from 'vitest'
import {
  datasetRequestPayloadSchema,
  parseStatisticsHubSearch,
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

  describe('statisticsDatasetExplorerSearchSchema', () => {
    it('keeps a theme code the router parsed as a number', async () => {
      const { parseStatisticsDatasetExplorerSearch } = await import('./statistics')
      expect(parseStatisticsDatasetExplorerSearch({ context: 1 })).toEqual({ context: '1' })
      expect(parseStatisticsDatasetExplorerSearch({ context: '1' })).toEqual({ context: '1' })
    })

    it('accepts a single periodicity as a one-item list and drops an unknown one', async () => {
      const { parseStatisticsDatasetExplorerSearch } = await import('./statistics')
      expect(parseStatisticsDatasetExplorerSearch({ frecventa: 'MONTHLY' })).toEqual({ frecventa: ['MONTHLY'] })
      expect(parseStatisticsDatasetExplorerSearch({ frecventa: ['ANNUAL', 'MONTHLY'] })).toEqual({ frecventa: ['ANNUAL', 'MONTHLY'] })
      expect(parseStatisticsDatasetExplorerSearch({ frecventa: 'WEEKLY' })).toEqual({})
      // A pasted link that repeats a cadence names it once; an empty list is no filter.
      expect(parseStatisticsDatasetExplorerSearch({ frecventa: ['ANNUAL', 'ANNUAL'] })).toEqual({ frecventa: ['ANNUAL'] })
      expect(parseStatisticsDatasetExplorerSearch({ frecventa: [] })).toEqual({})
    })

    it('keeps a search term the router parsed as a number', async () => {
      const { parseStatisticsDatasetExplorerSearch } = await import('./statistics')
      expect(parseStatisticsDatasetExplorerSearch({ q: 2024 })).toEqual({ q: '2024' })
      expect(parseStatisticsDatasetExplorerSearch({ q: ' populatie ' })).toEqual({ q: 'populatie' })
    })
  })

  describe('statisticsHubSearchSchema', () => {
    it('applies undefined defaults when no search is provided', () => {
      const parsed = parseStatisticsHubSearch({})
      expect(parsed).toEqual({})
    })

    it('keeps a known indicator and drops an unknown one', () => {
      expect(parseStatisticsHubSearch({ indicator: 'salariati' })).toEqual({ indicator: 'salariati' })
      expect(parseStatisticsHubSearch({ indicator: 'altceva' })).toEqual({})
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
