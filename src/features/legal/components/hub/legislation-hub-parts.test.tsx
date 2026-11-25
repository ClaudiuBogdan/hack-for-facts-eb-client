import { render } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { BarRows } from './legislation-hub-parts'

function barWidths(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > span')].map((bar) => bar.style.width)
}

describe('BarRows', () => {
  it('draws each bar on a track of 0–100% of all acts, so its length is the share printed beside it', () => {
    const rows = [
      { key: 'rule-making', label: 'stabilesc reguli', acts: 72_995 },
      { key: 'individual', label: 'acte individuale', acts: 39_925 },
    ]
    const { container, getByText } = render(<BarRows rows={rows} total={227_202} />)
    // 72.995 of 227.202 is 32,1%: a third of the track, not the whole of it (no rescaling to the first row)
    expect(barWidths(container)).toEqual(['32.1%', '17.6%'])
    expect(getByText('32,1%')).toBeInTheDocument()
    expect(getByText('17,6%')).toBeInTheDocument()
  })

  it('draws no bar without a total', () => {
    const { container, getByText } = render(<BarRows rows={[{ key: 'a', label: 'a', acts: 5 }]} total={0} />)
    expect(barWidths(container)).toEqual(['0%'])
    expect(getByText('—')).toBeInTheDocument()
  })
})
