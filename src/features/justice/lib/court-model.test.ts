import { describe, expect, it } from 'vitest'
import { FIXTURE_COURT, FIXTURE_YEAR, courtSheetFixture } from '../fixtures/judicial-fixtures'
import { childLevelOf, courtLastYear, courtYearBars, courtYearChoices } from './court-model'

describe('courtSheetOf', () => {
  const sheet = courtSheetFixture()

  it('describes the court in its year, the year’s total from the matters’ denominator', () => {
    expect(sheet).toMatchObject({ code: FIXTURE_COURT, level: 'tribunal', county: 'SJ', year: FIXTURE_YEAR, parent: 'CurteadeApelCLUJ' })
    expect(sheet.inYear).toBe(2632)
    expect(sheet.matters.reduce((sum, matter) => sum + matter.count, 0)).toBe(sheet.inYear)
    expect(sheet.total).toBe(9999)
  })

  it('keeps the four counted stages and puts the rest of the year in `other`', () => {
    expect(sheet.stages).toEqual({ fond: 1274, apel: 1104, recurs: 29, contestatie: 190, other: 2632 - 1274 - 1104 - 29 - 190 })
  })

  it('counts its children’s cases of the year, busiest first', () => {
    expect(sheet.children.map((child) => [child.code, child.count])).toEqual([
      ['JudecatoriaZALAU', 4365],
      ['JudecatoriaJIBOU', 2684],
      ['JudecatoriaSIMLEULSILVANIEI', 2617],
    ])
    expect(sheet.partial).toBe(false)
  })

  it('keeps the children without counts, and the sheet partial, when their read failed', () => {
    const failed = courtSheetFixture('failed')
    expect(failed.children.every((child) => child.count === null)).toBe(true)
    expect(failed.partial).toBe(true)
  })

  it('lists its cases without what they are about', () => {
    expect(sheet.cases.rows).toHaveLength(20)
    for (const row of sheet.cases.rows) expect(Object.keys(row)).not.toContain('object')
  })
})

describe('the court’s years', () => {
  const sheet = courtSheetFixture()

  it('offers the whole years of the capture and its last one, never the partial ones', () => {
    expect(courtLastYear(sheet)).toBe(2026)
    expect(courtYearChoices(sheet, 2023)).toEqual([2023, 2024, 2025, 2026])
    expect(courtYearBars(sheet, 2023).filter((bar) => bar.partial).every((bar) => bar.year < 2023)).toBe(true)
  })

  it('knows which levels have courts under them', () => {
    expect(childLevelOf({ courtLevel: 'curte_de_apel' })).toBe('tribunal')
    expect(childLevelOf({ courtLevel: 'tribunal' })).toBe('judecatorie')
    expect(childLevelOf({ courtLevel: 'judecatorie' })).toBeNull()
    expect(childLevelOf({ courtLevel: 'inalta_curte' })).toBeNull()
  })
})
