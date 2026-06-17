import { describe, expect, it } from 'vitest'
import {
  colorForGroupName,
  deriveGroupId,
  foldSlug,
  fromGraphqlChamber,
  PARLIAMENT_GROUP_FALLBACK_COLOR,
  toGraphqlChamber,
} from './parliament-translate'

describe('chamber translation', () => {
  it('maps UI chamber to the DB enum', () => {
    expect(toGraphqlChamber('camera')).toBe('camera_deputatilor')
    expect(toGraphqlChamber('senat')).toBe('senat')
  })

  it('maps DB chamber back to UI, collapsing comun to camera', () => {
    expect(fromGraphqlChamber('camera_deputatilor')).toBe('camera')
    expect(fromGraphqlChamber('senat')).toBe('senat')
    expect(fromGraphqlChamber('comun')).toBe('camera')
  })

  it('returns null for unknown chamber values', () => {
    expect(fromGraphqlChamber('unknown')).toBeNull()
    expect(fromGraphqlChamber(null)).toBeNull()
  })
})

describe('foldSlug', () => {
  it('folds diacritics and lowercases', () => {
    expect(foldSlug('IAŞI')).toBe('iasi')
    expect(foldSlug('MUREŞ')).toBe('mures')
    expect(foldSlug('SATU-MARE')).toBe('satu-mare')
    expect(foldSlug('București')).toBe('bucuresti')
  })
})

describe('deriveGroupId', () => {
  it('reproduces the server groupId format <slug>-<chamber>', () => {
    expect(deriveGroupId('PSD', 'camera_deputatilor')).toBe('psd-camera_deputatilor')
    expect(deriveGroupId('UDMR', 'senat')).toBe('udmr-senat')
    expect(deriveGroupId('SOS RO', 'camera_deputatilor')).toBe('sos-ro-camera_deputatilor')
  })

  it('folds a bare ballot label (no chamber) to a stable id', () => {
    expect(deriveGroupId('neafiliat', undefined)).toBe('neafiliat')
  })

  it('defaults an empty group name', () => {
    expect(deriveGroupId(null, 'senat')).toBe('necunoscut-senat')
  })
})

describe('colorForGroupName (delegates to the centralized resolver)', () => {
  it('resolves known parties diacritic-insensitively', () => {
    expect(colorForGroupName('PSD')).toBe('#E4002B')
    expect(colorForGroupName('Neafiliaţi')).toBe(colorForGroupName('neafiliati'))
  })

  it('gives an unknown group a deterministic distinct fallback (not neutral grey)', () => {
    // The resolver assigns unknown groups a stable fallback SLOT (never colliding
    // with a brand), so they are visually separable — not the neutral grey.
    expect(colorForGroupName('XYZ')).toBe(colorForGroupName('XYZ'))
    expect(colorForGroupName('XYZ')).not.toBe(PARLIAMENT_GROUP_FALLBACK_COLOR)
  })

  it('returns neutral grey only for empty/missing input', () => {
    expect(colorForGroupName(null)).toBe(PARLIAMENT_GROUP_FALLBACK_COLOR)
    expect(colorForGroupName('')).toBe(PARLIAMENT_GROUP_FALLBACK_COLOR)
  })
})
