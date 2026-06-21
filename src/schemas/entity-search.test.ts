import { describe, it, expect } from 'vitest'
import { parseEntitySearchParams } from './entity-search'

describe('parseEntitySearchParams', () => {
  it('coerces a numeric q to a string', () => {
    expect(parseEntitySearchParams({ q: 2816464 }).q).toBe('2816464')
  })

  it('wraps a single `types` string into an array', () => {
    expect(parseEntitySearchParams({ types: 'company' }).types).toEqual([
      'company',
    ])
  })

  it('keeps a `types` array as-is', () => {
    expect(
      parseEntitySearchParams({ types: ['company', 'legal_act'] }).types,
    ).toEqual(['company', 'legal_act'])
  })

  it('coerces year to an int and passes county through', () => {
    const parsed = parseEntitySearchParams({ year: '2024', county: 'Cluj' })
    expect(parsed.year).toBe(2024)
    expect(parsed.county).toBe('Cluj')
  })

  it('tolerates an empty search object', () => {
    expect(parseEntitySearchParams({})).toEqual({})
  })

  it('catches a malformed year to undefined instead of throwing', () => {
    expect(parseEntitySearchParams({ year: 'not-a-year' }).year).toBeUndefined()
  })
})
