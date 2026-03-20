import { describe, expect, it } from 'vitest'
import { isoToTime, maxIso, maxIsoRequired } from './date-utils'

const ISO_1 = '2025-01-01T00:00:00.000Z'
const ISO_2 = '2025-01-02T00:00:00.000Z'

describe('isoToTime', () => {
  it('returns milliseconds for a valid ISO string', () => {
    expect(isoToTime(ISO_1)).toBe(Date.parse(ISO_1))
  })

  it('returns 0 for null', () => {
    expect(isoToTime(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(isoToTime(undefined)).toBe(0)
  })

  it('returns 0 for an empty string', () => {
    expect(isoToTime('')).toBe(0)
  })

  it('returns 0 for an invalid string', () => {
    expect(isoToTime('not-a-date')).toBe(0)
  })
})

describe('maxIso', () => {
  it('returns null when both are null', () => {
    expect(maxIso(null, null)).toBeNull()
  })

  it('returns b when a is null', () => {
    expect(maxIso(null, ISO_1)).toBe(ISO_1)
  })

  it('returns a when b is null', () => {
    expect(maxIso(ISO_1, null)).toBe(ISO_1)
  })

  it('returns a when a is newer', () => {
    expect(maxIso(ISO_2, ISO_1)).toBe(ISO_2)
  })

  it('returns b when b is newer', () => {
    expect(maxIso(ISO_1, ISO_2)).toBe(ISO_2)
  })

  it('returns a when both are equal', () => {
    expect(maxIso(ISO_1, ISO_1)).toBe(ISO_1)
  })
})

describe('maxIsoRequired', () => {
  it('returns a when a is newer', () => {
    expect(maxIsoRequired(ISO_2, ISO_1)).toBe(ISO_2)
  })

  it('returns b when b is newer', () => {
    expect(maxIsoRequired(ISO_1, ISO_2)).toBe(ISO_2)
  })

  it('returns a when both are equal', () => {
    expect(maxIsoRequired(ISO_1, ISO_1)).toBe(ISO_1)
  })
})
