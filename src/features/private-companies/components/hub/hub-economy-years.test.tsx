import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { gapReasonLabel } from '../../lib/company-analytics-text'
import type { HubFiscalYear } from '../../lib/hub-snapshot-types'
import { HubEconomyChart } from './hub-economy-years'

/**
 * The years chart draws what each year is: a loss below the zero line, an
 * explicit zero as a mark on it, a year without a value as a gap with its
 * reason (never a bar), and a last year with fewer filers as possibly
 * incomplete — hatched, said, not compared, and not where the reading rests.
 */

const year = (value: number, sum: number | null, filers = 100, gap: HubFiscalYear['netResult']['gap'] = null): HubFiscalYear => {
  const measure = { sum, gap: sum === null ? gap : null, reported: sum === null ? 0 : filers }
  return { year: value, filers, turnover: measure, netResult: measure, employees: measure }
}

const YEARS: readonly HubFiscalYear[] = [
  year(2019, 100),
  year(2020, -20),
  year(2021, 0),
  year(2022, null, 100, 'NOT_ADMITTED'),
  year(2023, 50, 80),
]

describe('HubEconomyChart', () => {
  it('rests on the last whole year, and says why a year has no value', () => {
    render(<HubEconomyChart years={YEARS} measure="netResult" />)
    const slider = screen.getByRole('slider')
    // 2023 has fewer filers than 2022: possibly incomplete, so the reading rests on 2022.
    expect(slider.getAttribute('aria-valuenow')).toBe('3')
    expect(slider.getAttribute('aria-valuetext')).toContain(gapReasonLabel('NOT_ADMITTED'))
    expect(slider.getAttribute('aria-valuetext')).not.toContain('0 lei')
  })

  it('hangs a loss below zero, marks a zero on the line, draws no bar for a gap', () => {
    const { container } = render(<HubEconomyChart years={YEARS} measure="netResult" />)
    // The plot's bars: not the hatch's pattern, not the legend's swatch.
    const bars = [...container.querySelectorAll('[role=slider] svg rect:not(pattern rect)')]
    // 100, -20 and 50: three bars; the zero and the gap are lines on the zero line.
    expect(bars).toHaveLength(3)
    const [gain, loss] = bars.map((bar) => ({ y: Number(bar.getAttribute('y')), height: Number(bar.getAttribute('height')) }))
    // The gain ends at the zero line, the loss starts there; the explicit zero is a mark on that line.
    expect((gain?.y ?? 0) + (gain?.height ?? 0)).toBeCloseTo(loss?.y ?? -1)
    const marks = [...container.querySelectorAll('[role=slider] svg line')].filter((line) => line.getAttribute('class')?.includes('stroke-foreground/60'))
    expect(marks.map((line) => Number(line.getAttribute('y1')))).toEqual([loss?.y])
    expect(container.textContent).toContain('Pierdere netă, sub zero')
  })

  it('draws a tiny value on its own side of zero', () => {
    const tiny = [year(2019, 1000), year(2020, 1), year(2021, -1000)]
    const { container } = render(<HubEconomyChart years={tiny} measure="netResult" />)
    const [, small, loss] = [...container.querySelectorAll('[role=slider] svg rect:not(pattern rect)')].map((bar) => ({ y: Number(bar.getAttribute('y')), height: Number(bar.getAttribute('height')) }))
    // At least a pixel tall, ending on the zero line, where the loss begins.
    expect(small?.height).toBeGreaterThanOrEqual(1)
    expect((small?.y ?? 0) + (small?.height ?? 0)).toBeCloseTo(loss?.y ?? -1)
  })

  it('does not compare the possibly incomplete year, and centres every year label under its bar', () => {
    const { container } = render(<HubEconomyChart years={YEARS} measure="turnover" />)
    const slider = screen.getByRole('slider')
    fireEvent.focus(slider)
    fireEvent.keyDown(slider, { key: 'End' })
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^2023, /)
    expect(slider.getAttribute('aria-valuetext')).not.toContain('față de anul precedent')
    const labels = [...container.querySelectorAll('figure > div > div[aria-hidden=true] > span')]
    expect(labels.length).toBeGreaterThan(1)
    expect(labels.every((label) => label.className.includes('-translate-x-1/2'))).toBe(true)
  })

  it('says the last year is possibly incomplete', () => {
    const { container } = render(<HubEconomyChart years={YEARS} measure="turnover" />)
    expect(container.textContent).toContain('2023: mai puține bilanțuri decât în 2022, posibil incomplet')
  })
})
