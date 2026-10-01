/**
 * Human labels for procurement enum tokens. Raw enum values (source systems,
 * contract kinds, sort options, review signals) must never reach the screen —
 * every UI surface goes through these lazily-evaluated `t` functions (lazy so
 * a locale switch is picked up, unlike module-level `t` consts).
 */
import { t } from '@lingui/core/macro'
import type { ContractKind, ProcurementSourceSystem } from '@/schemas/procurement'
import type { ProcurementSource } from '@/schemas/procurement-search'

export function contractKindLabel(kind: ContractKind): string {
  switch (kind) {
    case 'works':
      return t`Works`
    case 'services':
      return t`Services`
    case 'supplies':
      return t`Supplies`
  }
}

export function sourceSystemLabel(system: ProcurementSourceSystem): string {
  switch (system) {
    case 'seap_notice':
      return t`SEAP notices`
    case 'seap_contracts':
      return t`SEAP contracts`
    case 'seap_da':
      return t`SEAP direct acquisitions`
    case 'seap_dan':
      return t`SEAP direct acquisitions (archive)`
    case 'elicitatie':
      return t`e-licitatie procedures`
    case 'elicitatie_da':
      return t`e-licitatie direct acquisitions`
    case 'elicitatie_ca_award':
      return t`e-licitatie awards`
  }
}

export function sourceLabel(source: ProcurementSource): string {
  switch (source) {
    case 'elicitatie':
      return t`e-licitatie`
    case 'seap':
      return t`SEAP / SICAP`
  }
}
