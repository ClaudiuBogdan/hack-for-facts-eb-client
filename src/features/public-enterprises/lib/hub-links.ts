import { canonicalCuiOf } from './enterprise-cui'

/** Where the hub's search leads: an enterprise to its own page. */

/** The search role every public enterprise plays, whatever kind it is indexed as. */
export const ENTERPRISE_ROLE = 'public_enterprise'

export function enterpriseHref(cui: string): string {
  return `/public-enterprises/${encodeURIComponent(cui)}`
}

/**
 * A search hit's enterprise page, read off whichever address the hit carries:
 * global search's own (`/public-enterprises/$cui`), the retired one an older
 * index may still hold, a company page's, or the institution page of an
 * enterprise that is also a public institution and is indexed as one. That
 * last address is taken only from a hit playing the enterprise role; another
 * institution keeps its own link.
 */
export function enterpriseHitHref(hit: { readonly href: string; readonly roles?: readonly string[] }): string | null {
  const match = /^\/(public-enterprises|intreprinderi-publice|companies|entities)\/(\d+)(?:[/?#]|$)/u.exec(hit.href)
  if (!match || (match[1] === 'entities' && !hit.roles?.includes(ENTERPRISE_ROLE))) return null
  const cui = canonicalCuiOf(match[2])
  return cui ? enterpriseHref(cui) : null
}
