import { t } from '@lingui/core/macro'
import type { NgoListSnapshot, NgoOrganization } from './api'

/**
 * The four official lists the profile is joined to by CUI — the ministry's
 * licensed social services and accredited providers, ANOFM's social-enterprise
 * register (RUEIS) and accredited employment-service providers — and which of
 * them name an organisation: `available` with rows. Not listed in the edition
 * (`[]`) and not loaded are no fact to draw.
 */

export type ListKey = 'socialServices' | 'socialServiceAccreditations' | 'socialEnterpriseCertificates' | 'employmentServiceAccreditations'

const LIST_KEYS: readonly ListKey[] = ['socialServices', 'socialServiceAccreditations', 'socialEnterpriseCertificates', 'employmentServiceAccreditations']

/** The list's name, as its publisher calls it, with the publisher. */
export const LIST_NAME: Readonly<Record<ListKey, () => string>> = {
  socialServices: () => t`Serviciile sociale licențiate, Ministerul Muncii`,
  socialServiceAccreditations: () => t`Furnizorii acreditați de servicii sociale, Ministerul Muncii`,
  socialEnterpriseCertificates: () => t`Registrul unic al întreprinderilor sociale (RUEIS), ANOFM`,
  employmentServiceAccreditations: () => t`Furnizorii acreditați de servicii de ocupare, ANOFM`,
}

/** The lists that name the organisation, in the band's order, each with its edition. */
export function listedSections(organization: NgoOrganization): readonly { readonly key: ListKey; readonly snapshot: NgoListSnapshot | null }[] {
  // The lists are joined by CUI: a profile without one has none to show, whatever a response says.
  if (organization.cui === null) return []
  return LIST_KEYS.flatMap((key) => {
    const section = organization[key]
    return section.availability === 'available' && section.data && section.data.length > 0 ? [{ key, snapshot: section.snapshot }] : []
  })
}
