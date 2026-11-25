import { describe, expect, it } from 'vitest'
import { rawRow, rawWinnerAwards } from '@/features/procurement/lib/contract-award.fixture'
import { effectiveGrain, paymentGrainsOf, toCompanyProcurementRead, type CompanyDirectRead } from './company-procurement-read'
import { authorityRow, categoryRow, companyProcurement, grainAnalytics, newestPurchase } from './company-profile.fixture'

/** The direct part of a read that answered it. */
function directOf(read: ReturnType<typeof toCompanyProcurementRead>): CompanyDirectRead {
  if (read.directAcquisitions.status !== 'ready') throw new Error('the direct purchases did not answer')
  return read.directAcquisitions.value
}

describe('toCompanyProcurementRead: direct purchases', () => {
  it('names the institutions SEAP ranked, never the remainders', () => {
    const read = toCompanyProcurementRead(
      companyProcurement({
        directAcquisition: grainAnalytics('direct_acquisition', {
          records: 20,
          withValue: 8,
          months: ['2019-01', '2026-04'],
          authorities: [
            authorityRow('14810074', 'UNITATEA MILITARA 02022', 15, '102871414.96'),
            authorityRow(null, 'FĂRĂ CUI', 2, null),
            authorityRow(null, null, 96, '1000.00', 'other'),
            authorityRow(null, null, 0, null, 'unknown'),
          ],
        }),
      }),
    )
    expect(directOf(read).topAuthorities).toEqual([
      { cui: '14810074', name: 'UNITATEA MILITARA 02022', amountRon: 102871414.96, count: 15 },
      { cui: null, name: 'FĂRĂ CUI', amountRon: null, count: 2 },
    ])
    expect(directOf(read).stats).toEqual({ count: 20, withValue: 8, firstMonth: '2019-01', lastMonth: '2026-04', authoritiesRankedBy: 'value' })
    // The sources line's year: the firm's own first direct purchase.
    expect(read.window).toEqual({ from: '2019-01', to: '2026-04' })
  })

  it('keeps the records with no CPV code as a share of their own, and drops the empty rows', () => {
    const read = toCompanyProcurementRead(
      companyProcurement({
        directAcquisition: grainAnalytics('direct_acquisition', {
          records: 10,
          categories: [categoryRow('09', 'Produse petroliere', 8, '0.8760'), categoryRow(null, null, 2, '0.1240', 'unknown'), categoryRow(null, null, 0, null, 'other')],
        }),
      }),
    )
    expect(directOf(read).topCategories).toEqual([
      { code: '09', labelRo: 'Produse petroliere', labelEn: 'Produse petroliere (en)', count: 8, share: 0.876 },
      { code: null, labelRo: null, labelEn: null, count: 2, share: 0.124 },
    ])
  })

  it('lists the release’s newest purchases with their buyer, a value only when it counts in lei', () => {
    const id = 'a'.repeat(64)
    const read = toCompanyProcurementRead(
      companyProcurement({
        newest: [newestPurchase(id), newestPurchase('b'.repeat(64), { value: null, title: 'Carburanți', titlePublic: false })],
      }),
    )
    expect(directOf(read).recent).toEqual([
      { id, grain: 'direct_acquisition', title: 'Benzină', authority: { cui: '10755066', name: 'SC Locativ SA' }, valueRon: 300.14, date: '2026-09-03' },
      { id: 'b'.repeat(64), grain: 'direct_acquisition', title: 'Carburanți', authority: { cui: '10755066', name: 'SC Locativ SA' }, valueRon: null, date: '2026-09-03' },
    ])
  })

  it('keeps a count the source did not send unknown, never zero', () => {
    const analytics = grainAnalytics('direct_acquisition', { records: 40 })
    const read = toCompanyProcurementRead(companyProcurement({ directAcquisition: { ...analytics, stats: { ...analytics.stats, withValueCount: null } } }))
    expect(directOf(read).stats.count).toBe(40)
    expect(directOf(read).stats.withValue).toBeNull()
  })

  it('reports a ranking by the number of records when too little money is published to rank by it', () => {
    const read = toCompanyProcurementRead(companyProcurement({ directAcquisition: grainAnalytics('direct_acquisition', { records: 5, rankedBy: 'count' }) }))
    expect(directOf(read).stats.authoritiesRankedBy).toBe('count')
  })

  it('reads an abstained analysis with nothing listed as no answer — failed, its tab kept — never as none', () => {
    const analytics = grainAnalytics('direct_acquisition')
    const abstained = { ...analytics, stats: { ...analytics.stats, recordCount: null, meta: { ...analytics.stats.meta, answerability: 'abstained' as const } } }
    const read = toCompanyProcurementRead(companyProcurement({ directAcquisition: abstained }))
    expect(read.directAcquisitions).toEqual({ status: 'failed' })
    expect(paymentGrainsOf(read)).toEqual(['achizitii-directe'])
    // A purchase the release listed is an answer, abstained analysis or not.
    expect(toCompanyProcurementRead(companyProcurement({ directAcquisition: abstained, newest: [newestPurchase('e'.repeat(64))] })).directAcquisitions.status).toBe('ready')
  })

  it('says a failed direct read as failed, and leaves the window unknown', () => {
    const read = toCompanyProcurementRead(companyProcurement({ direct: 'failed' }))
    expect(read.directAcquisitions).toEqual({ status: 'failed' })
    expect(read.window).toEqual({ from: null, to: null })
  })
})

describe('toCompanyProcurementRead: contract awards (PROC-001)', () => {
  it('counts the winner’s records and lists the newest, each buyer as served, linked only for an institution', () => {
    const read = toCompanyProcurementRead(companyProcurement({ contracts: rawWinnerAwards({ summary: { recordCount: 170, valuedCount: 150 } }) }))
    expect(read.contracts.status).toBe('ready')
    const contracts = read.contracts.status === 'ready' ? read.contracts.value : null
    expect(contracts).toMatchObject({ count: 170, withValue: 150, dataAsOf: '2026-11-25T01:00:00Z', floor: '2021-01-01' })
    expect(contracts?.recent).toEqual([
      { id: 'e_licitatie:ca:100234:550011', grain: 'contract', title: 'Reabilitare școala gimnazială nr. 2', authority: { cui: '4364446', name: 'ORAȘUL OTOPENI' }, valueRon: 1250000.5, date: '2024-03-08' },
      // A masked buyer is named as served, and has no page to link to.
      { id: 'e_licitatie:ca:100240:550020', grain: 'contract', title: 'Servicii de deszăpezire', authority: { cui: null, name: 'Maria I*** (CUI 30111299)' }, valueRon: 1250000.5, date: '2024-03-08' },
    ])
  })

  it('says a buyer served by its code alone as that code, unlinked — never as an institution without a name', () => {
    const read = toCompanyProcurementRead(companyProcurement({ contracts: rawWinnerAwards({ rows: [{ ...rawRow(), buyer: { fiscalCode: '30111299', displayKind: 'code_only', name: null } }] }) }))
    const recent = read.contracts.status === 'ready' ? (read.contracts.value?.recent ?? []) : []
    expect(recent[0]?.authority).toEqual({ cui: null, name: 'CUI 30111299 (nume nepublicat)' })
  })

  it('never shows a framework’s ceiling, or a row under identity review, as an awarded amount', () => {
    const buyer = { fiscalCode: '4364446', displayKind: 'authority', name: 'ORAȘUL OTOPENI' }
    const read = toCompanyProcurementRead(
      companyProcurement({
        contracts: rawWinnerAwards({
          rows: [
            { ...rawRow({ recordId: 'r1', contractKind: 'framework_agreement', valueKind: 'framework_ceiling', additive: false }), buyer },
            { ...rawRow({ recordId: 'r2', status: 'identity_review' }), buyer },
          ],
        }),
      }),
    )
    const recent = read.contracts.status === 'ready' ? (read.contracts.value?.recent ?? []) : []
    expect(recent.map((row) => [row.id, row.valueRon, row.framework ?? false])).toEqual([
      ['r1', null, true],
      ['r2', null, false],
    ])
  })

  it('reads a code the API lists no awards for as none, and a failed read as failed', () => {
    expect(toCompanyProcurementRead(companyProcurement()).contracts).toEqual({ status: 'ready', value: null })
    expect(toCompanyProcurementRead(companyProcurement({ contracts: 'failed' })).contracts).toEqual({ status: 'failed' })
  })
})

describe('paymentGrainsOf and effectiveGrain', () => {
  const both = toCompanyProcurementRead(companyProcurement({ contracts: rawWinnerAwards(), directAcquisition: grainAnalytics('direct_acquisition', { records: 9 }) }))
  const directOnly = toCompanyProcurementRead(companyProcurement({ directAcquisition: grainAnalytics('direct_acquisition', { records: 9 }) }))

  it('lists the populations the company has records in, contracts first', () => {
    expect(paymentGrainsOf(both)).toEqual(['contracte', 'achizitii-directe'])
    expect(paymentGrainsOf(directOnly)).toEqual(['achizitii-directe'])
    // Both answered, neither has any: the band's empty state.
    expect(paymentGrainsOf(toCompanyProcurementRead(companyProcurement()))).toEqual([])
    expect(paymentGrainsOf(toCompanyProcurementRead(companyProcurement({ contracts: rawWinnerAwards({ summary: { recordCount: 0, valuedCount: 0 }, rows: [] }) })))).toEqual([])
  })

  it('keeps a tab for what a part listed though its count is none or unknown: a listed record is not none', () => {
    expect(paymentGrainsOf(toCompanyProcurementRead(companyProcurement({ contracts: rawWinnerAwards({ summary: { recordCount: 0, valuedCount: 0 } }) })))).toEqual(['contracte'])
    const unknown = grainAnalytics('direct_acquisition')
    const counted = { ...unknown, stats: { ...unknown.stats, recordCount: null } }
    expect(paymentGrainsOf(toCompanyProcurementRead(companyProcurement({ directAcquisition: counted, newest: [newestPurchase('d'.repeat(64))] })))).toEqual(['achizitii-directe'])
    expect(paymentGrainsOf(toCompanyProcurementRead(companyProcurement({ directAcquisition: grainAnalytics('direct_acquisition', { categories: [categoryRow('09', 'Produse petroliere', 1, '1.0000')] }) })))).toEqual(['achizitii-directe'])
  })

  it('keeps a tab for a part whose read failed: said as failed, never dropped as if it had none', () => {
    expect(paymentGrainsOf(toCompanyProcurementRead(companyProcurement({ contracts: 'failed' })))).toEqual(['contracte'])
    expect(paymentGrainsOf(toCompanyProcurementRead(companyProcurement({ direct: 'failed', contracts: rawWinnerAwards() })))).toEqual(['contracte', 'achizitii-directe'])
  })

  it('keeps a direct population whose count is unknown when it names payers', () => {
    const analytics = grainAnalytics('direct_acquisition', { authorities: [authorityRow('1', 'COMUNA X', 3, '10.00')] })
    const read = toCompanyProcurementRead(companyProcurement({ directAcquisition: { ...analytics, stats: { ...analytics.stats, recordCount: null } } }))
    expect(paymentGrainsOf(read)).toEqual(['achizitii-directe'])
  })

  it('follows the URL only to a population the band has', () => {
    expect(effectiveGrain(paymentGrainsOf(both), 'achizitii-directe')).toBe('achizitii-directe')
    expect(effectiveGrain(paymentGrainsOf(directOnly), 'contracte')).toBe('achizitii-directe')
    expect(effectiveGrain([], 'contracte')).toBeNull()
  })
})
