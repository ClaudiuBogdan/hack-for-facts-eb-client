import { parsePrivateCompanySearch } from './private-company'

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
