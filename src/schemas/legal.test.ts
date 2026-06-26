import { describe, expect, it } from 'vitest'

import {
  legea227_2015Act,
  legeaAbrogataAct,
  legeaStatusNecunoscutAct,
} from '@/features/legal/mocks/fixtures'
import {
  parseLegalActDetailSearch,
  parseLegalLandingSearch,
} from './legal'

describe('legal search schemas', () => {
  it('parseLegalLandingSearch returns empty object for missing q', () => {
    expect(parseLegalLandingSearch({})).toEqual({})
  })

  it('parseLegalLandingSearch keeps q when provided', () => {
    expect(parseLegalLandingSearch({ q: 'Legea nr. 227/2015' })).toEqual({
      q: 'Legea nr. 227/2015',
    })
  })

  it('parseLegalActDetailSearch returns empty object for default search', () => {
    expect(parseLegalActDetailSearch({})).toEqual({})
  })

  it('parseLegalActDetailSearch keeps non-default detail params', () => {
    expect(
      parseLegalActDetailSearch({
        versiune: 'republicare-2024',
        highlight: 'art-1',
        from: 'landing',
      }),
    ).toEqual({
      versiune: 'republicare-2024',
      highlight: 'art-1',
      from: 'landing',
    })
  })
})

describe('legal mock fixtures', () => {
  it('keeps pre-2012 Monitorul publications metadata-only', () => {
    for (const act of [legeaAbrogataAct, legeaStatusNecunoscutAct]) {
      expect(act.mo).not.toBeNull()
      expect(act.mo?.issueYear).toBeLessThan(2012)
      expect(act.mo?.hasFullText).toBe(false)
    }
  })

  it('keeps post-2012 Monitorul publications with full text in fixtures', () => {
    expect(legea227_2015Act.mo?.issueYear).toBeGreaterThanOrEqual(2012)
    expect(legea227_2015Act.mo?.hasFullText).toBe(true)
  })
})
