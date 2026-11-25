import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { RankedTable } from './analytics-charts'

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
