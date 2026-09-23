import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { NgoRegistryCategoryKey, NgoRegistryStatusKey } from './registry-summary-types'

/**
 * The hub's names for the registry's legal forms and statuses, as
 * descriptors: they translate when they are read (`i18n._`), not when this
 * module loads, so the English page does not keep the Romanian source.
 */

export const CATEGORY_LABEL: Readonly<Record<NgoRegistryCategoryKey, MessageDescriptor>> = {
  association: msg`Asociații`,
  foundation: msg`Fundații`,
  federation: msg`Federații`,
  religious_association: msg`Asociații religioase`,
  foreign_legal_person: msg`Persoane juridice străine`,
}

export const STATUS_LABEL: Readonly<Record<NgoRegistryStatusKey, MessageDescriptor>> = {
  registered: msg`Înregistrate`,
  dissolved: msg`Dizolvate`,
  inLiquidation: msg`În lichidare`,
  deregistered: msg`Radiate`,
}
