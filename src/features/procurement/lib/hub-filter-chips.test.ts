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
