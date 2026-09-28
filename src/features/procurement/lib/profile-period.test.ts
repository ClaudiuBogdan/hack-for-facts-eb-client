import { describe, expect, it } from 'vitest'
import { answersChoice, choiceOf, isPartYear, lastDayOf, needsCutoff, pageCutoff, periodChoice, periodLinkSearch, periodOf, periodYear, recentWindow, shiftMonth, throughMonth } from './profile-period'

const CUTOFF = { direct: '2026-06', contract: '2026-05' }

describe('lastDayOf', () => {
  it('ends a month on its last day, leap years included', () => {
    expect(lastDayOf('2026-05')).toBe('2026-05-31')
    expect(lastDayOf('2026-06')).toBe('2026-06-30')
    expect(lastDayOf('2024-02')).toBe('2024-02-29')
    expect(lastDayOf('2026-02')).toBe('2026-02-28')
  })
})

describe('shiftMonth', () => {
  it('moves a month across years both ways', () => {
    expect(shiftMonth('2026-05', -11)).toBe('2025-06')
    expect(shiftMonth('2025-06', -12)).toBe('2024-06')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(shiftMonth('2026-01', 0)).toBe('2026-01')
  })
})

describe('the page’s cutoff', () => {
  it('is the earlier population’s month, so one date covers the page', () => {
    expect(pageCutoff(CUTOFF)).toBe('2026-05')
    expect(pageCutoff({ direct: '2026-06', contract: null })).toBe('2026-06')
    expect(pageCutoff(null)).toBeNull()
  })

  it('reads the year in progress through it only when it falls in the year', () => {
    expect(throughMonth(2026, CUTOFF)).toBe('2026-05')
    // January: either population still in the year before.
    expect(throughMonth(2026, { direct: '2026-05', contract: '2025-12' })).toBeNull()
    expect(throughMonth(2026, null)).toBeNull()
  })

  it('ends the last twelve months at it, wherever it falls', () => {
    expect(recentWindow(CUTOFF)).toEqual({ from: '2025-06', through: '2026-05' })
    expect(recentWindow({ direct: '2026-12', contract: '2026-11' })).toEqual({ from: '2025-12', through: '2026-11' })
    expect(recentWindow(null)).toBeNull()
  })
})

describe('periodChoice', () => {
  it('takes a year from 2019 through the year in progress; anything else, and none, is the last twelve months', () => {
    expect(periodChoice(2023, 2025)).toBe(2023)
    expect(periodChoice(2019, 2025)).toBe(2019)
    expect(periodChoice(2026, 2025)).toBe(2026)
    expect(periodChoice(2018, 2025)).toBe('recent')
    expect(periodChoice(2027, 2025)).toBe('recent')
    expect(periodChoice(undefined, 2025)).toBe('recent')
  })

  it('waits for SEAP’s cutoff only where the period ends at it', () => {
    expect(needsCutoff('recent', 2025)).toBe(true)
    expect(needsCutoff(2026, 2025)).toBe(true)
    expect(needsCutoff(2025, 2025)).toBe(false)
  })
})

describe('periodOf', () => {
  it('reads the last twelve months through the cutoff, against the twelve before', () => {
    expect(periodOf('recent', 2025, CUTOFF)).toEqual({
      kind: 'recent',
      year: 2026,
      from: '2025-06',
      through: '2026-05',
      months: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'],
      scope: { from: '2025-06', to: '2026-05' },
      before: { from: '2024-06', to: '2025-05' },
      range: { gte: '2025-06-01', lte: '2026-05-31' },
    })
  })

  it('describes the last complete year when the last twelve months cannot be told', () => {
    expect(periodOf('recent', 2025, null)).toMatchObject({ kind: 'year', year: 2025, through: null, scope: { year: 2025 } })
  })

  it('reads a complete year whole, against the whole year before; 2019 against nothing', () => {
    expect(periodOf(2025, 2025, CUTOFF)).toMatchObject({
      kind: 'year',
      year: 2025,
      from: '2025-01',
      through: null,
      scope: { year: 2025 },
      before: { year: 2024 },
      range: { gte: '2025-01-01', lte: '2025-12-31' },
    })
    expect(periodOf(2025, 2025, CUTOFF).months[11]).toBe('2025-12')
    expect(periodOf(2019, 2025, null).before).toBeNull()
  })

  it('reads the year in progress through the cutoff, compared with nothing: its last months may still be filling', () => {
    expect(periodOf(2026, 2025, CUTOFF)).toMatchObject({
      kind: 'year',
      year: 2026,
      through: '2026-05',
      scope: { from: '2026-01', to: '2026-05' },
      before: null,
      range: { gte: '2026-01-01', lte: '2026-05-31' },
    })
    expect(periodOf(2026, 2025, null)).toMatchObject({ through: null, scope: { year: 2026 }, before: null })
  })
})

describe('a profile’s period', () => {
  it('answers the choice it was read for, links the other page on it, and says a part year', () => {
    const recent = periodOf('recent', 2025, CUTOFF)
    const year = periodOf(2024, 2025, CUTOFF)
    const part = periodOf(2026, 2025, CUTOFF)
    expect([choiceOf(recent), choiceOf(year)]).toEqual(['recent', 2024])
    expect([periodYear(recent), periodYear(year)]).toEqual([null, 2024])
    // The last twelve months are the other page's default too: no year in its link.
    expect([periodLinkSearch(recent), periodLinkSearch(year)]).toEqual([{}, { year: 2024 }])
    expect([isPartYear(recent), isPartYear(year), isPartYear(part)]).toEqual([false, false, true])
    // A read for the last twelve months that fell back to a year still answers it; a year answers only itself.
    expect([answersChoice(recent, 'recent'), answersChoice(year, 'recent'), answersChoice(year, 2024), answersChoice(recent, 2026)]).toEqual([true, true, true, false])
  })
})
