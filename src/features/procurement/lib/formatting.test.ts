import { describe, expect, it } from 'vitest'
import {
  describeMoney,
  formatFlowCount,
  formatScopeShare,
  formatMoneyValue,
  formatRon,
  isMoneyMissing,
  moneyValueCurrency,
  parseRon,
  ronAmountSlice,
  sumRonValues,
} from './formatting'
import type { MoneyFields, ValueResolution } from '@/schemas/procurement'

/**
 * The contract under test (see the module docblock): the honest display keys on
 * the data-layer RESOLUTION, never on the row's own `valueRon` — an
 * `invalid_source_value` row carries a garbage own value. Aggregation follows
 * from that: only rows whose resolution yields a comparable RON amount may fold
 * into a total; foreign / suspect rows are counted so the caller can warn, and
 * framework ceilings / conflicting rows are dropped entirely.
 *
 * Under test the Lingui double reports locale `en` (see `vitest.config.ts`), so
 * `formatCurrency` formats as `en-US` (`RON 1,171,228`, NBSP before the digits)
 * and `t` returns the source string. Amounts are asserted exactly — a
 * digit-substring check would survive a scaling bug.
 */

/** Intl separates the currency code from the amount with a non-breaking space. */
const NBSP = '\u00A0'

const resolution = (over: Partial<ValueResolution> = {}): ValueResolution => ({
  valueState: 'source_missing',
  valueStateRule: null,
  valueAccepted: false,
  valueRonComparable: null,
  valueComparableBasis: null,
  valueRulesVersion: 2,
  valueResolvedAt: null,
  ...over,
})

/** An accepted resolution carrying an official comparable RON amount. */
const accepted = (
  valueRonComparable: string,
  over: Partial<ValueResolution> = {},
): ValueResolution =>
  resolution({
    valueState: 'official_exact',
    valueAccepted: true,
    valueRonComparable,
    valueComparableBasis: 'official',
    ...over,
  })

const money = (over: Partial<MoneyFields> = {}): MoneyFields => ({
  valueRon: null,
  currency: 'RON',
  value: null,
  ...over,
})

describe('parseRon', () => {
  it('parses a RON decimal string', () => {
    expect(parseRon('1171228.00')).toBe(1171228)
    expect(parseRon('1171228.45')).toBe(1171228.45)
    expect(parseRon('0')).toBe(0)
  })

  it('parses a negative amount (modification deltas are signed)', () => {
    expect(parseRon('-1250.75')).toBe(-1250.75)
  })

  it('returns null for null and undefined rather than coercing to 0', () => {
    expect(parseRon(null)).toBeNull()
    expect(parseRon(undefined)).toBeNull()
  })

  it('returns null for garbage and non-finite tokens', () => {
    expect(parseRon('abc')).toBeNull()
    expect(parseRon('1.171.228,00')).toBeNull()
    expect(parseRon('NaN')).toBeNull()
    expect(parseRon('Infinity')).toBeNull()
    expect(parseRon('-Infinity')).toBeNull()
  })

  it('is documented-quirk tolerant: an empty string coerces to 0', () => {
    // `Number('')` is 0. `decimalStringSchema` rejects '' at the Zod boundary,
    // so this cannot arrive from a parsed response — pinned so a future
    // stricter parse is a deliberate change, not an accident.
    expect(parseRon('')).toBe(0)
  })
})

describe('formatRon', () => {
  it('formats a RON decimal string exactly', () => {
    expect(formatRon('1171228.00')).toBe(`RON${NBSP}1,171,228`)
    expect(formatRon('1234567.85')).toBe(`RON${NBSP}1,234,567.85`)
  })

  it('supports compact notation', () => {
    expect(formatRon('1234567.00', 'compact')).toBe(`RON${NBSP}1.23M`)
  })

  it('returns indisponibil for null and unparseable input', () => {
    expect(formatRon(null)).toBe('indisponibil')
    expect(formatRon(undefined)).toBe('indisponibil')
    expect(formatRon('abc')).toBe('indisponibil')
  })
})

describe('describeMoney', () => {
  it('prefers the accepted comparable over a divergent own valueRon', () => {
    // The own value and the resolution disagree; the resolution wins.
    const display = describeMoney(
      money({ valueRon: '9999999.00', value: accepted('1171228.00') }),
    )
    expect(display).toEqual({
      kind: 'ron',
      ron: 1171228,
      basis: 'official',
    })
  })

  it('uses an accepted BNR-derived comparable when the row has no own RON value', () => {
    const display = describeMoney(
      money({
        valueRon: null,
        currency: 'EUR',
        value: accepted('500000.00', {
          valueState: 'official_ron_equivalent',
          valueComparableBasis: 'derived_bnr',
        }),
      }),
    )
    expect(display).toEqual({
      kind: 'ron',
      ron: 500000,
      basis: 'derived_bnr',
    })
  })

  it('short-circuits on valueAccepted: false — a comparable alone is only a hint', () => {
    // A BNR hint on a NOT-accepted foreign row must never be served as the value.
    const display = describeMoney(
      money({
        valueRon: null,
        currency: 'EUR',
        value: resolution({
          valueState: 'foreign_currency_only',
          valueAccepted: false,
          valueRonComparable: '500000.00',
          valueComparableBasis: 'derived_bnr',
        }),
      }),
    )
    expect(display).toEqual({
      kind: 'foreign',
      currency: 'EUR',
      comparable: 500000,
    })
  })

  it('falls back to missing when an accepted row has no comparable amount', () => {
    const display = describeMoney(
      money({
        valueRon: '1171228.00',
        value: resolution({
          valueState: 'official_exact',
          valueAccepted: true,
          valueRonComparable: null,
        }),
      }),
    )
    expect(display).toEqual({ kind: 'missing' })
  })

  it('reports a foreign-only row with no comparable, defaulting an absent currency', () => {
    expect(
      describeMoney(
        money({
          currency: 'EUR',
          value: resolution({ valueState: 'foreign_currency_only' }),
        }),
      ),
    ).toEqual({ kind: 'foreign', currency: 'EUR', comparable: null })

    expect(
      describeMoney(
        money({
          currency: null,
          value: resolution({ valueState: 'foreign_currency_only' }),
        }),
      ),
    ).toEqual({ kind: 'foreign', currency: '—', comparable: null })
  })

  it('maps invalid_source_value to suspect and never exposes the garbage amount', () => {
    expect(
      describeMoney(
        money({
          valueRon: '99999999999.00',
          value: resolution({
            valueState: 'invalid_source_value',
            valueRonComparable: '99999999999.00',
          }),
        }),
      ),
    ).toEqual({ kind: 'suspect' })
  })

  it('maps ambiguous_grain to framework and conflicting_sources to conflict', () => {
    expect(
      describeMoney(
        money({
          valueRon: '5000000.00',
          value: resolution({ valueState: 'ambiguous_grain' }),
        }),
      ),
    ).toEqual({ kind: 'framework' })

    expect(
      describeMoney(
        money({
          valueRon: '900000.00',
          value: resolution({ valueState: 'conflicting_sources' }),
        }),
      ),
    ).toEqual({ kind: 'conflict' })
  })

  it('maps source_missing, not_applicable and an unknown state to missing', () => {
    for (const valueState of [
      'source_missing',
      'not_applicable',
      null,
      'a_state_this_client_has_never_seen',
    ]) {
      expect(
        describeMoney(money({ valueRon: '100.00', value: resolution({ valueState }) })),
      ).toEqual({ kind: 'missing' })
    }
  })

  it('shows an unresolved slice (value: null) as a plain RON figure with no basis', () => {
    expect(describeMoney(money({ valueRon: '250.00' }))).toEqual({
      kind: 'ron',
      ron: 250,
      basis: null,
    })
    expect(describeMoney(money({ valueRon: '-1250.75' }))).toEqual({
      kind: 'ron',
      ron: -1250.75,
      basis: null,
    })
  })

  it('shows an empty unresolved slice as missing', () => {
    expect(describeMoney(money({ valueRon: null }))).toEqual({ kind: 'missing' })
    expect(describeMoney(money({ valueRon: 'abc' }))).toEqual({ kind: 'missing' })
  })
})

describe('formatMoneyValue', () => {
  it('formats a comparable RON amount exactly', () => {
    expect(
      formatMoneyValue(money({ valueRon: null, value: accepted('1171228.00') })),
    ).toBe(`RON${NBSP}1,171,228`)
  })

  it('supports compact notation', () => {
    expect(
      formatMoneyValue(
        money({ value: accepted('1234567.00') }),
        'compact',
      ),
    ).toBe(`RON${NBSP}1.23M`)
  })

  it('returns indisponibil for every non-RON state, never an invented amount', () => {
    const states = [
      'foreign_currency_only',
      'invalid_source_value',
      'ambiguous_grain',
      'conflicting_sources',
      'source_missing',
    ]
    for (const valueState of states) {
      expect(
        formatMoneyValue(
          money({ valueRon: '5000000.00', value: resolution({ valueState }) }),
        ),
      ).toBe('indisponibil')
    }
  })
})

describe('isMoneyMissing', () => {
  it('is false only when a comparable RON amount is available', () => {
    expect(isMoneyMissing(money({ value: accepted('100.00') }))).toBe(false)
    expect(isMoneyMissing(money({ valueRon: '100.00' }))).toBe(false)
  })

  it('is true for foreign, suspect, framework, conflict and missing slices', () => {
    for (const valueState of [
      'foreign_currency_only',
      'invalid_source_value',
      'ambiguous_grain',
      'conflicting_sources',
      'source_missing',
    ]) {
      expect(
        isMoneyMissing(
          money({ valueRon: '100.00', value: resolution({ valueState }) }),
        ),
      ).toBe(true)
    }
  })
})

describe('sumRonValues', () => {
  const frameworkRow = money({
    valueRon: '5000000.00',
    value: resolution({ valueState: 'ambiguous_grain' }),
  })
  const conflictRow = money({
    valueRon: '900000.00',
    value: resolution({ valueState: 'conflicting_sources' }),
  })
  const suspectRow = money({
    valueRon: '99999999999.00',
    value: resolution({ valueState: 'invalid_source_value' }),
  })
  const foreignRow = money({
    valueRon: null,
    currency: 'EUR',
    value: resolution({ valueState: 'foreign_currency_only' }),
  })
  const missingRow = money({
    value: resolution({ valueState: 'source_missing' }),
  })

  it('sums only comparable RON rows and excludes framework / conflicting / suspect / foreign / missing rows', () => {
    const rows: readonly MoneyFields[] = [
      money({ valueRon: '1171228.00', value: accepted('1171228.00') }),
      money({ valueRon: '1750000.00', value: accepted('1750000.00') }),
      frameworkRow,
      conflictRow,
      suspectRow,
      foreignRow,
      missingRow,
    ]

    expect(sumRonValues(rows)).toEqual({
      // 1171228 + 1750000 — none of the excluded rows leak into the total.
      ronTotal: 2921228,
      nonRonCount: 1,
      suspectCount: 1,
    })
  })

  it('counts a suspect row in suspectCount and a foreign row in nonRonCount, not the reverse', () => {
    expect(sumRonValues([suspectRow])).toEqual({
      ronTotal: null,
      nonRonCount: 0,
      suspectCount: 1,
    })
    expect(sumRonValues([foreignRow])).toEqual({
      ronTotal: null,
      nonRonCount: 1,
      suspectCount: 0,
    })
  })

  it('drops framework and conflicting rows silently — they belong to no counter', () => {
    expect(sumRonValues([frameworkRow, conflictRow])).toEqual({
      ronTotal: null,
      nonRonCount: 0,
      suspectCount: 0,
    })
  })

  it('returns a null total (never 0) when no row has a comparable amount', () => {
    // A missing total must stay distinguishable from a real zero-lei total.
    expect(sumRonValues([]).ronTotal).toBeNull()
    expect(sumRonValues([missingRow, foreignRow]).ronTotal).toBeNull()
    expect(sumRonValues([money({ valueRon: '0.00' })]).ronTotal).toBe(0)
  })

  it('keeps a BNR hint on a non-accepted foreign row out of the total', () => {
    const foreignWithHint = money({
      valueRon: null,
      currency: 'EUR',
      value: resolution({
        valueState: 'foreign_currency_only',
        valueRonComparable: '500000.00',
        valueComparableBasis: 'derived_bnr',
      }),
    })
    expect(sumRonValues([foreignWithHint])).toEqual({
      ronTotal: null,
      nonRonCount: 1,
      suspectCount: 0,
    })
  })

  it('folds an ACCEPTED BNR-derived comparable into the total', () => {
    const acceptedDerived = money({
      valueRon: null,
      currency: 'EUR',
      value: accepted('500000.00', {
        valueState: 'official_ron_equivalent',
        valueComparableBasis: 'derived_bnr',
      }),
    })
    expect(sumRonValues([acceptedDerived])).toEqual({
      ronTotal: 500000,
      nonRonCount: 0,
      suspectCount: 0,
    })
  })

  it('sums unresolved slices, including signed deltas', () => {
    expect(
      sumRonValues([
        money({ valueRon: '1000.50' }),
        money({ valueRon: '-250.25' }),
      ]),
    ).toEqual({ ronTotal: 750.25, nonRonCount: 0, suspectCount: 0 })
  })
})

describe('moneyValueCurrency', () => {
  it('returns the row currency, defaulting to RON when absent', () => {
    expect(moneyValueCurrency({ currency: 'EUR' })).toBe('EUR')
    expect(moneyValueCurrency({ currency: null })).toBe('RON')
  })
})

describe('ronAmountSlice', () => {
  it('builds an unresolved RON slice that describes as a plain amount', () => {
    expect(ronAmountSlice('1171228.00')).toEqual({
      valueRon: '1171228.00',
      currency: 'RON',
      value: null,
    })
    expect(describeMoney(ronAmountSlice('1171228.00'))).toEqual({
      kind: 'ron',
      ron: 1171228,
      basis: null,
    })
    expect(describeMoney(ronAmountSlice(null))).toEqual({ kind: 'missing' })
  })
})

describe('formatFlowCount', () => {
  it('formats a bigint decimal string and a plain number', () => {
    expect(formatFlowCount('1234567')).toBe('1,234,567')
    expect(formatFlowCount(0)).toBe('0')
  })

  it('falls back to 0 for an unparseable count', () => {
    expect(formatFlowCount('not-a-number')).toBe('0')
  })
})

describe('formatScopeShare', () => {
  it('renders a server ratio as a percentage', () => {
    expect(formatScopeShare('0.5000')).toBe('50%')
    expect(formatScopeShare('0.3333')).toBe('33.33%')
    expect(formatScopeShare('1.0000')).toBe('100%')
  })
})
