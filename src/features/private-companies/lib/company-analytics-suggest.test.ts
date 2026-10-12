import { describe, expect, it } from 'vitest'
import type { CompanyAnalysisScope } from '@/schemas/company-analytics'
import { suggestionsOf, type SuggestionInput } from './company-analytics-suggest'

/**
 * „+ Adaugă un filtru": what a typed word offers — at a word's start — each
 * answer the selection with that filter added, within the release's limits
 * and only once they are known.
 */

const LIMITS = { maxSelectedCuis: 500, maxCounties: 50, maxUats: 50, maxLegalForms: 30 }

const suggest = (term: string, scope: CompanyAnalysisScope = {}, extra: Partial<SuggestionInput> = {}) =>
  suggestionsOf({ term, scope, year: 2024, places: null, companies: [], limits: LIMITS, ...extra })

describe('the add-a-filter box', () => {
  it('offers what a word starts, not every word that holds the letters', () => {
    const found = suggest('ti')
    expect(found.filter((item) => item.group === 'county').map((item) => item.label)).toEqual(['Timiș'])
    // „ti" is inside „Societate", „salariați", „plătitoare": none of those is offered.
    expect(found.filter((item) => item.group !== 'county')).toEqual([])
  })

  it('adds the filter to the selection', () => {
    const [county] = suggest('cluj', { legalForms: ['SRL'] })
    expect(county?.scope).toEqual({ legalForms: ['SRL'], county: { in: ['CJ'] } })
    expect(suggest('15192433')[0]).toMatchObject({ group: 'cui', label: 'CUI 15192433', scope: { cuis: ['15192433'] } })
  })

  it('lets the ranges and sizes go with „fără bilanț", and „fără bilanț" go with a size', () => {
    const scope: CompanyAnalysisScope = { financialRanges: [{ metric: 'TURNOVER', min: '1000' }] }
    const unfiled = suggest('fara bilant', scope).find((item) => item.group === 'filing')
    expect(unfiled?.scope).toEqual({ filing: 'NOT_FILED', financialRanges: undefined, employeeSizeBands: undefined })
    const size = suggest('10-49', { filing: 'NOT_FILED' }).find((item) => item.group === 'size')
    expect(size?.scope).toEqual({ filing: undefined, employeeSizeBands: ['FROM_10_TO_49'] })
  })

  it('offers nothing that needs a limit before the release says it', () => {
    expect(suggest('cluj', {}, { limits: null }).filter((item) => item.group === 'county')).toEqual([])
    expect(suggest('15192433', {}, { limits: null })).toEqual([])
  })

  it('offers a company only from the hits it is given', () => {
    const found = suggest('dedeman', {}, { companies: [{ cui: '2816464', label: 'DEDEMAN SRL' }] })
    expect(found).toEqual([expect.objectContaining({ group: 'company', label: 'DEDEMAN SRL', scope: { cuis: ['2816464'] } })])
  })
})
