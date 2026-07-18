import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { ValueWithCurrency } from './value-with-currency'
import type { ValueResolution } from '@/schemas/procurement'

/** A value resolution with sensible defaults, overridable per test. */
const resolution = (over: Partial<ValueResolution>): ValueResolution => ({
  valueState: 'source_missing',
  valueStateRule: null,
  valueAccepted: false,
  valueRonComparable: null,
  valueComparableBasis: null,
  valueRulesVersion: 2,
  valueResolvedAt: null,
  ...over,
})

describe('ValueWithCurrency', () => {
  it('formats an accepted comparable RON amount', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: '1171228.00',
          currency: 'RON',
          value: resolution({
            valueState: 'official_exact',
            valueAccepted: true,
            valueRonComparable: '1171228.00',
            valueComparableBasis: 'official',
          }),
        }}
      />,
    )
    expect(screen.queryByText(/indisponibil/i)).not.toBeInTheDocument()
    expect(
      screen.getByText((content) =>
        content.replace(/\D/g, '').includes('1171228'),
      ),
    ).toBeInTheDocument()
  })

  it('shows the currency code and no native amount for foreign-only values', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: null,
          currency: 'EUR',
          value: resolution({ valueState: 'foreign_currency_only' }),
        }}
      />,
    )
    expect(screen.getByText('EUR')).toBeInTheDocument()
    expect(screen.getByText(/valoare RON indisponibilă/i)).toBeInTheDocument()
  })

  it('shows a BNR-derived comparable for a foreign value that has one', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: null,
          currency: 'EUR',
          value: resolution({
            valueState: 'foreign_currency_only',
            valueRonComparable: '500000.00',
            valueComparableBasis: 'derived_bnr',
          }),
        }}
      />,
    )
    expect(screen.getByText('EUR')).toBeInTheDocument()
    expect(screen.getByText(/BNR/)).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.replace(/\D/g, '').includes('500000')),
    ).toBeInTheDocument()
  })

  it('flags an invalid_source_value row as atypical (never shows its garbage amount)', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: '99999999999.00',
          currency: 'RON',
          value: resolution({ valueState: 'invalid_source_value' }),
        }}
      />,
    )
    expect(screen.getByText(/atipică/i)).toBeInTheDocument()
    expect(
      screen.queryByText((content) =>
        content.replace(/\D/g, '').includes('99999999999'),
      ),
    ).not.toBeInTheDocument()
  })

  it('labels a framework (ambiguous_grain) value as valoare-cadru, not a spend', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: '5000000.00',
          currency: 'RON',
          value: resolution({ valueState: 'ambiguous_grain' }),
        }}
      />,
    )
    expect(screen.getByText(/valoare-cadru/i)).toBeInTheDocument()
    expect(screen.getByText('cadru')).toBeInTheDocument()
  })

  it('flags conflicting_sources as divergent', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: '100.00',
          currency: 'RON',
          value: resolution({ valueState: 'conflicting_sources' }),
        }}
      />,
    )
    expect(screen.getByText(/surse divergente/i)).toBeInTheDocument()
    expect(screen.getByText('divergent')).toBeInTheDocument()
  })

  it('renders a plain RON figure for an unresolved slice (value: null)', () => {
    render(
      <ValueWithCurrency
        value={{ valueRon: '250.00', currency: null, value: null }}
      />,
    )
    expect(
      screen.getByText((content) => content.replace(/\D/g, '').includes('250')),
    ).toBeInTheDocument()
  })
})
