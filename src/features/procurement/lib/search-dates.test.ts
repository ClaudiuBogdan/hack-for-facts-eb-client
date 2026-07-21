import { describe, expect, it } from 'vitest'
import {
  withProcurementSearchDefaults,
  type ProcurementSearchState,
} from '@/schemas/procurement-search'
import {
  PROCUREMENT_DA_MAX_WINDOW_DAYS,
  buildDateRange,
  resolveDirectAcquisitionWindow,
  todayDay,
} from './search-dates'

function state(
  overrides: Partial<ProcurementSearchState> = {},
): ProcurementSearchState {
  return withProcurementSearchDefaults({
    grain: 'direct_acquisitions',
    ...overrides,
  })
}

const TODAY = '2026-07-21'

/** Span in whole days between two `YYYY-MM-DD` bounds. */
function span(from: string, to: string): number {
  return (
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  )
}

describe('buildDateRange', () => {
  it('prefers explicit bounds and expands a bare year', () => {
    expect(buildDateRange(state({ dateFrom: '2024-03-01' }))).toEqual({
      gte: '2024-03-01',
    })
    expect(buildDateRange(state({ year: 2024 }))).toEqual({
      gte: '2024-01-01',
      lte: '2024-12-31',
    })
    expect(
      buildDateRange(state({ year: 2024, dateTo: '2025-02-02' })),
    ).toEqual({ lte: '2025-02-02' })
    expect(buildDateRange(state())).toBeUndefined()
  })
})

describe('resolveDirectAcquisitionWindow', () => {
  it('defaults an unfiltered search to the last window (the server rejects {})', () => {
    const { range, adjustment } = resolveDirectAcquisitionWindow(state(), TODAY)
    expect(adjustment).toBe('default')
    expect(range).toEqual({ gte: '2025-07-20', lte: TODAY })
    expect(span(range!.gte!, range!.lte!)).toBe(PROCUREMENT_DA_MAX_WINDOW_DAYS)
  })

  it('leaves the dates alone when a party CUI already qualifies the query', () => {
    expect(
      resolveDirectAcquisitionWindow(
        state({ authority_cui: '4267117' }),
        TODAY,
      ),
    ).toEqual({ range: undefined, adjustment: null })
    expect(
      resolveDirectAcquisitionWindow(
        state({ supplier_cui: '123', dateFrom: '2015-01-01' }),
        TODAY,
      ),
    ).toEqual({ range: { gte: '2015-01-01' }, adjustment: null })
  })

  it('passes a user window inside the cap through untouched', () => {
    expect(
      resolveDirectAcquisitionWindow(
        state({ dateFrom: '2024-01-01', dateTo: '2024-06-30' }),
        TODAY,
      ),
    ).toEqual({
      range: { gte: '2024-01-01', lte: '2024-06-30' },
      adjustment: null,
    })
    // A bare year is 364 days — it must not be reported as adjusted.
    expect(
      resolveDirectAcquisitionWindow(state({ year: 2024 }), TODAY).adjustment,
    ).toBeNull()
  })

  it('completes a half-open window, closing at today when today fits', () => {
    expect(
      resolveDirectAcquisitionWindow(state({ dateFrom: '2026-01-01' }), TODAY),
    ).toEqual({
      range: { gte: '2026-01-01', lte: TODAY },
      adjustment: 'completed',
    })
    // An old start cannot reach today — it closes at start + cap instead.
    expect(
      resolveDirectAcquisitionWindow(state({ dateFrom: '2020-01-01' }), TODAY),
    ).toEqual({
      range: { gte: '2020-01-01', lte: '2021-01-01' },
      adjustment: 'completed',
    })
    expect(
      resolveDirectAcquisitionWindow(state({ dateTo: '2024-12-31' }), TODAY),
    ).toEqual({
      range: { gte: '2023-12-31', lte: '2024-12-31' },
      adjustment: 'completed',
    })
  })

  it('clamps an over-wide window onto its newer bound', () => {
    expect(
      resolveDirectAcquisitionWindow(
        state({ dateFrom: '2015-01-01', dateTo: '2024-12-31' }),
        TODAY,
      ),
    ).toEqual({
      range: { gte: '2023-12-31', lte: '2024-12-31' },
      adjustment: 'clamped',
    })
  })

  it('repairs an inverted range instead of letting the server reject it', () => {
    expect(
      resolveDirectAcquisitionWindow(
        state({ dateFrom: '2024-06-30', dateTo: '2024-01-01' }),
        TODAY,
      ),
    ).toEqual({
      range: { gte: '2024-01-01', lte: '2024-06-30' },
      adjustment: 'clamped',
    })
  })

  it('never emits a half-open or over-wide window without a party CUI', () => {
    const cases: Partial<ProcurementSearchState>[] = [
      {},
      { dateFrom: '2019-05-05' },
      { dateTo: '2019-05-05' },
      { dateFrom: '2010-01-01', dateTo: '2026-01-01' },
      { dateFrom: '2026-01-01', dateTo: '2010-01-01' },
      { year: 2020 },
      { cpv: '45453000' },
      { q: 'spital' },
    ]
    for (const overrides of cases) {
      const { range } = resolveDirectAcquisitionWindow(state(overrides), TODAY)
      expect(range?.gte).toBeDefined()
      expect(range?.lte).toBeDefined()
      const days = span(range!.gte!, range!.lte!)
      expect(days).toBeGreaterThanOrEqual(0)
      expect(days).toBeLessThanOrEqual(PROCUREMENT_DA_MAX_WINDOW_DAYS)
    }
  })
})

describe('todayDay', () => {
  it('formats the LOCAL calendar day (a UTC day would drift east of Greenwich)', () => {
    expect(todayDay(new Date(2026, 6, 21, 23, 30))).toBe('2026-07-21')
    expect(todayDay(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
  })
})
