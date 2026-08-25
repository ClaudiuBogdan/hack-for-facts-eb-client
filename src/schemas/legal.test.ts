import { describe, expect, it } from 'vitest'
import { gazetteBrowseSearchSchema } from './legal'

/**
 * `/legislation/gazette` URL params run through `validateSearch`: a throwing
 * schema would error the whole route on junk someone pasted into the address
 * bar. `.catch(undefined)` degrades each bad param to its default instead —
 * verified in the browser (`?year=abc&page=0&part=ZZ` renders the default
 * view); pinned here so the behaviour cannot regress silently.
 */
describe('gazetteBrowseSearchSchema', () => {
  it('passes valid filters and page through unchanged', () => {
    expect(
      gazetteBrowseSearchSchema.parse({ year: 2010, part: 'PIM', page: 2 }),
    ).toEqual({ year: 2010, part: 'PIM', page: 2 })
  })

  it('parses an empty search to all-defaults', () => {
    expect(gazetteBrowseSearchSchema.parse({})).toEqual({})
  })

  it('drops junk params to their defaults instead of erroring the route', () => {
    const parsed = gazetteBrowseSearchSchema.parse({
      year: 'abc',
      page: 0,
      part: 'ZZ',
    })
    expect(parsed.year).toBeUndefined()
    expect(parsed.page).toBeUndefined()
    expect(parsed.part).toBeUndefined()
  })

  it('rejects a below-one page and a fractional year without throwing', () => {
    expect(gazetteBrowseSearchSchema.parse({ page: -3 }).page).toBeUndefined()
    expect(
      gazetteBrowseSearchSchema.parse({ year: 2010.5 }).year,
    ).toBeUndefined()
  })

  it('admits only the eight real part codes', () => {
    expect(gazetteBrowseSearchSchema.parse({ part: 'PVII' }).part).toBe('PVII')
    expect(
      gazetteBrowseSearchSchema.parse({ part: 'PVIII' }).part,
    ).toBeUndefined()
  })
})
