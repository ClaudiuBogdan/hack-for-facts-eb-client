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
    type Key = (typeof OPTIONS)[number]['key']
    const onChange = vi.fn<(key: Key) => void>()
    const toggle = (value: Key) => (
      <IndicatorToggle label="Indicatorul de pe hartă" options={OPTIONS} value={value} onChange={onChange} />
    )
    const { rerender } = render(toggle('somaj'))
    const group = screen.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' })
    const radios = within(group).getAllByRole('radio')
    const state = () => radios.map((radio) => [radio.getAttribute('aria-checked'), radio.getAttribute('tabindex')].join(':'))
    expect(state()).toEqual(['false:-1', 'true:0', 'false:-1'])

    // Each key picks the neighbour and focuses it; the page writes the value
    // back, and the checked radio — the one tab stop — follows.
    radios[1]!.focus()
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('salariati')
    expect(document.activeElement).toBe(radios[2])
    rerender(toggle('salariati'))
    expect(state()).toEqual(['false:-1', 'false:-1', 'true:0'])

    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('somaj')
    expect(document.activeElement).toBe(radios[1])
    rerender(toggle('somaj'))
    expect(state()).toEqual(['false:-1', 'true:0', 'false:-1'])

    // Around the ends, both ways.
    rerender(toggle('salariati'))
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('viata')
    expect(document.activeElement).toBe(radios[0])
    rerender(toggle('viata'))
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('salariati')
    expect(document.activeElement).toBe(radios[2])

    // A click picks directly.
    fireEvent.click(radios[1]!)
    expect(onChange).toHaveBeenLastCalledWith('somaj')
  })
})
