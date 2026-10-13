import { i18n } from '@lingui/core'
import { describe, expect, it } from 'vitest'
import { CAEN_DIVISIONS, caenDivision, caenDivisionLabel, divisionLabel } from './caen-divisions'
import { CAEN_REV3_DIVISIONS, CAEN_REV3_SOURCE } from './caen-rev3-divisions'

/** NACE Rev. 2.1's 87 division codes (Eurostat), which CAEN Rev.3 takes over: 45 gone, 01–99 with gaps. */
const NACE_21_DIVISIONS =
  '01 02 03 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 35 36 37 38 39 41 42 43 46 47 49 50 51 52 53 55 56 58 59 60 61 62 63 64 65 66 68 69 70 71 72 73 74 75 77 78 79 80 81 82 84 85 86 87 88 90 91 92 93 94 95 96 97 98 99'.split(' ')

describe('CAEN Rev.3 divisions (ONRC)', () => {
  it('holds every NACE Rev. 2.1 division once, in its section, with the source it was read from', () => {
    expect(CAEN_REV3_DIVISIONS.map((division) => division.code)).toEqual(NACE_21_DIVISIONS)
    expect(CAEN_REV3_DIVISIONS.every((division) => /^[A-V]$/u.test(division.section))).toBe(true)
    // The structure the names were read from, as parsed: the reference catalog holds the same 651 classes.
    expect(CAEN_REV3_SOURCE.counts).toEqual({ sections: 22, divisions: 87, groups: 287, classes: 651 })
    expect(CAEN_REV3_SOURCE.sha256).toMatch(/^[0-9a-f]{64}$/u)
    expect(CAEN_REV3_SOURCE.url).toBe('https://www.onrc.ro/documente/anunturi/CAEN-Rev.3_structura-completa.pdf')
  })

  it('keeps ONRC’s own text, and writes its cedillas as comma-below letters', () => {
    const oil = CAEN_REV3_DIVISIONS.find((division) => division.code === '06')
    expect(oil ? i18n._(oil.name) : null).toBe('Extracţia petrolului brut şi a gazelor naturale')
    expect(caenDivisionLabel('06', 'rev3')).toBe('Extracția petrolului brut și a gazelor naturale')
    expect(caenDivisionLabel('29', 'rev3')).toBe('Fabricarea autovehiculelor de transport rutier, a remorcilor și semiremorcilor')
  })

  it('looks a division up only in its own revision — never a Rev.3 code in the Rev.2 table, nor the reverse', () => {
    // Rev.3 has no 45: its digits are no Rev.2 motor-vehicle trade.
    expect(caenDivisionLabel('45', 'rev3')).toBeNull()
    expect(caenDivisionLabel('45', 'rev2')).toBe(divisionLabel('45'))
    // The same digits, two revisions, two names.
    expect(caenDivisionLabel('62', 'rev2')).toBe('Software și servicii IT')
    expect(caenDivisionLabel('62', 'rev3')).toBe('Activități de programare și activități de consultanță în tehnologia informației')
    // Another revision, or none: unknown, never borrowed.
    expect(caenDivisionLabel('62', 'rev1')).toBeNull()
    expect(caenDivisionLabel('62', 'rev0')).toBeNull()
    expect(caenDivisionLabel('62', null)).toBeNull()
    expect(caenDivisionLabel('00', 'rev3')).toBeNull()
  })
})

describe('CAEN divisions', () => {
  it('keys every Rev.2 division by a two-digit code, once', () => {
    const codes = CAEN_DIVISIONS.map((division) => division.code)
    expect(codes.every((code) => /^\d{2}$/.test(code))).toBe(true)
    expect(new Set(codes).size).toBe(codes.length)
    // Rev.2 has 88 divisions, 01 to 99 with gaps.
    expect(codes).toHaveLength(88)
  })

  it('names a division in the page language', () => {
    expect(caenDivision('47')).toBeDefined()
    expect(divisionLabel('47')).toBe('Comerț cu amănuntul')
    expect(divisionLabel('62')).toBe('Software și servicii IT')
  })

  it('shows a code with no division as itself rather than guessing a name', () => {
    expect(divisionLabel('00')).toBe('CAEN 00')
  })
})
