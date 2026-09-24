import { t } from '@lingui/core/macro'
import type { StatisticsHubIndicator, StatisticsHubUnit } from '@/schemas/statistics'
import { formatHubNumber } from './numbers'
import { tileUnit } from './territory-groups'

/**
 * The unit as a Romanian word in the quiet tier. A percent folds its sign
 * into the value; „other" units carry the API's own unit name, never a guess.
 */

/** The word after the number, from the unit the API resolved. Never guessed from the dataset name. */
export function hubUnitOf(latest: {
  readonly unitSymbol: string | null
  readonly unitCode: string | null
  readonly unitNameRo: string | null
}): StatisticsHubUnit {
  const symbol = latest.unitSymbol?.toLowerCase() ?? ''
  const name = latest.unitNameRo?.toLowerCase() ?? ''
  if (symbol === 'persons' || name.startsWith('numar persoane')) return 'persons'
  if (symbol === 'percent' || name.startsWith('procent')) return 'percent'
  if (symbol === 'count' || name === 'numar') return 'count'
  if (name === 'ani') return 'years'
  return 'other'
}

export function hubUnitWord(unit: StatisticsHubUnit, unitLabel: string | null): string {
  switch (unit) {
    case 'persons':
      return t`persoane`
    case 'years':
      return t`ani`
    case 'percent':
      return '%'
    case 'count':
      return ''
    case 'other':
      // INS spells its currency „Lei RON"; the reader says „lei".
      return unitLabel && /^lei\b/i.test(unitLabel.trim()) ? t`lei` : (unitLabel ?? '')
  }
}

/** Value and unit as two strings, so the unit can sit in the quiet tier. */
export function formatHubValue(
  value: number,
  unit: StatisticsHubUnit,
  unitLabel: string | null,
  options?: { readonly compact?: boolean; readonly digits?: number },
): { readonly value: string; readonly unit: string } {
  const digits = options?.digits
  if (unit === 'percent') return { value: `${formatHubNumber(value, { digits })}%`, unit: '' }
  // Compact only past a million („21,6 mil."); below that the full figure is
  // shorter to read than the „145,7 K" the Romanian locale would produce.
  const compact = Boolean(options?.compact) && unit !== 'years' && Math.abs(value) >= 1_000_000
  return { value: formatHubNumber(value, compact ? { compact } : { digits }), unit: hubUnitWord(unit, unitLabel) }
}

export function formatIndicatorValue(
  indicator: Pick<StatisticsHubIndicator, 'value' | 'unit' | 'unitLabel'>,
  options?: { readonly compact?: boolean },
): { readonly value: string; readonly unit: string } | null {
  if (indicator.value === null) return null
  return formatHubValue(indicator.value, indicator.unit, indicator.unitLabel, options)
}

/**
 * Whether the national cell of a unit is the sum of the counties': a count of
 * people or things is; a rate, an average or a life expectancy is not.
 */
export function isAdditiveUnit(unit: StatisticsHubUnit): boolean {
  return unit === 'persons' || unit === 'count'
}

/** The API's unit symbol as the reader reads it: known English codes become Romanian words, anything else stays verbatim. */
export function describeUnitSymbol(symbol: string): string {
  switch (symbol.trim().toLowerCase()) {
    case 'persons':
      return t`persoane`
    case 'percent':
      return t`procente`
    case 'count':
      return t`număr`
    default:
      return symbol
  }
}

/**
 * The unit as a word beside a detail figure — „persoane", „%", and for a bare
 * count the symbol worded („număr"): `hubUnitWord` is deliberately empty for
 * a count, because „10 numar" is not a sentence, but a figure with no unit at
 * all leaves the reader to guess what 10 counts. One rule for the summary and
 * for the loading state that precedes it, so the word never changes on arrival.
 */
export function figureUnitWord(
  unit: { readonly unitSymbol: string | null; readonly unitNameRo: string | null },
  unitLabel: string | null,
): string {
  return hubUnitWord(tileUnit(unit), unitLabel) || (unit.unitSymbol ? describeUnitSymbol(unit.unitSymbol) : '')
}
