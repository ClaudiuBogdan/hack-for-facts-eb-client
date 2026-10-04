import { describe, expect, it } from 'vitest'
import { analyticsSearchOf, DEFAULT_STATE, recordsKeyOf, SEARCH_KEYS, searchOf, siteSearchOf, stateOf, urlSearchOf, withScope, type CompanyAnalyticsState } from './company-analytics-url'

/**
 * The address is the question: every choice round-trips through it (so Back
 * and a shared link restore it), the site's own keys travel along, a value
 * the page cannot read is said rather than dropped, and the list starts over
 * whenever what it lists changes.
 */

const FULL: CompanyAnalyticsState = {
  year: 2008,
  metric: 'NET_RESULT',
  panel: 'defalcare',
  dimension: 'MAIN_CAEN',
  rankBy: 'CONTRIBUTORS',
  sort: 'CUI',
  direction: 'DESC',
  cohort: 'EACH_YEAR',
  release: '7',
  scope: {
    cuis: ['14399840', '6291812'],
    county: { in: ['B', 'CJ'], includeUnknown: true },
    uat: { in: ['54975'] },
    legalForms: ['SA', 'SRL'],
    observedStatus: { includeUnknown: true },
    vatPayer: ['YES', 'UNKNOWN'],
    fiscallyInactive: ['NO'],
    mainCaen: [{ code: '6201' }, { code: '6202', revision: 'rev2' }],
    mainCaenBasis: ['REVISION_UNKNOWN', 'MISSING'],
    filing: 'FILED',
    financialRanges: [
      { metric: 'TURNOVER', min: '10000000.50' },
      { metric: 'EMPLOYEES', min: '10', max: '49' },
    ],
    employeeSizeBands: ['FROM_10_TO_49', 'FROM_250'],
  },
  unread: [],
}

/** The address as the router hands it back: a digits-only value arrives as a number. */
function throughRouter(state: CompanyAnalyticsState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(urlSearchOf(state))) as Record<string, unknown>
}

describe('company analytics address', () => {
  it('round-trips every choice of a question, the pinned release included', () => {
    expect(stateOf(analyticsSearchOf(throughRouter(FULL)))).toEqual(FULL)
  })

  it('writes nothing for the defaults: the bare page is the bare address', () => {
    expect(searchOf(DEFAULT_STATE)).toEqual({})
    expect(stateOf({})).toEqual(DEFAULT_STATE)
  })

  it('writes digits-only values as numbers so the router does not quote them', () => {
    const url = urlSearchOf({ ...DEFAULT_STATE, year: 2024, release: '7', scope: { cuis: ['14399840'], uat: { in: ['01017'] } } })
    expect(url).toMatchObject({ an: 2024, editie: 7, cui: 14399840 })
    // A SIRUTA with its leading zero stays text: as a number it would lose it.
    expect(url.uat).toBe('01017')
  })

  it('keeps the site’s own keys (the language) across a change of question', () => {
    expect(siteSearchOf({ lang: 'en', an: 2024, judet: 'CJ', utm: 'x' })).toEqual({ lang: 'en', utm: 'x' })
  })

  it('canonicalizes: the same question is one address and one cache key', () => {
    const a = stateOf({ judet: 'cj,B,CJ', forma: 'srl,SA', tva: 'necunoscut,da' })
    const b = stateOf({ judet: 'B,CJ', forma: 'SA,SRL', tva: 'da,necunoscut' })
    expect(a.scope).toEqual(b.scope)
    expect(searchOf(a)).toEqual(searchOf(b))
  })

  it('says which values it could not read, rather than answer a wider question in silence', () => {
    const state = stateOf({ an: '20x4', judet: 'CJ,Narnia', interval: 'turnover:1,5~', marime: 'enormous', editie: '0' })
    expect(state.unread).toEqual(['an', 'editie', 'judet', 'interval', 'marime'])
    expect(state.scope.county).toEqual({ in: ['CJ'] })
    expect(state.year).toBeNull()
    expect(state.release).toBeNull()
  })

  it('refuses ranges on a company without a statement, as the API does', () => {
    const state = stateOf({ depunere: 'nu', interval: 'net_loss:0.01~' })
    expect(state.scope.filing).toBeUndefined()
    expect(state.scope.financialRanges).toEqual([{ metric: 'NET_LOSS', min: '0.01' }])
    expect(state.unread).toContain('depunere')
  })

  it('reads money bounds as exact decimals and headcounts as whole numbers', () => {
    expect(stateOf({ interval: 'turnover:1000000.999~' }).unread).toEqual(['interval'])
    expect(stateOf({ interval: 'employees:9.5~' }).unread).toEqual(['interval'])
    expect(stateOf({ interval: 'turnover:-50.25~0' }).scope.financialRanges).toEqual([{ metric: 'TURNOVER', min: '-50.25', max: '0' }])
  })

  it('keeps a main activity of unknown revision unknown, never guessed', () => {
    expect(stateOf({ caen: '6201' }).scope.mainCaen).toEqual([{ code: '6201' }])
    expect(stateOf({ caen: 'rev2:6201' }).scope.mainCaen).toEqual([{ code: '6201', revision: 'rev2' }])
  })

  it('starts the list over when the release, scope, year or order changes — and only then', () => {
    const base = { release: '7', scopeKey: { fiscalYear: 2024 }, year: 2024, sort: 'METRIC' as const, sortMetric: 'TURNOVER' as const, direction: 'DESC' as const }
    const key = recordsKeyOf(base)
    expect(recordsKeyOf({ ...base })).toBe(key)
    for (const change of [{ release: '8' }, { scopeKey: { fiscalYear: 2024, county: { in: ['CJ'] } } }, { year: 2023 }, { direction: 'ASC' as const }, { sortMetric: 'EMPLOYEES' as const }]) {
      expect(recordsKeyOf({ ...base, ...change })).not.toBe(key)
    }
  })

  it('normalizes a scope changed on the page, and forgets what it could not read', () => {
    const next = withScope({ ...DEFAULT_STATE, unread: ['judet'] }, { county: { in: ['TM', 'CJ', 'TM'] }, legalForms: [] })
    expect(next.scope).toEqual({ county: { in: ['CJ', 'TM'] } })
    expect(next.unread).toEqual([])
  })
})

describe('company analytics address — the ONRC edition’s two questions', () => {
  /** Every consensus basis key and every ONRC observation key, written and read back exactly. */
  const ONRC: CompanyAnalyticsState = {
    ...DEFAULT_STATE,
    scope: {
      county: { in: ['(multiple_values)', 'CJ'] },
      uat: { in: ['(partial_observations)', '(unresolved)'], includeUnknown: true },
      observedStatus: { in: ['(missing)', '1048'] },
      // One identifier with a public 1048, in Cluj, with 6201 in any revision (an unknown one included) and exactly rev2:6201.
      onrc: { status: ['1048'], county: ['CJ'], caenCode: ['6201'], onrcCaen: ['rev2:6201'], exclude: { status: ['1070'], caenCode: ['4711'], county: ['B'], legalForm: ['SA'] } },
    },
  }

  it('round-trips a consensus basis key and every ONRC observation and exclusion through the address', () => {
    const search = searchOf(ONRC)
    expect(search).toMatchObject({
      judet: '(multiple_values),CJ',
      uat: '(partial_observations),(unresolved),necunoscut',
      stare: '(missing),1048',
      onrc_stare: '1048',
      onrc_judet: 'CJ',
      onrc_caen: '6201',
      onrc_caen_exact: 'rev2:6201',
      onrc_fara_stare: '1070',
      onrc_fara_caen: '4711',
      onrc_fara_judet: 'B',
      onrc_fara_forma: 'SA',
    })
    expect(stateOf(analyticsSearchOf(throughRouter(ONRC)))).toEqual(ONRC)
  })

  it('reads a basis key only as the API writes it, and a value key as before', () => {
    expect(stateOf({ judet: '(MULTIPLE_VALUES)' }).unread).toEqual(['judet'])
    expect(stateOf({ judet: '(nothing_like_it)' }).unread).toEqual(['judet'])
    expect(stateOf({ stare: '(partial_observations)' }).scope.observedStatus).toEqual({ in: ['(partial_observations)'] })
  })

  it('never gives a code a revision: an exact CAEN without one is not read, a broad one matches every revision', () => {
    const exact = stateOf({ onrc_caen_exact: '6201' })
    expect(exact.unread).toEqual(['onrc_caen_exact'])
    expect(exact.scope.onrc).toBeUndefined()
    expect(stateOf({ onrc_caen: '6201' }).scope.onrc).toEqual({ caenCode: ['6201'] })
    expect(stateOf({ onrc_caen_exact: 'REV2:6201,rev4:6201' })).toMatchObject({ scope: { onrc: { onrcCaen: ['rev2:6201'] } }, unread: ['onrc_caen_exact'] })
  })

  it('keeps the observations apart from the consensus keys of the same name', () => {
    // A status every entry agrees on, and „has an entry with a public 1048": two filters, two keys.
    const state = stateOf({ stare: '1048', onrc_stare: '1048' })
    expect(state.scope.observedStatus).toEqual({ in: ['1048'] })
    expect(state.scope.onrc).toEqual({ status: ['1048'] })
  })

  it('writes no exact-revision exclusion: the address has no key for one', () => {
    expect(SEARCH_KEYS.filter((key) => key.startsWith('onrc_fara'))).toEqual(['onrc_fara_stare', 'onrc_fara_caen', 'onrc_fara_judet', 'onrc_fara_forma'])
  })
})
