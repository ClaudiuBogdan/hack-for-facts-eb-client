import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VOTE_TAB,
  VOTE_TABS,
  parseVoteDetailSearch,
  voteDetailSearchWithTab,
} from './vote-detail-search'

describe('parseVoteDetailSearch', () => {
  it('accepts every tab the section can show', () => {
    // Including the two honesty tabs and the whole roll — a link naming one of
    // those must survive, or the URL can only ever address four of seven views.
    expect([...VOTE_TABS]).toEqual([
      'pentru',
      'impotriva',
      'abtinere',
      'nu_a_votat',
      'conflicting_choice',
      'unknown',
      'toate',
    ])
    for (const tab of VOTE_TABS) {
      expect(parseVoteDetailSearch({ alegere: tab })).toEqual({ alegere: tab })
    }
  })

  it('drops a value it does not recognise instead of throwing', () => {
    // A hand-edited or stale param must not throw the page away; the section
    // then falls back to `pentru`.
    for (const junk of ['PENTRU', 'da', '', 42, null, undefined, {}]) {
      expect(parseVoteDetailSearch({ alegere: junk })).toEqual({})
    }
    expect(parseVoteDetailSearch({})).toEqual({})
  })

  it('keeps a tab this division may not show', () => {
    // Resolved on render by the section's effective-tab rule, NOT by rewriting
    // the URL — rewriting is what would loop.
    expect(parseVoteDetailSearch({ alegere: 'conflicting_choice' })).toEqual({
      alegere: 'conflicting_choice',
    })
  })
})

describe('voteDetailSearchWithTab', () => {
  it('writes the chosen tab', () => {
    expect(voteDetailSearchWithTab({}, 'toate')).toEqual({ alegere: 'toate' })
  })

  it('leaves no param behind on the default tab', () => {
    // The plain URL stays the canonical one for the page.
    expect(voteDetailSearchWithTab({ alegere: 'toate' }, DEFAULT_VOTE_TAB)).toEqual(
      {},
    )
  })

  it('preserves params this route does not own', () => {
    expect(
      voteDetailSearchWithTab({ ref: 'newsletter', alegere: 'unknown' }, 'toate'),
    ).toEqual({ ref: 'newsletter', alegere: 'toate' })
    expect(
      voteDetailSearchWithTab({ ref: 'newsletter' }, DEFAULT_VOTE_TAB),
    ).toEqual({ ref: 'newsletter' })
  })

  it('does not mutate the previous search', () => {
    const previous = { alegere: 'toate' as const, ref: 'newsletter' }
    voteDetailSearchWithTab(previous, 'impotriva')
    expect(previous).toEqual({ alegere: 'toate', ref: 'newsletter' })
  })
})
