import { parsePrivateCompanySearch } from './private-company'

describe('parsePrivateCompanySearch', () => {
  it('keeps valid tab search state', () => {
    expect(parsePrivateCompanySearch({ tab: 'financials' })).toEqual({
      tab: 'financials',
    })
  })

  it('falls back to summary for unknown tab values', () => {
    expect(parsePrivateCompanySearch({ tab: 'contracts' })).toEqual({
      tab: 'summary',
    })
  })
})
