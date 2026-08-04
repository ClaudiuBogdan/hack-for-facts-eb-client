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

  it('parses the active flag and passes county through', () => {
    const parsed = parseEntitySearchParams({ active: 'true', county: 'Cluj' })
    expect(parsed.active).toBe(true)
    expect(parsed.county).toBe('Cluj')
  })

  it('tolerates an empty search object', () => {
    expect(parseEntitySearchParams({})).toEqual({})
  })

  it('treats any non-true active value as false rather than throwing', () => {
    expect(parseEntitySearchParams({ active: 'nope' }).active).toBe(false)
  })
})
