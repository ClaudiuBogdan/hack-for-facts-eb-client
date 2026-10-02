import { describe, expect, it } from 'vitest'
import { aggregate, breakdownFixture, releaseFixture, seriesFixture, statsFixture } from '../api/company-analytics.fixture'
import { resolveQuestion } from '../api/company-analytics-plan'
import { drillScope, nextDimension } from './company-analytics-drill'
import { boundOf } from './company-analytics-filter-model'
import { DEFAULT_STATE, stateOf } from './company-analytics-url'
import { factsOf, groupLabel, headlineOf, metricFact, partialYears, pointText } from './company-analytics-view'

/**
 * What the page draws from the answers: nothing reported is said as such
 * and never drawn as 0, an explicit zero is a zero, held values are counted
 * apart, scaled figures carry their exact digits, a recent year with fewer
 * statements is partial, and a click narrows exactly to what was counted.
 */

const question = resolveQuestion(DEFAULT_STATE, releaseFixture())

describe('figures band', () => {
  it('scales a sum past 2^53 and keeps its exact digits under it', () => {
    const fact = metricFact(aggregate('TURNOVER', '9007199254741973.32', '900000'), 'ro')
    expect(fact.value).toBe('9.007.199,3')
    expect(fact.unit).toBe('mld. lei')
    expect(fact.notes).toContain('9.007.199.254.741.973,32 lei')
  })

  it('says a sum nobody reported, and never shows it as 0', () => {
    const fact = metricFact(aggregate('EMPLOYEES', null, '0'), 'ro')
    expect(fact.value).toBe('—')
    expect(fact.notes).toEqual(['nicio firmă nu a raportat o valoare'])
  })

  it('shows an explicit zero as a zero', () => {
    const fact = metricFact(aggregate('NET_RESULT', '0.00', '3'), 'ro')
    expect(fact.value).toBe('0')
    expect(fact.notes).toContain('0,00 lei')
  })

  it('counts companies, filers and non-filers, and the coverage of the chosen figure with its held values apart', () => {
    const { main, more } = factsOf(statsFixture(), question, 'ro')
    expect(main.map((fact) => fact.key)).toEqual(['companies', 'filers', 'TURNOVER', 'coverage'])
    expect(main[0]?.value).toBe('2.718.250')
    expect(main[1]?.notes).toEqual(['1.753.037 fără situație pentru 2024'])
    // 900 000 reported of 965 213 statements (reported + missing + held).
    expect(main[3]?.value).toBe('93,2%')
    expect(main[3]?.notes).toEqual(['lipsă 60.000 · reținute 5.213 · neadmise 0'])
    expect(more.map((fact) => [fact.key, fact.value])).toEqual([
      ['EMPLOYEES', '—'],
      ['NET_RESULT', '0'],
    ])
  })
})

describe('headline and breakdown', () => {
  it('asks the question in a sentence: the figure, the place, the fiscal year', () => {
    expect(headlineOf(stateOf({ judet: 'CJ' }), question, {})).toBe('Cifra de afaceri în județul Cluj, anul fiscal 2024')
    expect(headlineOf(DEFAULT_STATE, question, {})).toBe('Cifra de afaceri în România, anul fiscal 2024')
  })

  it('names the unknown group by what is unknown, and a main activity of unknown revision as such', () => {
    const breakdown = breakdownFixture()
    expect(groupLabel('COUNTY', breakdown.unknown)).toBe('Județ necunoscut')
    expect(groupLabel('COUNTY', breakdown.other)).toBe('Alte 1 grupuri')
    expect(groupLabel('MAIN_CAEN', { ...breakdown.groups[0]!, key: '?:6201', caen: { code: '6201', revision: null, basis: 'REVISION_UNKNOWN', label: null } })).toBe('6201 (revizie necunoscută)')
  })

  it('narrows a click to exactly what the group counted, and refuses what no single filter names', () => {
    const groups = breakdownFixture()
    expect(drillScope({}, 'COUNTY', groups.groups[0]!)).toEqual({ county: { in: ['B'] } })
    expect(drillScope({}, 'COUNTY', groups.unknown)).toEqual({ county: { includeUnknown: true } })
    expect(drillScope({}, 'MAIN_CAEN', { ...groups.groups[0]!, key: '?:6201' })).toEqual({ mainCaen: [{ code: '6201' }] })
    expect(drillScope({}, 'MAIN_CAEN', { ...groups.groups[0]!, key: 'rev2:6201' })).toEqual({ mainCaen: [{ code: '6201', revision: 'rev2' }] })
    expect(drillScope({ mainCaen: [{ code: '1' }] }, 'MAIN_CAEN', groups.unknown)).toMatchObject({ mainCaenBasis: ['MISSING'], mainCaen: undefined })
    expect(drillScope({}, 'VAT_PAYER', groups.unknown)).toEqual({ vatPayer: ['UNKNOWN'] })
    expect(drillScope({}, 'EMPLOYEE_SIZE', groups.unknown)).toBeNull()
    expect(drillScope({}, 'COUNTY', groups.other)).toBeNull()
    expect(nextDimension('COUNTY', { county: { in: ['CJ'] } })).toBe('UAT')
  })
})

describe('years', () => {
  it('calls a last year with fewer statements partial, and no year complete', () => {
    expect([...partialYears(releaseFixture())]).toEqual([2025])
  })

  it('says why a year has no figure, and the exact figure with who reported it otherwise', () => {
    const series = seriesFixture()
    expect(pointText(series.points[0]!, series, 'ro')).toBe('2008: 9.007.199.254.741.973,32 lei · raportat de 70 din 80 firme cu situație')
    expect(pointText(series.points[1]!, series, 'ro')).toBe('2009: indicatorul nu e admis pentru acest an')
    expect(pointText(series.points[2]!, series, 'ro')).toBe('2010: 0,00 lei · raportat de 2 din 80 firme cu situație')
    expect(pointText(series.points[3]!, series, 'ro')).toBe('2011: nicio valoare raportată')
  })
})

describe('filter bounds', () => {
  it('reads lei as a reader writes them, exactly, and refuses what the API would', () => {
    expect(boundOf('1.000.000,50', 'TURNOVER')).toBe('1000000.50')
    expect(boundOf('1,000,000.50', 'TURNOVER')).toBe('1000000.50')
    expect(boundOf('1.000.000', 'TURNOVER')).toBe('1000000')
    expect(boundOf('1000,5', 'TURNOVER')).toBe('1000.5')
    expect(boundOf('-0,01', 'NET_RESULT')).toBe('-0.01')
    expect(boundOf('1,005', 'TURNOVER')).toBeNull()
    expect(boundOf('10,5', 'EMPLOYEES')).toBeNull()
    expect(boundOf('49', 'EMPLOYEES')).toBe('49')
  })
})
