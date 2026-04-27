import type { ReportPeriodInput, ReportPeriodType, PeriodDate } from '@/schemas/reporting'
import { getQuarterForMonth } from '@/schemas/reporting'

export function toCommitmentsReportPeriod(reportPeriod: ReportPeriodInput): ReportPeriodInput {
  if (reportPeriod.type !== 'MONTH') return reportPeriod

  const interval = reportPeriod.selection.interval
  if (interval) {
    const startMonth = parseInt(interval.start.split('-')[1] || '1', 10)
    const endMonth = parseInt(interval.end.split('-')[1] || '12', 10)
    const startYear = interval.start.split('-')[0]
    const endYear = interval.end.split('-')[0]
    const startQ = getQuarterForMonth(startMonth)
    const endQ = getQuarterForMonth(endMonth)
    return {
      type: 'QUARTER' as ReportPeriodType,
      selection: {
        interval: {
          start: `${startYear}-${startQ}` as PeriodDate,
          end: `${endYear}-${endQ}` as PeriodDate,
        },
      },
    }
  }

  const dates = reportPeriod.selection.dates ?? []
  const quarterDates = Array.from(new Set(
    dates.map((date) => {
      const [year, monthStr] = date.split('-')
      const month = parseInt(monthStr || '1', 10)
      const quarter = getQuarterForMonth(month)
      return `${year}-${quarter}` as PeriodDate
    })
  )).sort()

  return {
    type: 'QUARTER' as ReportPeriodType,
    selection: { dates: quarterDates },
  }
}
