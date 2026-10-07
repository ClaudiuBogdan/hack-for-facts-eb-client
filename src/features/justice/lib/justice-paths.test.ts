import { describe, expect, it } from 'vitest'
import { matchCourts } from './court-search'
import { JUSTICE_HUB_SNAPSHOT } from './hub-snapshot'
import { casePath, courtPath, isCaseNumber, isCourtCode, isTypedCaseNumber } from './justice-paths'

const NUMBERS = ['33517/3/2021/a85', '1234/3/2024*', '380/100/2018**/a1', '9/1/2025/a1.2', '1607/173/2026', '1234/2005', '340.1/832/2007', '12480./3/2008/a1', '286.1./263/2006', '17020,/245/2008']

describe('isTypedCaseNumber', () => {
  it('takes case numbers as the portal writes them', () => {
    for (const number of NUMBERS) expect(isTypedCaseNumber(number)).toBe(true)
  })

  it('refuses what is not a number — a typed name above all, with or without spaces', () => {
    for (const text of ['', 'Ion Popescu', 'Popescu', '1/Ion-Popescu', '1/2/Popescu', 'a1/2024', '/12/2024', '12//2024', '12/2024 ', '1/../2', `1/${'1'.repeat(80)}`, `1/2/2024/a1${'.1'.repeat(42)}`]) {
      expect(isTypedCaseNumber(text), text).toBe(false)
    }
  })
})

describe('isCaseNumber', () => {
  it('lets a page hold every number the portal writes, and nothing a path would read otherwise', () => {
    for (const number of NUMBERS) expect(isCaseNumber(number)).toBe(true)
    for (const text of ['', '../x', 'a b', '12//2024', '1/../2', '1/./2', 'Ion/Popescu', '1/Popescu', '1'.repeat(101)]) expect(isCaseNumber(text), text).toBe(false)
  })
})

describe('isCourtCode', () => {
  it('takes every institution code the API serves', () => {
    for (const court of JUSTICE_HUB_SNAPSHOT.courts) expect(isCourtCode(court.code), court.code).toBe(true)
  })

  it('takes an institution code and refuses anything else', () => {
    expect(isCourtCode('JudecatoriaDarabani')).toBe(true)
    expect(isCourtCode('JudecatoriaSECTORUL1BUCURESTI')).toBe(true)
    expect(isCourtCode('Tribunalul CLUJ')).toBe(false)
    expect(isCourtCode('../etc')).toBe(false)
  })
})

describe('the paths', () => {
  it('keeps a case number’s slashes and escapes nothing a number holds', () => {
    expect(courtPath('TribunalulCLUJ')).toBe('/justice/courts/TribunalulCLUJ')
    expect(casePath('TribunalulBUCURESTI', '33517/3/2021/a85')).toBe('/justice/cases/TribunalulBUCURESTI/33517/3/2021/a85')
    expect(casePath('TribunalulBUCURESTI', '1234/3/2024*')).toBe('/justice/cases/TribunalulBUCURESTI/1234/3/2024*')
  })
})

describe('matchCourts', () => {
  const courts = JUSTICE_HUB_SNAPSHOT.courts

  it('finds courts by the start of each word, diacritics ignored, busiest first', () => {
    expect(matchCourts(courts, 'sector 2').map((court) => court.code)).toEqual(['JudecatoriaSECTORUL2BUCURESTI'])
    const brasov = matchCourts(courts, 'brașov')
    expect(brasov.map((court) => court.code)).toContain('TribunalulBRASOV')
    for (let index = 1; index < brasov.length; index += 1) expect(brasov[index - 1]!.casesInYear).toBeGreaterThanOrEqual(brasov[index]!.casesInYear)
    expect(matchCourts(courts, '   ')).toEqual([])
  })
})
