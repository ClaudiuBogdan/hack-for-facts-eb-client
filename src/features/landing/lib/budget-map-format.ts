import type { NumberLocale } from './national-facts'

/**
 * How the budget map writes its figures, in the active locale — Romanian
 * separators on an English page read as a thousandfold error, so the locale is
 * always a parameter (`national-facts.ts` has the same rule).
 *
 * Short amounts: Romanian writes thousands as `mii` (the compact notation's own
 * `K` reads as English), then `mil.` and `mld.`; English writes `K`, `M`, `B`.
 * A typographic minus throughout: a hyphen reads as a dash beside a range's own.
 */

const TAG: Readonly<Record<NumberLocale, string>> = { ro: 'ro-RO', en: 'en-GB' }

const formatters = new Map<string, Intl.NumberFormat>()
function formatter(locale: NumberLocale, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`
  let found = formatters.get(key)
  if (!found) {
    found = new Intl.NumberFormat(TAG[locale], options)
    formatters.set(key, found)
  }
  return found
}

const minus = (text: string) => text.replace(/^-/, '−')
const COMPACT: Intl.NumberFormatOptions = { notation: 'compact', maximumFractionDigits: 1 }

export interface CompactParts {
  readonly number: string
  /** `mii`, `mil.`, `mld.` — `K`, `M`, `B` — or empty under a thousand. */
  readonly suffix: string
}

export function compactParts(value: number, locale: NumberLocale): CompactParts {
  const size = Math.abs(value)
  const decimal = formatter(locale, { maximumFractionDigits: 1 })
  if (size < 1e3) return { number: minus(decimal.format(value)), suffix: '' }
  if (locale === 'ro' && size < 1e6) return { number: minus(decimal.format(value / 1e3)), suffix: 'mii' }
  // English suffixes as en-US writes them (K, M, B): en-GB's own are „k", „m" and „bn". Separators are the same.
  const compact = (locale === 'en' ? new Intl.NumberFormat('en-US', COMPACT) : formatter(locale, COMPACT)).formatToParts(value)
  const suffix = compact.find((part) => part.type === 'compact')?.value ?? ''
  const number = compact
    .filter((part) => part.type !== 'compact' && part.type !== 'literal')
    .map((part) => part.value)
    .join('')
  return { number: minus(number), suffix }
}

/** The parts joined as the locale writes them: „24,4 mil." with a no-break space, „24.4M" tight. */
export function joinParts({ number, suffix }: CompactParts, locale: NumberLocale): string {
  if (!suffix) return number
  return locale === 'ro' ? `${number}\u00a0${suffix}` : `${number}${suffix}`
}

/** An amount in lei, short: „−500,4 mii lei", „24.4M lei"; an em dash where there is none. */
export function formatAmount(value: number | null, locale: NumberLocale): string {
  return value === null ? '—' : `${joinParts(compactParts(value, locale), locale)} lei`
}

/** A figure already in percent: „−8,1%", „+10%". */
export function formatPercent(value: number | null, locale: NumberLocale): string {
  if (value === null) return '—'
  return `${minus(formatter(locale, { maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(value))}%`
}

/** One decimal, as the formatters above round (half away from zero), in a form `Number` reads back. */
const ONE_DECIMAL = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, useGrouping: false })

/**
 * `value` in `unit`s, rounded to one decimal by `Intl` itself and back in the
 * value's own unit. `Intl` rounds the decimal the number reads as: 0.95 prints
 * „1" and 2.9499999999999997 prints „2,9", where arithmetic on the binary value
 * (`Math.round(0.95 / 0.1)`) gets the first wrong and digit tricks the second.
 */
const roundTo = (value: number, unit: number) => Number(ONE_DECIMAL.format(value / unit)) * unit

/** An amount rounded as `compactParts` prints it: one decimal of its thousands, millions or billions. */
export function asPrinted(value: number): number {
  const size = Math.abs(value)
  return roundTo(value, size < 1e3 ? 1 : size < 1e6 ? 1e3 : size < 1e9 ? 1e6 : 1e9)
}

/** A percent rounded as `formatPercent` prints it: one decimal. */
export function percentAsPrinted(value: number): number {
  return roundTo(value, 1)
}
