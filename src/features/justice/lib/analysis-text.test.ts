import { i18n } from '@lingui/core'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_QUESTION, type Question } from './analysis-model'
import { analysisDocumentTitle, headlineOf, headlineText, rowLabel, unsaidChips, yearText } from './analysis-text'
import { buildAnalysisPageTitle } from './justice-page-titles'

// The page's language, pinned: the test environment activates none.
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const question = (patch: Partial<Question> = {}): Question => ({ ...DEFAULT_QUESTION, ...patch })

describe('the question as a sentence', () => {
  it('says the bare page as its grouping, the year left to the year menu', () => {
    expect(headlineText(DEFAULT_QUESTION)).toBe('Dosarele, pe instanțe')
  })

  it('says each filter as a phrase, in the order a reader says them', () => {
    expect(headlineText(question({ matters: ['faliment'], levels: ['tribunal'], counties: ['CJ'] }))).toBe('Dosarele de faliment la tribunalele din județul Cluj, pe instanțe')
    expect(headlineText(question({ matters: ['penal'], stages: ['apel'], dupa: 'etape' }))).toBe('Dosarele penale în apel, pe etape')
    expect(headlineText(question({ counties: ['B'], dupa: 'materii' }))).toBe('Dosarele din București, pe materii')
    expect(headlineText(question({ levels: ['inalta_curte'], dupa: 'niveluri' }))).toBe('Dosarele la Înalta Curte, pe niveluri de instanță')
  })

  it('counts what it cannot list', () => {
    expect(headlineText(question({ matters: ['civil', 'penal'] }))).toBe('Dosarele civile și penale, pe instanțe')
    expect(headlineText(question({ matters: ['civil', 'penal', 'faliment'] }))).toBe('Dosarele din 3 materii, pe instanțe')
    expect(headlineText(question({ counties: ['CJ', 'IS', 'TM'] }))).toBe('Dosarele din 3 județe, pe instanțe')
    expect(headlineText(question({ courts: ['TribunalulCLUJ', 'TribunalulIASI'] }))).toBe('Dosarele la 2 instanțe, pe instanțe')
  })

  it('says a court picked as the place, its level and county then chips of their own', () => {
    const asked = question({ courts: ['TribunalulCLUJ'], levels: ['tribunal'], counties: ['CJ'], dupa: 'materii' })
    expect(headlineText(asked)).toBe('Dosarele la Tribunalul Cluj, pe materii')
    expect(unsaidChips(asked).map((chip) => chip.label)).toEqual(['Tribunale', 'Cluj'])
    expect(unsaidChips(question({ levels: ['tribunal'] }))).toEqual([])
  })

  it('marks every phrase but the first and the grouping as a filter to open or drop', () => {
    expect(headlineOf(question({ matters: ['faliment'], stages: ['fond'] })).map((phrase) => phrase.role)).toEqual(['base', 'matters', 'stages', 'dupa'])
  })
})

describe('the names', () => {
  it('names a court with its level and county, the ÎCCJ among counties as the whole country, a folded row as the rest', () => {
    expect(rowLabel('instante', 'JudecatoriaCLUJNAPOCA')).toEqual({ label: 'Judecătoria Cluj-Napoca', sub: 'Judecătorie · Cluj' })
    expect(rowLabel('judete', 'tara').label).toBe('Înalta Curte (toată țara)')
    expect(rowLabel('materii', 'restul').label).toBe('Restul')
    expect(rowLabel('etape', 'alte').label).toBe('Alte etape')
  })

  it('names the capture’s last year with the month it stops in', () => {
    expect(yearText(2026, 'portal')).toBe('2026 (până în iunie)')
    expect(yearText(2026, 'iccj')).toBe('2026 (până în iulie)')
    expect(yearText(2025, 'both')).toBe('2025')
  })
})

describe('the titles', () => {
  it('gives the bare page the page’s title and any other question its headline', () => {
    expect(buildAnalysisPageTitle(i18n)).toBe('Analize ale dosarelor — Justiție — Transparenta.eu')
    expect(analysisDocumentTitle(i18n, DEFAULT_QUESTION)).toBe(buildAnalysisPageTitle(i18n))
    expect(analysisDocumentTitle(i18n, question({ matters: ['faliment'] }))).toBe('Dosarele de faliment, pe instanțe — Justiție — Transparenta.eu')
  })
})
