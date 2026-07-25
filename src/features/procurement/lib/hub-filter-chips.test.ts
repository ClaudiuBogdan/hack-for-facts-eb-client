import { describe, expect, it } from 'vitest'
import {
  parseProcurementHubSearch,
  rankingStatusFromHubState,
  resolveProcurementOverviewPeriod,
} from '@/schemas/procurement-hub'
import { buildHubActiveFilterChips } from './hub-filter-chips'

describe('buildHubActiveFilterChips', () => {
  it('marks unsupported facets as not applied to rankings', () => {
    const state = parseProcurementHubSearch({
      view: 'rankings',
      q: 'school',
      source: 'seap',
      authority_cui: '123',
      status: 'cancelled',
      measure: 'value_awarded',
    })
    const period = resolveProcurementOverviewPeriod(state)
    const chips = buildHubActiveFilterChips(state, period)
    // q scopes rankings/overview as a title row filter since 2026-07-24.
    expect(chips.find((chip) => chip.key === 'q')?.kind).toBe('applied')
    expect(chips.find((chip) => chip.key === 'source')?.kind).toBe(
      'not-on-rankings',
    )
    expect(chips.find((chip) => chip.key === 'measure')?.kind).toBe(
      'not-on-rankings',
    )
    expect(chips.find((chip) => chip.key === 'authority')?.kind).toBe('applied')
    expect(chips.find((chip) => chip.key === 'status')?.kind).toBe('applied')
  })

  it('marks multi-status as not applied to rankings', () => {
    const state = parseProcurementHubSearch({
      view: 'rankings',
      status: 'cancelled,finalized',
    })
    expect(rankingStatusFromHubState(state)).toBeUndefined()
    const chips = buildHubActiveFilterChips(
      state,
      resolveProcurementOverviewPeriod(state),
    )
    expect(chips.find((chip) => chip.key === 'status')?.kind).toBe(
      'not-on-rankings',
    )
  })
})

describe('period chip label', () => {
  const periodChip = (
    dateFrom: string,
    dateTo: string,
  ): string | undefined =>
    buildHubActiveFilterChips(
      parseProcurementHubSearch({ dateFrom, dateTo }),
      { dateFrom, dateTo, isDefault: false, isAllTime: false },
    ).find((chip) => chip.key === 'period')?.value

  it('names a whole calendar year by its year', () => {
    expect(periodChip('2025-01-01', '2025-12-31')).toBe('2025')
  })

  it('names a whole calendar month by its month', () => {
    expect(periodChip('2025-05-01', '2025-05-31')).toMatch(/May 2025|mai 2025/)
  })

  it('handles a short month without falling back to a range', () => {
    expect(periodChip('2024-02-01', '2024-02-29')).toMatch(
      /February 2024|februarie 2024/,
    )
  })

  it('keeps the endpoints when the period is a real range', () => {
    expect(periodChip('2025-01-01', '2025-03-31')).toContain('–')
  })

  it('keeps the endpoints for a partial month', () => {
    expect(periodChip('2025-05-02', '2025-05-31')).toContain('–')
  })
})
