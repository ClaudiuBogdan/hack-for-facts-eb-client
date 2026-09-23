import { fireEvent, render, screen, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { IndicatorToggle } from './indicator-toggle'

describe('IndicatorToggle', () => {
  const OPTIONS = [
    { key: 'viata', label: 'Speranța de viață' },
    { key: 'somaj', label: 'Rata șomajului' },
    { key: 'salariati', label: 'Salariați' },
  ] as const

  it('is one tab stop whose arrows move the choice and the focus together, around the ends', () => {
    const onChange = vi.fn()
    const { rerender } = render(<IndicatorToggle label="Indicatorul de pe hartă" options={OPTIONS} value="somaj" onChange={onChange} />)
    const group = screen.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
    expect(within(group).getByRole('radio', { name: 'Rata șomajului' })).toHaveAttribute('aria-checked', 'true')

    radios[1]!.focus()
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('salariati')
    expect(document.activeElement).toBe(radios[2])

    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('viata')
    expect(document.activeElement).toBe(radios[0])

    // From the last option the arrow wraps to the first, and back; a click picks directly.
    rerender(<IndicatorToggle label="Indicatorul de pe hartă" options={OPTIONS} value="salariati" onChange={onChange} />)
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('viata')
    expect(document.activeElement).toBe(radios[0])
    rerender(<IndicatorToggle label="Indicatorul de pe hartă" options={OPTIONS} value="viata" onChange={onChange} />)
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('salariati')
    expect(document.activeElement).toBe(radios[2])
    fireEvent.click(radios[1]!)
    expect(onChange).toHaveBeenLastCalledWith('somaj')
  })
})
