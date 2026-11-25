import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, LEGACY_KEYS, legacyState, searchFromState, stateFromSearch, type PageState } from './map-page-search'

/** An old link's year, as the previous page wrote it. */
const yearPeriod = (start: string, end = start) => ({ type: 'YEAR', selection: { interval: { start, end } } })

describe('the map page address', () => {
  it('opens the default view with no parameters', () => {
    expect(stateFromSearch({})).toEqual(DEFAULT_STATE)
    expect(DEFAULT_STATE).toEqual({ measureId: 'balance', year: '2025', basis: 'total', level: 'uat', view: 'map' })
  })

  it('reads its own keys, a year as the router reads it (a number) or as text', () => {
    expect(stateFromSearch({ harta: 'venituri', an: 2019, pe: 'locuitor', nivel: 'judete', vedere: 'tabel' })).toEqual({
      measureId: 'income',
      year: '2019',
      basis: 'per_capita',
      level: 'county',
      view: 'table',
    })
    expect(stateFromSearch({ harta: 'cheltuieli', an: '2016' })).toMatchObject({ measureId: 'expenses', year: '2016' })
  })

  it('reads an unknown value of its own keys as the default', () => {
    expect(stateFromSearch({ harta: 'nimic', an: 2015, pe: 'x', nivel: 'uat', vedere: 'chart' })).toEqual(DEFAULT_STATE)
    expect(stateFromSearch({ an: 2026 }).year).toBe('2025')
  })

  it('writes only what differs from the default, and clears every old key', () => {
    const search = searchFromState({ measureId: 'income', year: '2020', basis: 'per_capita', level: 'county', view: 'table' })
    expect(search).toMatchObject({ harta: 'venituri', an: 2020, pe: 'locuitor', nivel: 'judete', vedere: 'tabel' })
    for (const key of LEGACY_KEYS) {
      expect(search).toHaveProperty(key)
      expect(search[key]).toBeUndefined()
    }
    expect(Object.entries(searchFromState(DEFAULT_STATE)).filter(([, value]) => value !== undefined)).toEqual([])
  })

  it('reads back what it writes', () => {
    const states: PageState[] = [
      DEFAULT_STATE,
      { measureId: 'expenses', year: '2018', basis: 'per_capita', level: 'uat', view: 'map' },
      { measureId: 'balance', year: '2025', basis: 'total', level: 'county', view: 'table' },
    ]
    for (const state of states) expect(stateFromSearch(searchFromState(state))).toEqual(state)
  })
})

describe('an old link to the map', () => {
  it('opens the map its preset names, or the one its account category names', () => {
    expect(stateFromSearch({ preset: 'income' }).measureId).toBe('income')
    expect(stateFromSearch({ preset: 'expenses' }).measureId).toBe('expenses')
    expect(stateFromSearch({ preset: 'balance' }).measureId).toBe('balance')
    expect(stateFromSearch({ filters: { account_category: 'vn' } }).measureId).toBe('income')
    expect(stateFromSearch({ filters: { account_category: 'ch' } }).measureId).toBe('expenses')
    // The preset decides over the account category, as on the previous page; local taxes are not a map here.
    expect(stateFromSearch({ preset: 'expenses', filters: { account_category: 'vn' } }).measureId).toBe('expenses')
    expect(stateFromSearch({ preset: 'local-taxes', filters: { account_category: 'vn' } }).measureId).toBe('balance')
  })

  it('counts per inhabitant when its normalization did, in lei', () => {
    expect(stateFromSearch({ filters: { normalization: 'per_capita' } }).basis).toBe('per_capita')
    expect(stateFromSearch({ filters: { normalization: 'per_capita_euro' } }).basis).toBe('per_capita')
    expect(stateFromSearch({ filters: { normalization: 'total_euro' } }).basis).toBe('total')
    expect(stateFromSearch({ filters: { normalization: 'percent_gdp' } }).basis).toBe('total')
  })

  it('opens the single year its period names, and the default for a range or a year this page lacks', () => {
    expect(stateFromSearch({ filters: { report_period: yearPeriod('2021') } }).year).toBe('2021')
    expect(stateFromSearch({ filters: { report_period: { type: 'YEAR', selection: { dates: ['2023'] } } } }).year).toBe('2023')
    expect(stateFromSearch({ filters: { report_period: yearPeriod('2019', '2021') } }).year).toBe('2025')
    expect(stateFromSearch({ filters: { report_period: { type: 'YEAR', selection: { dates: ['2019', '2020'] } } } }).year).toBe('2025')
    expect(stateFromSearch({ filters: { report_period: yearPeriod('2012') } }).year).toBe('2025')
  })

  it('opens the counties for the county view', () => {
    expect(stateFromSearch({ mapViewType: 'County' }).level).toBe('county')
    expect(stateFromSearch({ mapViewType: 'UAT' }).level).toBe('uat')
  })

  it('opens the table for the table view, and the map for the chart view', () => {
    expect(stateFromSearch({ activeView: 'table' }).view).toBe('table')
    expect(stateFromSearch({ activeView: 'chart' }).view).toBe('map')
  })

  it('reads everything it can show at once and drops the rest', () => {
    const search = {
      filters: { account_category: 'vn', normalization: 'per_capita', report_period: yearPeriod('2020'), functional_prefixes: ['65.'], aggregate_min_amount: 1000, currency: 'EUR' },
      mapViewType: 'County',
      activeView: 'table',
      mapCenter: [46, 24],
      mapZoom: 7,
    }
    expect(stateFromSearch(search)).toEqual({ measureId: 'income', year: '2020', basis: 'per_capita', level: 'county', view: 'table' })
  })

  it('opens the default view when every old parameter is junk', () => {
    const search = {
      filters: 'nimic',
      preset: 'xyz',
      activeView: 5,
      mapViewType: [1],
      mapCenter: 'abc',
      mapZoom: 'zz',
      entity_cuis: { nope: true },
      harta: 'foo',
      an: 1999,
      pe: null,
      nivel: {},
      vedere: [],
    }
    expect(() => legacyState(search)).not.toThrow()
    expect(stateFromSearch(search)).toEqual(DEFAULT_STATE)
    expect(stateFromSearch({ filters: { report_period: 'x', normalization: 3, account_category: null } })).toEqual(DEFAULT_STATE)
    expect(stateFromSearch({ filters: { report_period: { selection: { interval: null, dates: 'x' } } } })).toEqual(DEFAULT_STATE)
  })

  it('gives way to the page\'s own keys, even an unreadable one', () => {
    const old = { filters: { account_category: 'vn', normalization: 'per_capita', report_period: yearPeriod('2020') }, mapViewType: 'County', activeView: 'table' }
    expect(stateFromSearch({ ...old, harta: 'cheltuieli', an: 2018, pe: 'x', nivel: 'y', vedere: 'z' })).toEqual({ ...DEFAULT_STATE, measureId: 'expenses', year: '2018' })
  })
})
