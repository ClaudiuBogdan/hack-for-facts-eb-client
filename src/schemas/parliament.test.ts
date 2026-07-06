import { describe, expect, it } from 'vitest'
import { MemberVotesSearchSchema } from './parliament'

describe('MemberVotesSearchSchema', () => {
  it('parses a single choice string and a choice array', () => {
    expect(MemberVotesSearchSchema.parse({ choice: 'impotriva' }).choice).toBe(
      'impotriva',
    )
    expect(
      MemberVotesSearchSchema.parse({ choice: ['pentru', 'abtinere'] }).choice,
    ).toEqual(['pentru', 'abtinere'])
  })

  it('coerces `an` to an int and drops non-numeric junk', () => {
    expect(MemberVotesSearchSchema.parse({ an: '2026' }).an).toBe(2026)
    expect(MemberVotesSearchSchema.parse({ an: 'abc' }).an).toBeUndefined()
  })

  it('drops junk enum values instead of throwing', () => {
    const parsed = MemberVotesSearchSchema.parse({
      outcome: 'nope',
      session: 'weird',
    })
    expect(parsed.outcome).toBeUndefined()
    expect(parsed.session).toBeUndefined()
  })

  it('keeps valid enum + date facets', () => {
    const parsed = MemberVotesSearchSchema.parse({
      from: '2026-01-01',
      to: '2026-03-31',
      outcome: 'respins',
      session: 'proprie',
    })
    expect(parsed).toMatchObject({
      from: '2026-01-01',
      to: '2026-03-31',
      outcome: 'respins',
      session: 'proprie',
    })
  })

  it('drops non-YYYY-MM-DD date strings (would crash the chip formatter)', () => {
    const parsed = MemberVotesSearchSchema.parse({
      from: 'abc',
      to: '2026-3-1',
    })
    expect(parsed.from).toBeUndefined()
    expect(parsed.to).toBeUndefined()
  })

  it('never throws on a fully junk object', () => {
    expect(() =>
      MemberVotesSearchSchema.parse({ from: 5, outcome: 42, an: {} }),
    ).not.toThrow()
  })
})
