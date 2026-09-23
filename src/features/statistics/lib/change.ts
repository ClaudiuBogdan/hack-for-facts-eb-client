import { t } from '@lingui/core/macro'
import type { StatisticsHubUnit } from '@/schemas/statistics'
import { formatHubNumber, formatSignedNumber } from './numbers'
import { hubUnitWord, isAdditiveUnit } from './units'

/**
 * A change between two figures, as the pages state it: counts change in
 * percent; rates and years change in their own unit, because a percent of a
 * percent misleads.
 */

/**
 * The change from one value to another, as the table of „then and now"
 * shows it. Counts change in percent; rates and years change in their own
 * unit, because a percent of a percent misleads. Null when a count starts
 * at zero, where a percent has no meaning.
 */
export function describeHubDelta(from: number, to: number, unit: StatisticsHubUnit): string | null {
  const change = hubChange(from, to, unit)
  return change === null ? null : formatHubChange(change, unit)
}

/** The change {@link describeHubDelta} states, as a number: percentage points, years or percent. */
export function hubChange(from: number, to: number, unit: StatisticsHubUnit): number | null {
  if (unit === 'percent' || unit === 'years') return to - from
  if (from === 0) return null
  return ((to - from) / Math.abs(from)) * 100
}

/** A change from {@link hubChange}, signed, in the unit it is measured in („+2,1 pp", „-18,9%"). */
export function formatHubChange(change: number, unit: StatisticsHubUnit, digits = 1): string {
  if (unit === 'percent') return t`${formatSignedNumber(change, digits, true)} pp`
  if (unit === 'years') return t`${formatSignedNumber(change, digits, true)} ani`
  return `${formatSignedNumber(change, digits, true)}%`
}

/** A signed whole figure („+4.560", „-93.966"), for a difference between two counts. */
export function formatHubSigned(value: number): string {
  return formatSignedNumber(value, 0)
}

/**
 * A county against the national cell of the same dataset and year. A rate or
 * an average differs from the country's in its own unit (percentage points for
 * a percent); a count is a share of the country's total.
 */
export function describeAgainstNational(
  value: number,
  national: number,
  unit: StatisticsHubUnit,
  unitLabel: string | null,
  digits: number,
): string | null {
  if (isAdditiveUnit(unit)) {
    return national > 0 ? t`${formatHubNumber((value / national) * 100, { digits: 1 })}% din totalul țării` : null
  }
  const delta = formatSignedNumber(value - national, digits, true)
  if (unit === 'percent') return t`${delta} pp față de România`
  const word = hubUnitWord(unit, unitLabel)
  return word ? t`${delta} ${word} față de România` : t`${delta} față de România`
}
