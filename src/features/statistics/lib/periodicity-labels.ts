import { t } from '@lingui/core/macro'
import type { InsPeriodicity } from '@/schemas/ins'

const PERIODICITY_LABELS: Record<InsPeriodicity, () => string> = {
  ANNUAL: () => t`anual`,
  SEMESTRIAL: () => t`semestrial`,
  RANGE: () => t`interval`,
  OTHER: () => t`altă periodicitate`,
  QUARTERLY: () => t`trimestrial`,
  MONTHLY: () => t`lunar`,
}

export function periodicityLabel(periodicity: InsPeriodicity): string {
  return PERIODICITY_LABELS[periodicity]()
}

/** The same word, capitalised: for a control's label or a row's cadence column. */
export function periodicityTitle(periodicity: InsPeriodicity): string {
  const label = periodicityLabel(periodicity)
  return label.charAt(0).toLocaleUpperCase('ro') + label.slice(1)
}

/** Whether a cadence string from the API is one this module has a label for. */
export function isInsPeriodicity(value: string): value is InsPeriodicity {
  return Object.prototype.hasOwnProperty.call(PERIODICITY_LABELS, value)
}
