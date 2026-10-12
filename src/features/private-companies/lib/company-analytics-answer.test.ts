import { describe, expect, it } from 'vitest'
import type { CompanyAnalysisScope } from '@/schemas/company-analytics'
import { answerTabs, mapCountyOf } from './company-analytics-answer'
import { DEFAULT_STATE } from './company-analytics-url'

/**
 * One place is one value of the registry: a county chosen leaves no counties
 * to rank and puts the map on its localities — but a group without a common
 * county, or a county with that group, still has groups to rank, and no
 * outline of its own.
 */

const tabsOf = (scope: CompanyAnalysisScope) => answerTabs({ ...DEFAULT_STATE, scope }, false)

describe('the answer’s tabs', () => {
  it('drops the counties for one county, the localities too for one locality', () => {
    expect(tabsOf({ county: { in: ['CJ'] } })).not.toContain('COUNTY')
    expect(tabsOf({ county: { in: ['CJ'] } })).toContain('UAT')
    expect(tabsOf({ uat: { in: ['54975'] } })).not.toContain('UAT')
  })

  it('keeps an axis whose filter is a group without a common value, or a value with it', () => {
    expect(tabsOf({ county: { in: ['(multiple_values)'] } })).toContain('COUNTY')
    expect(tabsOf({ county: { in: ['CJ'], includeUnknown: true } })).toContain('COUNTY')
    expect(tabsOf({ uat: { in: ['(unresolved)'] } })).toContain('UAT')
  })
})

describe('the map’s county', () => {
  it('is a county the map knows, chosen alone', () => {
    expect(mapCountyOf({ county: { in: ['CJ'] } })).toBe('CJ')
    expect(mapCountyOf({ county: { in: ['(multiple_values)'] } })).toBeNull()
    expect(mapCountyOf({ county: { in: ['CJ'], includeUnknown: true } })).toBeNull()
    expect(mapCountyOf({ county: { in: ['CJ', 'TM'] } })).toBeNull()
    expect(mapCountyOf({ county: { in: ['XX'] } })).toBeNull()
  })
})
