import { describe, expect, it } from 'vitest'
import {
  buildBillsFilter,
  buildBillsSort,
  buildMembersFilter,
  buildVotesFilter,
} from './parliament-filters'

describe('buildVotesFilter', () => {
  it('maps chamber to the DB enum and drops "all"', () => {
    expect(buildVotesFilter({ chamber: 'camera' })).toEqual({
      chamber: { eq: 'camera_deputatilor' },
    })
    expect(buildVotesFilter({ chamber: 'all' })).toEqual({})
  })

  it('passes adoptat/respins but never the UI-only amânat', () => {
    expect(buildVotesFilter({ outcome: 'respins' })).toEqual({ outcome: { eq: 'respins' } })
    expect(buildVotesFilter({ outcome: 'amânat' })).toEqual({})
  })

  it('collapses date pickers to day bounds', () => {
    expect(
      buildVotesFilter({ from: '2022-05-01T00:00:00+03:00', to: '2022-05-31' }),
    ).toEqual({ voteDate: { gte: '2022-05-01', lte: '2022-05-31' } })
  })

  it('forwards a trimmed q search', () => {
    expect(buildVotesFilter({ q: '  Cod penal  ' })).toEqual({ q: { contains: 'Cod penal' } })
    expect(buildVotesFilter({ q: '   ' })).toEqual({})
  })
})

describe('buildMembersFilter', () => {
  it('always carries the legislature bound', () => {
    expect(buildMembersFilter({}, { legislature: '2024' })).toEqual({
      legislature: { eq: '2024' },
    })
  })

  it('applies resolved group/constituency names and chamber', () => {
    const filter = buildMembersFilter(
      { chamber: 'senat' },
      { legislature: '2024', groupNames: ['UDMR'], constituencyNames: ['CLUJ'] },
    )
    expect(filter).toEqual({
      legislature: { eq: '2024' },
      chamber: { eq: 'senat' },
      group: { in: ['UDMR'] },
      judet: { in: ['CLUJ'] },
    })
  })

  it('drops the "all" chamber and empty resolved arrays', () => {
    const filter = buildMembersFilter(
      { chamber: 'all' },
      { legislature: '2024', groupNames: [], constituencyNames: [] },
    )
    expect(filter).toEqual({ legislature: { eq: '2024' } })
  })
})

describe('buildBillsFilter / buildBillsSort', () => {
  it('only forwards q + the promulgat → finalized facet', () => {
    expect(buildBillsFilter({ q: 'educație' })).toEqual({ q: { contains: 'educație' } })
    expect(buildBillsFilter({ billLocation: 'promulgat' })).toEqual({
      finalized: { isNull: false },
    })
  })

  it('does not translate billType (no live column)', () => {
    expect(buildBillsFilter({ billType: 'guvern' })).toEqual({})
  })

  it('defaults the sort to updated_desc', () => {
    expect(buildBillsSort({})).toBe('updated_desc')
    expect(buildBillsSort({ sortBy: 'title_asc' })).toBe('title_asc')
  })
})
