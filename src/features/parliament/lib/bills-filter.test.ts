import { describe, expect, it } from 'vitest'
import {
  countActiveBillFilters,
  getBillLastEventDateChipLabel,
  getBillLocationChipLabel,
  getBillTypeChipLabel,
} from './bills-filter'

describe('countActiveBillFilters', () => {
  it('counts only the sheet facets (type + location + last-event period)', () => {
    expect(countActiveBillFilters({})).toBe(0)
    // q is the search input's own chip; sortBy is presentation — neither counts.
    expect(countActiveBillFilters({ q: 'buget', sortBy: 'title_asc' })).toBe(0)
    expect(countActiveBillFilters({ billType: 'guvern' })).toBe(1)
    expect(
      countActiveBillFilters({ from: '2026-08-04', to: '2026-08-04' }),
    ).toBe(1)
    expect(
      countActiveBillFilters({ billType: 'guvern', billLocation: 'promulgat' }),
    ).toBe(2)
  })
})

describe('chip labels', () => {
  it('delegates to the shared bill label helpers', () => {
    expect(getBillTypeChipLabel({ billType: 'guvern' })).toBe(
      'Tip: Proiect al Guvernului',
    )
    expect(getBillTypeChipLabel({})).toBeNull()
    expect(getBillLocationChipLabel({ billLocation: 'camera' })).toBe(
      'Etapă: Camera Deputaților',
    )
    expect(getBillLocationChipLabel({})).toBeNull()
    expect(
      getBillLastEventDateChipLabel({
        from: '2026-08-04',
        to: '2026-08-04',
      }),
    ).toBe('Ultima etapă: 4 aug. 2026')
    expect(getBillLastEventDateChipLabel({})).toBeNull()
  })
})
