import { describe, expect, it } from 'vitest'
import { buildChallengeEntityAnalysisTrendPeriod } from './challenge-entity-analysis-queries'

describe('buildChallengeEntityAnalysisTrendPeriod', () => {
  it('extends yearly trend periods through 2026 when that year is available', () => {
    expect(
      buildChallengeEntityAnalysisTrendPeriod({
        periodType: 'YEAR',
        selectedYear: 2026,
      }),
    ).toEqual({
      type: 'YEAR',
      selection: {
        interval: {
          start: '2016',
          end: '2026',
        },
      },
    })
  })
})
