import type { I18n } from '@lingui/core'
import { describe, expect, it, vi } from 'vitest'
import { OTHER_CATEGORY } from './home-categories'
import { categoriesRead, nationalRead } from './home.fixture'
import { consortiumLede, countyLede, directAverageLede, directPurchasesNote, frameworksNote, frequentLede, growthLede, unpublishedLede, whatLede } from './home-text'

// Pin the page language: figures read with Romanian separators.
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

/** The macro mock gives descriptors as their source text; the real `i18n._` resolves them. */
const i18n = { _: (message: unknown) => (typeof message === 'string' ? message : ((message as { message?: string }).message ?? '')) } as unknown as I18n

describe('whatLede', () => {
  it('says where most contract money went, what follows, and what leads direct purchases', () => {
    expect(whatLede(categoriesRead(), 2025, i18n)).toBe(
      'La drumuri, poduri și autostrăzi a mers 37% din valoarea contractelor atribuite în 2025, 38,0\u00a0mld.\u00a0lei. Urmează construcția și renovarea clădirilor, cu 14%. La achizițiile directe, cei mai mulți bani merg pe proiectare și inginerie (12%).',
    )
  })

  it('says nothing while no category holds a fifth of the money', () => {
    const flat = categoriesRead({ contract: categoriesRead().contract.map((row) => ({ ...row, share: 0.1 })) })
    expect(whatLede(flat, 2025, i18n)).toBeNull()
  })
})

describe('consortiumLede', () => {
  it('names the consortia’s share, and the roads’ when it is higher', () => {
    expect(consortiumLede(nationalRead(), { withheld: 89, total: 100 })).toMatch(/^52% din valoarea contractelor atribuite în 2025 a mers la asocieri de firme; la drumuri, 89%\. SEAP publică/)
    expect(consortiumLede(nationalRead(), { withheld: 1, total: 100 })).toMatch(/^52% din valoarea contractelor atribuite în 2025 a mers la asocieri de firme\. SEAP/)
  })

  it('says nothing while consortia hold less than a fifth, or the read has no split', () => {
    expect(consortiumLede(nationalRead({ consortium: { withheld: 10, total: 100 } }), null)).toBeNull()
    expect(consortiumLede(nationalRead({ consortium: null }), null)).toBeNull()
  })
})

describe('the other ledes', () => {
  it('say the share negotiated without a notice while it is 5% or more', () => {
    expect(unpublishedLede(nationalRead())).toBe('19% din contractele atribuite în 2025 (7.636 de contracte) au fost negociate fără anunț prealabil.')
    expect(unpublishedLede(nationalRead({ contract: { ...nationalRead().contract, count: 1_000_000 } }))).toBeNull()
  })

  it('say the average direct purchase', () => {
    expect(directAverageLede(nationalRead())).toMatch(/2,01\u00a0mil\. de achiziții directe din catalogul SEAP, de 8\.948\u00a0lei în medie/)
  })

  it('say how direct purchases grew, only when they grew by half or more', () => {
    expect(growthLede(nationalRead())).toBe('Achizițiile directe au crescut de la 9,1\u00a0mld.\u00a0lei în 2019 la 18,0\u00a0mld.\u00a0lei în 2025, în lei ai fiecărui an.')
    const flat = nationalRead({ directYears: [{ year: 2019, value: 10, count: 1 }, { year: 2025, value: 12, count: 1 }] })
    expect(growthLede(flat)).toBeNull()
  })

  it('name the county that buys most and least per resident, against the country', () => {
    const line = countyLede(
      [
        { code: 'B', value: 1_394 },
        { code: 'GR', value: 621 },
        { code: 'CJ', value: 1_124 },
      ],
      922,
      (code) => ({ B: 'București', GR: 'Giurgiu', CJ: 'Cluj' })[code] ?? code,
    )
    expect(line).toBe('București cumpără direct de 1.394\u00a0lei pe locuitor, Giurgiu de 621\u00a0lei. Media țării: 922\u00a0lei.')
    expect(countyLede([{ code: 'B', value: 1 }], 1, (code) => code)).toBeNull()
  })

  it('name the firms that recur among the largest contracts', () => {
    expect(frequentLede({ names: ['Spedition UMB', 'Tehnostrade'], times: 4 }, 8, 2025)).toBe('Spedition UMB și Tehnostrade apar fiecare în 4 dintre cele 8 mai mari contracte din 2025.')
    expect(frequentLede({ names: ['Tehnostrade'], times: 3 }, 8, 2025)).toBe('Tehnostrade apare în 3 dintre cele 8 mai mari contracte din 2025.')
  })
})

describe('what the ledes may not claim', () => {
  it('says „urmează" and „cei mai mulți bani" only of a category nothing else outweighs', () => {
    const base = categoriesRead()
    const other = { category: OTHER_CATEGORY, value: 20_000_000_000, count: 9, share: 0.19 }
    const directOther = { category: OTHER_CATEGORY, value: 9_000_000_000, count: 9, share: 0.5 }
    const line = whatLede({ ...base, contract: [...base.contract, other], direct: [...base.direct, directOther] }, 2025, i18n)
    expect(line).toMatch(/^La drumuri, poduri și autostrăzi a mers 37%/)
    expect(line).not.toContain('Urmează')
    expect(line).not.toContain('cei mai mulți bani')
  })

  it('says nothing about categories whose money is unknown', () => {
    const unknown = categoriesRead({ contract: categoriesRead().contract.map((row) => ({ ...row, value: null, share: null })) })
    expect(whatLede(unknown, 2025, i18n)).toBeNull()
  })
})

describe('figure notes', () => {
  it('write the count as Romanian does: „de" after a million and after 20–99', () => {
    expect(directPurchasesNote(2_014_671)).toBe('2,01\u00a0mil. de cumpărături, fără TVA')
    expect(directPurchasesNote(45)).toBe('45 de cumpărături, fără TVA')
    expect(directPurchasesNote(1)).toBe('O cumpărătură, fără TVA')
    expect(frameworksNote(88_105)).toBe('Și 88.105 acorduri-cadru')
    expect(frameworksNote(88_120)).toBe('Și 88.120 de acorduri-cadru')
  })
})
