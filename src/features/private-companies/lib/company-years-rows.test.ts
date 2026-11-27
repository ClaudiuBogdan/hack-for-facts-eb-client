import { describe, expect, it } from 'vitest'
import { buildCompanyProfileModel } from './company-profile-model'
import { yearsSaid } from './company-profile-text'
import { companyProfile, financialYear } from './company-profile.fixture'
import { blankYearsOf, sameStretch, yearRowsOf } from './company-years-rows'

/**
 * The IFRS form's layer (owner, 25–26 November 2026): the publisher's IFRS-file years beside the typed ones, as
 * filed, keyed by year; a year marked on the form is so labelled, an unmarked one is never said to be another form.
 */

const file = (fiscalYear: number, fields: Partial<{ turnover: string | null; netResult: string | null; employees: string | null; sourceUrl: string | null }> = {}) => ({
  fiscalYear,
  publisher: 'mfp' as const,
  turnover: '1000',
  netResult: '100',
  employees: '10',
  sourceUrl: `https://data.gov.ro/web_ir_an${fiscalYear}.txt`,
  ...fields,
})

describe('the IFRS form in the model', () => {
  it('keeps a typed statement over a file year of the same year, and draws no value it cannot read', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [financialYear(2014, { turnover: 5000, netProfit: 50, netLoss: 0, employees: 7 }), financialYear(2019, { turnover: 6000, reportingForm: 'ifrs' })],
        ifrsFormYears: [file(2013, { turnover: '12,5', employees: '' }), file(2014)],
      }),
    )
    expect(model.ifrsForm.fileYears).toEqual([{ year: 2013, publisher: 'mfp', turnover: null, netResult: 100, employees: null, sourceUrl: 'https://data.gov.ro/web_ir_an2013.txt' }])
    expect(model.ifrsForm.markedYears).toEqual([2019])
  })

  it('has no IFRS layer from an API that serves none', () => {
    const model = buildCompanyProfileModel(companyProfile({ financials: [financialYear(2020, { turnover: 1 })] }))
    expect(model.ifrsForm).toEqual({ fileYears: [], markedYears: [] })
  })
})

describe('yearRowsOf', () => {
  it('runs from the first to the last year with figures, a year between with neither said as a gap', () => {
    const rows = yearRowsOf(
      buildCompanyProfileModel(
        companyProfile({
          financials: [financialYear(2019, { turnover: 6000, netProfit: 10, netLoss: 0, employees: 3 })],
          ifrsFormYears: [file(2014), file(2015, { sourceUrl: 'javascript:alert(1)' })],
        }),
      ),
    )
    expect(rows.map((row) => [row.year, row.form, row.ifrsFile])).toEqual([
      [2014, 'ifrs', true],
      [2015, 'ifrs', true],
      [2016, null, false],
      [2017, null, false],
      [2018, null, false],
      [2019, null, false],
    ])
    // Only a web address is linked.
    expect(rows[1]?.source).toBeNull()
    // The real gaps: never a year of the file.
    expect(blankYearsOf(rows)).toEqual([2016, 2017, 2018])
  })

  it('joins two years only when they are consecutive and on the same form', () => {
    const [a, b, c] = yearRowsOf(
      buildCompanyProfileModel(
        companyProfile({
          financials: [financialYear(2019, { turnover: 1, reportingForm: 'ifrs' }), financialYear(2020, { turnover: 1 })],
          ifrsFormYears: [file(2018)],
        }),
      ),
    )
    // The Ministry's 2018 and ANAF's 2019 on the same form: one stretch; 2019 → 2020 a change of form.
    expect(sameStretch(a!, b!)).toBe(true)
    expect(sameStretch(b!, c!)).toBe(false)
  })
})

describe('yearsSaid', () => {
  it('says only the years there are, the last range joined by „și"', () => {
    expect(yearsSaid([2014, 2016, 2017, 2018])).toBe('2014 și 2016–2018')
    expect(yearsSaid([2012, 2014, 2016, 2017])).toBe('2012, 2014 și 2016–2017')
    expect(yearsSaid([2012, 2013, 2014, 2015, 2016, 2017, 2018])).toBe('2012–2018')
    expect(yearsSaid([])).toBe('')
  })
})
