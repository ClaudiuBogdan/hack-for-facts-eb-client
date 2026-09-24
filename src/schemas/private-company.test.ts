import { parsePrivateCompanySearch } from './private-company'

describe('parsePrivateCompanySearch', () => {
  it('keeps the chart measure, the payment records and the litigation page', () => {
    expect(parsePrivateCompanySearch({ masura: 'profit', plati: 'achizitii-directe', litPage: '2' })).toEqual({
      masura: 'profit',
      plati: 'achizitii-directe',
      litPage: 2,
    })
  })

  it('drops a value it does not know instead of failing the route', () => {
    expect(parsePrivateCompanySearch({ masura: 'ebitda', plati: 'granturi', litPage: '0' })).toEqual({})
  })

  it('opens an old tab link on the page, with the tab forgotten', () => {
    expect(parsePrivateCompanySearch({ tab: 'financials' })).toEqual({})
  })
})
