import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { NgoYearChart } from './ngo-year-chart'

vi.mock('@/features/statistics/lib/format', () => ({ activeNumberLocale: () => 'ro-RO' }))

const POINTS = [
  { year: 2021, value: 5_020 },
  { year: 2022, value: 5_043 },
  { year: 2023, value: 4_915 },
  { year: 2024, value: 5_008 },
  { year: 2025, value: 5_040 },
]

function renderChart() {
  render(<NgoYearChart points={POINTS} label="Înscrieri în registru, pe an" unit="organizații înscrise" />)
  return screen.getByRole('slider', { name: 'Înscrieri în registru, pe an, 2021–2025' })
}

describe('NgoYearChart', () => {
  it('is a slider over the years whose value is the latest year’s count at rest', () => {
    const slider = renderChart()
    expect(slider).toHaveAttribute('aria-valuemax', '4')
    expect(slider).toHaveAttribute('aria-valuetext', '2025: 5.040 organizații înscrise')
    expect(screen.getByText('2021')).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
  })

  it('reads the years from the keyboard, opening on the latest', () => {
    const slider = renderChart()
    fireEvent.focus(slider)
    expect(screen.getByText('5.040')).toBeInTheDocument()
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(slider).toHaveAttribute('aria-valuetext', '2024: 5.008 organizații înscrise')
    expect(screen.getByText('5.008')).toBeInTheDocument()
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    fireEvent.keyDown(slider, { key: 'Escape' })
    expect(screen.queryByText('5.020')).not.toBeInTheDocument()
  })

  it('draws the value axis from zero in round steps', () => {
    renderChart()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('6.000')).toBeInTheDocument()
  })

  it('writes a figure and its ticks as it is told, with no unit word where the figure carries its own', () => {
    render(
      <NgoYearChart
        points={[
          { year: 2024, value: 32_000_000_000 },
          { year: 2025, value: 33_500_000_000 },
        ]}
        label="Veniturile ONG-urilor pe an"
        unit=""
        format={(value) => `${value / 1e9} mld. lei`}
        formatTick={(value) => `${value / 1e9} mld.`}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Veniturile ONG-urilor pe an, 2024–2025' })
    expect(slider).toHaveAttribute('aria-valuetext', '2025: 33.5 mld. lei')
    expect(screen.getByText('40 mld.')).toBeInTheDocument()
  })

  it('draws a year that is not final dashed, and says so in its reading', () => {
    render(
      <NgoYearChart
        points={POINTS}
        label="Venituri"
        unit="lei"
        provisional={{ years: new Set([2025]), label: 'prima publicare' }}
      />,
    )
    const slider = screen.getByRole('slider', { name: 'Venituri, 2021–2025' })
    expect(slider).toHaveAttribute('aria-valuetext', '2025: 5.040 lei (prima publicare)')
    expect(slider.querySelectorAll('[data-provisional]')).toHaveLength(1)
    fireEvent.focus(slider)
    expect(screen.getByText('prima publicare')).toBeInTheDocument()
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(slider).toHaveAttribute('aria-valuetext', '2024: 5.008 lei')
  })
})
