import { parseNgoLandingSearch, parseNgoProfileSearch } from './ngos'

describe('parseNgoLandingSearch', () => {
  it('returns empty state for no params', () => {
    expect(parseNgoLandingSearch({})).toEqual({})
  })

  it('keeps a known map layer and domain measure', () => {
    expect(parseNgoLandingSearch({ indicator: 'noi', domenii: 'venituri' })).toEqual({ indicator: 'noi', domenii: 'venituri' })
    expect(parseNgoLandingSearch({ indicator: 'total' })).toEqual({ indicator: 'total' })
  })

  it('drops an unknown value and anything else', () => {
    expect(parseNgoLandingSearch({ indicator: 'judete', domenii: 'angajati', q: 'asociatia' })).toEqual({})
  })
})

describe('parseNgoProfileSearch', () => {
  it('keeps a statement year, and drops one that is no year', () => {
    expect(parseNgoProfileSearch({ an: '2019' })).toEqual({ an: 2019 })
    expect(parseNgoProfileSearch({ an: 'ieri' })).toEqual({})
    expect(parseNgoProfileSearch({ an: '1066' })).toEqual({})
  })

  it('defaults to empty state', () => {
    expect(parseNgoProfileSearch({})).toEqual({})
  })

  it('keeps the site language, and drops the retired mock profile’s keys', () => {
    expect(parseNgoProfileSearch({ lang: 'ro', tab: 'financiar', evidence: '1', from: 'servicii' })).toEqual({ lang: 'ro' })
  })
})
