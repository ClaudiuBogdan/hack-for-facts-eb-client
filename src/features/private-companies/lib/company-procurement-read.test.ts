import { describe, expect, it } from 'vitest'
import { effectiveGrain, paymentGrainsOf, toCompanyProcurementRead } from './company-procurement-read'
import { authorityRow, categoryRow, contract, directAcquisition, grainAnalytics, supplierSlice } from './company-profile.fixture'

describe('toCompanyProcurementRead', () => {
  it('names the institutions SEAP ranked, never the remainders', () => {
    const read = toCompanyProcurementRead(
      supplierSlice({
        contract: grainAnalytics('contract', {
          records: 20,
          withValue: 8,
          months: ['2016-01', '2026-04'],
          authorities: [
            authorityRow('14810074', 'UNITATEA MILITARA 02022', 15, '102871414.96'),
            authorityRow(null, 'FĂRĂ CUI', 2, null),
            authorityRow(null, null, 96, '1000.00', 'other'),
            authorityRow(null, null, 0, null, 'unknown'),
          ],
        }),
      }),
    )
    expect(read.topAuthorities.contract).toEqual([
      { cui: '14810074', name: 'UNITATEA MILITARA 02022', amountRon: 102871414.96, count: 15 },
      { cui: null, name: 'FĂRĂ CUI', amountRon: null, count: 2 },
    ])
    expect(read.contracts).toEqual({ count: 20, withValue: 8, firstMonth: '2016-01', lastMonth: '2026-04', authoritiesRankedBy: 'value' })
  })

  it('keeps the records with no CPV code as a share of their own, and drops the empty rows', () => {
    const read = toCompanyProcurementRead(
      supplierSlice({
        directAcquisition: grainAnalytics('direct_acquisition', {
          records: 10,
          categories: [
            categoryRow('09', 'Produse petroliere', 8, '0.8760'),
            categoryRow(null, null, 2, '0.1240', 'unknown'),
            categoryRow(null, null, 0, null, 'other'),
          ],
        }),
      }),
    )
    expect(read.topCategories.directAcquisition).toEqual([
      { code: '09', labelRo: 'Produse petroliere', labelEn: 'Produse petroliere (en)', count: 8, share: 0.876 },
      { code: null, labelRo: null, labelEn: null, count: 2, share: 0.124 },
    ])
  })

  it('shows a record’s amount only when the data layer accepts it, never the raw source value', () => {
    const read = toCompanyProcurementRead(
      supplierSlice({
        recentRecords: [
          directAcquisition('1', { finalizationDate: null, publicationDate: '2026-09-01' }),
          contract('2', {
            valueRon: '99999999999.00',
            value: { valueState: 'invalid_source_value', valueStateRule: null, valueAccepted: false, valueRonComparable: null, valueComparableBasis: null, valueRulesVersion: 5, valueResolvedAt: null },
            displayTitle: { text: '  Titlu afișat ', source: 'matched_award', sourceUrl: null },
          }),
        ],
      }),
    )
    expect(read.recent).toEqual([
      { id: '1', grain: 'direct_acquisition', title: 'benzina', authority: { cui: '10755066', name: 'SC "LOCATIV"SA' }, valueRon: 300.14, date: '2026-09-01' },
      { id: '2', grain: 'contract', title: 'Titlu afișat', authority: { cui: '10755066', name: 'SC "LOCATIV"SA' }, valueRon: null, date: '2026-09-02' },
    ])
  })

  it('keeps a count the source did not send unknown, never zero', () => {
    const slice = supplierSlice({ contract: grainAnalytics('contract', { records: 40 }) })
    const read = toCompanyProcurementRead({
      ...slice,
      analysisByGrain: {
        ...slice.analysisByGrain,
        contract: { ...slice.analysisByGrain.contract, stats: { ...slice.analysisByGrain.contract.stats, withValueCount: null } },
      },
    })
    expect(read.contracts.count).toBe(40)
    expect(read.contracts.withValue).toBeNull()
  })

  it('reports a ranking by the number of records when too little money is published to rank by it', () => {
    const read = toCompanyProcurementRead(supplierSlice({ directAcquisition: grainAnalytics('direct_acquisition', { records: 5, rankedBy: 'count' }) }))
    expect(read.directAcquisitions.authoritiesRankedBy).toBe('count')
  })
})

describe('paymentGrainsOf and effectiveGrain', () => {
  const both = toCompanyProcurementRead(
    supplierSlice({ contract: grainAnalytics('contract', { records: 3 }), directAcquisition: grainAnalytics('direct_acquisition', { records: 9 }) }),
  )
  const directOnly = toCompanyProcurementRead(supplierSlice({ directAcquisition: grainAnalytics('direct_acquisition', { records: 9 }) }))

  it('lists the populations the company has records in, contracts first', () => {
    expect(paymentGrainsOf(both)).toEqual(['contracte', 'achizitii-directe'])
    expect(paymentGrainsOf(directOnly)).toEqual(['achizitii-directe'])
    expect(paymentGrainsOf(toCompanyProcurementRead(supplierSlice()))).toEqual([])
  })

  it('keeps a population whose count is unknown when it names payers', () => {
    const slice = supplierSlice({ contract: grainAnalytics('contract', { authorities: [authorityRow('1', 'COMUNA X', 3, '10.00')] }) })
    const unknown = { ...slice.analysisByGrain.contract, stats: { ...slice.analysisByGrain.contract.stats, recordCount: null } }
    const read = toCompanyProcurementRead({ ...slice, analysisByGrain: { ...slice.analysisByGrain, contract: unknown } })
    expect(read.contracts.count).toBeNull()
    expect(paymentGrainsOf(read)).toEqual(['contracte'])
  })

  it('follows the URL only to a population the company has', () => {
    expect(effectiveGrain(paymentGrainsOf(both), 'achizitii-directe')).toBe('achizitii-directe')
    expect(effectiveGrain(paymentGrainsOf(directOnly), 'contracte')).toBe('achizitii-directe')
    expect(effectiveGrain([], 'contracte')).toBeNull()
  })
})
