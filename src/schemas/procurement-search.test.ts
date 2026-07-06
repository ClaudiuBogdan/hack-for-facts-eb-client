import { describe, expect, it } from 'vitest'
import {
  cleanProcurementSearch,
  parseProcurementSearch,
  procurementSearchSchema,
  withProcurementSearchDefaults,
  PROCUREMENT_SEARCH_DEFAULTS,
} from './procurement-search'

describe('procurement search route state', () => {
  it('normalizes invalid URL search params back to route-safe defaults', () => {
    expect(
      parseProcurementSearch({
        grain: 'invalid',
        sort: 'unsupported',
        page: '-2',
        pageSize: '500',
        status: 'awarded,not-a-status,unknown',
      }),
    ).toMatchObject({
      grain: 'contracts',
      sort: 'date_desc',
      page: 1,
      pageSize: 25,
      status: ['awarded', 'unknown'],
    })
  })

  it('cleans defaults and empty strings before the search state is written back to the URL', () => {
    expect(
      cleanProcurementSearch(
        parseProcurementSearch({
          q: '  drumuri  ',
          authority_cui: '   ',
          grain: 'contracts',
          page: 1,
          pageSize: 25,
          sort: 'date_desc',
          region: 'Vest',
        }),
      ),
    ).toEqual({
      q: 'drumuri',
      region: 'Vest',
    })
  })

  it('drops every junk facet to undefined instead of throwing (.catch idiom)', () => {
    const junk: Record<string, { input: unknown }> = {
      grain: { input: 'bananas' },
      source: { input: 'ted' },
      status: { input: 'nope,also-nope' },
      year: { input: 'abc' },
      dateFrom: { input: 'abc' },
      dateTo: { input: '2024-13' },
      valueMin: { input: '-5' },
      valueMax: { input: 'NaN' },
      signal: { input: 'made_up' },
      sort: { input: 'weird' },
      page: { input: '0' },
      pageSize: { input: '9999' },
    }

    for (const [key, { input }] of Object.entries(junk)) {
      const parsed = procurementSearchSchema.parse({ [key]: input })
      expect(parsed[key as keyof typeof parsed], key).toBeUndefined()
    }
  })

  it('accepts strict ISO dates and rejects loose ones', () => {
    expect(
      procurementSearchSchema.parse({ dateFrom: '2024-01-01' }).dateFrom,
    ).toBe('2024-01-01')
    expect(
      procurementSearchSchema.parse({ dateFrom: ' 2024-01-01 ' }).dateFrom,
    ).toBe('2024-01-01')
    expect(
      procurementSearchSchema.parse({ dateFrom: '01.02.2024' }).dateFrom,
    ).toBeUndefined()
  })

  it('withProcurementSearchDefaults fills exactly the four defaults', () => {
    const state = withProcurementSearchDefaults(
      procurementSearchSchema.parse({ q: 'spital' }),
    )
    expect(state).toMatchObject({
      q: 'spital',
      grain: PROCUREMENT_SEARCH_DEFAULTS.grain,
      sort: PROCUREMENT_SEARCH_DEFAULTS.sort,
      page: PROCUREMENT_SEARCH_DEFAULTS.page,
      pageSize: PROCUREMENT_SEARCH_DEFAULTS.pageSize,
    })
    expect(state.authority_cui).toBeUndefined()
    expect(state.status).toBeUndefined()
  })

  it('round-trips: clean strips exactly the defaults that withDefaults added', () => {
    const cleaned = cleanProcurementSearch(parseProcurementSearch({ q: 'apa' }))
    expect(cleaned).toEqual({ q: 'apa' })
  })
})
