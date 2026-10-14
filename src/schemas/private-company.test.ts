import { parsePrivateCompanySearch, privateCompanyLongFormStatementSchema } from './private-company'

describe('parsePrivateCompanySearch', () => {
  it('keeps the chart measure and the payment records', () => {
    expect(parsePrivateCompanySearch({ masura: 'profit', plati: 'achizitii-directe' })).toEqual({
      masura: 'profit',
      plati: 'achizitii-directe',
    })
  })

  it('drops a value it does not know instead of failing the route', () => {
    expect(parsePrivateCompanySearch({ masura: 'ebitda', plati: 'granturi' })).toEqual({})
  })

  it('forgets the retired litigation page', () => {
    expect(parsePrivateCompanySearch({ masura: 'profit', litPage: '2' })).toEqual({ masura: 'profit' })
  })

  it('opens an old tab link on the page, with the tab forgotten', () => {
    expect(parsePrivateCompanySearch({ tab: 'financials' })).toEqual({})
  })
})

describe('privateCompanyLongFormStatementSchema', () => {
  const statement = { fiscalYear: 2013, publisher: 'mfp', filerClass: 'ir', sourceSnapshotId: 'mfp:situatii_financiare_2021:2013:r', resourceUrl: null }

  it('holds file-level metadata only: a row locator is not part of it', () => {
    expect(privateCompanyLongFormStatementSchema.parse({ ...statement, statementLocator: 'mfp:r:19' })).toEqual(statement)
  })

  it('takes an unnamed publisher as null, never another publisher', () => {
    expect(privateCompanyLongFormStatementSchema.parse({ ...statement, publisher: null }).publisher).toBeNull()
    expect(() => privateCompanyLongFormStatementSchema.parse({ ...statement, publisher: 'anaf-guess' })).toThrow()
  })
})
