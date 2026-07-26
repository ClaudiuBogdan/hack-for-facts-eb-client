import { describe, expect, it } from 'vitest'
import {
  isCanonicalSpeechKey,
  isLegacySpeechKey,
  legacySpeechKeySourceSystem,
} from './parliament-speech-keys'

/**
 * The regression key from a real shared link. `/parlament/stenograme/<this>`
 * must stay a working URL forever: it is legacy-shaped, so the route promises a
 * redirect into the canonical sitting reader rather than rendering a bare
 * spinner or a not-found page.
 */
const REGRESSION_LEGACY_KEY = 'cdep:cdep_stenogram:9043:9:718'

describe('speech-key shapes', () => {
  it('recognises the regression key as LEGACY, not canonical', () => {
    expect(isLegacySpeechKey(REGRESSION_LEGACY_KEY)).toBe(true)
    expect(isCanonicalSpeechKey(REGRESSION_LEGACY_KEY)).toBe(false)
    expect(legacySpeechKeySourceSystem(REGRESSION_LEGACY_KEY)).toBe('cdep')
  })

  it('recognises a canonical key', () => {
    expect(isCanonicalSpeechKey('canon:cdep:9043:718')).toBe(true)
    expect(isLegacySpeechKey('canon:cdep:9043:718')).toBe(false)
  })

  it('recognises the Senate legacy prefix', () => {
    expect(isLegacySpeechKey('senat:senat_stenogram:12:3')).toBe(true)
    expect(legacySpeechKeySourceSystem('senat:senat_stenogram:12:3')).toBe(
      'senat',
    )
  })

  it('does not infer a source system for an unrecognised key', () => {
    // An unknown shape is still RESOLVED against the server — these predicates
    // only pick the loading copy, they never decide the destination.
    expect(isCanonicalSpeechKey('m1:sp:0')).toBe(false)
    expect(isLegacySpeechKey('m1:sp:0')).toBe(false)
    expect(legacySpeechKeySourceSystem('m1:sp:0')).toBeUndefined()
  })
})
