import { canonicalCuiOf } from './enterprise-cui'

/** Where the hub's search leads: an enterprise to its own page. */

export function enterpriseHref(cui: string): string {
  return `/public-enterprises/${encodeURIComponent(cui)}`
}

/**
 * A search hit's enterprise page, read off whichever address the hit carries:
 * global search's own (`/public-enterprises/$cui`), the retired one an older
 * index may still hold, or a company page's.
 */
export function enterpriseHitHref(hit: { readonly href: string }): string | null {
  const digits = /^\/(?:public-enterprises|intreprinderi-publice|companies)\/(\d+)(?:[/?#]|$)/u.exec(hit.href)?.[1]
  const cui = digits ? canonicalCuiOf(digits) : null
  return cui ? enterpriseHref(cui) : null
}
