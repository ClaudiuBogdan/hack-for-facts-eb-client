import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { FactTile } from './fact-tile'

const tile = (props: Parameters<typeof FactTile>[0]) =>
  render(
    <dl>
      <FactTile {...props} />
    </dl>,
  )

describe('FactTile', () => {
  it('keeps a short unit on the number’s line', () => {
    tile({ label: 'Ultima valoare', value: '1,9', unit: '%', caption: 'în mai 2026', valueTestId: 'value' })
    expect(screen.getByTestId('value')).toHaveTextContent('1,9 %')
    expect(screen.getByText('în mai 2026')).toBeInTheDocument()
  })

  it('opens the caption with a unit that would not fit, so the tiles keep one height', () => {
    tile({ label: 'Ultima valoare', value: '21.646.220', unit: 'persoane', caption: 'în 2026', valueTestId: 'value' })
    const value = screen.getByTestId('value')
    expect(value).toHaveTextContent(/^21\.646\.220$/)
    // Still one phrase in reading order: number, unit, period.
    expect(value.nextElementSibling).toHaveTextContent('persoaneîn 2026')
  })

  it('moves a unit that fits the budget in characters but not a phone’s tile', () => {
    tile({ label: 'Ultima valoare', value: '123.456', unit: 'număr', caption: 'în 2024', valueTestId: 'value' })
    expect(screen.getByTestId('value')).toHaveTextContent(/^123\.456$/)
    expect(screen.getByTestId('value').nextElementSibling).toHaveTextContent('numărîn 2024')
  })

  it('keeps a word unit beside a short number', () => {
    tile({ label: 'Ultima valoare', value: '10', unit: 'număr', caption: 'în 2024', valueTestId: 'value' })
    expect(screen.getByTestId('value')).toHaveTextContent('10 număr')
  })

  it('gives a long unit its own line even without a caption', () => {
    tile({ label: 'medie', value: '321.954', unit: 'Miliarde lei', valueTestId: 'value' })
    expect(screen.getByTestId('value').nextElementSibling).toHaveTextContent('Miliarde lei')
  })

  it('draws no caption line for a tile with nothing under its number', () => {
    tile({ label: 'medie', value: '2,58', valueTestId: 'value' })
    expect(screen.getByTestId('value').nextElementSibling).toBeNull()
    expect(screen.getByRole('term')).toHaveTextContent('medie')
    expect(screen.getByRole('definition')).toHaveTextContent('2,58')
  })
})
