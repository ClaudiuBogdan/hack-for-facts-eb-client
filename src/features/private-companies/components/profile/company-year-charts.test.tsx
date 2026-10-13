import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CombinedYears, YearBars, type BarSeries } from './company-year-charts'

/**
 * The annual charts keep a gap a gap and a loss under the line, and read a
 * year to the keyboard as they do to a pointer.
 */

const format = (value: number) => String(value)

function bars(series: readonly BarSeries[], extra: Partial<Parameters<typeof YearBars>[0]> = {}) {
  return render(<YearBars years={[2021, 2022, 2023, 2024]} series={series} format={format} label="Rezultat net" emptyLabel={() => 'Niciun bilanț'} {...extra} />)
}

const PROFIT: BarSeries = { key: 'profit', label: 'Profit net', values: [100, null, 50, null], fill: 'fill-primary', swatch: 'bg-primary' }
const LOSS: BarSeries = { key: 'loss', label: 'Pierdere netă', values: [null, null, null, -40], fill: 'fill-destructive/70', swatch: 'bg-destructive/70' }

describe('YearBars', () => {
  it('shades a year with nothing in it rather than drawing a zero, unless an empty year is a real zero', () => {
    const { container, unmount } = bars([PROFIT, LOSS])
    // 2022 alone has neither a profit nor a loss.
    expect(container.querySelectorAll('rect.fill-muted\\/60')).toHaveLength(1)
    expect(container.querySelectorAll('rect.fill-primary')).toHaveLength(2)
    unmount()
    const quiet = bars([PROFIT, LOSS], { shadeEmpty: false })
    expect(quiet.container.querySelectorAll('rect.fill-muted\\/60')).toHaveLength(0)
  })

  it('hangs a loss under the zero line', () => {
    const { container } = bars([PROFIT, LOSS])
    // The emphasised gridline is zero when the axis goes below it.
    const zero = container.querySelector('line.stroke-foreground\\/40')
    const loss = container.querySelector('rect.fill-destructive\\/70') as SVGRectElement
    expect(loss).not.toBeNull()
    // The loss starts at zero and goes down: its top is the zero line.
    expect(Number(loss.getAttribute('y'))).toBeCloseTo(Number(zero?.getAttribute('y1')), 0)
    expect(Number(loss.getAttribute('height'))).toBeGreaterThan(0)
  })

  it('reads the years with the arrow keys, Home and End, and lets go on Escape', () => {
    bars([PROFIT, LOSS])
    const slider = screen.getByRole('slider', { name: 'Rezultat net, 2021–2024' })
    // At rest the newest year speaks.
    expect(slider).toHaveAttribute('aria-valuetext', '2024, Pierdere netă -40')
    fireEvent.focus(slider)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(slider).toHaveAttribute('aria-valuetext', '2023, Profit net 50')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuetext', '2021, Profit net 100')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    // A year with nothing in it says what that means.
    expect(slider).toHaveAttribute('aria-valuetext', '2022, Niciun bilanț')
    fireEvent.keyDown(slider, { key: 'End' })
    expect(slider).toHaveAttribute('aria-valuenow', '3')
    expect(document.querySelector('[data-chart-tooltip]')?.textContent).toContain('2024')
    fireEvent.keyDown(slider, { key: 'Escape' })
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull()
  })

  it('labels whole-number values with whole ticks only', () => {
    const people: BarSeries = { key: 'people', label: 'Salariați', values: [0, 1, 1, 2], fill: 'fill-primary', swatch: 'bg-primary' }
    const { container } = bars([people], { integer: true, legend: false })
    const ticks = [...container.querySelectorAll('span.right-full')].map((tick) => tick.textContent)
    expect(ticks.length).toBeGreaterThan(0)
    expect(ticks.every((tick) => Number.isInteger(Number(tick)))).toBe(true)
  })
})

describe('CombinedYears', () => {
  // 2022: an admitted profit beside a held result; 2023: a net result; 2024: nothing comparable; 2025: a negative net result.
  const kinds = ['profit', 'result', null, 'result'] as const
  const chart = () =>
    render(
      <CombinedYears
        years={[2022, 2023, 2024, 2025]}
        turnover={[900, 1_000, null, 2_000]}
        net={[120, 100, null, -50]}
        employees={[6, 5, null, 4]}
        netLabel={(index) => (kinds[index] === 'profit' ? 'Profit net' : 'Rezultat net')}
        profitOnly={(index) => kinds[index] === 'profit'}
        labels={{ turnover: 'Cifra de afaceri', net: 'Rezultat net', loss: 'Pierdere netă', profit: 'Profit net (rezultatul net reținut)', employees: 'Salariați' }}
        formatTick={format}
        formatMoney={format}
        formatCount={format}
        emptyLabel={() => 'Fără valori comparabile pentru acest an'}
        label="Toate"
      />,
    )

  it('names each year’s bottom line by its own metric — a negative result is never „Profit net"', () => {
    chart()
    const slider = screen.getByRole('slider', { name: 'Toate, 2022–2025' })
    expect(slider).toHaveAttribute('aria-valuetext', '2025, Cifra de afaceri 2000, Rezultat net -50, Salariați 4')
    fireEvent.focus(slider)
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(slider).toHaveAttribute('aria-valuetext', '2024, Fără valori comparabile pentru acest an')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuetext', '2022, Cifra de afaceri 900, Profit net 120, Salariați 6')
  })

  it('draws a held result’s profit apart from the results, in the legend and the bars', () => {
    chart()
    // The negative result in the loss colour; the profit outlined, never filled as a result.
    expect(document.querySelectorAll('rect.fill-destructive\\/70')).toHaveLength(1)
    expect(document.querySelectorAll('rect[data-net-kind="profit"]')).toHaveLength(1)
    expect(document.querySelectorAll('rect[data-net-kind="result"]')).toHaveLength(2)
    const legend = document.querySelector('figcaption')?.textContent ?? ''
    expect(legend).toContain('Rezultat net')
    expect(legend).toContain('Profit net (rezultatul net reținut)')
    expect(legend).toContain('Pierdere netă')
  })

  it('names the year being read in its tooltip by its own metric', () => {
    chart()
    const slider = screen.getByRole('slider', { name: 'Toate, 2022–2025' })
    fireEvent.focus(slider)
    fireEvent.keyDown(slider, { key: 'Home' })
    // The reading's figures: the one list in the chart while a year is read.
    const reading = () => within(slider.querySelector('dl') as HTMLElement)
    expect(reading().getByText('Profit net')).toBeInTheDocument()
    expect(reading().queryByText('Rezultat net')).toBeNull()
    fireEvent.keyDown(slider, { key: 'End' })
    expect(reading().getByText('Rezultat net')).toBeInTheDocument()
    expect(reading().queryByText('Profit net')).toBeNull()
  })
})
