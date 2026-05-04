import { describe, expect, it } from 'vitest'
import { getAllMeasureOptions, getMeasureDisplayLabel } from './allocations'

describe('PNRR allocation measure filters', () => {
  it('exposes education measures that appear in the current dataset financing split', () => {
    const values = new Set(getAllMeasureOptions().map((option) => option.value))

    expect(values.has('C15.I13.loan')).toBe(true)
    expect(values.has('C15.I17.loan')).toBe(true)
    expect(values.has('C15.I18.grant')).toBe(true)
  })

  it('labels education measure filters instead of falling back to raw keys', () => {
    expect(getMeasureDisplayLabel('C15.I18.grant')).toContain(
      'Programul de formare și îndrumare pentru managerii și inspectorii școlari',
    )
  })
})
