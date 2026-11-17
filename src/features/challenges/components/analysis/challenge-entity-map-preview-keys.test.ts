import { describe, expect, it } from 'vitest'
import { CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS } from './challenge-entity-public-maps'
import {
  CHALLENGE_ENTITY_MAP_PREVIEW_ALIASES,
  CHALLENGE_ENTITY_MAP_PREVIEW_KEYS,
  DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
  normalizeChallengeEntityMapPreviewKey,
} from './challenge-entity-map-preview-keys'

describe('the map previews’ names', () => {
  it('are the definitions’ keys and aliases, in their order', () => {
    expect(CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS.map((definition) => definition.key)).toEqual([...CHALLENGE_ENTITY_MAP_PREVIEW_KEYS])
    for (const definition of CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS) expect(definition.aliases).toEqual(CHALLENGE_ENTITY_MAP_PREVIEW_ALIASES[definition.key])
    expect(DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY).toBe(CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS[0].key)
  })

  it('resolve a key, an old name, or else the default', () => {
    expect(normalizeChallengeEntityMapPreviewKey('income')).toBe('income')
    expect(normalizeChallengeEntityMapPreviewKey('M7PyWc0ic4hV')).toBe('balance')
    expect(normalizeChallengeEntityMapPreviewKey('taxes-local-total')).toBe('local-taxes')
    expect(normalizeChallengeEntityMapPreviewKey('nope')).toBe('expenses')
    expect(normalizeChallengeEntityMapPreviewKey(undefined)).toBe('expenses')
    expect(normalizeChallengeEntityMapPreviewKey('__proto__')).toBe('expenses')
  })
})
