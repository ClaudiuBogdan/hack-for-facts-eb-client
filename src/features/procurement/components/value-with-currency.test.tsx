import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { ValueWithCurrency } from './value-with-currency'

describe('ValueWithCurrency', () => {
  it('formats a RON amount', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: '1171228.00',
          currency: 'RON',
          isRon: true,
          valueSuspect: false,
        }}
      />,
    )
    // Renders an actual amount, not the unavailable state.
    expect(screen.queryByText(/indisponibil/i)).not.toBeInTheDocument()
    expect(
      screen.getByText((content) =>
        content.replace(/\D/g, '').includes('1171228'),
      ),
    ).toBeInTheDocument()
  })

  it('shows the currency code and no native amount for non-RON values', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: null,
          currency: 'EUR',
          isRon: false,
          valueSuspect: false,
        }}
      />,
    )
    expect(screen.getByText('EUR')).toBeInTheDocument()
    expect(screen.getByText(/valoare RON indisponibilă/i)).toBeInTheDocument()
  })

  it('flags a suspect, guarded-out amount even when valueRon is null', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: null,
          currency: 'RON',
          isRon: true,
          valueSuspect: true,
        }}
      />,
    )
    expect(screen.getByText(/atipică/i)).toBeInTheDocument()
  })
})
