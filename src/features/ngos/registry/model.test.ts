import { describe, expect, it, vi } from 'vitest'
import { i18n } from '@lingui/core'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import {
  countyOf,
  distinctRows,
  drilled,
  EMPTY_QUERY,
  filterOf,
  groupAxes,
  headline,
  notesOf,
  numberYear,
  queryOf,
  questions,
  searchOf,
  suggestionsOf,
  type RegistryQuery,
} from './model'
import { read, row, snapshot } from './test/fixtures'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))

i18n.load('ro', {})
i18n.activate('ro')

const counties = NGO_REGISTRY_SUMMARY.counties
const summary = NGO_REGISTRY_SUMMARY

describe('the address', () => {
  it("reads the route's own keys and writes them back", () => {
    const { query, unread } = queryOf(
      { status: 'Radiat', county: 'cluj', category: 'foundation', publicUtility: 'yes', q: ' kirali ', registryNumber: '1174 / b / 1997' },
      counties,
    )
    expect(unread).toEqual([])
    expect(query).toEqual<RegistryQuery>({
      status: 'deregistered',
      county: 'CLUJ',
      category: 'foundation',
      publicUtility: true,
      q: 'kirali',
      registryNumber: '1174/B/1997',
    })
    expect(searchOf(query)).toEqual({
      q: 'kirali',
      county: 'CLUJ',
      category: 'foundation',
      status: 'Radiat',
      registryNumber: '1174/B/1997',
      publicUtility: 'yes',
    })
    expect(queryOf(searchOf(query), counties).query).toEqual(query)
  })

  it('says what it could not use and answers without it', () => {
    const { query, unread } = queryOf({ status: 'activ', category: 'ong', publicUtility: 'maybe', registryNumber: 'abc' }, counties)
    expect(unread.map((item) => item.param)).toEqual(['status', 'category', 'publicUtility', 'registryNumber'])
    expect(query).toEqual(EMPTY_QUERY)
  })

  it('writes nothing for the empty query', () => {
    expect(searchOf(EMPTY_QUERY)).toEqual({})
    expect(filterOf(EMPTY_QUERY)).toEqual({})
  })

  it("compiles to the API's filter with the registry's own values", () => {
    expect(filterOf({ ...EMPTY_QUERY, status: 'inLiquidation', county: 'DÂMBOVITA', publicUtility: false })).toEqual({
      county: { eq: 'DÂMBOVITA' },
      status: { eq: 'In Lichidare' },
      publicUtility: { eq: false },
    })
  })
})

describe('a county as typed', () => {
  it("finds the registry's spelling from a code, a name or the spelling itself", () => {
    expect(countyOf('CJ', counties)).toBe('CLUJ')
    expect(countyOf('Dâmbovița', counties)).toBe('DÂMBOVITA')
    expect(countyOf('dambovita', counties)).toBe('DÂMBOVITA')
    expect(countyOf('bucuresti', counties)).toBe('BUCURESTI')
    expect(countyOf('B', counties)).toBe('BUCURESTI')
  })
  it('reads a hyphen as a space, and knows no county the registry does not spell', () => {
    expect(countyOf('Satu-Mare', counties)).toBe('SATU MARE')
    expect(countyOf('Bistrita Nasaud', counties)).toBe('BISTRITA NASAUD')
    expect(countyOf('nedeterminat', counties)).toBeNull()
    expect(countyOf('  ', counties)).toBeNull()
  })
  it('reports a county it cannot read as unread, and filters on none', () => {
    const { query, unread } = queryOf({ county: 'Atlantida' }, counties)
    expect(query.county).toBeNull()
    expect(unread).toEqual([{ param: 'county', value: 'Atlantida' }])
  })
})

describe('the headline', () => {
  it('names the whole registry with nothing set', () => {
    expect(headline(EMPTY_QUERY, counties)).toBe('Toate ONG-urile din registru')
    expect(headline({ ...EMPTY_QUERY, category: 'foundation' }, counties)).toBe('Toate fundațiile din registru')
  })
  it('agrees the status with the subject and orders the phrases', () => {
    expect(headline({ ...EMPTY_QUERY, status: 'deregistered', category: 'foundation', county: 'CLUJ', q: 'kirali' }, counties)).toBe(
      'Fundațiile radiate din județul Cluj cu „kirali” în nume',
    )
    expect(headline({ ...EMPTY_QUERY, status: 'registered', publicUtility: true, county: 'BUCURESTI' }, counties)).toBe(
      'ONG-urile înregistrate de utilitate publică din București',
    )
    expect(headline({ ...EMPTY_QUERY, registryNumber: '1471/A/2012' }, counties)).toBe('ONG-urile cu numărul 1471/A/2012')
  })
})

describe('the axes', () => {
  it('offers the axes the filters leave open', () => {
    expect(groupAxes(EMPTY_QUERY)).toEqual(['judet', 'forma', 'stare', 'an'])
    expect(groupAxes({ ...EMPTY_QUERY, status: 'registered', county: 'CLUJ', category: 'foundation' })).toEqual(['localitate', 'an'])
  })
  it('narrows where the address can say it', () => {
    expect(drilled(EMPTY_QUERY, 'judet', 'CLUJ')).toEqual({ ...EMPTY_QUERY, county: 'CLUJ' })
    expect(drilled(EMPTY_QUERY, 'stare', 'Radiat')).toEqual({ ...EMPTY_QUERY, status: 'deregistered' })
    expect(drilled(EMPTY_QUERY, 'forma', 'foundation')).toEqual({ ...EMPTY_QUERY, category: 'foundation' })
    expect(drilled(EMPTY_QUERY, 'an', '2020')).toBeNull()
    expect(drilled(EMPTY_QUERY, 'localitate', 'DEJ')).toBeNull()
  })
})

describe('rows and numbers', () => {
  it('drops a row repeated field for field, keeps a row that differs', () => {
    const { rows, repeated } = distinctRows([
      row({ id: 'a', sourceRowNumber: 1 }),
      row({ id: 'b', sourceRowNumber: 2 }),
      row({ id: 'c', sourceRowNumber: 3, locality: 'CLUJ-NAPOCA' }),
    ])
    expect(rows.map((item) => item.id)).toEqual(['a', 'c'])
    expect(repeated).toBe(1)
  })
  it('reads the year from a registry number', () => {
    expect(numberYear('3446/A/2026', 2026)).toBe(2026)
    expect(numberYear('12/B/2006 ', 2026)).toBe(2006)
    expect(numberYear('fara numar', 2026)).toBeNull()
  })
  it('takes a year before 1990 or after the export for a slip, not a year', () => {
    expect(numberYear('88/A/1990', 2026)).toBe(1990)
    expect(numberYear('5/A/1005', 2026)).toBeNull()
    expect(numberYear('5/A/2034', 2026)).toBeNull()
  })
})

describe('the notes', () => {
  it('alerts on an unread address, a late export and a capped count; states the facts', () => {
    const notes = notesOf({
      query: EMPTY_QUERY,
      unread: [{ param: 'status', value: 'activ' }],
      snapshot,
      summary,
      summaryMatches: true,
      read: read([row()], { complete: false, capped: true }),
      countsGap: null,
      trap: null,
    })
    expect(notes.alerts).toHaveLength(3)
    expect(notes.alerts[0]).toContain('status=activ')
    expect(notes.facts[0]).toContain('nu că mai funcționează')
  })
  it('is an „i" when nothing is off', () => {
    const notes = notesOf({
      query: { ...EMPTY_QUERY, county: 'CLUJ' },
      unread: [],
      snapshot: { ...snapshot, refreshOverdue: false },
      summary,
      summaryMatches: true,
      read: read([row()]),
      countsGap: null,
      trap: null,
    })
    expect(notes.alerts).toEqual([])
    expect(notes.facts.some((fact) => fact.includes('fără județ'))).toBe(false)
  })
})

describe('the notes when the counts or the summary are of another export', () => {
  it('say the counts did not answer, and state no figure of the other export', () => {
    const notes = notesOf({
      query: EMPTY_QUERY,
      unread: [],
      snapshot: { ...snapshot, refreshOverdue: false },
      summary,
      summaryMatches: false,
      read: read([row()]),
      countsGap: 'otherExport',
      trap: null,
    })
    expect(notes.alerts.some((alert) => alert.includes('altui export'))).toBe(true)
    expect(notes.facts.some((fact) => fact.includes('104'))).toBe(false)
  })
  it('bound a read past the cap by its distinct rows', () => {
    const notes = notesOf({
      query: { ...EMPTY_QUERY, q: 'club' },
      unread: [],
      snapshot: { ...snapshot, refreshOverdue: false },
      summary,
      summaryMatches: true,
      read: read([row()], { complete: false, capped: true }),
      countsGap: null,
      trap: null,
    })
    expect(notes.alerts).toEqual(['Selecția are cel puțin 1 de înregistrări: cifrele ei nu se calculează. Restrânge-o pentru un răspuns exact.'])
  })
})

describe('the questions and the omnibox', () => {
  it('every ready question round-trips through the address', () => {
    for (const question of questions()) expect(queryOf(searchOf(question.query), counties).query).toEqual(question.query)
  })
  it('suggests a county, a form, a status, public utility, a name and a number', () => {
    expect(suggestionsOf('cl', EMPTY_QUERY, counties).map((item) => item.group)).toEqual(['county', 'county'])
    expect(suggestionsOf('fund', EMPTY_QUERY, counties).map((item) => item.group)).toEqual(['form', 'name'])
    expect(suggestionsOf('radiate', EMPTY_QUERY, counties).map((item) => item.group)).toEqual(['status', 'name'])
    expect(suggestionsOf('utilitate', EMPTY_QUERY, counties).map((item) => item.group)).toEqual(['utility', 'name'])
    expect(suggestionsOf('1471/A/2012', EMPTY_QUERY, counties).map((item) => item.group)).toEqual(['number'])
    const named = suggestionsOf('banca pentru alimente', EMPTY_QUERY, counties)
    expect(named[named.length - 1]?.query.q).toBe('banca pentru alimente')
  })
})
