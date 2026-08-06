/**
 * The mock transports must satisfy the same schemas the live path does.
 *
 * They did not, and nothing said so. `ParliamentBillRelatedVoteSchema.outcome`
 * and `ParliamentMemberVoteRecordSchema.ballotKey` were both added as REQUIRED
 * without updating these fixtures, so every mock bill detail and vote detail
 * failed `.parse()` — and `.parse()` THROWS, so the offline/demo path errored
 * out rather than degrading. It went unnoticed because no test ever fed a
 * fixture to its schema: the mock API is exercised through helpers that happen
 * to route around the failing ids.
 *
 * This is the cheap check that keeps them honest. If a schema gains a required
 * field, this fails here rather than in someone's browser.
 */
import { describe, expect, it } from 'vitest'

import {
  ParliamentBillDetailSchema,
  ParliamentVoteDetailSchema,
} from '@/schemas/parliament'

import billDetails from './bill-details.json'
import voteDetails from './vote-details.json'

describe('mock bill details satisfy the UI schema', () => {
  const entries = Object.entries(billDetails as Record<string, unknown>)

  it('has fixtures to check', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it.each(entries.map(([id]) => id))('parses %s', (id) => {
    const raw = (billDetails as Record<string, unknown>)[id]
    expect(() => ParliamentBillDetailSchema.parse(raw)).not.toThrow()
  })

  it('never contradicts the vote fixture it links to', () => {
    // A related-vote card and the vote page it opens must agree on whether the
    // division carried. Fixtures that disagree would teach a wrong expectation
    // to anyone developing against them.
    const votes = voteDetails as Record<string, { outcome?: string }>
    for (const [, bill] of entries as [string, { relatedVotes?: readonly {
      voteId: string
      outcome: string
    }[] }][]) {
      for (const related of bill.relatedVotes ?? []) {
        const linked = votes[related.voteId]
        if (linked?.outcome === undefined) continue
        expect(related.outcome).toBe(linked.outcome)
      }
    }
  })
})

describe('mock vote details satisfy the UI schema', () => {
  const entries = Object.entries(voteDetails as Record<string, unknown>)

  it('has fixtures to check', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it.each(entries.map(([id]) => id))('parses %s', (id) => {
    const raw = (voteDetails as Record<string, unknown>)[id]
    expect(() => ParliamentVoteDetailSchema.parse(raw)).not.toThrow()
  })

  it('gives every ballot a unique render key', () => {
    // The key exists so rows are stable without inventing member ids for
    // unresolved ballots; duplicates would defeat that.
    for (const [, vote] of entries as [string, { memberVotes?: readonly {
      ballotKey: string
    }[] }][]) {
      const keys = (vote.memberVotes ?? []).map((m) => m.ballotKey)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})
