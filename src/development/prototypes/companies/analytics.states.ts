import { t } from '@lingui/core/macro'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE, STATUS_STRUCK_OFF, STATUS_SUSPENDED } from '@/features/private-companies/lib/company-status-codes'
import type { CompanyAnalysisScope } from '@/schemas/company-analytics'

/**
 * The registry's states a reader asks about, each a set of ONRC codes, in
 * the headline's words („Firmele radiate din Cluj"); „unclear" is the
 * edition's companies without one state. The headline says the group the
 * selection is; „Adaugă un filtru" offers them by these words.
 */

export interface StatusGroup {
  readonly phrase: string
  readonly scope: NonNullable<CompanyAnalysisScope['observedStatus']>
}

export function statusGroups(): readonly StatusGroup[] {
  return [
    { phrase: t`în funcțiune`, scope: { in: [STATUS_ACTIVE] } },
    { phrase: t`cu activitatea întreruptă`, scope: { in: [STATUS_SUSPENDED] } },
    { phrase: t`în insolvență`, scope: { in: INSOLVENCY_STATUSES } },
    { phrase: t`în dizolvare sau lichidare`, scope: { in: DISSOLUTION_STATUSES } },
    { phrase: t`radiate`, scope: { in: [STATUS_STRUCK_OFF] } },
    { phrase: t`cu starea neclară în registru`, scope: { includeUnknown: true } },
  ]
}

function sameStatus(a: CompanyAnalysisScope['observedStatus'], b: StatusGroup['scope']): boolean {
  const codes = (filter: CompanyAnalysisScope['observedStatus']) => [...(filter?.in ?? [])].sort().join()
  return Boolean(a?.includeUnknown) === Boolean(b.includeUnknown) && codes(a) === codes(b)
}

/** The group the selection's state is, if it is one. */
export function statusGroupOf(scope: CompanyAnalysisScope): StatusGroup | null {
  const status = scope.observedStatus
  return status ? (statusGroups().find((group) => sameStatus(status, group.scope)) ?? null) : null
}
