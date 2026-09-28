import { describe, expect, it } from 'vitest'
import { daDetail, daItem, daRecord, directPurchase, dpContext, NAMES } from './direct-purchase.fixture'
import {
  aroundOf,
  byMoney,
  contextGapOf,
  contextInputOf,
  contextPeriodOf,
  excludedLine,
  exportQuarterOf,
  familyOf,
  linkYearOf,
  mapDirectPurchase,
  NO_NAMES,
  outcomeOf,
  purchasesSince,
  redoOf,
  shownDayOf,
  titleNamesOneLine,
} from './direct-purchase-model'

/**
 * What a direct purchase's page may claim, as far as its model holds it:
 * where SEAP has the record from, how it ended and who stopped it, the value
 * a reader may take as spent, the lines as the source wrote them, and the
 * context's period and window.
 */

describe('where SEAP has the record from', () => {
  it('names the family by its source', () => {
    expect([familyOf('elicitatie_da'), familyOf('seap_da'), familyOf('seap_dan')]).toEqual(['catalog', 'export', 'notification'])
  })

  it('reads the quarter an export file names, arabic or roman', () => {
    expect(exportQuarterOf('https://data.gov.ro/x/download/achizitii-directe-t2-2025.xlsx')).toBe('T2 2025')
    expect(exportQuarterOf('https://data.gov.ro/x/download/datagov-notificari-de-atribuire-la-cumpararea-directa-tiii-2025.xlsx')).toBe('T3 2025')
    expect(exportQuarterOf('https://data.gov.ro/x/download/notificri-de-atribuire-la-cumprarea-directa-t_iv_2025.xlsx')).toBe('T4 2025')
    expect(exportQuarterOf('https://data.gov.ro/x/download/export.xlsx')).toBeNull()
  })
})

describe('how it ended', () => {
  it('counts a catalogue purchase once both sides accepted', () => {
    expect(outcomeOf('finalized', 'catalog', daDetail())).toEqual({ kind: 'accepted' })
  })

  it('says who stopped a cancelled one, from the reason given or the decision never made', () => {
    const cancelled = (fields: Parameters<typeof daDetail>[0]) => outcomeOf('cancelled', 'catalog', daDetail(fields))
    expect(cancelled({ supplierRejectionReason: 'pret incorect', caDecisionDate: null })).toEqual({ kind: 'firm-refused', reason: 'pret incorect' })
    expect(cancelled({ caRejectionReason: 'CPV incorect' })).toEqual({ kind: 'institution-refused', reason: 'CPV incorect' })
    expect(cancelled({ supplierDecisionDate: null, caDecisionDate: null })).toEqual({ kind: 'firm-late' })
    expect(cancelled({ caDecisionDate: null })).toEqual({ kind: 'institution-late' })
  })

  it('does not guess who stopped it without the detail, or when the text (reasons included) is withheld', () => {
    expect(outcomeOf('cancelled', 'catalog', null)).toEqual({ kind: 'stopped' })
    expect(outcomeOf('cancelled', 'catalog', daDetail({ textRedacted: true, supplierRejectionReason: null }))).toEqual({ kind: 'stopped' })
  })

  it('takes an export row as reported, and a status it does not know as unknown', () => {
    expect(outcomeOf('unknown', 'export', null)).toEqual({ kind: 'reported' })
    expect(outcomeOf('awarded', 'notification', null)).toEqual({ kind: 'reported' })
    expect(outcomeOf('published', 'catalog', null)).toEqual({ kind: 'unknown' })
  })
})

describe('the purchase as the page reads it', () => {
  it('names the parties by the spine, in reading case, and the category by its label', () => {
    const purchase = directPurchase()
    expect(purchase.authority.name).toBe('Banca Nationala a Romaniei')
    expect(purchase.supplier.name).toBe('Floraria Iris SRL')
    expect(purchase.cpv).toEqual({ code: '03121210', label: { ro: 'Aranjamente florale', en: 'Floral arrangements' } })
    expect(purchase.source).toEqual({ kind: 'page', url: 'https://e-licitatie.ro/pub/direct-acquisition/view/121372731' })
  })

  it('drops a CUI SEAP wrote before the name when it read no CUI, and a display name that is only the CUI', () => {
    const noCui = directPurchase({ authority: { cui: null, name: 'R 361684 Banca Nationala a Romaniei', displayName: 'R 361684 Banca Nationala a Romaniei' } }, {}, NO_NAMES)
    expect(noCui.authority.name).toBe('Banca Nationala a Romaniei')
    const cuiOnly = directPurchase({ authority: { cui: '25097708', name: 'ASOCIATIA DE DEZVOLTARE INTERCOMUNITARA IPATELE-DRAGUSENI', displayName: '25097708' } }, {}, NO_NAMES)
    expect(cuiOnly.authority.name).toBe('Asociatia de Dezvoltare Intercomunitara Ipatele-Draguseni')
    // A number that is not the party's CUI is its name's.
    const numbered = directPurchase({ supplier: { cui: '15520188', name: '2004 IMPEX SRL', displayName: '2004 IMPEX SRL' } }, {}, NO_NAMES)
    expect(numbered.supplier.name).toBe('2004 Impex SRL')
    const ownCui = directPurchase({ supplier: { cui: 'RO15520188', name: 'RO 15520188 IMPEX SRL', displayName: 'RO 15520188 IMPEX SRL' } }, {}, NO_NAMES)
    expect(ownCui.supplier.name).toBe('Impex SRL')
  })

  it('names the other sources that publish the same purchase, its own left out', () => {
    expect(directPurchase({}, {}, NAMES, ['seap_da', 'seap_da', 'elicitatie_da']).alsoIn).toEqual(['export'])
    expect(directPurchase().alsoIn).toEqual([])
  })

  it('dates an attempt by its request, anything else by its end', () => {
    const refused = directPurchase({ status: 'cancelled', publicationDate: '2026-03-02', finalizationDate: '2026-03-05' }, { supplierRejectionReason: 'pret incorect' })
    expect(shownDayOf(refused)).toBe('2026-03-02')
    expect(shownDayOf(directPurchase())).toBe('2026-01-21')
  })

  it('shows a purchase’s checked value, an attempt’s offer, and never an unchecked value as the value', () => {
    expect(directPurchase().value).toBe(98448)
    const refused = directPurchase({ status: 'cancelled', valueRon: '25000.00', estimatedValueRon: '20000.00', value: null }, { supplierRejectionReason: 'pret incorect', caDecisionDate: null })
    expect([refused.value, refused.estimate]).toEqual([25000, 20000])
    const quarantined = directPurchase({ value: { ...daRecord().value!, valueAccepted: false, valueRonComparable: null, valueState: 'invalid_source_value' } })
    expect([quarantined.value, quarantined.unverifiedValue]).toEqual([null, 98448])
  })

  it('shows the estimate only where it differs from the value (SEAP fills it from the offer)', () => {
    expect(directPurchase().estimate).toBeNull()
  })

  it('keeps the lines as the source wrote them, the catalogue price only where the price paid differs', () => {
    const purchase = directPurchase({}, { items: [daItem(0, { catalogItemName: 'SERVICII SELECTIE DIRECTORI', catalogItemDescription: 'Servicii expert independent', itemQuantity: '3', unitPrice: '9000', catalogUnitPrice: '10000', lineValue: '27000' })] })
    const [line] = purchase.detail?.items ?? []
    expect(line).toMatchObject({ name: 'Servicii selectie directori', description: 'Servicii expert independent', quantity: 3, unitPrice: 9000, catalogPrice: 10000, line: 27000, cpvLabel: { ro: 'Aranjamente florale', en: 'Floral arrangements' } })
    expect(directPurchase().detail?.items.every((item) => item.catalogPrice === null && item.description === null)).toBe(true)
  })

  it('reads the detail only where the API served it, and marks a read that failed just now', () => {
    expect(directPurchase({}, null).detail).toBeNull()
    const failed = mapDirectPurchase(daRecord(), null, 'TEMPORARILY_UNAVAILABLE', NAMES)
    expect([failed.detail, failed.partial]).toEqual([null, true])
    expect(mapDirectPurchase(daRecord(), daDetail(), 'AVAILABLE', { ...NAMES, failed: true }).partial).toBe(true)
  })

  it('names an export row’s file by its quarter', () => {
    const row = directPurchase({ sourceSystem: 'seap_da', status: 'unknown', sourceUrl: 'https://data.gov.ro/x/download/achizitii-directe-t2-2025.xlsx' }, null)
    expect([row.family, row.outcome, row.source]).toEqual(['export', { kind: 'reported' }, { kind: 'export', url: 'https://data.gov.ro/x/download/achizitii-directe-t2-2025.xlsx', file: 'T2 2025' }])
  })
})

describe('the basket', () => {
  it('sorts the lines by money, a line of unknown money last', () => {
    const purchase = directPurchase({}, { items: [daItem(0, { lineValue: '5' }), daItem(1, { lineValue: null, itemQuantity: null }), daItem(2, { lineValue: '50' })] })
    expect(byMoney(purchase.detail?.items ?? []).map((item) => item.index)).toEqual([2, 0, 1])
  })

  it('finds the line the value leaves out when the gap is exactly one line', () => {
    const purchase = directPurchase(
      { valueRon: '479.71', value: { ...daRecord().value!, valueRonComparable: '479.71' } },
      { itemsReconciled: false, itemsTotal: '745.51', items: [daItem(0, { lineValue: '479.71' }), daItem(5, { lineValue: '265.80' })] },
    )
    expect(excludedLine(purchase)?.index).toBe(5)
    expect(excludedLine(directPurchase())).toBeNull()
  })

  it('knows a title that names only one line of the basket', () => {
    expect(titleNamesOneLine(directPurchase({ title: 'COROANA FUNERARA MODEL I' }))).toBe(true)
    expect(titleNamesOneLine(directPurchase())).toBe(false)
  })
})

describe('the context', () => {
  it('needs both parties, a date, and a year that compares', () => {
    expect(contextInputOf(directPurchase())).toEqual({ id: '10120196', authorityCui: '361684', supplierCui: '9446547', day: '2026-01-16', yearDay: '2026-01-21' })
    expect(contextGapOf(directPurchase())).toBeNull()
    const noCui = directPurchase({ authority: { cui: null, name: 'X', displayName: null } })
    const noDate = directPurchase({ publicationDate: null, finalizationDate: null }, null)
    const legacy = directPurchase({ sourceSystem: 'seap_da', status: 'unknown', publicationDate: '2017-04-03', finalizationDate: '2017-04-05' }, null)
    expect([noCui, noDate, legacy].map(contextGapOf)).toEqual(['no-cui', 'no-date', 'before-comparable'])
    expect([noCui, noDate, legacy].map(contextInputOf)).toEqual([null, null, null])
  })

  it('reads a complete year whole, the year in progress through the cutoff or the purchase’s own month if later', () => {
    expect(contextPeriodOf('2025-06-02', 2025, '2026-05')).toEqual({ year: 2025, from: '2025-01', to: '2025-12', through: null })
    expect(contextPeriodOf('2026-01-21', 2025, '2026-05')).toEqual({ year: 2026, from: '2026-01', to: '2026-05', through: '2026-05' })
    expect(contextPeriodOf('2026-06-12', 2025, '2026-05')).toEqual({ year: 2026, from: '2026-01', to: '2026-06', through: '2026-06' })
    expect(contextPeriodOf('2026-06-12', 2025, null).through).toBe('2026-06')
  })

  it('opens the parties’ pages on the purchase’s year when they have it', () => {
    expect(linkYearOf({ finalized: '2026-01-21', published: null }, 2025)).toBe(2026)
    expect(linkYearOf({ finalized: '2016-05-01', published: null }, 2025)).toBeUndefined()
  })

  it('keeps up to three records either side of this one, newest first, this one in place', () => {
    const other = (id: string, date: string) => ({ id, code: null, title: 'X', value: 1, date, done: true })
    const newer = ['n1', 'n2', 'n3', 'n4'].map((id, index) => other(id, `2026-02-0${index + 1}`))
    const older = ['o1', 'o2', 'o3', 'o4'].map((id, index) => other(id, `2026-01-0${9 - index}`))
    expect(aroundOf(directPurchase(), newer, older).map((item) => item.id)).toEqual(['n3', 'n2', 'n1', '10120196', 'o1', 'o2', 'o3'])
    // An attempt is dated by its request, as its head dates it — not by its cancellation.
    const refused = directPurchase({ status: 'cancelled', publicationDate: '2026-03-04', finalizationDate: '2026-03-05' }, { supplierRejectionReason: 'pret incorect' })
    expect(aroundOf(refused, [], []).map((item) => [item.date, item.done])).toEqual([['2026-03-04', false]])
  })

  it('finds a refused offer’s redo: the nearest done record with the same title, within the week after', () => {
    const refused = directPurchase({ id: 'r', status: 'cancelled', title: 'Servicii de contabilitate', finalizationDate: '2026-03-05' }, { supplierRejectionReason: 'pret incorect' })
    const redo = { id: 'd', code: null, title: 'Servicii de contabilitate', value: 20000, date: '2026-03-05', done: true }
    expect(redoOf(refused, dpContext({ others: [redo] }))?.id).toBe('d')
    expect(redoOf(refused, dpContext({ others: [{ ...redo, date: '2026-04-30' }] }))).toBeNull()
    expect(redoOf(directPurchase(), dpContext({ others: [redo] }))).toBeNull()
    // A weekly order: the others come newest first; the redo is the nearest, and next week's order is not one.
    const weekly = [
      { ...redo, id: 'week', date: '2026-03-12' },
      { ...redo, id: 'next-day', date: '2026-03-06' },
    ]
    expect(redoOf(refused, dpContext({ others: weekly }))?.id).toBe('next-day')
    expect(redoOf(refused, dpContext({ others: [weekly[0]!] }))).toBeNull()
  })

  it('counts the pair’s purchases only when their years were read', () => {
    expect(purchasesSince(dpContext())).toEqual({ count: 17, since: 2023 })
    expect(purchasesSince(dpContext({ years: null }))).toBeNull()
  })
})
