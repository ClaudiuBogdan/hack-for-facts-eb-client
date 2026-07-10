import { describe, expect, it } from 'vitest'
import {
  SERIES_COLORS,
  formatEmployeesAxis,
  formatRonAxis,
  formatTooltipValue,
  getNetResultBarStyle,
  getNetResultSwatchColor,
  getSeriesSwatchColor,
} from './financial-chart-theme'

describe('getNetResultBarStyle', () => {
  it('paints a profit green and a loss red', () => {
    expect(getNetResultBarStyle(1_000).fill).toBe(SERIES_COLORS.netResultPositive)
    expect(getNetResultBarStyle(-1_000).fill).toBe(SERIES_COLORS.netResultNegative)
  })

  it('treats a break-even year as a profit', () => {
    expect(getNetResultBarStyle(0).fill).toBe(SERIES_COLORS.netResultPositive)
  })

  it('renders a missing or non-finite value as a muted ghost bar', () => {
    expect(getNetResultBarStyle(null).fillOpacity).toBe(0.2)
    expect(getNetResultBarStyle(Number.NaN).fill).toBe('var(--pnrr-muted)')
  })
})

describe('getNetResultSwatchColor', () => {
  it('mutes null and undefined alike', () => {
    expect(getNetResultSwatchColor(null)).toBe('var(--pnrr-muted)')
    expect(getNetResultSwatchColor(undefined)).toBe('var(--pnrr-muted)')
  })
})

describe('getSeriesSwatchColor', () => {
  it('is sign-dependent only for the net-result series', () => {
    expect(getSeriesSwatchColor('turnover', -5)).toBe(SERIES_COLORS.turnover)
    expect(getSeriesSwatchColor('employees', -5)).toBe(SERIES_COLORS.employees)
    expect(getSeriesSwatchColor('netResult', -5)).toBe(SERIES_COLORS.netResultNegative)
  })
})

describe('formatTooltipValue', () => {
  it('renders a loss with a true minus sign, not a hyphen', () => {
    const formatted = formatTooltipValue('netResult', -1234)
    expect(formatted.startsWith('−')).toBe(true)
    expect(formatted.startsWith('-')).toBe(false)
  })

  it('formats employees as a headcount, not money', () => {
    expect(formatTooltipValue('employees', 4200)).not.toMatch(/RON/)
  })

  it('formats turnover as money', () => {
    expect(formatTooltipValue('turnover', 4200)).toMatch(/RON/)
  })
})

describe('axis formatters', () => {
  it('suffixes the money axis with lei and compacts the employee axis', () => {
    expect(formatRonAxis(1_500_000)).toMatch(/lei$/)
    expect(formatEmployeesAxis(1_500)).not.toMatch(/lei/)
  })
})
