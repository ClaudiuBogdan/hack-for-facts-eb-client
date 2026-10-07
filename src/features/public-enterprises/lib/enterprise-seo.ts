import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import type { PublicEnterpriseSeo } from './enterprise-head'
import { controlRows } from './enterprise-model'
import { displayName } from './hub-format'

/**
 * The few facts the head says, worked out where the reads are (the server
 * loader, the page) so the head itself needs no model.
 */

/** The enterprise's name as the page sets it: the company record's, else the kernel identity's; null when neither names it (the API's name is then its CUI). */
export function enterpriseName(cui: string, read: PublicEnterpriseRead | undefined, company: PrivateCompanyProfile | null | undefined): string | null {
  for (const name of [company?.legalName, read?.profile?.organization?.name]) {
    const trimmed = name?.trim() ?? ''
    if (trimmed !== '' && trimmed !== cui) return displayName(trimmed)
  }
  return null
}

/**
 * ANAF's list's authorities, else the announcements': the sources' own names
 * only (a name borrowed from a budget record is not the list's), no wording,
 * since a head may run under another request's language.
 */
export function publicEnterpriseSeo(read: PublicEnterpriseRead, company: PrivateCompanyProfile | null | undefined): PublicEnterpriseSeo {
  const rows = controlRows(read)
  const namesFrom = (source: 's1001' | 'json_apt') => [...new Set(rows.flatMap((row) => (row.source === source && row.name ? [displayName(row.name)] : [])))]
  // ANAF's list's own names, else the announcements' own: each credited to the source that gave it.
  const listed = namesFrom('s1001')
  const announced = listed.length > 0 ? [] : namesFrom('json_apt')
  const names = listed.length > 0 ? listed : announced
  return {
    cui: read.cui,
    name: enterpriseName(read.cui, read, company),
    authority: names.length > 0 ? names.join(', ') : null,
    authoritySource: listed.length > 0 ? 's1001' : announced.length > 0 ? 'json_apt' : null,
    historical: read.profile?.isCurrentMember === false,
  }
}
