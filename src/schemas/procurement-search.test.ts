import { describe, expect, it } from 'vitest'
import {
  cleanProcurementSearch,
  parseProcurementSearch,
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
})
