/** Where the hub's search leads: an enterprise to its company page. */

export function companyHref(cui: string): string {
  return `/companies/${encodeURIComponent(cui)}`
}

/**
 * A search hit's company page. Global search still addresses an enterprise
 * by the retired `/intreprinderi-publice/$cui` (procurement's front door reads
 * a state company as a buyer off that address); the hub's own search goes
 * straight to the company page instead of through the redirect.
 */
export function enterpriseHitHref(hit: { readonly href: string }): string | null {
  const cui = /^\/(?:intreprinderi-publice|companies)\/(\d+)(?:[/?#]|$)/u.exec(hit.href)?.[1]
  return cui ? companyHref(cui) : null
}
