import { describe, expect, it } from 'vitest'
import { ECHR_FIRST_WHOLE_YEAR, figuresOf, hudocUrl, judgmentsIn, lodgedYear, median, referenceYear, waitYears, yearsOf, yearState } from './echr-model'
import { ECHR_FIRST_YEAR, ECHR_LAST_YEAR, ECHR_REFERENCE_YEAR } from './echr-years'
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
  it('takes the last whole year as the one before the newest document’s', () => {
    expect(referenceYear(snapshot)).toBe(2025)
  })

  it('marks the years before the capture went whole and its running year, and compares only two whole years', () => {
    expect(yearState(snapshot, ECHR_FIRST_WHOLE_YEAR - 1)).toBe('partial')
    expect(yearState(snapshot, 2025)).toBe('whole')
    expect(yearState(snapshot, 2026)).toBe('running')
    expect(figuresOf(snapshot, 2025).change).toBeCloseTo(-0.5)
    expect(figuresOf(snapshot, 2026).change).toBeNull()
    expect(figuresOf(snapshot, ECHR_FIRST_WHOLE_YEAR).change).toBeNull()
  })

  it('leaves a later judgment in a judged case out of the waits and the joined count, but counts it as a judgment', () => {
    const later: EchrSnapshot = {
      ...snapshot,
      judgments: [{ ecli: 'ECLI:CE:ECHR:2025:1201JUD000000123', date: '2025-12-01', applications: ['1/23', '2/10'], versions: [{ language: 'en', item: '001-3' }], followUp: true }, ...snapshot.judgments],
    }
    expect(figuresOf(later, 2025)).toMatchObject({ joined: 1, followUps: 1, medianWait: 14 })
  })

  it('adds up a year from the snapshot: its judgments, applications, joined judgments and median wait', () => {
    expect(judgmentsIn(snapshot, 2025).map((judgment) => judgment.date)).toEqual(['2025-12-15', '2025-01-01'])
    expect(figuresOf(snapshot, 2025)).toMatchObject({ judgments: 2, applications: 4, joined: 1, communicated: 6, decisions: 5, medianWait: 14 })
  })
})

describe('the snapshot', () => {
  it('counts an application once, in the year of its first judgment; a later judgment in a judged case decides none anew', () => {
    const judged = new Set<string>()
    const first = new Map<number, number>()
    for (const judgment of [...ECHR_SNAPSHOT.judgments].reverse()) {
      const fresh = judgment.applications.filter((application) => !judged.has(application))
      // Every judgment decides either only new applications or only judged ones.
      expect([0, judgment.applications.length], judgment.ecli).toContain(fresh.length)
      expect(judgment.followUp === true, judgment.ecli).toBe(fresh.length === 0)
      const year = Number(judgment.date.slice(0, 4))
      first.set(year, (first.get(year) ?? 0) + fresh.length)
      for (const application of judgment.applications) judged.add(application)
    }
    for (const entry of ECHR_SNAPSHOT.years) expect(entry.applications, String(entry.year)).toBe(first.get(entry.year) ?? 0)
  })

  it('agrees with the years the route knows it by, every year between its first and last held', () => {
    expect(referenceYear(ECHR_SNAPSHOT)).toBe(ECHR_REFERENCE_YEAR)
    expect(yearsOf(ECHR_SNAPSHOT)).toEqual(Array.from({ length: ECHR_LAST_YEAR - ECHR_FIRST_YEAR + 1 }, (_, index) => ECHR_FIRST_YEAR + index))
  })

  it('holds one judgment per ECLI, each with a HUDOC document, its years adding up to its list', () => {
    const eclis = new Set(ECHR_SNAPSHOT.judgments.map((judgment) => judgment.ecli))
    expect(eclis.size).toBe(ECHR_SNAPSHOT.judgments.length)
    expect(ECHR_SNAPSHOT.judgments.every((judgment) => judgment.versions.length > 0 && judgment.applications.length > 0)).toBe(true)
    for (const entry of ECHR_SNAPSHOT.years) expect(judgmentsIn(ECHR_SNAPSHOT, entry.year).length).toBe(entry.judgments)
  })

  it('carries no name: an application is a number, a version a HUDOC item', () => {
    for (const judgment of ECHR_SNAPSHOT.judgments) {
      expect(Object.keys(judgment).sort()).toEqual(expect.arrayContaining(['applications', 'date', 'ecli', 'versions']))
      expect(Object.keys(judgment).every((key) => ['alsoAgainst', 'applications', 'date', 'ecli', 'followUp', 'versions'].includes(key))).toBe(true)
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
