import { describe, expect, it } from 'vitest'
import { MemberSpeechesSearchSchema, MemberVotesSearchSchema } from './parliament'

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

  it('drops calendar-impossible dates that pass the regex (2026-99-99, 2026-02-30)', () => {
    const parsed = MemberVotesSearchSchema.parse({
      from: '2026-99-99',
      to: '2026-02-30',
    })
    expect(parsed.from).toBeUndefined()
    expect(parsed.to).toBeUndefined()
    // A real leap day still survives.
    expect(MemberVotesSearchSchema.parse({ from: '2024-02-29' }).from).toBe(
      '2024-02-29',
    )
  })

  it('never throws on a fully junk object', () => {
    expect(() =>
      MemberVotesSearchSchema.parse({ from: 5, outcome: 42, an: {} }),
    ).not.toThrow()
  })
})

describe('MemberSpeechesSearchSchema', () => {
  it('keeps valid date range, session and trimmed q', () => {
    const parsed = MemberSpeechesSearchSchema.parse({
      from: '2026-01-01',
      to: '2026-05-31',
      session: 'comun',
      q: '  buget  ',
      an: '2026',
    })
    expect(parsed).toMatchObject({
      from: '2026-01-01',
      to: '2026-05-31',
      session: 'comun',
      q: 'buget',
      an: 2026,
    })
  })

  it('drops non-YYYY-MM-DD dates and junk session (would crash formatters)', () => {
    const parsed = MemberSpeechesSearchSchema.parse({
      from: 'abc',
      to: '2026-3-1',
      session: 'weird',
    })
    expect(parsed.from).toBeUndefined()
    expect(parsed.to).toBeUndefined()
    expect(parsed.session).toBeUndefined()
  })

  it('drops calendar-impossible dates that pass the regex (2026-99-99, 2026-02-30)', () => {
    const parsed = MemberSpeechesSearchSchema.parse({
      from: '2026-99-99',
      to: '2026-02-30',
    })
    expect(parsed.from).toBeUndefined()
    expect(parsed.to).toBeUndefined()
    expect(MemberSpeechesSearchSchema.parse({ from: '2024-02-29' }).from).toBe(
      '2024-02-29',
    )
  })

  it('collapses an empty/whitespace-only q to undefined', () => {
    expect(MemberSpeechesSearchSchema.parse({ q: '   ' }).q).toBeUndefined()
    expect(MemberSpeechesSearchSchema.parse({ q: '' }).q).toBeUndefined()
  })

  it('coerces `an` and never throws on a fully junk object', () => {
    expect(MemberSpeechesSearchSchema.parse({ an: 'abc' }).an).toBeUndefined()
    expect(() =>
      MemberSpeechesSearchSchema.parse({ from: 5, session: 42, q: {}, an: [] }),
    ).not.toThrow()
  })
})
