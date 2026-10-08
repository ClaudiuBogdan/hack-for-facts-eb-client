import type { AuthorityPortfolio, PortfolioSnapshot } from '@/schemas/public-enterprise-portfolio'

/**
 * The authority portfolio's server read: one authority's part of the
 * snapshot the generator writes (`lib/portfolio-snapshot.json`, every
 * authority and its enterprises, 1.4 MB). Only server code imports this
 * file — the route's loader behind `import.meta.env.SSR`, and the JSON route
 * a client-side navigation fetches — so the snapshot never reaches a browser
 * bundle. A test holds the snapshot to its schema.
 */

let snapshot: Promise<PortfolioSnapshot> | null = null

/** Kept once loaded; a failed load is not kept, so the next request tries again. */
function loadSnapshot(): Promise<PortfolioSnapshot> {
  snapshot ??= import('../lib/portfolio-snapshot.json').then(
    (module) => module.default as unknown as PortfolioSnapshot,
    (error: unknown) => {
      snapshot = null
      throw error
    },
  )
  return snapshot
}

const own = (record: object, key: string) => Object.prototype.hasOwnProperty.call(record, key)

/** The authority's enterprises in the page's order: ANAF's list's first, then those only the announcements name. */
function enterpriseOrder(authority: PortfolioSnapshot['authorities'][string]): readonly string[] {
  const listed = new Set(authority.s1001)
  return [...authority.s1001, ...authority.jsonApt.filter((cui) => !listed.has(cui))]
}

/** One authority's portfolio; null when no current member's edge names it (the page answers 404). */
export async function readAuthorityPortfolio(cui: string): Promise<AuthorityPortfolio | null> {
  const { authorities, enterprises, generatedAt, financialYear, seapSpan, sources } = await loadSnapshot()
  const authority = own(authorities, cui) ? authorities[cui] : undefined
  if (!authority) return null
  return {
    generatedAt,
    financialYear,
    seapSpan,
    sources,
    authority,
    enterprises: enterpriseOrder(authority).flatMap((member) => (own(enterprises, member) ? [enterprises[member]!] : [])),
  }
}
