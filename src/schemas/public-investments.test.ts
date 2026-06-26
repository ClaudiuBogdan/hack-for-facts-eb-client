import { describe, expect, it } from 'vitest'
import {
  PUBLIC_INVESTMENTS_DEFAULTS,
  cleanObjectiveSearch,
  cleanSearchState,
  parseArraySearchParam,
  parseLandingSearch,
  parseLayoutSearch,
  parseObjectiveSearch,
  parsePublicInvestmentsSearchString,
  parseSearchState,
  parseTerritorySearch,
} from './public-investments'
import type {
  PublicInvestmentsSearchState,
  PublicInvestmentsObjectiveSearchState,
} from './public-investments'

describe('parseArraySearchParam', () => {
  it('parses a JSON-encoded array', () => {
    expect(parseArraySearchParam('["a","b","c"]')).toEqual(['a', 'b', 'c'])
  })

  it('parses a comma-separated list', () => {
    expect(parseArraySearchParam('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('wraps a single value', () => {
    expect(parseArraySearchParam('a')).toEqual(['a'])
  })

  it('accepts an already-array value', () => {
    expect(parseArraySearchParam(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('drops empty/garbage entries instead of throwing', () => {
    expect(parseArraySearchParam('a,, ,b')).toEqual(['a', 'b'])
    expect(parseArraySearchParam('')).toBeUndefined()
    expect(parseArraySearchParam(undefined)).toBeUndefined()
    expect(parseArraySearchParam(null)).toBeUndefined()
  })

  it('applies a filter predicate', () => {
    expect(
      parseArraySearchParam('a,b,c', (item) => item !== 'b'),
    ).toEqual(['a', 'c'])
  })

  it('coerces numeric array items', () => {
    expect(parseArraySearchParam([1, 2, 'a'])).toEqual(['1', '2', 'a'])
  })
})

describe('parseSearchState — permissive normalization', () => {
  it('returns defaults for empty/garbage input', () => {
    const parsed = parseSearchState({})
    expect(parsed.view).toBeUndefined() // default stripped
    expect(parsed.sort).toBeUndefined()
    expect(parsed.order).toBeUndefined()
    expect(parsed.page).toBeUndefined()
    expect(parsed.pageSize).toBeUndefined()
    expect(parsed.amountField).toBeUndefined()
  })

  it('normalizes invalid enum values to defaults', () => {
    const parsed = parseSearchState({
      view: 'banana',
      sort: 'wrong',
      order: 'sideways',
      amountField: 'nope',
    })
    // Defaults are stripped after cleaning.
    expect(parsed.view).toBeUndefined()
    expect(parsed.sort).toBeUndefined()
    expect(parsed.order).toBeUndefined()
    expect(parsed.amountField).toBeUndefined()
  })

  it('normalizes valid enums to canonical lowercase', () => {
    const parsed = parseSearchState({
      view: 'LIST',
      sort: 'TITLE',
      order: 'ASC',
      amountField: 'REIMBURSED',
    })
    // Non-default values survive cleaning in canonical casing.
    expect(parsed.view).toBe('list')
    expect(parsed.sort).toBe('title')
    expect(parsed.order).toBe('asc')
    // amountField default is 'contracted', so 'reimbursed' survives.
    expect(parsed.amountField).toBe('reimbursed')
  })

  it('coerces numeric strings for page/pageSize/amounts', () => {
    const parsed = parseSearchState({
      page: '3',
      pageSize: '50',
      amountMin: '1000',
      amountMax: '5000',
      absMin: '10',
      absMax: '90',
    }) as Partial<PublicInvestmentsSearchState>
    expect(parsed.page).toBe(3)
    expect(parsed.pageSize).toBe(50)
    expect(parsed.amountMin).toBe(1000)
    expect(parsed.amountMax).toBe(5000)
    expect(parsed.absMin).toBe(10)
    expect(parsed.absMax).toBe(90)
  })

  it('rejects non-numeric garbage for numeric params (falls back to defaults)', () => {
    const parsed = parseSearchState({ page: 'abc', pageSize: 'xyz' })
    expect(parsed.page).toBeUndefined()
    expect(parsed.pageSize).toBeUndefined()
  })

  it('drops object-shaped scalar params without throwing', () => {
    expect(
      parseSearchState({
        q: { text: 'apahida' },
        siruta: ['58728'],
        selected: { objectiveId: 'pi-1' },
      }),
    ).toEqual({})
  })

  it('clamps absorption to 0..100', () => {
    const parsed = parseSearchState({ absMin: '-10', absMax: '150' }) as Partial<PublicInvestmentsSearchState>
    expect(parsed.absMin).toBe(0)
    expect(parsed.absMax).toBe(100)
  })

  it('parses program arrays from JSON, comma, or repeated values', () => {
    expect(parseSearchState({ programs: '["ANGHEL_SALIGNY","PNDL"]' }).programs).toEqual([
      'ANGHEL_SALIGNY',
      'PNDL',
    ])
    expect(parseSearchState({ programs: 'anghel_saligny,pndl' }).programs).toEqual([
      'ANGHEL_SALIGNY',
      'PNDL',
    ])
    expect(parseSearchState({ programs: ['ANGHEL_SALIGNY', 'PNDL'] }).programs).toEqual([
      'ANGHEL_SALIGNY',
      'PNDL',
    ])
  })

  it('drops unknown program/stage enum values', () => {
    const parsed = parseSearchState({ programs: 'ANGHEL_SALIGNY,FAKE,PNMC' })
    expect(parsed.programs).toEqual(['ANGHEL_SALIGNY', 'PNMC'])
    const stageParsed = parseSearchState({ stages: 'contractat,bogus,necunoscut' })
    expect(stageParsed.stages).toEqual(['contractat', 'necunoscut'])
  })

  it('drops object-shaped array params without throwing', () => {
    const parsed = parseSearchState({
      programs: { ANGHEL_SALIGNY: true },
      stages: { contractat: true },
      counties: { CJ: true },
    })
    expect(parsed.programs).toBeUndefined()
    expect(parsed.stages).toBeUndefined()
    expect(parsed.counties).toBeUndefined()
  })

  it('parses boolean params from true/false/1/0', () => {
    const parsed = parseSearchState({
      hasContractorCui: 'true',
      hasDesignerCui: 'false',
      hasSiruta: '1',
    }) as Partial<PublicInvestmentsSearchState>
    expect(parsed.hasContractorCui).toBe(true)
    expect(parsed.hasDesignerCui).toBe(false)
    expect(parsed.hasSiruta).toBe(true)
  })

  it('cleans invalid amount ranges (min > max) by dropping both', () => {
    const parsed = cleanSearchState({
      amountMin: 5000,
      amountMax: 1000,
    } as Partial<PublicInvestmentsSearchState>)
    expect(parsed.amountMin).toBeUndefined()
    expect(parsed.amountMax).toBeUndefined()
  })

  it('strips default values so the URL stays minimal', () => {
    const cleaned = cleanSearchState({
      view: PUBLIC_INVESTMENTS_DEFAULTS.view,
      sort: PUBLIC_INVESTMENTS_DEFAULTS.sort,
      order: PUBLIC_INVESTMENTS_DEFAULTS.order,
      page: PUBLIC_INVESTMENTS_DEFAULTS.page,
      pageSize: PUBLIC_INVESTMENTS_DEFAULTS.pageSize,
    } as Partial<PublicInvestmentsSearchState>)
    expect(cleaned.view).toBeUndefined()
    expect(cleaned.sort).toBeUndefined()
    expect(cleaned.order).toBeUndefined()
    expect(cleaned.page).toBeUndefined()
    expect(cleaned.pageSize).toBeUndefined()
  })
})

describe('parseLayoutSearch', () => {
  it('preserves shared evidence/backtrack params on the layout surface', () => {
    const parsed = parseLayoutSearch({
      dovada: ' evidence-anghel-apahida-contract ',
      county: 'cj',
      siruta: '58728',
      from: 'landing',
    })

    expect(parsed).toEqual({
      dovada: 'evidence-anghel-apahida-contract',
      county: 'CJ',
      siruta: '58728',
      from: 'landing',
    })
  })

  it('drops empty layout params without throwing', () => {
    expect(
      parseLayoutSearch({
        dovada: ' ',
        county: '',
        siruta: null,
        from: undefined,
      }),
    ).toEqual({})
  })

  it('drops malformed object and array params without throwing', () => {
    expect(
      parseLayoutSearch({
        dovada: ['ev-1'],
        county: { code: 'cj' },
        from: { value: 'landing' },
      }),
    ).toEqual({})
    expect(parseLayoutSearch(null)).toEqual({})
    expect(parseLayoutSearch(['not-an-object'])).toEqual({})
  })

  it('keeps dovada only for the layout parser', () => {
    expect(parseLayoutSearch({ dovada: 'ev-1' }).dovada).toBe('ev-1')
    expect('dovada' in parseLandingSearch({ dovada: 'ev-1' })).toBe(false)
    expect('dovada' in parseSearchState({ dovada: 'ev-1' })).toBe(false)
    expect('dovada' in parseObjectiveSearch({ dovada: 'ev-1' })).toBe(false)
    expect('dovada' in parseTerritorySearch({ dovada: 'ev-1' })).toBe(false)
  })

  it('parses raw search strings by surface', () => {
    expect(
      parsePublicInvestmentsSearchString(
        '?dovada=evidence-anghel-apahida-contract&county=cj',
        'layout',
      ),
    ).toEqual({
      dovada: 'evidence-anghel-apahida-contract',
      county: 'CJ',
    })
    expect(
      parsePublicInvestmentsSearchString('?dovada=ignored&view=stage', 'landing'),
    ).toEqual({ view: 'stage' })
  })
})

describe('parseLandingSearch', () => {
  it('strips default mapView', () => {
    expect(parseLandingSearch({ view: 'program' }).view).toBeUndefined()
  })

  it('normalizes invalid mapView to default', () => {
    expect(parseLandingSearch({ view: 'wrong' }).view).toBeUndefined()
  })

  it('keeps a valid non-default mapView', () => {
    expect(parseLandingSearch({ view: 'stage' }).view).toBe('stage')
  })

  it('enforces mapLat/mapLng/mapZoom all-or-none', () => {
    expect(parseLandingSearch({ mapLat: 46, mapLng: 23 }).mapLat).toBeUndefined()
    expect(parseLandingSearch({ mapLat: 46, mapLng: 23, mapZoom: 8 }).mapLat).toBe(46)
  })

  it('drops invalid program enum', () => {
    expect(parseLandingSearch({ program: 'FAKE' }).program).toBeUndefined()
    expect(parseLandingSearch({ program: 'pndl' }).program).toBe('PNDL')
  })
})

describe('parseObjectiveSearch', () => {
  it('strips default tab', () => {
    expect(parseObjectiveSearch({ tab: 'prezentare' }).tab).toBeUndefined()
  })

  it('keeps paySort/payOrder only when on plati tab', () => {
    const onPlati = parseObjectiveSearch({
      tab: 'plati',
      paySort: 'amount',
      payOrder: 'desc',
    }) as Partial<PublicInvestmentsObjectiveSearchState>
    expect(onPlati.tab).toBe('plati')
    expect(onPlati.paySort).toBe('amount')
    expect(onPlati.payOrder).toBe('desc')

    const onOther = parseObjectiveSearch({
      tab: 'prezentare',
      paySort: 'amount',
      payOrder: 'asc',
    })
    expect(onOther.tab).toBeUndefined()
    expect(onOther.paySort).toBeUndefined()
    expect(onOther.payOrder).toBeUndefined()
  })

  it('uppercases county code', () => {
    expect(parseObjectiveSearch({ county: 'cj' }).county).toBe('CJ')
  })

  it('normalizes invalid tab to default (stripped)', () => {
    expect(parseObjectiveSearch({ tab: 'banana' }).tab).toBeUndefined()
  })

  it('does not throw on object-shaped optional params', () => {
    expect(
      parseObjectiveSearch({
        stage: { bucket: 'in_executie' },
        from: ['landing'],
        county: { code: 'cj' },
      }),
    ).toEqual({})
  })
})

describe('parseTerritorySearch', () => {
  it('parses arrays and strips defaults', () => {
    const parsed = parseTerritorySearch({
      programs: 'ANGHEL_SALIGNY,PNDL',
      stages: 'contractat',
      sort: 'contracted',
      order: 'desc',
      view: 'split',
    })
    expect(parsed.programs).toEqual(['ANGHEL_SALIGNY', 'PNDL'])
    expect(parsed.stages).toEqual(['contractat'])
    // defaults stripped
    expect(parsed.sort).toBeUndefined()
    expect(parsed.order).toBeUndefined()
    expect(parsed.view).toBeUndefined()
  })
})

describe('cleanObjectiveSearch — explicit edge', () => {
  it('removes empty strings across optional fields', () => {
    const cleaned = cleanObjectiveSearch({
      tab: 'plati',
      stage: '   ',
      from: '',
      county: '  ',
    } as Partial<PublicInvestmentsObjectiveSearchState>)
    expect(cleaned.stage).toBeUndefined()
    expect(cleaned.from).toBeUndefined()
    expect(cleaned.county).toBeUndefined()
    expect(cleaned.tab).toBe('plati')
  })
})
