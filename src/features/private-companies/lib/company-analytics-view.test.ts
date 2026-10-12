import { describe, expect, it } from 'vitest'
import { aggregate, breakdownFixture, bucket, releaseFixture, seriesFixture } from '../api/company-analytics.fixture'
import { drillScope, nextDimension } from './company-analytics-drill'
import { boundOf } from './company-analytics-filter-model'
import { placeName } from './company-analytics-text'
import { breakdownRows, groupLabel, metricFact, partialYears, pointText } from './company-analytics-view'

/**
 * What the page draws from the answers: nothing reported is said as such
 * and never drawn as 0, an explicit zero is a zero, held values are counted
 * apart, scaled figures carry their exact digits, a recent year with fewer
 * statements is partial, and a click narrows exactly to what was counted.
 */


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
})

describe('breakdown', () => {
  it('names the unknown group by what is unknown, and a main activity of unknown revision as such', () => {
    const breakdown = breakdownFixture()
    expect(groupLabel('COUNTY', breakdown.unknown)).toBe('Județ necunoscut')
    expect(groupLabel('COUNTY', breakdown.other)).toBe('Încă un grup')
    expect(groupLabel('COUNTY', { ...breakdown.other, groups: 3 })).toBe('Alte 3 grupuri')
    expect(groupLabel('COUNTY', { ...breakdown.other, groups: 35 })).toBe('Alte 35 de grupuri')
    expect(groupLabel('MAIN_CAEN', { ...breakdown.groups[0]!, key: '?:6201', caen: { code: '6201', revision: null, basis: 'REVISION_UNKNOWN', label: null } })).toBe('6201 (revizie necunoscută)')
  })

  it('names a consensus group without a value by why — never by its key in parentheses or as unknown', () => {
    const breakdown = breakdownFixture()
    expect(groupLabel('COUNTY', breakdown.groups[2]!)).toBe('Fără județ comun — valori diferite în înscrieri')
    expect(groupLabel('OBSERVED_STATUS', bucket('GROUP', '(partial_observations)', null, { basis: 'PARTIAL_OBSERVATIONS' }))).toBe('Fără stare comună — observații incomplete')
    expect(groupLabel('UAT', bucket('GROUP', '(unresolved)', null, { basis: 'UNRESOLVED' }))).toBe('Fără localitate comună — înscrieri nerezolvate')
  })

  it('draws a consensus grouping’s basis groups among its groups, and not the unknown slot the API keeps empty', () => {
    const breakdown = breakdownFixture()
    expect(breakdownRows(breakdown).ranked.map((row) => row.key)).toEqual(['B', 'CJ', '(multiple_values)'])
    expect(breakdownRows(breakdown).rest.map((row) => row.kind)).toEqual(['OTHER'])
    // Were it ever not empty, it is drawn: the rows still add up to the total.
    expect(breakdownRows({ ...breakdown, unknown: { ...breakdown.unknown, companies: '3' } }).rest.map((row) => row.kind)).toContain('UNKNOWN')
    // Any other grouping keeps its unknown row, empty or not.
    expect(breakdownRows({ ...breakdown, dimension: 'MAIN_CAEN' }).rest.map((row) => row.kind)).toContain('UNKNOWN')
  })

  it('narrows a click to exactly what the group counted, and refuses what no single filter names', () => {
    const groups = breakdownFixture()
    expect(drillScope({}, 'COUNTY', groups.groups[0]!)).toEqual({ county: { in: ['B'] } })
    // A basis group by its own key — exactly that bucket, never widened to every company without a county.
    expect(drillScope({}, 'COUNTY', groups.groups[2]!)).toEqual({ county: { in: ['(multiple_values)'] } })
    // The consensus grouping's unknown slot is empty: `includeUnknown` would select every basis group instead.
    expect(drillScope({}, 'COUNTY', groups.unknown)).toBeNull()
    expect(drillScope({}, 'OBSERVED_STATUS', groups.unknown)).toBeNull()
    expect(drillScope({}, 'MAIN_CAEN', { ...groups.groups[0]!, key: '?:6201' })).toEqual({ mainCaen: [{ code: '6201' }] })
    expect(drillScope({}, 'MAIN_CAEN', { ...groups.groups[0]!, key: 'rev2:6201' })).toEqual({ mainCaen: [{ code: '6201', revision: 'rev2' }] })
    expect(drillScope({ mainCaen: [{ code: '1' }] }, 'MAIN_CAEN', groups.unknown)).toMatchObject({ mainCaenBasis: ['MISSING'], mainCaen: undefined })
    expect(drillScope({}, 'VAT_PAYER', groups.unknown)).toEqual({ vatPayer: ['UNKNOWN'] })
    expect(drillScope({}, 'EMPLOYEE_SIZE', groups.unknown)).toBeNull()
    expect(drillScope({}, 'COUNTY', groups.other)).toBeNull()
    expect(nextDimension('COUNTY', { county: { in: ['CJ'] } })).toBe('UAT')
  })

  it('names a place by its name, not the registry’s capitals', () => {
    const group = { ...breakdownFixture().groups[0]!, basis: null }
    expect(groupLabel('COUNTY', { ...group, key: 'CJ', label: 'CLUJ' })).toBe('Cluj')
    expect(groupLabel('COUNTY', { ...group, key: 'B', label: 'MUNICIPIUL BUCUREȘTI' })).toBe('București')
    expect(groupLabel('UAT', { ...group, key: '54975', label: 'MUNICIPIUL CLUJ-NAPOCA' })).toBe('Cluj-Napoca')
    expect(groupLabel('UAT', { ...group, key: '179132', label: 'SECTORUL 1' })).toBe('Sectorul 1')
  })
})

describe('place words', () => {
  it('title-cases the registry’s capitals and leaves the kind of place to the name', () => {
    expect(placeName('ORAȘ MIOVENI')).toBe('Mioveni')
    expect(placeName('COMUNA BAIA DE ARIEȘ')).toBe('Baia de Arieș')
    expect(placeName('MUNICIPIUL TÂRGU MUREȘ')).toBe('Târgu Mureș')
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
