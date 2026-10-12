import { describe, expect, it } from 'vitest'
import { amongFilers, withFiling } from './company-analytics-filter-model'

/**
 * The filing and the statement filters, one transition for the panel and the
 * search box: a company without a statement has no value or size band, and
 * the API refuses the pair, so neither side may leave the other stale.
 */
describe('the filing and the statement filters', () => {
  const ranged = { county: { in: ['CJ'] }, financialRanges: [{ metric: 'TURNOVER' as const, min: '1000' }], employeeSizeBands: ['FROM_1_TO_9' as const] }

  it('lets the ranges and the sizes go with „N-au depus"', () => {
    expect(withFiling(ranged, 'NOT_FILED')).toEqual({ county: { in: ['CJ'] }, filing: 'NOT_FILED', financialRanges: undefined, employeeSizeBands: undefined })
  })

  it('keeps them with „Au depus" and with none', () => {
    expect(withFiling(ranged, 'FILED')).toEqual({ ...ranged, filing: 'FILED' })
    expect(withFiling(ranged, undefined)).toEqual({ ...ranged, filing: undefined })
  })

  it('lets „N-au depus" go when a range or a size is added', () => {
    expect(amongFilers({ filing: 'NOT_FILED', county: { in: ['CJ'] } })).toEqual({ filing: undefined, county: { in: ['CJ'] } })
    expect(amongFilers({ filing: 'FILED' })).toEqual({ filing: 'FILED' })
  })
})
