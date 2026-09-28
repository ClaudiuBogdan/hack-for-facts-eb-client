import { describe, expect, it, vi } from 'vitest'
import { daItem, daRecord, directPurchase } from './direct-purchase.fixture'
import type { DpItem } from './direct-purchase-model'
import {
  aboutText,
  afterText,
  alsoInText,
  basketCount,
  catalogText,
  contextYearText,
  dayShort,
  labelText,
  leiExact,
  ordinalText,
  outcomeDetailText,
  peersText,
  quantityText,
  receiptLede,
  reconciliationText,
  refusalText,
  repeatsText,
  shareText,
  titleOf,
  titleRestText,
  unitText,
  whenText,
} from './direct-purchase-text'

const locale = vi.hoisted(() => ({ current: 'ro' }))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => locale.current }))

/**
 * The direct purchase page's sentences: exact lei, the source's units read,
 * Romanian count grammar, and nothing said the data would not support.
 */

const line = (fields: Partial<DpItem> = {}): DpItem => ({
  index: 0,
  code: 'W59780005',
  name: 'Dexametazona Rompharm',
  description: null,
  unit: 'CUTIE X 10 FIOLE',
  cpvLabel: null,
  quantity: 5,
  unitPrice: 9.88,
  catalogPrice: null,
  line: 49.4,
  peers: null,
  repeats: null,
  ...fields,
})

describe('numbers as a receipt writes them', () => {
  it('writes lei to the ban, and whole lei whole', () => {
    expect(leiExact(98448)).toBe('98.448\u00a0lei')
    expect(leiExact(479.71)).toBe('479,71\u00a0lei')
    expect(leiExact(322.593)).toBe('322,59\u00a0lei')
  })

  it('keeps a quantity’s own decimals and reads the source’s units', () => {
    expect([quantityText(150), quantityText(18.35)]).toEqual(['150', '18,35'])
    expect([unitText('bucata'), unitText('BUC'), unitText('kilogram'), unitText('CUTIE X 20'), unitText('  ')]).toEqual(['buc.', 'buc.', 'kg', 'cutie x 20', null])
    expect(dayShort('2026-01-21')).toBe('21.01.2026')
  })

  it('counts in Romanian', () => {
    expect([basketCount(1, 'services'), basketCount(3, 'services'), basketCount(21, 'supply'), basketCount(2, 'works')]).toEqual(['1 serviciu', '3 servicii', '21 de produse', '2 lucrări'])
    expect([afterText(0), afterText(1), afterText(5), afterText(20)]).toEqual(['în aceeași zi', 'a doua zi', 'după 5 zile', 'după 20 de zile'])
    expect([ordinalText(1), ordinalText(6), ordinalText(28)]).toEqual(['primul', 'al șaselea', 'al 28-lea'])
  })
})

describe('the title', () => {
  it('stands for a record with none, and counts the rest of a basket it names one line of', () => {
    expect(titleOf(directPurchase({ title: null }))).toBe('Achiziție directă fără titlu în SEAP')
    expect(titleRestText(directPurchase({ title: 'COROANA FUNERARA MODEL I' }))).toBe('și alte 2 produse')
    expect(titleRestText(directPurchase())).toBeNull()
  })
})

describe('how it ended', () => {
  it('says who stopped an attempt, and quotes the reason as written', () => {
    expect(refusalText({ kind: 'firm-refused', reason: 'pret incorect' })).toBe('firma a refuzat condițiile instituției („pret incorect”).')
    expect(refusalText({ kind: 'institution-late' })).toBe('instituția nu a acceptat oferta la timp.')
    expect(refusalText({ kind: 'stopped' })).toBe('SEAP o arată anulată.')
    expect(refusalText({ kind: 'accepted' })).toBeNull()
  })

  it('says under the status who accepted, or where an export row comes from', () => {
    expect(outcomeDetailText({ kind: 'accepted' }, 'catalog')).toBe('Ambele părți au acceptat.')
    expect(outcomeDetailText({ kind: 'reported' }, 'notification')).toBe('Din notificarea instituției; SEAP nu spune pașii.')
  })
})

describe('what the page says as it renders', () => {
  it('picks a label in the page’s language, the other when there is only one', () => {
    const both = { ro: 'Aranjamente florale', en: 'Floral arrangements' }
    expect(labelText(both)).toBe('Aranjamente florale')
    locale.current = 'en'
    try {
      expect(labelText(both)).toBe('Floral arrangements')
      expect(labelText({ ro: 'Aranjamente florale', en: null })).toBe('Aranjamente florale')
    } finally {
      locale.current = 'ro'
    }
    expect(labelText(null)).toBeNull()
  })

  it('says what an institution is and where from its record, not from a sentence kept', () => {
    const identity = { cui: '1', name: 'Spitalul Judetean', entityType: 'health', isTownHall: false, place: { kind: 'municipality', name: 'Targu Mures', countyCode: 'MS', countyName: 'Mureș' }, population: null, address: null, hasBudget: true }
    expect(aboutText(identity)).toMatch(/, județul Mureș$/u)
    expect(aboutText(null)).toBeNull()
  })

  it('says when with its own preposition, or that SEAP does not publish the date', () => {
    expect(whenText('2026-01-21')).toBe('pe 21 ianuarie 2026')
    expect(whenText(null)).toBe('la o dată nepublicată')
  })

  it('names the other sources that publish the same purchase', () => {
    expect(alsoInText(['export'])).toBe('SEAP o publică și în raportul trimestrial al achizițiilor directe; Transparenta o numără o singură dată.')
    expect(alsoInText([])).toBeNull()
  })
})

describe('the basket', () => {
  it('says where the money went, and nothing for a single line', () => {
    expect(receiptLede(directPurchase())).toBe('Cel mai mare rând, Aranjament floral mic, face 48% din bani.')
    expect(receiptLede(directPurchase({}, { items: [daItem(0, { lineValue: '10' }), daItem(1, { lineValue: '90' })] }))).toBe(
      'Un singur rând, Aranjament floral mic, face mai mult de jumătate din bani.',
    )
    expect(receiptLede(directPurchase({}, { items: [daItem(0)] }))).toBeNull()
    // Exactly half is not more than half.
    expect(receiptLede(directPurchase({}, { items: [daItem(0, { lineValue: '50' }), daItem(1, { lineValue: '50' })] }))).toBe('Cel mai mare rând, Aranjament floral mic, face 50% din bani.')
    // A line of unknown money: no shares of a part.
    expect(receiptLede(directPurchase({}, { items: [daItem(0, { lineValue: null, itemQuantity: null }), daItem(1, { lineValue: '90' })] }))).toBeNull()
  })

  it('says a gap between the lines and the value, and the line it equals', () => {
    const value = { ...daRecord().value!, valueRonComparable: '479.71' }
    const gap = directPurchase(
      { valueRon: '479.71', value },
      { itemsReconciled: false, itemsTotal: '745.51', items: [daItem(0, { lineValue: '479.71' }), daItem(5, { catalogItemName: 'CLORURA DE SODIU', lineValue: '265.80' })] },
    )
    expect(reconciliationText(gap)).toContain('diferența e exact rândul Clorura de sodiu, tăiat mai sus')
    expect(reconciliationText(directPurchase())).toBeNull()
  })

  it('places this price among the same firm’s prices elsewhere, or says it is the same', () => {
    expect(peersText(line(), { buyers: 12, lines: 16, min: 9.88, median: 9.88, max: 11.76 }, 2026)).toBe(
      'Alte 12 instituții l-au cumpărat de la firmă în 2026 cu 9,88\u00a0lei – 11,76\u00a0lei; aici, cel mai mic preț.',
    )
    expect(peersText(line({ unitPrice: 12 }), { buyers: 5, lines: 6, min: 10, median: 11, max: 13 }, 2026)).toContain('aici, 9% peste mediană')
    expect(peersText(line(), { buyers: 5, lines: 5, min: 9.88, median: 9.88, max: 9.88 }, 2026)).toBe('Același preț la alte 5 instituții care l-au cumpărat de la firmă în 2026.')
  })

  it('says a price under or over the firm’s catalogue, and how often the institution bought the same', () => {
    expect(catalogText(line({ unitPrice: 9000, catalogPrice: 10000 }))).toBe('Cu 10% sub prețul din catalogul firmei (10.000\u00a0lei).')
    expect(catalogText(line())).toBeNull()
    expect(repeatsText(line({ repeats: 25 }), 2026)).toBe('Instituția l-a cumpărat de la firmă de încă 25 de ori în 2026.')
    expect(repeatsText(line({ repeats: 1 }), 2026)).toBe('Instituția l-a cumpărat de la firmă încă o dată în 2026.')
    expect(repeatsText(line({ repeats: 0 }), 2026)).toBeNull()
  })
})

describe('the context', () => {
  it('names the year in progress with the month it runs through', () => {
    expect(contextYearText({ year: 2026, through: '2026-05' })).toBe('2026 (până în mai)')
    expect(contextYearText({ year: 2025, through: null })).toBe('2025')
  })

  it('floors a share that would read as nothing', () => {
    expect([shareText(0.0001), shareText(0.056)]).toEqual(['sub 0,1%', '5,6%'])
  })
})
