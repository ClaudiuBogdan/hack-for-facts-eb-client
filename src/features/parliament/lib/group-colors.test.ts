import { describe, expect, it } from 'vitest'
import {
  colorDistance,
  fallbackColorFor,
  GROUP_BRAND_COLORS,
  PARLIAMENT_GROUP_FALLBACK_COLOR,
  resolveGroupColor,
} from './group-colors'

describe('resolveGroupColor — per-party identity', () => {
  it('resolves a party regardless of chamber suffix or name vs id', () => {
    const aur = '#111111'
    expect(resolveGroupColor({ name: 'AUR' })).toBe(aur)
    expect(resolveGroupColor({ groupId: 'aur-camera_deputatilor' })).toBe(aur)
    expect(resolveGroupColor({ groupId: 'aur-senat' })).toBe(aur)
    expect(resolveGroupColor({ groupId: 'aur-senat', name: 'AUR' })).toBe(aur)
  })

  it('folds diacritics in the group name', () => {
    expect(resolveGroupColor({ name: 'Neafiliaţi' })).toBe(
      resolveGroupColor({ name: 'neafiliati' }),
    )
  })

  it('PNL and AUR are DIFFERENT colours (the reported duplicate)', () => {
    expect(resolveGroupColor({ name: 'PNL' })).not.toBe(resolveGroupColor({ name: 'AUR' }))
  })

  it('uses the user-authoritative FIXED hexes (do not auto-adjust)', () => {
    expect(resolveGroupColor({ name: 'PSD' })).toBe('#E4002B')
    expect(resolveGroupColor({ name: 'AUR' })).toBe('#111111') // black, not navy
    expect(resolveGroupColor({ name: 'PNL' })).toBe('#FFD200')
    expect(resolveGroupColor({ name: 'USR' })).toBe('#002A59') // dark blue, not cyan
    expect(resolveGroupColor({ name: 'PACE' })).toBe('#F05A28') // orange, not purple
    expect(resolveGroupColor({ name: 'UDMR' })).toBe('#00843D')
    expect(resolveGroupColor({ name: 'Neafiliaţi' })).toBe('#6B7280')
  })

  it('falls back deterministically + distinctly for an unknown group', () => {
    const a = resolveGroupColor({ name: 'Partidul Nou XYZ' })
    const b = resolveGroupColor({ name: 'Partidul Nou XYZ' })
    expect(a).toBe(b) // deterministic
    expect(a).not.toBe(PARLIAMENT_GROUP_FALLBACK_COLOR) // a real slot, not neutral grey
  })

  it('empty input → neutral grey', () => {
    expect(resolveGroupColor({})).toBe(PARLIAMENT_GROUP_FALLBACK_COLOR)
    expect(fallbackColorFor({ name: '' })).toBe(PARLIAMENT_GROUP_FALLBACK_COLOR)
  })
})

describe('distinctness guard', () => {
  /**
   * Every brand colour must be perceptually separable from every other brand
   * colour (no two groups read as the same), AND from every fallback slot (a new
   * group never collides with a known brand). Threshold ~70 on the redmean
   * distance reliably separates distinct hues/brightnesses; identical colours
   * score 0, PNL-yellow vs AUR-navy scores well above it.
   */
  const MIN_DISTANCE = 70

  const brandEntries = Object.entries(GROUP_BRAND_COLORS)
  // Dedup identical hex for aliases that intentionally share a colour (udmr/rmdsz,
  // sos-ro/sos-romania) — those are the SAME party, so equal colour is correct.
  const distinctBrand = Array.from(new Set(brandEntries.map(([, hex]) => hex)))

  it('no two DISTINCT brand colours are perceptually close', () => {
    const tooClose: string[] = []
    for (let i = 0; i < distinctBrand.length; i++) {
      for (let j = i + 1; j < distinctBrand.length; j++) {
        const d = colorDistance(distinctBrand[i]!, distinctBrand[j]!)
        if (d < MIN_DISTANCE) tooClose.push(`${distinctBrand[i]} ~ ${distinctBrand[j]} (Δ=${d.toFixed(0)})`)
      }
    }
    expect(tooClose, `brand colours too close:\n${tooClose.join('\n')}`).toEqual([])
  })

  it('PNL vs AUR are clearly separable', () => {
    expect(colorDistance(GROUP_BRAND_COLORS['pnl']!, GROUP_BRAND_COLORS['aur']!)).toBeGreaterThan(
      MIN_DISTANCE,
    )
  })

  it('no fallback slot collides with a brand colour', () => {
    // Probe many synthetic unknown groups; each fallback must stay clear of brands.
    const collisions: string[] = []
    for (let n = 0; n < 50; n++) {
      const fb = fallbackColorFor({ name: `Grup Necunoscut ${n}` })
      for (const hex of distinctBrand) {
        if (colorDistance(fb, hex) < MIN_DISTANCE) {
          collisions.push(`fallback ${fb} ~ brand ${hex}`)
        }
      }
    }
    expect(collisions, `fallback↔brand collisions:\n${[...new Set(collisions)].join('\n')}`).toEqual([])
  })
})
