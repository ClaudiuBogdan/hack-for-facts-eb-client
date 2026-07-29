import { describe, expect, it } from 'vitest'
import {
  getActiveVoteFilterCount,
  readVoteKinds,
  VOTE_KIND_LABELS,
  VOTE_KIND_ORDER,
} from './votes-filter-state'

describe('getActiveVoteFilterCount', () => {
  it('counts nothing when nothing is narrowing the list', () => {
    expect(getActiveVoteFilterCount({ tab: 'voturi' })).toBe(0)
    // `all` is the whole parliament — the list's own default, not a constraint.
    expect(getActiveVoteFilterCount({ tab: 'voturi', chamber: 'all' })).toBe(0)
  })

  it('counts the chamber, which is a facet in the panel like any other', () => {
    // The votes tab is ONE list over the whole parliament now; a chamber
    // narrows it, so the filter badge has to say so.
    expect(getActiveVoteFilterCount({ tab: 'voturi', chamber: 'camera' })).toBe(1)
    expect(getActiveVoteFilterCount({ chamber: 'comun' })).toBe(1)
  })

  it('does NOT count the free-text term', () => {
    // `q` has its own always-visible bar. Counting it would put a number on a
    // button whose panel does not contain it, so clearing "1 filter" would
    // leave the reader still filtered.
    expect(getActiveVoteFilterCount({ q: 'buget' })).toBe(0)
  })

  it('counts a one-sided date range once', () => {
    expect(getActiveVoteFilterCount({ from: '2026-01-28' })).toBe(1)
    expect(getActiveVoteFilterCount({ to: '2026-07-28' })).toBe(1)
    expect(getActiveVoteFilterCount({ from: '2026-01-28', to: '2026-07-28' })).toBe(1)
  })

  it('counts the group and its stance as ONE filter', () => {
    // The stance only narrows the group, so counting them separately would
    // claim two constraints where the query carries one.
    expect(getActiveVoteFilterCount({ grupVot: 'PSD', alegere: 'pentru' })).toBe(1)
  })

  it('counts a group with no stance, because that is a real filter', () => {
    expect(getActiveVoteFilterCount({ grupVot: 'PSD' })).toBe(1)
  })

  it('counts a stance with no group as nothing, matching what the query sends', () => {
    expect(getActiveVoteFilterCount({ alegere: 'pentru' })).toBe(0)
  })

  it('adds the independent facets up', () => {
    expect(
      getActiveVoteFilterCount({
        q: 'buget',
        from: '2026-01-28',
        outcome: 'adoptat',
        grupVot: 'PSD',
        alegere: 'pentru',
      }),
    ).toBe(3)
  })
})

describe('readVoteKinds', () => {
  it('reads a single value as a one-item list', () => {
    // The router serialises one selection as a bare string, many as an array.
    expect(readVoteKinds({ tipVot: 'legislative' })).toEqual(['legislative'])
  })

  it('passes an array through', () => {
    expect(readVoteKinds({ tipVot: ['legislative', 'amendment'] })).toEqual([
      'legislative',
      'amendment',
    ])
  })

  it('reads an absent param as no selection', () => {
    expect(readVoteKinds({})).toEqual([])
  })
})

describe('vote kind presentation', () => {
  it('labels every kind the schema allows', () => {
    for (const kind of VOTE_KIND_ORDER) {
      expect(VOTE_KIND_LABELS[kind]).toBeTruthy()
    }
  })

  it('orders the substantive buckets before the residue', () => {
    expect(VOTE_KIND_ORDER[0]).toBe('legislative')
    expect(VOTE_KIND_ORDER[VOTE_KIND_ORDER.length - 1]).toBe('unclassified')
  })
})

describe('getActiveVoteFilterCount — kinds', () => {
  it('counts any kind selection as one filter', () => {
    expect(getActiveVoteFilterCount({ tipVot: 'legislative' })).toBe(1)
    expect(
      getActiveVoteFilterCount({ tipVot: ['legislative', 'amendment'] }),
    ).toBe(1)
  })
})
