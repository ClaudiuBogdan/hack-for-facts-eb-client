import { describe, expect, it } from 'vitest'

import { getChamberFromMandateKey } from './member-mandate-key'

describe('getChamberFromMandateKey', () => {
  it('reads the chamber the source encoded in the key', () => {
    expect(getChamberFromMandateKey('2:2024:133')).toBe('camera')
    expect(getChamberFromMandateKey('1:2024:13')).toBe('senat')
  })

  it('answers for past legislatures too — the code does not move', () => {
    expect(getChamberFromMandateKey('2:2020:12')).toBe('camera')
    expect(getChamberFromMandateKey('1:2016:4')).toBe('senat')
  })

  it('gives up rather than guess a chamber it cannot read', () => {
    // A wrong answer here paints the hero of a senator's profile green and
    // names the wrong chamber above their name, so anything unrecognised must
    // fall through to neutral.
    expect(getChamberFromMandateKey('3:2024:1')).toBeUndefined()
    expect(getChamberFromMandateKey('2024:133')).toBeUndefined()
    expect(getChamberFromMandateKey('abc')).toBeUndefined()
    expect(getChamberFromMandateKey('')).toBeUndefined()
  })
})
