import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { ValueWithCurrency } from './value-with-currency'
import type { ValueResolution } from '@/schemas/procurement'

/**
 * Money assertions here are EXACT strings, never digit-stripped substrings: a
 * scaling bug (`RON 1,171,228` → `RON 11,712,280`) survives any `includes`
 * check on `content.replace(/\D/g, '')`, and separators/decimals are only
 * pinned by comparing the whole rendered token.
 *
 * Under test the Lingui double reports locale `en` (see `vitest.config.ts`), so
 * `formatCurrency` formats as `en-US` — `RON 1,171,228`. Testing Library's
 * default normalizer collapses Intl's NBSP into a plain space, so the expected
 * strings below are written with a plain space.
 */

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
  it('formats an accepted comparable RON amount, reading the resolution and not the raw own value', () => {
    render(
      <ValueWithCurrency
        value={{
          // Deliberately DIFFERENT from the resolved comparable: the honest
          // display keys on the resolution, never on the row's own evidence
          // (an `invalid_source_value` row carries a garbage `valueRon`).
          valueRon: '9999999.00',
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
    expect(screen.getByText('RON 1,171,228')).toBeInTheDocument()
    // The raw own value must never reach the screen.
    expect(screen.queryByText('RON 9,999,999')).not.toBeInTheDocument()
  })

  it('renders thousands separators and decimals exactly', () => {
    render(
      <ValueWithCurrency
        value={{
          valueRon: '1234567.85',
          currency: 'RON',
          value: resolution({
            valueState: 'official_exact',
            valueAccepted: true,
            valueRonComparable: '1234567.85',
            valueComparableBasis: 'official',
          }),
        }}
      />,
    )
    expect(screen.getByText('RON 1,234,567.85')).toBeInTheDocument()
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
          // A foreign row's own RON evidence is absent; only the BNR-derived
          // comparable may be shown, prefixed with ≈.
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
    expect(screen.getByText('(BNR)')).toBeInTheDocument()
    expect(screen.getByText('≈ RON 500,000')).toBeInTheDocument()
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
    expect(screen.getByText('atipică')).toBeInTheDocument()
    expect(screen.getByText('indisponibil')).toBeInTheDocument()
    expect(screen.queryByText('RON 99,999,999,999')).not.toBeInTheDocument()
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
    expect(screen.getByText('valoare-cadru')).toBeInTheDocument()
    expect(screen.getByText('cadru')).toBeInTheDocument()
    // A framework ceiling is not a spend — its amount is never rendered.
    expect(screen.queryByText('RON 5,000,000')).not.toBeInTheDocument()
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
    expect(screen.getByText('surse divergente')).toBeInTheDocument()
    expect(screen.getByText('divergent')).toBeInTheDocument()
    expect(screen.queryByText('RON 100')).not.toBeInTheDocument()
  })

  it('renders a plain RON figure for an unresolved slice (value: null)', () => {
    render(
      <ValueWithCurrency
        value={{ valueRon: '250.00', currency: null, value: null }}
      />,
    )
    expect(screen.getByText('RON 250')).toBeInTheDocument()
  })

  it('appends the RON label without touching the amount when showCurrencyBadge is set', () => {
    render(
      <ValueWithCurrency
        showCurrencyBadge
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
    expect(screen.getByText('RON 1,171,228')).toBeInTheDocument()
    expect(screen.getByText('RON')).toBeInTheDocument()
  })
})
