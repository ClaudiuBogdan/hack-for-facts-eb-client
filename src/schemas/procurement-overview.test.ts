import { describe, expect, it } from 'vitest'
import {
  buildProcurementOverviewMonthScope,
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  parseProcurementOverviewSearch,
} from './procurement-overview'

describe('procurement overview period', () => {
  it('normalizes selected days to full calendar months', () => {
    expect(
      parseProcurementOverviewSearch({
        dateFrom: '2024-02-17',
        dateTo: '2024-03-02',
      }),
    ).toMatchObject({
      dateFrom: '2024-02-01',
      dateTo: '2024-03-31',
    })
  })

  it('handles leap years and rejects invalid calendar dates', () => {
    expect(normalizeProcurementMonthStart('2024-02-29')).toBe('2024-02-01')
    expect(normalizeProcurementMonthEnd('2024-02-29')).toBe('2024-02-29')
    expect(normalizeProcurementMonthEnd('2023-02-29')).toBeUndefined()
    expect(parseProcurementOverviewSearch({ dateFrom: 'not-a-date' })).toEqual(
      {},
    )
  })

  it('derives the monthly API scope without replacing missing bounds', () => {
    expect(
      buildProcurementOverviewMonthScope({
        dateFrom: '2024-05-01',
        dateTo: '2024-06-30',
      }),
    ).toEqual({ monthFrom: '2024-05', monthTo: '2024-06' })
    expect(
      buildProcurementOverviewMonthScope({ dateTo: '2024-06-30' }),
    ).toEqual({ monthTo: '2024-06' })
  })

  it('keeps one stable geography key per party side', () => {
    expect(
      parseProcurementOverviewSearch({
        buyerRegion: ' Nord-Vest ',
        buyerCounty: 'CJ',
        supplierRegion: 'Centru',
      }),
    ).toMatchObject({
      buyerCounty: 'CJ',
      supplierRegion: 'Centru',
    })
    expect(
      parseProcurementOverviewSearch({
        buyerRegion: 'Nord-Vest',
        supplierCounty: '  ',
      }),
    ).toEqual({ buyerRegion: 'Nord-Vest' })
  })
})
