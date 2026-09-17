import { describe, expect, it } from 'vitest'
import { CAEN_DIVISIONS, caenDivision, labelDivisions } from './caen-divisions'

describe('CAEN divisions', () => {
  it('keys every division by a two-character code, with no duplicates', () => {
    const codes = CAEN_DIVISIONS.map((division) => division.code)
    expect(codes.every((code) => /^\d{2}$/.test(code))).toBe(true)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('names a served division from the nomenclature', () => {
    expect(caenDivision('41')?.short).toBe('Construcții de clădiri')
    expect(caenDivision('62')?.label).toBe('Servicii în tehnologia informației')
  })

  it('carries the served count through and flags the named rows', () => {
    const rows = labelDivisions([
      { key: '47', label: null, count: 632531 },
      { key: '41', label: null, count: 199517 },
    ])

    expect(rows.map((row) => row.count)).toEqual([632531, 199517])
    expect(rows.every((row) => row.named)).toBe(true)
    expect(rows[0].short).toBe('Comerț cu amănuntul')
  })

  it('shows a code with no division as itself rather than guessing a name', () => {
    // `00` and `04` are source noise: no division in the nomenclature answers
    // to them, and inventing a sector name for a count would be a claim.
    const [row] = labelDivisions([{ key: '00', label: null, count: 702 }])

    expect(row.named).toBe(false)
    expect(row.short).toContain('00')
    expect(row.long).toContain('00')
    expect(row.count).toBe(702)
  })

  it('leaves the served order alone', () => {
    const rows = labelDivisions([
      { key: '00', label: null, count: 9 },
      { key: '47', label: null, count: 5 },
    ])
    expect(rows.map((row) => row.key)).toEqual(['00', '47'])
  })
})
