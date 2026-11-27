import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { RankedTable, StackedYears } from './analytics-charts'

const rows = [
  { key: 'a', label: 'stabilesc reguli', n: 72_995, share: 72_995 / 227_202 },
  { key: 'b', label: 'acte individuale', n: 39_925, share: 39_925 / 227_202 },
  { key: 'c', label: 'procedură', n: 25_117, share: 25_117 / 227_202 },
]

function barWidths(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('.bg-chart-1')].map((bar) => bar.style.width)
}

describe('RankedTable', () => {
  it('draws each bar as the share printed beside it, not against the first row', () => {
    const { container } = render(<RankedTable rows={rows} total={227_202} limit={30} caption="Felul" denominator="" />)
    // 72.995 of 227.202 is 32,1%: the first bar is a third of the track, not the whole of it
    expect(barWidths(container)).toEqual(['32.1%', '17.6%', '11.1%'])
    expect(screen.getByText('32,1%')).toBeInTheDocument()
  })

  it('says every row is shown when nothing is left out', () => {
    render(<RankedTable rows={rows} total={138_037} limit={30} caption="Felul" denominator="" />)
    expect(screen.getByText(/Toate cele 3\./)).toBeInTheDocument()
  })

  it('states the acts outside the rows when the API cut the list', () => {
    render(<RankedTable rows={rows} total={227_202} limit={30} caption="Emitent" denominator="" truncated />)
    // 227.202 − (72.995 + 39.925 + 25.117) = 89.165 acts at the values not listed
    expect(screen.getByText(/Primele 3; alte 89\.165 acte la ceilalți\./)).toBeInTheDocument()
  })

  it('states the acts outside the rows when the page shows fewer rows than it has', () => {
    render(<RankedTable rows={rows} total={227_202} limit={2} caption="Felul" denominator="" />)
    // 227.202 − (72.995 + 39.925) = 114.282
    expect(screen.getByText(/Primele 2; alte 114\.282 acte la ceilalți\./)).toBeInTheDocument()
  })
})

describe('StackedYears — the hovered year in a tooltip (owner, 27 November 2026)', () => {
  const years = [2020, 2021, 2022, 2023, 2024, 2025].map((year, i) => ({ year, values: [100 + i, 20, 5] }))
  const labels = ['stabilesc reguli', 'acte individuale', 'altele']
  const draw = () => render(<StackedYears years={years} labels={labels} caption="Acte pe an" plain pendingFrom={{ year: 2025, label: 'an în curs' }} />)
  const tip = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-years-tooltip]')
  const column = (year: number) => screen.getByLabelText(new RegExp(`^${String(year)}: `))

  it('shows nothing until a year is pointed at, and no readout line beside the caption', () => {
    const { container } = draw()
    expect(tip(container)).toBeNull()
    expect(screen.queryByText(/Indică un an/)).toBeNull()
  })

  it('gives the pointed year, its total and each class top to bottom, beside the column on the side with room', () => {
    const { container } = draw()
    fireEvent.pointerEnter(column(2021), { pointerType: 'mouse' })
    const box = tip(container)
    expect(box).not.toBeNull()
    expect(box).toHaveAttribute('aria-hidden', 'true')
    expect(box?.querySelector('p')?.textContent).toBe('2021126 acte')
    expect([...(box?.querySelectorAll('li') ?? [])].map((li) => li.textContent)).toEqual(['altele5', 'acte individuale20', 'stabilesc reguli101'])
    // left half: to the right of the second column (from `sm`; a phone spans it under the chart)
    expect(box?.style.getPropertyValue('--tip-left')).toMatch(/^calc\(33\.33\d*% \+ 8px\)$/)
    expect(box).toHaveClass('sm:left-[var(--tip-left)]', 'inset-x-0', 'top-[calc(100%+0.25rem)]')
    // the same figures for assistive tech, said once
    expect(screen.getByText('2021: 126 acte · stabilesc reguli 101 · acte individuale 20 · altele 5')).toHaveClass('sr-only')
    // right half: to the left of the column; the year still being counted says so
    fireEvent.pointerEnter(column(2025), { pointerType: 'mouse' })
    expect(tip(container)?.style.getPropertyValue('--tip-right')).toMatch(/^calc\(16\.66\d*% \+ 8px\)$/)
    expect(tip(container)).toHaveClass('sm:right-[var(--tip-right)]')
    expect(tip(container)?.textContent).toContain('an în curs')
  })

  it('goes when the mouse leaves; stays after a tap until the focus leaves the chart; comes with the keyboard', () => {
    const { container } = draw()
    const list = container.querySelector('ol') as HTMLElement
    fireEvent.pointerEnter(column(2022), { pointerType: 'mouse' })
    fireEvent.pointerLeave(list, { pointerType: 'mouse' })
    expect(tip(container)).toBeNull()
    // a tap: the pointer leaves at once, the tooltip stays
    fireEvent.pointerEnter(column(2022), { pointerType: 'touch' })
    fireEvent.pointerLeave(list, { pointerType: 'touch' })
    expect(tip(container)).not.toBeNull()
    fireEvent.blur(column(2022), { relatedTarget: null })
    expect(tip(container)).toBeNull()
    // the keyboard
    fireEvent.focus(column(2023))
    expect(tip(container)?.querySelector('p')?.textContent).toContain('2023')
  })
})
