import { t } from '@lingui/core/macro'
import type {
  ProcurementAnalysisGrain,
  ProcurementGrain,
} from '@/schemas/procurement'

const GRAIN_LABELS: Record<ProcurementGrain, string> = {
  procedures: t`Proceduri`,
  contracts: t`Contracte`,
  direct_acquisitions: t`Achiziții directe`,
  modifications: t`Modificări`,
}

export function grainLabel(grain: ProcurementGrain): string {
  return GRAIN_LABELS[grain]
}

/**
 * Analysis populations — the six record types a buyer can appear in. Wider
 * than the four searchable grains above: frameworks and call-offs are analysed
 * but not indexed as their own search grain.
 */
export function populationLabel(grain: ProcurementAnalysisGrain): string {
  switch (grain) {
    case 'procedure':
      return t`Proceduri`
    case 'contract':
      return t`Contracte`
    case 'direct_acquisition':
      return t`Achiziții directe`
    case 'framework':
      return t`Acorduri-cadru`
    case 'calloff':
      return t`Contracte subsecvente`
    case 'modification':
      return t`Modificări`
  }
}

/**
 * What a population's anchor money MEANS. Each population carries its own
 * measure — a ceiling is not spending, a call-off is not a contract award — so
 * this label travels with the figure wherever it is shown and the two are never
 * conflated. `null` marks a population that is counted and never summed.
 */
export function populationMoneyBasisLabel(
  grain: ProcurementAnalysisGrain,
): string | null {
  switch (grain) {
    case 'framework':
      return t`plafon angajat`
    case 'calloff':
      return t`valoare comandată`
    case 'modification':
      return null
    default:
      return t`valoare atribuită`
  }
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
