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

  it('scopes a group by chamber when one is supplied (no cross-chamber leak)', () => {
    // The live module infers the chamber from a chamber-scoped groupId
    // (`psd-senat`) and passes it here so `group:{in:['PSD']}` does not also
    // match the Camera PSD members.
    const filter = buildMembersFilter(
      { chamber: 'senat' },
      { legislature: '2024', groupNames: ['PSD'] },
    )
    expect(filter).toEqual({
      legislature: { eq: '2024' },
      chamber: { eq: 'senat' },
      group: { in: ['PSD'] },
    })
  })
})

describe('buildBillsFilter / buildBillsSort', () => {
  it('forwards a trimmed q search', () => {
    expect(buildBillsFilter({ q: 'educație' })).toEqual({ q: { contains: 'educație' } })
  })

  it('maps the UI billType enum to the server token (now server-backed)', () => {
    expect(buildBillsFilter({ billType: 'guvern' })).toEqual({ billType: { eq: 'government' } })
    expect(buildBillsFilter({ billType: 'ordonanta' })).toEqual({ billType: { eq: 'government' } })
    expect(buildBillsFilter({ billType: 'parlamentar' })).toEqual({ billType: { eq: 'parliamentary' } })
    expect(buildBillsFilter({ billType: 'cetateni' })).toEqual({ billType: { eq: 'parliamentary' } })
  })

  it('maps the UI billLocation enum to the server status token', () => {
    expect(buildBillsFilter({ billLocation: 'promulgat' })).toEqual({ status: { eq: 'promulgated' } })
    expect(buildBillsFilter({ billLocation: 'respins' })).toEqual({ status: { eq: 'rejected' } })
    expect(buildBillsFilter({ billLocation: 'camera' })).toEqual({ status: { eq: 'in_progress' } })
    expect(buildBillsFilter({ billLocation: 'senat' })).toEqual({ status: { eq: 'in_progress' } })
    // `retras` has no server token → not forwarded (never a raw/unknown token).
    expect(buildBillsFilter({ billLocation: 'retras' })).toEqual({})
  })

  it('AND-composes billType + status + q', () => {
    expect(
      buildBillsFilter({ billType: 'guvern', billLocation: 'promulgat', q: 'cod' }),
    ).toEqual({
      q: { contains: 'cod' },
      billType: { eq: 'government' },
      status: { eq: 'promulgated' },
    })
  })

  it('defaults the sort to updated_desc', () => {
    expect(buildBillsSort({})).toBe('updated_desc')
    expect(buildBillsSort({ sortBy: 'title_asc' })).toBe('title_asc')
  })
})
