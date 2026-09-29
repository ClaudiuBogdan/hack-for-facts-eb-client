import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import type { NgoFinanceDomainKey, NgoFinanceLeader, NgoFinanceSizeKey } from './finance-summary-types'
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

/** The reader's domains, from the non-profit activity each statement declares. */
export const DOMAIN_LABEL: Readonly<Record<NgoFinanceDomainKey, MessageDescriptor>> = {
  sport: msg`Sport`,
  social: msg`Asistență socială`,
  education: msg`Educație`,
  health: msg`Sănătate`,
  culture: msg`Cultură și timp liber`,
  religion: msg`Culte și organizații religioase`,
  professional: msg`Asociații profesionale și patronale`,
  unions: msg`Sindicate`,
  finance: msg`Creditare și ajutor reciproc`,
  agriculture: msg`Pășuni, agricultură și păduri`,
  political: msg`Partide și organizații politice`,
  other: msg`Alte activități`,
  general: msg`Fără domeniu precis`,
}

/** The revenue classes, in lei. */
export const SIZE_LABEL: Readonly<Record<NgoFinanceSizeKey, MessageDescriptor>> = {
  negative: msg`venit negativ`,
  none: msg`niciun venit`,
  under10k: msg`până la 10.000`,
  under100k: msg`10.000–100.000`,
  under1m: msg`100.000–1 mil.`,
  over1m: msg`peste 1 mil.`,
}

/** A leader whose registry entry has closed since the year it led. */
export const LEADER_STATUS_LABEL: Readonly<Record<NonNullable<NgoFinanceLeader['status']>, MessageDescriptor>> = {
  dissolved: msg`dizolvată`,
  inLiquidation: msg`în lichidare`,
  deregistered: msg`radiată`,
}
