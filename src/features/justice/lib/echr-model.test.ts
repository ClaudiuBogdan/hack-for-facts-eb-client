import { describe, expect, it } from 'vitest'
import { askedYear, ECHR_FIRST_WHOLE_YEAR, figuresOf, hudocUrl, judgmentsIn, lodgedYear, median, referenceYear, waitYears, yearState } from './echr-model'
import { ECHR_SNAPSHOT } from './echr-snapshot'
import type { EchrSnapshot } from './echr-snapshot-types'

const snapshot: EchrSnapshot = {
  capturedAt: '2026-10-07',
  newest: '2026-07-16',
  years: [
    { year: 2009, judgments: 2, applications: 2, decisions: 1, communicated: 0 },
    { year: 2010, judgments: 4, applications: 9, decisions: 3, communicated: 2 },
    { year: 2025, judgments: 2, applications: 4, decisions: 5, communicated: 6 },
    { year: 2024, judgments: 4, applications: 4, decisions: 1, communicated: 1 },
    { year: 2026, judgments: 1, applications: 1, decisions: 0, communicated: 0 },
  ],
  judgments: [
    { ecli: 'ECLI:CE:ECHR:2026:0716JUD007406117', date: '2026-07-16', applications: ['74061/17'], versions: [{ language: 'en', item: '001-251188' }] },
    { ecli: 'ECLI:CE:ECHR:2025:1215JUD001691521', date: '2025-12-15', applications: ['16915/21', '3/24', '1/99'], versions: [{ language: 'fr', item: '001-1' }] },
    { ecli: 'ECLI:CE:ECHR:2025:0101JUD000000123', date: '2025-01-01', applications: ['1/23'], versions: [{ language: 'en', item: '001-2' }] },
  ],
}

describe('the waits', () => {
  it('reads the year an application was lodged from its number, the Court’s first years in the 1900s', () => {
    expect(lodgedYear('6946/03')).toBe(2003)
    expect(lodgedYear('31153/98')).toBe(1998)
    expect(lodgedYear('12/59')).toBe(1959)
    expect(lodgedYear('Popescu')).toBeNull()
    expect(lodgedYear('1/2003')).toBeNull()
  })

  it('counts from the oldest application a judgment decides, and the median of the years', () => {
    expect(waitYears({ date: '2025-12-15', applications: ['16915/21', '3/24', '1/99'] })).toBe(26)
    expect(waitYears({ date: '2025-12-15', applications: ['x'] })).toBeNull()
    expect(median([4, 1, 3])).toBe(3)
    expect(median([1, 2, 3, 6])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('the years', () => {
  it('describes the last whole year by default, and only a year the snapshot holds', () => {
    expect(referenceYear(snapshot)).toBe(2025)
    expect(askedYear(snapshot, undefined)).toBe(2025)
    expect(askedYear(snapshot, '2024')).toBe(2024)
    expect(askedYear(snapshot, 2026)).toBe(2026)
    expect(askedYear(snapshot, '2019')).toBe(2025)
    expect(askedYear(snapshot, 'Ion Popescu')).toBe(2025)
  })

  it('marks the years before the capture went whole and its running year, and compares only two whole years', () => {
    expect(yearState(snapshot, ECHR_FIRST_WHOLE_YEAR - 1)).toBe('partial')
    expect(yearState(snapshot, 2025)).toBe('whole')
    expect(yearState(snapshot, 2026)).toBe('running')
    expect(figuresOf(snapshot, 2025).change).toBeCloseTo(-0.5)
    expect(figuresOf(snapshot, 2026).change).toBeNull()
    expect(figuresOf(snapshot, ECHR_FIRST_WHOLE_YEAR).change).toBeNull()
  })

  it('adds up a year from the snapshot: its judgments, applications, joined judgments and median wait', () => {
    expect(judgmentsIn(snapshot, 2025).map((judgment) => judgment.date)).toEqual(['2025-12-15', '2025-01-01'])
    expect(figuresOf(snapshot, 2025)).toMatchObject({ judgments: 2, applications: 4, joined: 1, communicated: 6, decisions: 5, medianWait: 14 })
  })
})

describe('the snapshot', () => {
  it('holds one judgment per ECLI, each with a HUDOC document, its years adding up to its list', () => {
    const eclis = new Set(ECHR_SNAPSHOT.judgments.map((judgment) => judgment.ecli))
    expect(eclis.size).toBe(ECHR_SNAPSHOT.judgments.length)
    expect(ECHR_SNAPSHOT.judgments.every((judgment) => judgment.versions.length > 0 && judgment.applications.length > 0)).toBe(true)
    for (const entry of ECHR_SNAPSHOT.years) expect(judgmentsIn(ECHR_SNAPSHOT, entry.year).length).toBe(entry.judgments)
  })

  it('carries no name: an application is a number, a version a HUDOC item', () => {
    for (const judgment of ECHR_SNAPSHOT.judgments) {
      expect(Object.keys(judgment).sort()).toEqual(expect.arrayContaining(['applications', 'date', 'ecli', 'versions']))
      expect(Object.keys(judgment).every((key) => ['alsoAgainst', 'applications', 'date', 'ecli', 'versions'].includes(key))).toBe(true)
      expect(judgment.applications.every((application) => /^\d+\/\d{2}$/u.test(application))).toBe(true)
      expect(judgment.versions.every((version) => /^001-\d+$/u.test(version.item))).toBe(true)
    }
  })
})

describe('the link', () => {
  it('opens HUDOC in the document’s language', () => {
    expect(hudocUrl({ language: 'en', item: '001-251188' })).toBe('https://hudoc.echr.coe.int/eng?i=001-251188')
    expect(hudocUrl({ language: 'fr', item: '001-97684' })).toBe('https://hudoc.echr.coe.int/fre?i=001-97684')
  })
})
