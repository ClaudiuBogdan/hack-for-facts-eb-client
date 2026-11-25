import { beforeAll, describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { getClassificationName } from '@/lib/classifications'
import type { AnalyticsFilterType } from '@/schemas/charts'
import { chapterWords, chipsOf, coverageText, readyQuestions, sentenceOf, subjectOf, topicOf, whoOf } from './public-institutions-text'

/**
 * The page's words, from the selection: whose money and how it is measured,
 * what for, the filters the head does not show — each said once.
 */

beforeAll(() => {
  i18n.loadAndActivate({ locale: 'ro', messages: {} })
})

const FILTER: AnalyticsFilterType = { account_category: 'ch', normalization: 'total' }

describe('whose money', () => {
  it('is every institution, the town halls, or the town halls and county councils', () => {
    expect(whoOf(FILTER, false)).toBe('all')
    expect(whoOf({ ...FILTER, is_uat: true }, false)).toBe('town-halls')
    expect(whoOf({ ...FILTER, is_territorial_executive: true }, false)).toBe('local-executives')
    // Per inhabitant keeps to the territorial executives unless the address says otherwise.
    expect(whoOf(FILTER, true)).toBe('local-executives')
    // Per inhabitant the API ranks the territorial executives whatever the address says.
    expect(whoOf({ ...FILTER, is_territorial_executive: false }, true)).toBe('local-executives')
  })

  it('is said with what is measured', () => {
    expect(subjectOf({ income: false, perCapita: false, who: 'all' })).toBe('Cheltuielile instituțiilor publice')
    expect(subjectOf({ income: true, perCapita: false, who: 'town-halls' })).toBe('Veniturile primăriilor')
    expect(subjectOf({ income: false, perCapita: true, who: 'local-executives' })).toBe('Cheltuielile pe locuitor ale primăriilor și consiliilor județene')
  })
})

describe('what the money is for', () => {
  it('is one chapter, named as words in a sentence', () => {
    expect(chapterWords('Învățământ')).toBe('învățământ')
    expect(chapterWords('70.  cheltuieli de capital (70=71+72+75)')).toBe('cheltuieli de capital')
    // The chapter's name in the reader's language (the tests run as an English reader).
    expect(topicOf({ ...FILTER, functional_prefixes: ['65'] })).toEqual({ key: 'functional_prefixes', text: chapterWords(getClassificationName('65') ?? '') })
    expect(topicOf({ ...FILTER, functional_prefixes: ['65.'] })?.text).toBe(topicOf({ ...FILTER, functional_prefixes: ['65'] })?.text)
    expect(topicOf({ ...FILTER, economic_prefixes: ['10'] })?.key).toBe('economic_prefixes')
  })

  it('is no topic when the selection names several chapters, or both kinds', () => {
    expect(topicOf({ ...FILTER, functional_prefixes: ['65', '66'] })).toBeNull()
    expect(topicOf({ ...FILTER, functional_prefixes: ['65'], economic_prefixes: ['10'] })).toBeNull()
  })

  it('goes in the headline, with the period', () => {
    expect(sentenceOf({ subject: 'Cheltuielile instituțiilor publice', topic: { key: 'functional_prefixes', text: 'învățământ' }, periodLabel: '2025' })).toBe(
      'Cheltuielile instituțiilor publice pentru învățământ, în 2025',
    )
  })
})

describe('the chips', () => {
  it('say each filter the head does not show, counted in words', () => {
    const chips = chipsOf({ ...FILTER, county_codes: ['SB', 'CJ'], uat_ids: ['1'], tags: Array.from({ length: 20 }, (_, index) => String(index)) }, null, false)
    expect(chips.map((chip) => chip.text)).toEqual(['2 județe', 'o localitate', '20 de etichete'])
    expect(chips[0].clear).toEqual({ county_codes: undefined })
  })

  it('leave out the headline’s topic and the per-capita view’s own scope', () => {
    const filter = { ...FILTER, functional_prefixes: ['65'], is_territorial_executive: true, normalization: 'per_capita' } as AnalyticsFilterType
    expect(chipsOf(filter, topicOf(filter), true)).toEqual([])
    expect(chipsOf({ ...FILTER, is_territorial_executive: true }, null, false).map((chip) => chip.text)).toEqual(['doar primăriile și consiliile județene'])
  })

  it('count the exclusions as one chip', () => {
    const chips = chipsOf({ ...FILTER, exclude: { entity_cuis: ['1'], county_codes: ['SB'] } }, null, false)
    expect(chips.map((chip) => [chip.key, chip.text])).toEqual([['exclude', '2 excluderi']])
  })
})

describe('the ready questions', () => {
  it('ask for the town halls and county councils with the filter that includes the councils', () => {
    const question = readyQuestions().find((one) => one.text.startsWith('Primăriile și consiliile județene'))
    expect(question?.filter).toEqual({ is_territorial_executive: true })
  })
})

describe('how far the data reaches', () => {
  it('says a whole year, the last month of a year in progress, or only that it is in progress', () => {
    expect(coverageText({ year: 2025, complete: true, lastMonth: null }, 'ro')).toBe('date pentru tot anul 2025')
    expect(coverageText({ year: 2026, complete: false, lastMonth: '2026-10' }, 'ro')).toBe('date până în octombrie 2026')
    expect(coverageText({ year: 2026, complete: false, lastMonth: null }, 'ro')).toBe('anul 2026 e în curs')
  })
})
