import { describe, expect, it } from 'vitest'
import {
  expandValueCategories,
  PROCUREMENT_VALUE_CATEGORIES,
} from './value-category'

describe('expandValueCategories', () => {
  it('returns undefined for an empty selection (omitted key = no constraint)', () => {
    expect(expandValueCategories([])).toBeUndefined()
  })

  it('maps accepted to the four accepted states (incl. the two reserved)', () => {
    expect(expandValueCategories(['accepted'])).toEqual([
      'official_exact',
      'official_ron_equivalent',
      'cross_source_exact',
      'official_document_recovered',
    ])
  })

  it('maps each single category to its raw states', () => {
    expect(expandValueCategories(['foreign'])).toEqual(['foreign_currency_only'])
    expect(expandValueCategories(['invalid'])).toEqual(['invalid_source_value'])
    expect(expandValueCategories(['framework'])).toEqual(['ambiguous_grain'])
    expect(expandValueCategories(['conflict'])).toEqual(['conflicting_sources'])
    expect(expandValueCategories(['missing'])).toEqual([
      'source_missing',
      'not_applicable',
    ])
  })

  it('unions multiple categories and de-duplicates', () => {
    const states = expandValueCategories(['invalid', 'missing'])
    expect(states).toEqual([
      'invalid_source_value',
      'source_missing',
      'not_applicable',
    ])
  })

  it('every category maps to at least one state (no empty category)', () => {
    for (const category of PROCUREMENT_VALUE_CATEGORIES) {
      expect(expandValueCategories([category])?.length ?? 0).toBeGreaterThan(0)
    }
  })
})
