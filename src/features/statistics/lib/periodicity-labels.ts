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

/** Whether a cadence string from the API is one this module has a label for. */
export function isInsPeriodicity(value: string): value is InsPeriodicity {
  return Object.prototype.hasOwnProperty.call(PERIODICITY_LABELS, value)
}
