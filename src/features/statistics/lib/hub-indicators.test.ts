import { describe, expect, it } from 'vitest'
import type { StatisticsHubIndicator } from '@/schemas/statistics'
import { HUB_NATIONAL_SPECS, hubIndicator } from '../test/hub-fixtures'
import { nationalLedeHolds } from './hub-indicators'

const captured = HUB_NATIONAL_SPECS.map(hubIndicator)

function withPoint(code: string, period: string, value: number): StatisticsHubIndicator[] {
  return captured.map((indicator) =>
    indicator.code === code ? { ...indicator, series: [...indicator.series, { period, value }] } : indicator,
  )
}

describe('nationalLedeHolds', () => {
  // The captured histories (`hub-national-series.ts`) must bear the sentence
  // out: a refreshed capture that does not has to change the sentence too.
  it('holds on the captured histories', () => {
    expect(nationalLedeHolds(captured)).toBe(true)
  })

  it('drops the sentence when a live year contradicts it', () => {
    expect(nationalLedeHolds(withPoint('POP201D', '2026', 150_000))).toBe(false)
    expect(nationalLedeHolds(withPoint('TUR104E', '2026', 4_000_000))).toBe(false)
    expect(nationalLedeHolds(withPoint('POP217A', '2026', 69))).toBe(false)
  })

  it('keeps it when a live year bears it out', () => {
    expect(nationalLedeHolds(withPoint('POP201D', '2026', 140_000))).toBe(true)
  })

  it('drops it when a series it speaks for is missing', () => {
    expect(nationalLedeHolds(captured.filter((indicator) => indicator.code !== 'TUR104E'))).toBe(false)
    expect(nationalLedeHolds(captured.filter((indicator) => indicator.code !== 'POP201D'))).toBe(false)
  })
})
