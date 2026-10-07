import { describe, expect, it } from 'vitest'
import { displayName, enterpriseCount, formatCount, formatDate, formatLei, formatShare, s1001ListDate } from './hub-format'

describe('the hub’s numbers', () => {
  it('groups counts as the page’s language does', () => {
    expect(formatCount(1721, 'ro')).toBe('1.721')
    expect(formatCount(1721, 'en')).toBe('1,721')
  })

  it('writes lei in thousands of millions, millions or lei, from exact decimal text', () => {
    expect(formatLei('9659879145', 'ro')).toBe('9,7 mld. lei')
    expect(formatLei('354232258', 'ro')).toBe('354,2 mil. lei')
    expect(formatLei('48120.40', 'ro')).toBe('48.120 lei')
  })

  it('gives a share in whole percents, a small one as „<1 %" rather than a zero, and none of an empty whole', () => {
    expect(formatShare(350, 1721, 'ro')).toMatch(/^20\s?%$/u)
    expect(formatShare(8, 1721, 'ro')).toMatch(/^<1\s?%$/u)
    expect(formatShare(0, 1721, 'ro')).toMatch(/^0\s?%$/u)
    expect(formatShare(3, 0, 'ro')).toBeNull()
  })

  it('agrees a count with its noun, as Romanian does', () => {
    expect(enterpriseCount(1, 'ro')).toBe('o întreprindere')
    expect(enterpriseCount(19, 'ro')).toBe('19 întreprinderi')
    expect(enterpriseCount(1721, 'ro')).toBe('1.721 de întreprinderi')
  })
})

describe('names and dates', () => {
  it('sets a registry name in capitals the way the company page does, and says when a source gave none', () => {
    expect(displayName('CONSILIUL LOCAL VOLUNTARI')).toBe('Consiliul Local Voluntari')
    expect(displayName('SOCIETATEA NATIONALA DE GAZE NATURALE  ROMGAZ  SA')).toBe('Societatea Nationala de Gaze Naturale Romgaz SA')
    expect(displayName(null)).toBe('Fără nume în sursă')
    expect(displayName('   ')).toBe('Fără nume în sursă')
  })

  it('reads ANAF’s list date off its file name, past the order numbers before it', () => {
    expect(s1001ListDate('http://static.anaf.ro/static/10/Anaf/Declaratii_R/S1001/Lista%20finala%20a%20IP%20care%20aplica%20OMFP%202873%20si%202874%20%2026%20august%202026%20.pdf')).toBe('2026-08-26')
  })

  it('says no date rather than guess one', () => {
    expect(s1001ListDate('http://static.anaf.ro/S1001/lista.pdf')).toBeNull()
    expect(s1001ListDate('http://static.anaf.ro/S1001/Lista%2032%20august%202026.pdf')).toBeNull()
    expect(s1001ListDate(null)).toBeNull()
    expect(s1001ListDate('%E0%A4%A')).toBeNull()
  })

  it('writes a date in the page’s language, Bucharest’s day', () => {
    expect(formatDate('2026-08-26', 'ro')).toBe('26 august 2026')
    expect(formatDate('2026-10-07T22:30:00.000Z', 'ro')).toBe('8 octombrie 2026')
    expect(formatDate('not a date', 'ro')).toBeNull()
    expect(formatDate(null, 'ro')).toBeNull()
  })
})
