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
