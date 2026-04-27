import { describe, it, expect } from 'vitest'

import { toCommitmentsReportPeriod } from './commitments-utils'
import type { ReportPeriodInput } from '@/schemas/reporting'

describe('CommitmentsView period conversion', () => {
  it('converts MONTH interval selection to QUARTER interval selection', () => {
    const result = toCommitmentsReportPeriod({
      type: 'MONTH',
      selection: { interval: { start: '2024-01', end: '2024-05' } },
    })

    expect(result).toEqual({
      type: 'QUARTER',
      selection: { interval: { start: '2024-Q1', end: '2024-Q2' } },
    })
  })

  it('converts MONTH dates selection to QUARTER dates selection (deduped)', () => {
    const result = toCommitmentsReportPeriod({
      type: 'MONTH',
      selection: { dates: ['2024-01', '2024-02', '2024-04'] },
    })

    expect(result).toEqual({
      type: 'QUARTER',
      selection: { dates: ['2024-Q1', '2024-Q2'] },
    })
  })

  it('passes through non-MONTH periods unchanged', () => {
    const input: ReportPeriodInput = { type: 'YEAR', selection: { dates: ['2024'] } }
    expect(toCommitmentsReportPeriod(input)).toBe(input)
  })
})
