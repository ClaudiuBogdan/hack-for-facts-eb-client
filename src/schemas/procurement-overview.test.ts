import { describe, expect, it } from 'vitest'
import {
  buildProcurementOverviewMonthScope,
  getCalendarYearBounds,
  getOlderCalendarYearOptions,
  getPreviousCalendarYearBounds,
  getRecentCalendarYearQuickOptions,
  matchesCalendarYearPeriod,
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  parseProcurementOverviewSearch,
  resolveProcurementOverviewPeriod,
  selectedCalendarYearFromPeriod,
  toProcurementLandingQueryFilters,
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

  it('defaults to the previous calendar year when period is unset', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    expect(getPreviousCalendarYearBounds(now)).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    })
    expect(getCalendarYearBounds(2024)).toEqual({
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    })
    expect(getRecentCalendarYearQuickOptions(now)).toEqual([2026, 2025, 2024])
    expect(getOlderCalendarYearOptions(now)).toEqual([
      2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
    ])
    expect(resolveProcurementOverviewPeriod({}, now)).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      isDefault: true,
      isAllTime: false,
    })
    expect(
      matchesCalendarYearPeriod(
        resolveProcurementOverviewPeriod({}, now),
        2025,
      ),
    ).toBe(true)
    expect(
      selectedCalendarYearFromPeriod(
        resolveProcurementOverviewPeriod({}, now),
      ),
    ).toBe(2025)
    expect(
      matchesCalendarYearPeriod(
        resolveProcurementOverviewPeriod({}, now),
        2026,
      ),
    ).toBe(false)
    expect(toProcurementLandingQueryFilters({}, now)).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    })
  })

  it('honours period=all as explicit all-time', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    expect(
      resolveProcurementOverviewPeriod({ period: 'all' }, now),
    ).toEqual({ isDefault: false, isAllTime: true })
    expect(
      toProcurementLandingQueryFilters(
        { period: 'all', buyerRegion: 'Nord-Vest' },
        now,
      ),
    ).toEqual({ buyerRegion: 'Nord-Vest' })
  })

  it('prefers explicit date bounds over the default year', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    expect(
      resolveProcurementOverviewPeriod(
        { dateFrom: '2024-03-15', dateTo: '2024-06-02' },
        now,
      ),
    ).toEqual({
      dateFrom: '2024-03-01',
      dateTo: '2024-06-30',
      isDefault: false,
      isAllTime: false,
    })
  })

  it('parses period=all from the URL search', () => {
    expect(parseProcurementOverviewSearch({ period: 'all' })).toEqual({
      period: 'all',
    })
    expect(parseProcurementOverviewSearch({ period: 'weird' })).toEqual({})
  })
})
