import { describe, expect, it } from 'vitest'
import { ECHR_DEFAULT_QUESTION, echrQuestionOf, echrSearchOf, isBareEchrSearch } from './echr-address'
import { ECHR_FIRST_YEAR, ECHR_LAST_YEAR, ECHR_REFERENCE_YEAR } from './echr-years'

describe('the ECHR page’s address', () => {
  it('is the question, its defaults left out: the bare page is the last whole year’s years', () => {
    expect(ECHR_DEFAULT_QUESTION).toEqual({ year: ECHR_REFERENCE_YEAR, view: 'ani' })
    expect(echrQuestionOf({})).toEqual(ECHR_DEFAULT_QUESTION)
    expect(echrSearchOf(ECHR_DEFAULT_QUESTION)).toEqual({ an: undefined, vedere: undefined })
    const asked = { year: 2018, view: 'hotarari' } as const
    expect(echrSearchOf(asked)).toEqual({ an: 2018, vedere: 'hotarari' })
    expect(echrQuestionOf(echrSearchOf(asked))).toEqual(asked)
  })

  it('reads a year as the router gives it, only one the snapshot holds; anything else is the default', () => {
    expect(echrQuestionOf({ an: '2018' }).year).toBe(2018)
    expect(echrQuestionOf({ an: ECHR_FIRST_YEAR }).year).toBe(ECHR_FIRST_YEAR)
    expect(echrQuestionOf({ an: ECHR_LAST_YEAR }).year).toBe(ECHR_LAST_YEAR)
    for (const an of [ECHR_FIRST_YEAR - 1, ECHR_LAST_YEAR + 1, '6946/03', 'Ion Popescu', 2018.5, '20188', ['2018']]) expect(echrQuestionOf({ an }).year).toBe(ECHR_REFERENCE_YEAR)
    expect(echrQuestionOf({ vedere: 'cereri' }).view).toBe('ani')
  })

  it('is the bare page only with none of its keys', () => {
    expect(isBareEchrSearch({})).toBe(true)
    expect(isBareEchrSearch({ lang: 'en' })).toBe(true)
    expect(isBareEchrSearch({ an: 2018 })).toBe(false)
    expect(isBareEchrSearch({ vedere: 'x' })).toBe(false)
  })
})
