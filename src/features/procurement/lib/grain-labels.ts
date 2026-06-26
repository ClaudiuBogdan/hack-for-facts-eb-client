import { t } from '@lingui/core/macro'
import type { ProcurementGrain } from '@/schemas/procurement'

const GRAIN_LABELS: Record<ProcurementGrain, string> = {
  procedures: t`Proceduri`,
  contracts: t`Contracte`,
  direct_acquisitions: t`Achiziții directe`,
  modifications: t`Modificări`,
}

export function grainLabel(grain: ProcurementGrain): string {
  return GRAIN_LABELS[grain]
}

export function grainSingularLabel(grain: ProcurementGrain): string {
  switch (grain) {
    case 'procedures':
      return t`Procedură`
    case 'contracts':
      return t`Contract`
    case 'direct_acquisitions':
      return t`Achiziție directă`
    case 'modifications':
      return t`Modificare`
  }
}
