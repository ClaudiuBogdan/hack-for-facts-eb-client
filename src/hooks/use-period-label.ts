import { useMemo } from 'react'
import { getYearLabel } from '@/components/entities/utils'
import type { TMonth, TQuarter, PeriodDate } from '@/schemas/reporting'

type PartialPeriodSelection = {
  readonly interval?: {
    readonly start?: PeriodDate
    readonly end?: PeriodDate
  } | null
  readonly dates?: readonly PeriodDate[] | null
}

type GenericReportPeriod = {
  type: 'YEAR' | 'MONTH' | 'QUARTER'
  selection?: PartialPeriodSelection | null
}

export function usePeriodLabel(reportPeriod: GenericReportPeriod | undefined): string {
  return useMemo(() => {
    if (!reportPeriod) {
      return ''
    }

    const selection = reportPeriod.selection ?? {}

    const formatSingle = (value: PeriodDate | undefined): string => {
      if (typeof value !== 'string') {
        return ''
      }
      if (reportPeriod.type === 'MONTH') {
        const m = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
        if (m) return getYearLabel(Number(m[1]), m[2] as TMonth)
      } else if (reportPeriod.type === 'QUARTER') {
        const q = value.match(/^(\d{4})-(Q[1-4])$/)
        if (q) return getYearLabel(Number(q[1]), undefined, q[2] as TQuarter)
      } else if (reportPeriod.type === 'YEAR') {
        const y = Number(value)
        if (Number.isInteger(y) && y >= 1000 && y <= 9999) return getYearLabel(y)
      }
      return ''
    }

    if (selection.interval?.start && selection.interval.end) {
      const startLabel = formatSingle(selection.interval.start)
      const endLabel = formatSingle(selection.interval.end)
      if (startLabel && endLabel) {
        return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`
      }
    }

    if (selection.dates && selection.dates.length > 1) {
      return selection.dates.map((date) => formatSingle(date)).join(', ')
    }
    if (selection.dates && selection.dates.length > 0) {
      const single = formatSingle(selection.dates[0])
      if (single) return single
    }

    return ''
  }, [reportPeriod])
}
