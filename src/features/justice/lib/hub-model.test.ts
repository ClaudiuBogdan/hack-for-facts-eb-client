import { describe, expect, it } from 'vitest'
import { JUDICIAL_COURT_LEVELS } from '@/schemas/judicial'
import { JUSTICE_HUB_SNAPSHOT as snapshot } from './hub-snapshot'
import {
  courtsOf,
  echrJudgmentsTotal,
  firstWholeYear,
  hubYearBars,
  judecatoriiPerThousand,
  lastCaptureYear,
  levelCount,
  mattersIn,
  stageMatrix,
  stageTotal,
} from './hub-model'
import { STAGE_KEYS } from './judicial-model'

describe('the front door snapshot', () => {
  it('describes the year before the capture stopped, its levels adding up to the year', () => {
    expect(snapshot.year).toBe(lastCaptureYear(snapshot) - 1)
    const levels = JUDICIAL_COURT_LEVELS.reduce((sum, level) => sum + levelCount(snapshot, level), 0)
    expect(levels).toBe(snapshot.cases.inYear)
    expect(snapshot.courts).toHaveLength(247)
  })
})

describe('mattersIn', () => {
  it('lists each matter once, the ÎCCJ labels merged into the Portal codes, adding up to the year', () => {
    const matters = mattersIn(snapshot, 'toate')
    expect(new Set(matters.map((matter) => matter.key)).size).toBe(matters.length)
    expect(matters.length).toBeLessThanOrEqual(12)
    expect(matters.reduce((sum, matter) => sum + matter.count, 0)).toBe(snapshot.cases.inYear)
  })
})

describe('stageMatrix', () => {
  it('adds every level’s row up to the level’s total, the rest of the stages in `other`', () => {
    const matrix = stageMatrix(snapshot)
    for (const level of JUDICIAL_COURT_LEVELS) {
      const row = matrix[level]
      if (!row) continue
      const sum = [...STAGE_KEYS, 'other' as const].reduce((total, key) => total + row[key], 0)
      expect(sum).toBe(levelCount(snapshot, level))
    }
    expect(stageTotal(snapshot, 'apel')).toBeGreaterThan(0)
  })
})

describe('courtsOf', () => {
  it('ranks a level’s courts by the year’s cases, their shares adding up to the level', () => {
    const courts = courtsOf(snapshot, 'tribunal')
    expect(courts[0]?.code).toBe('TribunalulBUCURESTI')
    expect(courts.reduce((sum, court) => sum + court.share, 0)).toBeCloseTo(1)
    for (let index = 1; index < courts.length; index += 1) expect(courts[index - 1]!.count).toBeGreaterThanOrEqual(courts[index]!.count)
  })
})

describe('judecatoriiPerThousand', () => {
  const population = { year: snapshot.year, national: 1_000_000, byCounty: new Map([['CJ', 100_000], ['B', 200_000], ['XX', 5]]) }

  it('rates the county’s judecătorii and the country on the same basis', () => {
    const layer = judecatoriiPerThousand(snapshot, population)
    const cluj = snapshot.courts.filter((court) => court.level === 'judecatorie' && court.county === 'CJ').reduce((sum, court) => sum + court.casesInYear, 0)
    expect(layer?.values.find((county) => county.code === 'CJ')?.value).toBeCloseTo((cluj / 100_000) * 1000)
    expect(layer?.national).toBeCloseTo((levelCount(snapshot, 'judecatorie') / 1_000_000) * 1000)
    // A county with residents and no judecătorie is missing, never a zero.
    expect(layer?.missingCounties).toEqual(['XX'])
  })

  it('draws no rate when the population is of another year', () => {
    expect(judecatoriiPerThousand(snapshot, { ...population, year: snapshot.year - 1 })).toBeNull()
  })
})

describe('the years and decisions', () => {
  it('marks the years before the capture went whole as partial and the last one as running', () => {
    const bars = hubYearBars(snapshot)
    expect(bars.filter((bar) => bar.partial).every((bar) => bar.year < firstWholeYear(snapshot))).toBe(true)
    expect(bars[bars.length - 1]).toMatchObject({ year: lastCaptureYear(snapshot), running: true })
  })

  it('counts the ECHR judgments once each', () => {
    expect(echrJudgmentsTotal(snapshot)).toBe(snapshot.decisions.echrJudgments.reduce((sum, entry) => sum + entry.count, 0))
  })
})
