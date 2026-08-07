import { describe, expect, it } from 'vitest'
import {
  buildBillsFilter,
  buildBillsSort,
  buildMembersFilter,
  buildVotesFilter,
} from './parliament-filters'

describe('buildVotesFilter — kind', () => {
  it('sends a single kind as an `in` list', () => {
    expect(buildVotesFilter({ tipVot: 'legislative' }).kind).toEqual({
      in: ['legislative'],
    })
  })

  it('sends several kinds', () => {
    expect(
      buildVotesFilter({ tipVot: ['legislative', 'attendance'] }).kind,
    ).toEqual({ in: ['legislative', 'attendance'] })
  })

  it('drops the filter when EVERY kind is selected', () => {
    // Selecting all six is the same question as selecting none, so there is no
    // reason to make the planner evaluate a six-way `in`.
    expect(
      buildVotesFilter({
        tipVot: [
          'legislative',
          'amendment',
          'procedural',
          'chamber_decision',
          'attendance',
          'unclassified',
        ],
      }).kind,
    ).toBeUndefined()
  })

  it('drops the filter when none is selected', () => {
    expect(buildVotesFilter({}).kind).toBeUndefined()
  })
})

describe('buildVotesFilter — groupVote', () => {
  it('sends the pair when both halves are present', () => {
    expect(
      buildVotesFilter({ grupVot: 'PSD', alegere: 'pentru' }),
    ).toEqual({ groupVote: { group: 'PSD', choice: 'pentru' } })
  })

  it('sends the group ALONE, meaning every vote it took part in', () => {
    expect(buildVotesFilter({ grupVot: 'PSD' })).toEqual({
      groupVote: { group: 'PSD' },
    })
  })

  it('sends nothing when only the choice is set', () => {
    expect(buildVotesFilter({ alegere: 'pentru' })).toEqual({})
  })

  it('passes the group name through verbatim, without slugging it', () => {
    // It must match `vote_records.group_name` exactly — "Senatori neafiliați"
    // is a real value there.
    expect(
      buildVotesFilter({ grupVot: 'Senatori neafiliați', alegere: 'abtinere' })
        .groupVote,
    ).toEqual({ group: 'Senatori neafiliați', choice: 'abtinere' })
  })
})

describe('buildVotesFilter', () => {
  it('maps chamber to the DB enum and drops "all"', () => {
    expect(buildVotesFilter({ chamber: 'camera' })).toEqual({
      chamber: { eq: 'camera_deputatilor' },
    })
    expect(buildVotesFilter({ chamber: 'all' })).toEqual({})
  })

  it('sends comun as its own assembly, never collapsed into camera', () => {
    // Joint sittings are a served chamber value; folding them into
    // camera_deputatilor would return the Camera's votes for a query that asked
    // for the joint ones.
    expect(buildVotesFilter({ chamber: 'comun' })).toEqual({
      chamber: { eq: 'comun' },
    })
  })

  it('passes the outcome the URL carries straight through', () => {
    expect(buildVotesFilter({ outcome: 'respins' })).toEqual({ outcome: { eq: 'respins' } })
    expect(buildVotesFilter({ outcome: 'adoptat' })).toEqual({ outcome: { eq: 'adoptat' } })
    // No outcome facet at all is the unfiltered list, not an empty result.
    expect(buildVotesFilter({})).toEqual({})
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

  it('drops "comun" — a votes-tab value no member roster can satisfy', () => {
    // The search object is shared across tabs; honouring comun here would send
    // a chamber filter that matches zero members.
    const filter = buildMembersFilter({ chamber: 'comun' }, { legislature: '2024' })
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

  it('maps the UI billLocation enum to the server status token (lifecycle.v2)', () => {
    expect(buildBillsFilter({ billLocation: 'promulgat' })).toEqual({ status: { eq: 'promulgated' } })
    expect(buildBillsFilter({ billLocation: 'respins' })).toEqual({ status: { eq: 'rejected' } })
    expect(buildBillsFilter({ billLocation: 'retras' })).toEqual({ status: { eq: 'withdrawn' } })
    expect(buildBillsFilter({ billLocation: 'clasat' })).toEqual({ status: { eq: 'lapsed' } })
    expect(buildBillsFilter({ billLocation: 'camera' })).toEqual({ status: { eq: 'in_progress' } })
    expect(buildBillsFilter({ billLocation: 'senat' })).toEqual({ status: { eq: 'in_progress' } })
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

  it('maps the shared URL period to the bill last-event date range', () => {
    expect(buildBillsFilter({ from: '2026-08-04', to: '2026-08-04' })).toEqual({
      lastEventDate: { gte: '2026-08-04', lte: '2026-08-04' },
    })
  })

  it('defaults the sort to updated_desc', () => {
    expect(buildBillsSort({})).toBe('updated_desc')
    expect(buildBillsSort({ sortBy: 'title_asc' })).toBe('title_asc')
  })
})
