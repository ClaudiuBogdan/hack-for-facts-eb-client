import { describe, expect, it } from 'vitest'
import { hasSourcePinIntent, parseSourcePins } from './source-pins'

const AXES = new Set(['D0', 'D1'])

describe('parseSourcePins', () => {
  it('reads a well-formed pin list', () => {
    const { pins, valid } = parseSourcePins(['D0:112', 'D1:7'], AXES)
    expect(valid).toBe(true)
    expect([...pins]).toEqual([
      ['D0', '112'],
      ['D1', '7'],
    ])
  })

  it('treats an absent list as no pins', () => {
    const { pins, valid } = parseSourcePins(undefined, AXES)
    expect(valid).toBe(true)
    expect(pins.size).toBe(0)
  })

  it('treats an EMPTY list as no pins, not as a malformed one', () => {
    // A matrix whose only axes are time and a unit has no classification
    // coordinate to pin, so `sourceRowSelection` returns `clasificari: []` for
    // every one of its rows. Rejecting that made „Alege această serie" write a
    // URL the page then refused to load.
    const { pins, valid } = parseSourcePins([], new Set<string>())
    expect(valid).toBe(true)
    expect(pins.size).toBe(0)
  })

  it('rejects a non-array and an over-long list', () => {
    expect(parseSourcePins('D0:1', AXES).valid).toBe(false)
    expect(
      parseSourcePins(
        ['D0:1', 'D1:1', 'D2:1', 'D3:1', 'D4:1', 'D5:1', 'D6:1', 'D7:1'],
        AXES,
      ).valid,
    ).toBe(false)
  })

  it('rejects a pin for an axis the matrix does not declare', () => {
    expect(parseSourcePins(['D9:1'], AXES).valid).toBe(false)
  })

  it('rejects a duplicated axis', () => {
    expect(parseSourcePins(['D0:1', 'D0:2'], AXES).valid).toBe(false)
  })

  it('rejects a malformed entry', () => {
    expect(parseSourcePins(['D0'], AXES).valid).toBe(false)
    expect(parseSourcePins(['D0:1:2'], AXES).valid).toBe(false)
    expect(parseSourcePins([42], AXES).valid).toBe(false)
  })
})

describe('hasSourcePinIntent', () => {
  it('is false for an absent list and for an empty one', () => {
    // Both say „no pins". Treating `[]` as intent suppressed the server's
    // defaults, the tier-0 bootstrap and the representative badge on every URL
    // carrying `?clasificari=[]` — which the page itself used to write.
    expect(hasSourcePinIntent(undefined)).toBe(false)
    expect(hasSourcePinIntent([])).toBe(false)
  })

  it('is true for any non-empty list', () => {
    expect(hasSourcePinIntent(['D0:1'])).toBe(true)
    expect(hasSourcePinIntent([null])).toBe(true)
  })

  it('is true for a malformed non-array, which must still be reported', () => {
    expect(hasSourcePinIntent('D0:1')).toBe(true)
    expect(hasSourcePinIntent({})).toBe(true)
    expect(hasSourcePinIntent(null)).toBe(true)
  })
})
