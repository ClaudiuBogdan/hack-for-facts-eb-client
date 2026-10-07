import { describe, expect, it } from 'vitest'
import {
  analysisUrl,
  changeOf,
  changeShown,
  comparable,
  ICCJ_CODE,
  siteSearchOf,
  sourceOf,
  countsBy,
  courtsOf,
  DEFAULT_QUESTION,
  drilled,
  filterOf,
  matterKeyOf,
  NO_COUNTY,
  questionOf,
  rankedRows,
  searchOf,
  stageCounts,
  topShare,
  type Question,
} from './analysis-model'

const question = (patch: Partial<Question> = {}): Question => ({ ...DEFAULT_QUESTION, ...patch })

describe('the address', () => {
  it('is the question, its defaults left out: the bare page is the default question', () => {
    expect(searchOf(DEFAULT_QUESTION)).toEqual({})
    expect(questionOf({})).toEqual(DEFAULT_QUESTION)
    const asked = question({ year: 2024, levels: ['tribunal'], matters: ['faliment', 'civil'], stages: ['apel'], counties: ['CJ'], courts: ['TribunalulCLUJ'], dupa: 'materii' })
    expect(searchOf(asked)).toEqual({ an: 2024, nivel: 'tribunal', materie: 'faliment,civil', etapa: 'apel', judet: 'CJ', instanta: 'TribunalulCLUJ', dupa: 'materii' })
    expect(questionOf(searchOf(asked))).toEqual(asked)
  })

  it('carries the year as a number, which the router writes bare', () => {
    expect(searchOf(question({ year: 2023 })).an).toBe(2023)
    expect(questionOf({ an: '2023' }).year).toBe(2023)
  })

  it('drops what it does not know, never guessing: a year outside the capture, a stray code, a name', () => {
    expect(questionOf({ an: 2019 }).year).toBe(DEFAULT_QUESTION.year)
    expect(questionOf({ an: 'Ion Popescu' }).year).toBe(DEFAULT_QUESTION.year)
    expect(questionOf({ materie: 'faliment,Ion Popescu,faliment' }).matters).toEqual(['faliment'])
    expect(questionOf({ instanta: 'TribunalulCLUJ,Popescu' }).courts).toEqual(['TribunalulCLUJ'])
    expect(questionOf({ judet: 'CJ,XX', nivel: ['tribunal'], dupa: 'persoane', masura: 'lei' })).toEqual(question({ counties: ['CJ'] }))
  })

  it('keeps the site’s own keys through a change of question, and none of the page’s', () => {
    expect(siteSearchOf({ lang: 'en', currency: 'EUR', materie: 'faliment', an: 2024 })).toEqual({ lang: 'en', currency: 'EUR' })
  })

  it('shares a question with its year written out, so the link does not move with the default year', () => {
    expect(analysisUrl(DEFAULT_QUESTION, 'https://transparenta.eu')).toBe(`https://transparenta.eu/justice/analytics?an=${DEFAULT_QUESTION.year}`)
    expect(analysisUrl(question({ matters: ['faliment'], dupa: 'judete' }), 'https://transparenta.eu')).toBe(`https://transparenta.eu/justice/analytics?an=${DEFAULT_QUESTION.year}&materie=faliment&dupa=judete`)
  })
})

describe('the filter a read sends', () => {
  it('sends a matter as every spelling the API stores it under, the ÎCCJ archive’s own label included', () => {
    expect(filterOf(question({ matters: ['contenciosadministrativsifiscal'] }))?.category?.in).toEqual(['Contenciosadministrativsifiscal', 'Contencios administrativ şi fiscal'])
    expect(matterKeyOf('Litigii de muncă')).toBe('litigiidemunca')
  })

  it('sends the military courts as their two levels and a stage group as its raw stages', () => {
    const filter = filterOf(question({ levels: ['militare'], stages: ['contestatie', 'extraordinare'] }))
    expect(filter?.courtLevel?.in).toEqual(['tribunal_militar', 'curte_militara_apel'])
    expect(filter?.stage?.in).toContain('ContestaţieNCPP')
    expect(filter?.stage?.in).toContain('Recurs în interesul legii')
  })

  it('bounds every read by a year, or every year of the band for the years read', () => {
    expect(filterOf(DEFAULT_QUESTION)).toEqual({ year: { eq: DEFAULT_QUESTION.year } })
    expect(filterOf(DEFAULT_QUESTION, { year: 'all' })).toEqual({ year: { gte: 2013 } })
  })

  it('names a county by its courts, and a court picked within the county picked', () => {
    const cluj = courtsOf({ counties: ['CJ'], courts: [] })
    expect(cluj).toContain('TribunalulCLUJ')
    expect(cluj).toContain('JudecatoriaCLUJNAPOCA')
    expect(cluj).not.toContain('TribunalulTIMIS')
    expect(courtsOf({ counties: ['CJ'], courts: ['TribunalulCLUJ', 'TribunalulTIMIS'] })).toEqual(['TribunalulCLUJ'])
    expect(courtsOf({ counties: [], courts: [] })).toBeNull()
  })

  it('reads nothing for a question no case can match (a court outside the county picked)', () => {
    expect(filterOf(question({ counties: ['CJ'], courts: ['TribunalulTIMIS'] }))).toBeNull()
  })

  it('compares a year with the one before only between whole years of the capture', () => {
    expect(comparable(question({ year: 2025 }))).toBe(true)
    expect(comparable(question({ year: 2024 }))).toBe(true)
    // 2022 holds only the cases still active later; 2026 is a part-year.
    expect(comparable(question({ year: 2023 }))).toBe(false)
    expect(comparable(question({ year: 2026 }))).toBe(false)
  })

  it('never compares the ÎCCJ’s archive with itself: a recent, partial set, not a year’s intake', () => {
    expect(comparable(question({ levels: ['inalta_curte'] }))).toBe(false)
    expect(comparable(question({ courts: [ICCJ_CODE] }))).toBe(false)
    expect(comparable(question({ levels: ['inalta_curte', 'tribunal'] }))).toBe(true)
    expect(sourceOf(question())).toBe('both')
    expect(sourceOf(question({ levels: ['tribunal'] }))).toBe('portal')
    expect(sourceOf(question({ courts: [ICCJ_CODE] }))).toBe('iccj')
    // What the question can match decides: its courts within its counties, narrowed to its levels.
    expect(sourceOf(question({ courts: [ICCJ_CODE, 'TribunalulCLUJ'], levels: ['inalta_curte'] }))).toBe('iccj')
    expect(sourceOf(question({ courts: [ICCJ_CODE, 'TribunalulCLUJ'] }))).toBe('both')
    expect(sourceOf(question({ counties: ['CJ'] }))).toBe('portal')
    expect(comparable(question({ courts: [ICCJ_CODE, 'TribunalulCLUJ'], levels: ['inalta_curte'] }))).toBe(false)
    // Its rows among others show their count, never a change.
    expect(changeShown('instante', ICCJ_CODE)).toBe(false)
    expect(changeShown('judete', NO_COUNTY)).toBe(false)
    expect(changeShown('niveluri', 'inalta_curte')).toBe(false)
    expect(changeShown('instante', 'TribunalulCLUJ')).toBe(true)
    expect(changeShown('materii', 'civil')).toBe(true)
  })
})

describe('the rows', () => {
  it('sums courts into their counties, the ÎCCJ apart, and matters under one key', () => {
    expect(countsBy('judete', [{ key: 'TribunalulCLUJ', count: 10 }, { key: 'JudecatoriaCLUJNAPOCA', count: 5 }, { key: 'InaltaCurtedeCasatiesiJustitie', count: 2 }])).toEqual(
      new Map([['CJ', 15], [NO_COUNTY, 2]]),
    )
    expect(countsBy('materii', [{ key: 'Contenciosadministrativsifiscal', count: 10 }, { key: 'Contencios administrativ şi fiscal', count: 3 }])).toEqual(new Map([['contenciosadministrativsifiscal', 13]]))
    expect(countsBy('niveluri', [{ key: 'tribunal_militar', count: 3 }, { key: 'curte_militara_apel', count: 1 }])).toEqual(new Map([['militare', 4]]))
  })

  it('counts „Alte etape" as the rest of the total, so the stages add up', () => {
    expect(stageCounts(new Map([['fond', 80], ['apel', 15]]), 100)).toEqual(new Map([['fond', 80], ['apel', 15], ['alte', 5]]))
    expect(stageCounts(new Map([['fond', 100]]), 100)).toEqual(new Map([['fond', 100]]))
  })

  it('ranks the largest groups, folds the rest into one row and draws the unranked after it; the rows add up to the total', () => {
    const now = new Map([['a', 50], ['b', 30], ['c', 15], [NO_COUNTY, 5]])
    const { rows, total, groups } = rankedRows({ now, before: new Map([['a', 40], ['c', 10]]), total: 100, top: 2 })
    expect(rows.map((row) => [row.key, row.kind, row.count, row.before])).toEqual([
      ['a', 'group', 50, 40],
      ['b', 'group', 30, 0],
      ['restul', 'rest', 15, 10],
      [NO_COUNTY, 'apart', 5, 0],
    ])
    expect(rows.reduce((sum, row) => sum + row.count, 0)).toBe(total)
    expect(groups).toBe(3)
  })

  it('keeps the year before’s groups this year has not in „Restul", so its column adds up to its total', () => {
    const { rows } = rankedRows({ now: new Map([['a', 10]]), before: new Map([['a', 8], ['b', 5]]), total: 10, top: 25 })
    expect(rows.map((row) => [row.key, row.kind, row.count, row.before])).toEqual([
      ['a', 'group', 10, 8],
      ['restul', 'rest', 0, 5],
    ])
    expect(rows.reduce((sum, row) => sum + (row.before ?? 0), 0)).toBe(13)
  })

  it('ranks by cases per 1,000 residents when asked, a group without residents not ranked', () => {
    const { rows } = rankedRows({ now: new Map([['CJ', 100], ['B', 300], [NO_COUNTY, 10]]), before: null, total: 410, top: 25, residents: new Map([['CJ', 1000], ['B', 6000]]) })
    expect(rows.map((row) => [row.key, row.rate])).toEqual([
      ['CJ', 100],
      ['B', 50],
      [NO_COUNTY, null],
    ])
    expect(rows[0]?.before).toBeNull()
  })

  it('says a change only against a count, and the largest groups’ share only when there are more of them', () => {
    expect(changeOf(110, 100)).toBeCloseTo(0.1)
    expect(changeOf(5, 0)).toBeNull()
    expect(changeOf(5, null)).toBeNull()
    expect(topShare(new Map([['a', 5], ['b', 3], ['c', 1], ['d', 1], ['e', 1], ['f', 1]]), 12)).toBeCloseTo(11 / 12)
    expect(topShare(new Map([['a', 5]]), 5)).toBeNull()
  })
})

describe('a row narrows the question to it', () => {
  it('opens a county on its courts, a court on its matters, a matter, stage or level on its courts', () => {
    expect(drilled(question({ dupa: 'judete', masura: 'locuitori' }), 'judete', 'CJ')).toEqual(question({ counties: ['CJ'], dupa: 'instante' }))
    expect(drilled(question(), 'instante', 'TribunalulCLUJ')).toEqual(question({ courts: ['TribunalulCLUJ'], dupa: 'materii' }))
    expect(drilled(question({ dupa: 'materii' }), 'materii', 'faliment')).toEqual(question({ matters: ['faliment'] }))
    expect(drilled(question({ dupa: 'etape' }), 'etape', 'apel')).toEqual(question({ stages: ['apel'] }))
    expect(drilled(question({ dupa: 'niveluri' }), 'niveluri', 'militare')).toEqual(question({ levels: ['militare'] }))
  })

  it('does not narrow by a row that names no filter: the rest, the ÎCCJ among counties, the other stages', () => {
    expect(drilled(question(), 'instante', 'restul')).toBeNull()
    expect(drilled(question({ dupa: 'judete' }), 'judete', NO_COUNTY)).toBeNull()
    expect(drilled(question({ dupa: 'etape' }), 'etape', 'alte')).toBeNull()
  })
})
