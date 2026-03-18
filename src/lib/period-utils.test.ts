import { describe, it, expect } from 'vitest'
import { getPeriodTags, getReportDateRange, toReportDateBoundary } from './period-utils'
import type { ReportPeriodInput } from '@/schemas/reporting'

describe('period-utils', () => {
  describe('getPeriodTags', () => {
    describe('with undefined period', () => {
      it('returns empty array for undefined period', () => {
        expect(getPeriodTags(undefined)).toEqual([])
      })
    })

    describe('with date selection', () => {
      it('returns tags for single date', () => {
        const period: ReportPeriodInput = {
          type: 'YEAR',
          selection: { dates: ['2023'] },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          key: 'period_date_2023',
          label: 'YEAR',
          value: '2023',
        })
      })

      it('returns tags for multiple dates', () => {
        const period: ReportPeriodInput = {
          type: 'YEAR',
          selection: { dates: ['2021', '2022', '2023'] },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(3)
        expect(result[0]).toEqual({
          key: 'period_date_2021',
          label: 'YEAR',
          value: '2021',
        })
        expect(result[1]).toEqual({
          key: 'period_date_2022',
          label: 'YEAR',
          value: '2022',
        })
        expect(result[2]).toEqual({
          key: 'period_date_2023',
          label: 'YEAR',
          value: '2023',
        })
      })

      it('returns tags for MONTH type dates', () => {
        const period: ReportPeriodInput = {
          type: 'MONTH',
          selection: { dates: ['2023-01', '2023-06'] },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
          key: 'period_date_2023-01',
          label: 'MONTH',
          value: '2023-01',
        })
        expect(result[1]).toEqual({
          key: 'period_date_2023-06',
          label: 'MONTH',
          value: '2023-06',
        })
      })

      it('returns tags for QUARTER type dates', () => {
        const period: ReportPeriodInput = {
          type: 'QUARTER',
          selection: { dates: ['2023-Q1', '2023-Q3'] },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
          key: 'period_date_2023-Q1',
          label: 'QUARTER',
          value: '2023-Q1',
        })
        expect(result[1]).toEqual({
          key: 'period_date_2023-Q3',
          label: 'QUARTER',
          value: '2023-Q3',
        })
      })

      it('returns empty array for empty dates array', () => {
        const period: ReportPeriodInput = {
          type: 'YEAR',
          selection: { dates: [] },
        }

        const result = getPeriodTags(period)

        expect(result).toEqual([])
      })
    })

    describe('with interval selection', () => {
      it('returns single tag for interval with different start and end', () => {
        const period: ReportPeriodInput = {
          type: 'YEAR',
          selection: { interval: { start: '2020', end: '2023' } },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          key: 'period_interval',
          label: 'YEAR',
          value: '2020 - 2023',
          isInterval: true,
        })
      })

      it('returns single value for interval with same start and end', () => {
        const period: ReportPeriodInput = {
          type: 'YEAR',
          selection: { interval: { start: '2023', end: '2023' } },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          key: 'period_interval',
          label: 'YEAR',
          value: '2023',
          isInterval: true,
        })
      })

      it('returns interval for MONTH type', () => {
        const period: ReportPeriodInput = {
          type: 'MONTH',
          selection: { interval: { start: '2023-01', end: '2023-12' } },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          key: 'period_interval',
          label: 'MONTH',
          value: '2023-01 - 2023-12',
          isInterval: true,
        })
      })

      it('returns interval for QUARTER type', () => {
        const period: ReportPeriodInput = {
          type: 'QUARTER',
          selection: { interval: { start: '2023-Q1', end: '2023-Q4' } },
        }

        const result = getPeriodTags(period)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          key: 'period_interval',
          label: 'QUARTER',
          value: '2023-Q1 - 2023-Q4',
          isInterval: true,
        })
      })
    })

    describe('edge cases', () => {
      it('prefers dates over interval when both might be considered', () => {
        // The type system enforces only one or the other, but test the logic path
        const periodWithDates: ReportPeriodInput = {
          type: 'YEAR',
          selection: { dates: ['2023'] },
        }

        const result = getPeriodTags(periodWithDates)
        expect(result).toHaveLength(1)
        expect(result[0]!.key).toBe('period_date_2023')
      })

      it('handles selection with no dates and no interval', () => {
        // This is technically invalid per the type system, but test defensive behavior
        const period = {
          type: 'YEAR',
          selection: {},
        } as unknown as ReportPeriodInput

        const result = getPeriodTags(period)
        expect(result).toEqual([])
      })
    })
  })

  describe('toReportDateBoundary', () => {
    it('converts year anchors to inclusive year boundaries', () => {
      expect(toReportDateBoundary('2024', true)).toBe('2024-01-01')
      expect(toReportDateBoundary('2024', false)).toBe('2024-12-31')
    })

    it('converts month anchors to inclusive month boundaries', () => {
      expect(toReportDateBoundary('2024-03', true)).toBe('2024-03-01')
      expect(toReportDateBoundary('2024-03', false)).toBe('2024-03-31')
      expect(toReportDateBoundary('2024-02', false)).toBe('2024-02-29')
    })

    it('converts quarter anchors to inclusive quarter boundaries', () => {
      expect(toReportDateBoundary('2024-Q2', true)).toBe('2024-04-01')
      expect(toReportDateBoundary('2024-Q2', false)).toBe('2024-06-30')
    })
  })

  describe('getReportDateRange', () => {
    it('builds a report date range for yearly intervals', () => {
      expect(getReportDateRange({
        type: 'YEAR',
        selection: { interval: { start: '2024', end: '2024' } },
      })).toEqual({
        start: '2024-01-01',
        end: '2024-12-31',
      })
    })

    it('builds a report date range for monthly intervals', () => {
      expect(getReportDateRange({
        type: 'MONTH',
        selection: { interval: { start: '2024-03', end: '2024-03' } },
      })).toEqual({
        start: '2024-03-01',
        end: '2024-03-31',
      })
    })

    it('builds a report date range for quarterly intervals', () => {
      expect(getReportDateRange({
        type: 'QUARTER',
        selection: { interval: { start: '2024-Q2', end: '2024-Q2' } },
      })).toEqual({
        start: '2024-04-01',
        end: '2024-06-30',
      })
    })

    it('uses the earliest and latest selected dates for date selections', () => {
      expect(getReportDateRange({
        type: 'MONTH',
        selection: { dates: ['2024-06', '2024-03', '2024-05'] },
      })).toEqual({
        start: '2024-03-01',
        end: '2024-06-30',
      })
    })
  })
})
